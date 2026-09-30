// Begehbare Welt: Bodenflächen, Rampen (Treppe, Rolltreppe), Deckenöffnungen und Kollisionskörper.
// Alle Zahlen stammen aus denselben Konstanten wie die Darstellung, damit Sichtbares und Begehbares übereinstimmen.

import { INITIAL_DESKS } from '../data/initialDesks'
import { FLOOR_DEPTH, FLOOR_HEIGHT, FLOOR_WIDTH, TOP_LEVEL, floorY } from './office.config'
import { LOBBY_LAYOUT, MEETING_ROOM, MEETING_TABLE, SEAT_DX, SEAT_DZ } from './floorLayouts'

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

/** Kollisionskörper: wirkt, wenn die Körpermitte der Figur zwischen y0 und y1 liegt. */
export interface Collider extends Rect {
  y0: number
  y1: number
}

export const HALF_W = FLOOR_WIDTH / 2
export const HALF_D = FLOOR_DEPTH / 2
export const PLAYER_RADIUS = 0.28
export const BODY_MID = 0.9
export const STEP_UP = 0.5

/** Treppe: zwei gegenläufige Läufe mit Podest (Etage n nach n+1) */
export const STAIRS = {
  stepRise: 0.2,
  stepRun: 0.3,
  steps: 15,
  runA: { x0: 3.9, x1: 8.4, z0: 4.9, z1: 6.3 },
  landing: { x0: 8.4, x1: 9.9, z0: 4.9, z1: 7.7 },
  runB: { x0: 3.9, x1: 8.4, z0: 6.3, z1: 7.7 },
  half: 3.0,
} as const

/** Rolltreppe von der Lobby (Etage 0) zu Etage 1: linke Spur fährt hinauf, rechte hinunter */
export const ESCALATOR = {
  x0: -8,
  x1: 2.4,
  rise: FLOOR_HEIGHT,
  up: { z0: 5.5, z1: 6.5 },
  down: { z0: 6.7, z1: 7.7 },
  outer: { z0: 5.35, z1: 7.85 },
  speed: 0.6,
} as const

export const ESCALATOR_SLOPE = ESCALATOR.rise / (ESCALATOR.x1 - ESCALATOR.x0)
/** ab hier ist die Ramp hoch genug für eine Öffnung in der Decke (Kopffreiheit) */
export const ESCALATOR_HOLE: Rect = { x0: ESCALATOR.x0 + 3.9 / ESCALATOR_SLOPE, x1: ESCALATOR.x1, z0: ESCALATOR.outer.z0, z1: ESCALATOR.outer.z1 }
export const STAIR_HOLE: Rect = { x0: STAIRS.runB.x0, x1: STAIRS.runB.x1, z0: STAIRS.runB.z0, z1: STAIRS.runB.z1 }

/** Deckenöffnungen je Etage (Öffnung in der Bodenplatte dieser Etage) */
export const holesOf = (level: number): Rect[] => {
  if (level === 0) return []
  return level === 1 ? [ESCALATOR_HOLE, STAIR_HOLE] : [STAIR_HOLE]
}

const inside = (r: Rect, x: number, z: number): boolean => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1

/** Zerlegt eine Fläche in Rechtecke ohne die Öffnungen (für die Bodenplatten). */
export function subtractHoles(base: Rect, holes: Rect[]): Rect[] {
  let rects: Rect[] = [base]
  for (const h of holes) {
    const next: Rect[] = []
    for (const r of rects) {
      if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) {
        next.push(r)
        continue
      }
      if (h.z0 > r.z0) next.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: h.z0 })
      if (h.z1 < r.z1) next.push({ x0: r.x0, x1: r.x1, z0: h.z1, z1: r.z1 })
      const zc0 = Math.max(r.z0, h.z0)
      const zc1 = Math.min(r.z1, h.z1)
      if (h.x0 > r.x0) next.push({ x0: r.x0, x1: h.x0, z0: zc0, z1: zc1 })
      if (h.x1 < r.x1) next.push({ x0: h.x1, x1: r.x1, z0: zc0, z1: zc1 })
    }
    rects = next
  }
  return rects
}

interface Surface {
  area: Rect
  height: (x: number, z: number) => number
  /** Geschwindigkeit, mit der diese Fläche die Figur mitnimmt (Rolltreppe) */
  carry?: [number, number]
  /** Massiver Körper darunter: zu hohe Stufen wirken wie eine Wand */
  solid?: boolean
  /** Unterkante des massiven Körpers */
  base?: number
}

const FOOTPRINT: Rect = { x0: -HALF_W, x1: HALF_W, z0: -HALF_D, z1: HALF_D }

function buildSurfaces(): Surface[] {
  const list: Surface[] = []
  for (let l = 0; l <= TOP_LEVEL; l++) {
    const y = floorY(l)
    const holes = holesOf(l)
    list.push({ area: FOOTPRINT, height: (x, z) => (holes.some((h) => inside(h, x, z)) ? -100 : y) })
    if (l < TOP_LEVEL) {
      const { runA, landing, runB, half } = STAIRS
      list.push({ area: runA, solid: true, base: y, height: (x) => y + ((x - runA.x0) / (runA.x1 - runA.x0)) * half })
      list.push({ area: landing, solid: true, base: y, height: () => y + half })
      list.push({ area: runB, height: (x) => y + half + ((runB.x1 - x) / (runB.x1 - runB.x0)) * half })
    }
  }
  const slope = (x: number) => ((x - ESCALATOR.x0) / (ESCALATOR.x1 - ESCALATOR.x0)) * ESCALATOR.rise
  list.push({ area: { x0: ESCALATOR.x0, x1: ESCALATOR.x1, ...ESCALATOR.up }, height: slope, solid: true, base: 0, carry: [ESCALATOR.speed, 0] })
  list.push({ area: { x0: ESCALATOR.x0, x1: ESCALATOR.x1, ...ESCALATOR.down }, height: slope, solid: true, base: 0, carry: [-ESCALATOR.speed, 0] })
  return list
}

const SURFACES = buildSurfaces()

export interface Ground {
  y: number
  carry: [number, number]
}

/** Höhe des Bodens unter (x, z): die höchste Fläche, die höchstens STEP_UP über der Figur liegt. */
export function groundAt(x: number, z: number, y: number): Ground {
  let best = -Infinity
  let carry: [number, number] = [0, 0]
  for (const s of SURFACES) {
    if (!inside(s.area, x, z)) continue
    const h = s.height(x, z)
    if (h <= y + STEP_UP && h > best) {
      best = h
      carry = s.carry && Math.abs(h - y) < 0.35 ? s.carry : [0, 0]
    }
  }
  return { y: best === -Infinity ? 0 : best, carry }
}

/** Steht an (x, z) ein massiver Körper, der höher als die Stufenhöhe über y liegt? */
export function solidAt(x: number, z: number, y: number): boolean {
  for (const s of SURFACES) if (s.solid && inside(s.area, x, z) && y + BODY_MID >= (s.base ?? 0) && s.height(x, z) > y + STEP_UP) return true
  return false
}

const box = (cx: number, cz: number, hw: number, hd: number, y0: number, h: number): Collider => ({ x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, y0, y1: y0 + h })

function buildColliders(): Collider[] {
  const out: Collider[] = []
  // Aufzugsschacht (alle Etagen)
  out.push({ x0: 9.3, x1: 11.8, z0: -8, z1: -4.95, y0: -1, y1: 40 })

  for (const d of INITIAL_DESKS) {
    const [x, y, z] = d.position
    out.push(box(x, z, 0.85, 0.43, y - 0.3, 2))
    out.push(box(x + SEAT_DX, z + SEAT_DZ, 0.27, 0.27, y - 0.3, 2))
  }

  const L = LOBBY_LAYOUT
  out.push(box(L.reception.x, L.reception.z, 2.3, 0.53, -0.3, 2))
  out.push({ x0: L.reception.x - 2.6, x1: L.reception.x - 1.7, z0: -8, z1: -5.9, y0: -0.3, y1: 2 })
  out.push({ x0: 2.9, x1: 8.1, z0: -8, z1: -7.1, y0: -0.3, y1: 2.5 })
  out.push({ x0: 8.15, x1: 9.15, z0: -8, z1: -7, y0: -0.3, y1: 2.5 })
  out.push(box(L.kitchen.islandX, L.kitchen.islandZ, 1.6, 0.53, -0.3, 2))
  out.push(box(L.bench.x, L.bench.z, (L.bench.seats + 0.4) / 2, 0.55, -0.3, 2))
  out.push(box(L.sofa.x, L.sofa.z, 1.9, 0.5, -0.3, 2))
  out.push(box(L.coffeeTable.x, L.coffeeTable.z, 0.6, 0.6, -0.3, 2))
  for (const a of L.armchairs) out.push(box(a.x, a.z, 0.5, 0.6, -0.3, 2))
  for (const [x, z] of [[-11.2, 7.0], [9.4, -0.9], [11, 6.4]] as const) out.push(box(x, z, 0.3, 0.3, -0.3, 2))

  for (let level = 1; level <= TOP_LEVEL; level++) {
    const y = floorY(level)
    // Glaswände des Konferenzraums mit Türöffnung
    const R = MEETING_ROOM
    const t = 0.07
    out.push({ x0: R.x0, x1: R.doorX0, z0: R.z0 - t, z1: R.z0 + t, y0: y - 0.3, y1: y + 3 })
    out.push({ x0: R.doorX1, x1: R.x1, z0: R.z0 - t, z1: R.z0 + t, y0: y - 0.3, y1: y + 3 })
    out.push({ x0: R.x0 - t, x1: R.x0 + t, z0: R.z0, z1: R.z1, y0: y - 0.3, y1: y + 3 })
    out.push({ x0: R.x1 - t, x1: R.x1 + t, z0: R.z0, z1: R.z1, y0: y - 0.3, y1: y + 3 })
    out.push({ x0: R.x0, x1: R.x1, z0: R.z1 - t, z1: R.z1 + t, y0: y - 0.3, y1: y + 3 })
    out.push(box(MEETING_TABLE.x, MEETING_TABLE.z, MEETING_TABLE.radius, MEETING_TABLE.radius, y - 0.3, 2))
    out.push(box(11.2, 2.6, 0.3, 0.3, y - 0.3, 2))
    out.push(box(-11.2, 7.0, 0.3, 0.3, y - 0.3, 2))
    if (level === 1) out.push(box(0.5, 2.9, 1.9, 0.5, y - 0.3, 2))
    if (level === 3) for (const x of [3.4, 4.5, 5.6, 6.7]) out.push(box(x, -7.2, 0.43, 0.46, y - 0.3, 2.4))
  }

  // Treppe: Trennwand zwischen den Läufen, Geländer, Absperrung der Deckenöffnung
  for (let l = 0; l < TOP_LEVEL; l++) {
    const y = floorY(l)
    const S = STAIRS
    out.push({ x0: S.runB.x0, x1: S.runA.x1, z0: 6.27, z1: 6.33, y0: y - 0.2, y1: y + 5.5 })
    out.push({ x0: S.runA.x0, x1: S.runA.x1, z0: S.runA.z0 - 0.06, z1: S.runA.z0, y0: y - 0.2, y1: y + 6.5 })
    out.push({ x0: S.landing.x0, x1: S.landing.x1, z0: S.landing.z0 - 0.06, z1: S.landing.z0, y0: y - 0.2, y1: y + 6.5 })
    out.push({ x0: S.landing.x1, x1: S.landing.x1 + 0.06, z0: S.landing.z0, z1: S.landing.z1, y0: y - 0.2, y1: y + 6.5 })
    out.push({ x0: S.runB.x0, x1: S.runB.x1, z0: S.runB.z1, z1: S.runB.z1 + 0.06, y0: y - 0.2, y1: y + 6.5 })
    const top = floorY(l + 1)
    out.push({ x0: S.runB.x0, x1: S.runB.x1, z0: 6.27, z1: 6.33, y0: top - 0.2, y1: top + 1.2 })
    out.push({ x0: S.runB.x1, x1: S.runB.x1 + 0.06, z0: 6.3, z1: 7.7, y0: top - 0.2, y1: top + 1.2 })
    out.push({ x0: S.runB.x0, x1: S.runB.x1, z0: S.runB.z1, z1: S.runB.z1 + 0.06, y0: top - 0.2, y1: top + 1.2 })
  }
  // Rolltreppe: Seitenwände, Mittelwand, Absperrung der Deckenöffnung in Etage 1
  const E = ESCALATOR
  out.push({ x0: E.x0, x1: E.x1, z0: E.outer.z0, z1: E.up.z0, y0: -0.2, y1: 5.5 })
  out.push({ x0: E.x0, x1: E.x1, z0: E.up.z1, z1: E.down.z0, y0: -0.2, y1: 5.5 })
  out.push({ x0: E.x0, x1: E.x1, z0: E.down.z1, z1: E.outer.z1, y0: -0.2, y1: 5.5 })
  const H = ESCALATOR_HOLE
  const f1 = floorY(1)
  out.push({ x0: H.x0, x1: H.x1, z0: H.z0 - 0.05, z1: H.z0 + 0.05, y0: f1 - 0.2, y1: f1 + 1.2 })
  out.push({ x0: H.x0, x1: H.x1, z0: H.z1 - 0.05, z1: H.z1 + 0.05, y0: f1 - 0.2, y1: f1 + 1.2 })
  out.push({ x0: H.x0 - 0.05, x1: H.x0 + 0.05, z0: H.z0, z1: H.z1, y0: f1 - 0.2, y1: f1 + 1.2 })
  return out
}

export const COLLIDERS: readonly Collider[] = buildColliders()

/** Schiebt eine Kreisfigur aus allen Kollisionskörpern heraus und hält sie im Gebäude. */
export function resolveCollisions(x: number, z: number, y: number, colliders: readonly Collider[] = COLLIDERS): [number, number] {
  const sample = y + BODY_MID
  let px = x
  let pz = z
  for (let pass = 0; pass < 3; pass++) {
    for (const c of colliders) {
      if (sample < c.y0 || sample > c.y1) continue
      const nx = Math.max(c.x0, Math.min(px, c.x1))
      const nz = Math.max(c.z0, Math.min(pz, c.z1))
      const dx = px - nx
      const dz = pz - nz
      const d2 = dx * dx + dz * dz
      if (d2 >= PLAYER_RADIUS * PLAYER_RADIUS) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        px = nx + (dx / d) * PLAYER_RADIUS
        pz = nz + (dz / d) * PLAYER_RADIUS
      } else {
        // Mittelpunkt liegt im Körper: über die kürzeste Kante hinausschieben
        const l = px - c.x0 + PLAYER_RADIUS
        const r = c.x1 - px + PLAYER_RADIUS
        const t = pz - c.z0 + PLAYER_RADIUS
        const b = c.z1 - pz + PLAYER_RADIUS
        const m = Math.min(l, r, t, b)
        if (m === l) px = c.x0 - PLAYER_RADIUS
        else if (m === r) px = c.x1 + PLAYER_RADIUS
        else if (m === t) pz = c.z0 - PLAYER_RADIUS
        else pz = c.z1 + PLAYER_RADIUS
      }
    }
  }
  px = Math.max(-HALF_W + 0.4, Math.min(HALF_W - 0.4, px))
  pz = Math.max(-HALF_D + 0.4, Math.min(HALF_D - 0.4, pz))
  return [px, pz]
}

/** Etage, auf der die Figur gerade steht (für Etagenanzeige und Sichtbarkeit). */
export const levelOfHeight = (y: number): number => Math.max(0, Math.min(TOP_LEVEL, Math.floor((y + 1.0) / FLOOR_HEIGHT)))
