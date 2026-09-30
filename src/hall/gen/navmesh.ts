// Gitter Navigation je Ebene. Zellgröße 1 m, 8 Nachbarn, A* mit Wegglättung.
// Wird aus denselben Plandaten wie Kollision und Grafik erzeugt, deshalb laufen Figuren nie durch Wände oder Möbel.

import { ELEVATORS, FOOT, LEVELS, LEVEL_H, platformsOfLevel, roomsOfLevel } from '../plan/hall.plan'
import type { Rect } from '../plan/hall.types'
import { BASE_COLLIDERS, type Collider } from './colliders'
import { inside } from './rect'

export const CELL = 1
export const AGENT_RADIUS = 0.3
const W = Math.round((FOOT.x1 - FOOT.x0) / CELL)
const H = Math.round((FOOT.z1 - FOOT.z0) / CELL)

export interface NavGrid {
  level: number
  walk: Uint8Array
}

const cx = (i: number): number => FOOT.x0 + (i + 0.5) * CELL
const cz = (j: number): number => FOOT.z0 + (j + 0.5) * CELL
const ix = (x: number): number => Math.floor((x - FOOT.x0) / CELL)
const iz = (z: number): number => Math.floor((z - FOOT.z0) / CELL)

function walkableRects(level: number): Rect[] {
  if (level === 0) return [FOOT]
  return [...roomsOfLevel(level), ...platformsOfLevel(level).map((p) => p.rect)]
}

/** Kreis (Radius r) gegen Rechteck */
const hits = (c: Collider, x: number, z: number, r: number): boolean => {
  const nx = Math.max(c.x0, Math.min(x, c.x1))
  const nz = Math.max(c.z0, Math.min(z, c.z1))
  return (x - nx) * (x - nx) + (z - nz) * (z - nz) < r * r
}

export function buildNavGrid(level: number, colliders: readonly Collider[]): NavGrid {
  const walk = new Uint8Array(W * H)
  const rects = walkableRects(level)
  const y = level * LEVEL_H + 0.9
  const relevant = colliders.filter((c) => y >= c.y0 && y <= c.y1)
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = cx(i)
      const z = cz(j)
      if (!rects.some((r) => inside(r, x, z))) continue
      // Zelle ist gesperrt, wenn ein Körper sie überlappt (dünne Wände auf Zellkanten sperren beide Seiten) oder Möbel zu nah sind
      const x0 = x - CELL / 2
      const z0 = z - CELL / 2
      if (relevant.some((c) => (c.x0 < x0 + CELL && c.x1 > x0 && c.z0 < z0 + CELL && c.z1 > z0) || hits(c, x, z, AGENT_RADIUS))) continue
      walk[j * W + i] = 1
    }
  }
  return { level, walk }
}

export class Navigator {
  readonly grids: NavGrid[]

  constructor(colliders: readonly Collider[] = BASE_COLLIDERS) {
    this.grids = Array.from({ length: LEVELS }, (_, l) => buildNavGrid(l, colliders))
  }

  isWalkable(level: number, x: number, z: number): boolean {
    const i = ix(x)
    const j = iz(z)
    if (i < 0 || j < 0 || i >= W || j >= H) return false
    return (this.grids[level] as NavGrid).walk[j * W + i] === 1
  }

  /** Nächste begehbare Zelle (Ringsuche), null wenn keine in 8 m Nähe */
  nearestWalkable(level: number, x: number, z: number): [number, number] | null {
    const i0 = ix(x)
    const j0 = iz(z)
    for (let r = 0; r <= 8; r++) {
      let best: [number, number] | null = null
      let bd = Infinity
      for (let j = j0 - r; j <= j0 + r; j++) {
        for (let i = i0 - r; i <= i0 + r; i++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue
          if (i < 0 || j < 0 || i >= W || j >= H) continue
          if ((this.grids[level] as NavGrid).walk[j * W + i] !== 1) continue
          const d = (cx(i) - x) ** 2 + (cz(j) - z) ** 2
          if (d < bd) {
            bd = d
            best = [i, j]
          }
        }
      }
      if (best) return best
    }
    return null
  }

  private los(level: number, ax: number, az: number, bx: number, bz: number): boolean {
    const dist = Math.hypot(bx - ax, bz - az)
    const steps = Math.ceil(dist / 0.25)
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      if (!this.isWalkable(level, ax + (bx - ax) * t, az + (bz - az) * t)) return false
    }
    return true
  }

  /** Weg von (ax, az) nach (bx, bz) auf einer Ebene als Punktfolge (ohne Startpunkt). null, wenn nicht erreichbar. */
  path(level: number, ax: number, az: number, bx: number, bz: number): Array<[number, number]> | null {
    const s = this.nearestWalkable(level, ax, az)
    const g = this.nearestWalkable(level, bx, bz)
    if (!s || !g) return null
    const grid = (this.grids[level] as NavGrid).walk
    const start = s[1] * W + s[0]
    const goal = g[1] * W + g[0]
    const gScore = new Float32Array(W * H).fill(Infinity)
    const from = new Int32Array(W * H).fill(-1)
    const closed = new Uint8Array(W * H)
    const open: Array<[number, number]> = [[0, start]]
    gScore[start] = 0
    const heur = (idx: number): number => {
      const dx = Math.abs((idx % W) - g[0])
      const dz = Math.abs(Math.floor(idx / W) - g[1])
      return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz)
    }
    while (open.length > 0) {
      let bi = 0
      for (let k = 1; k < open.length; k++) if ((open[k] as [number, number])[0] < (open[bi] as [number, number])[0]) bi = k
      const [, cur] = open.splice(bi, 1)[0] as [number, number]
      if (closed[cur]) continue
      closed[cur] = 1
      if (cur === goal) break
      const ci = cur % W
      const cj = Math.floor(cur / W)
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue
          const ni = ci + di
          const nj = cj + dj
          if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue
          const n = nj * W + ni
          if (!grid[n] || closed[n]) continue
          // keine Ecken schneiden
          if (di !== 0 && dj !== 0 && (!grid[cj * W + ni] || !grid[nj * W + ci])) continue
          const cost = (gScore[cur] as number) + (di !== 0 && dj !== 0 ? Math.SQRT2 : 1)
          if (cost < (gScore[n] as number)) {
            gScore[n] = cost
            from[n] = cur
            open.push([cost + heur(n), n])
          }
        }
      }
    }
    if (from[goal] === -1 && goal !== start) return null
    const cells: Array<[number, number]> = []
    for (let c = goal; c !== -1; c = from[c] as number) cells.unshift([cx(c % W), cz(Math.floor(c / W))])
    // Wegglättung: so weit wie möglich geradeaus
    const out: Array<[number, number]> = []
    let anchor: [number, number] = [ax, az]
    if (!this.isWalkable(level, ax, az)) anchor = cells[0] as [number, number]
    let k = 0
    while (k < cells.length) {
      let far = k
      for (let m = cells.length - 1; m > k; m--) {
        const p = cells[m] as [number, number]
        if (this.los(level, anchor[0], anchor[1], p[0], p[1])) {
          far = m
          break
        }
      }
      const p = cells[far] as [number, number]
      out.push(p)
      anchor = p
      k = far + 1
    }
    return out
  }
}

export const navigator = new Navigator()
export const elevatorStand = (id: number): [number, number] => {
  const e = ELEVATORS[id] as (typeof ELEVATORS)[number]
  return [e.standX, e.standZ]
}
