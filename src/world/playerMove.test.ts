import { describe, expect, it } from 'vitest'
import { mulberry } from './avatar'
import { BUILDING } from './buildingConfig'
import { HALF_D } from './constants'
import { getFloor } from './generate'
import { movePlayerStep, type MoveHooks, type MovingPlayer } from './playerMove'
import { unstick, walkable, WORLD_LIMIT } from './walk'

const mk = (floorId: string, x: number, z: number): MovingPlayer => ({ x, z, yaw: 0, walkClock: 0, walking: false, floorId, dy: 0, ride: null })
const mkHooks = (state: { floor: string; climbing: boolean }): MoveHooks => ({
  switchFloor: (id) => { state.floor = id },
  setClimbing: (b) => { state.climbing = b },
  isClimbing: () => state.climbing,
})

describe('Spieler: Rettung aus gesperrten Feldern und Weltgrenze', () => {
  it('unstick liefert für gültige Punkte denselben Punkt', () => {
    expect(unstick('floor-lobby', 0, 30)).toEqual({ x: 0, z: 30 })
  })
  it('unstick rettet aus Möbeln (jeder Schreibtisch jeder Etage) auf einen begehbaren Punkt in der Nähe', () => {
    for (const f of BUILDING.floors) {
      for (const d of getFloor(f.id).desks) {
        const u = unstick(f.id, d.pos.x, d.pos.z)
        expect(walkable(f.id, u.x, u.z), `${d.id}`).toBe(true)
        expect(Math.hypot(u.x - d.pos.x, u.z - d.pos.z), `${d.id}`).toBeLessThan(4)
      }
    }
  })
  it('unstick rettet aus Wänden, Aufzugskern, ungültigen Werten und weit außerhalb der Welt', () => {
    for (const [x, z] of [[-3, -8], [0, -13], [NaN, 5], [5, NaN], [Infinity, 0], [1e9, 1e9], [-22, 0], [0, HALF_D]] as [number, number][]) {
      const u = unstick('floor-lobby', x, z)
      expect(Number.isFinite(u.x) && Number.isFinite(u.z), `${x},${z}`).toBe(true)
      expect(walkable('floor-lobby', u.x, u.z), `${x},${z}`).toBe(true)
    }
  })
  it('die Weltgrenze ist fest, dahinter ist nichts begehbar', () => {
    expect(walkable('floor-lobby', WORLD_LIMIT - 1, 0)).toBe(true)
    expect(walkable('floor-lobby', WORLD_LIMIT + 1, 0)).toBe(false)
    expect(walkable('floor-lobby', 0, -(WORLD_LIMIT + 5))).toBe(false)
  })
})

describe('Spielerbewegung: Fuzzing', () => {
  const hostile = [NaN, Infinity, -Infinity, 1e9, -1e9, 0, 1, -1, 0.5, 1e-9]
  const run = (floorId: string, seed: number, steps: number, startX: number, startZ: number) => {
    const r = mulberry(seed)
    const p = mk(floorId, startX, startZ)
    const st = { floor: floorId, climbing: false }
    const hooks = mkHooks(st)
    for (let i = 0; i < steps; i++) {
      const pickH = () => hostile[Math.floor(r() * hostile.length)]
      const wild = r() < 0.15
      const dx = wild ? pickH() : (r() - 0.5) * 2
      const dz = wild ? pickH() : (r() - 0.5) * 2
      const dt = r() < 0.1 ? pickH() : r() * 0.2
      movePlayerStep(p, st.floor, dt, dx, dz, r() < 0.3, r() < 0.5, hooks)
      p.floorId = st.floor === p.floorId ? p.floorId : p.floorId
      const where = `Etage ${floorId} Schritt ${i} Startwert ${seed}`
      expect(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.yaw) && Number.isFinite(p.dy) && Number.isFinite(p.walkClock), where).toBe(true)
      expect(Math.hypot(p.x, p.z) <= WORLD_LIMIT + 1, where).toBe(true)
      if (p.ride) {
        expect(p.ride.t >= 0 && p.ride.t <= 1, where).toBe(true)
      } else {
        expect(p.dy, where).toBe(0)
        expect(walkable(p.floorId, p.x, p.z), `${where} steht im Gesperrten bei ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(true)
      }
      // Nach einem Etagenwechsel per Treppe gehört der Spieler zur neuen Etage
      if (!p.ride) st.floor = p.floorId
    }
  }
  for (const f of BUILDING.floors) {
    it(`${f.id}: 4000 feindliche Schritte, Start in der Etagenmitte und mitten in Möbeln`, () => {
      run(f.id, 11, 4000, 0, 0)
      const d = getFloor(f.id).desks[0]
      if (d) run(f.id, 12, 2000, d.pos.x, d.pos.z)
    })
  }
  it('Erdgeschoss: Start draußen, weit draußen und an ungültigen Positionen', () => {
    for (const [x, z] of [[0, 26], [500, 500], [-9999, 3], [NaN, NaN], [0, 15]] as [number, number][]) run('floor-lobby', 5, 1500, x, z)
  })
})

describe('Treppe: Ansichtswechsel während der Fahrt', () => {
  it('nach dem Ansichtswechsel wird beim Weiterfahren wieder die obere Etage gezeichnet (climbing)', () => {
    const st = { floor: 'floor-lobby', climbing: true }
    const hooks = mkHooks(st)
    const p = mk('floor-lobby', -18, -1.8)
    p.ride = { id: 'stairs-0-1', t: 0.5 }
    st.climbing = false // Ansicht wurde gewechselt, das Flag wurde zurückgesetzt
    movePlayerStep(p, 'floor-lobby', 0.05, -1, 0, false, true, hooks)
    expect(st.climbing).toBe(true)
  })
  it('die Fahrt läuft nach beliebig vielen Pausen ohne Sprünge weiter und endet auf der oberen Etage', () => {
    const st = { floor: 'floor-lobby', climbing: true }
    const hooks = mkHooks(st)
    const p = mk('floor-lobby', -14.4, -1.8)
    p.ride = { id: 'stairs-0-1', t: 0 }
    let last = 0
    for (let i = 0; i < 5000 && p.ride; i++) {
      movePlayerStep(p, st.floor, i % 7 === 0 ? 5 : 0.03, -1, 0, false, true, hooks) // manche Schritte riesig, wirken auf 0,1 begrenzt
      if (p.ride) { expect(p.ride.t).toBeGreaterThanOrEqual(last); last = p.ride.t }
    }
    expect(p.ride).toBeNull()
    expect(st.floor).toBe('floor-shared')
    expect(p.dy).toBe(0)
  })
})
