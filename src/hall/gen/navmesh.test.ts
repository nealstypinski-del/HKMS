import { describe, expect, it } from 'vitest'
import { ELEVATORS, ROOMS } from '../plan/hall.plan'
import { navigator } from './navmesh'
import { FURNISHED } from './furnish'

const doorPoint = (id: string): [number, number, number] => {
  const r = ROOMS.find((x) => x.id === id)!
  const d = r.doors[0]!
  const off = 1.5
  if (d.side === 'N') return [d.pos, r.z0 + off, r.level]
  if (d.side === 'S') return [d.pos, r.z1 - off, r.level]
  if (d.side === 'E') return [r.x1 - off, d.pos, r.level]
  return [r.x0 + off, d.pos, r.level]
}

describe('Navmesh', () => {
  it('Aufzugswartepunkte sind auf allen Ebenen begehbar', () => {
    for (const e of ELEVATORS) for (let l = 0; l < 3; l++) expect(navigator.isWalkable(l, e.standX, e.standZ)).toBe(true)
  })

  it('jeder Raum ist von seinem Aufzug aus erreichbar (Weg zur Tür und in den Raum)', () => {
    const unreachable: string[] = []
    for (const r of ROOMS) {
      const [x, z, l] = doorPoint(r.id)
      const e = ELEVATORS[0]!
      const p = navigator.path(l, e.standX, e.standZ, x, z)
      if (!p) unreachable.push(r.id)
    }
    expect(unreachable).toEqual([])
  })

  it('alle Sitzplätze sind von der Tür ihres Raums erreichbar', () => {
    const bad: string[] = []
    for (const s of FURNISHED.slots) {
      const room = ROOMS.find((r) => r.id === s.roomId)!
      const [dx, dz] = doorPoint(room.id)
      const p = navigator.path(room.level, dx, dz, s.x, s.z)
      if (!p) bad.push(s.id)
    }
    expect(bad).toEqual([])
  })

  it('Schreibtische haben genau einen Sitzplatz Platz davor', () => {
    expect(FURNISHED.desks.length).toBeGreaterThanOrEqual(36)
  })

  it('Weg geht durch Türen, nicht durch Wände', () => {
    const p = navigator.path(1, -30, 26, 30, 26)!
    expect(p).not.toBeNull()
    // Räume SW und SE liegen auf derselben Etage getrennt, der Weg muss über die Galerie (z < 20) führen
    expect(Math.min(...p.map((q) => q[1]))).toBeLessThan(20)
  })
})
