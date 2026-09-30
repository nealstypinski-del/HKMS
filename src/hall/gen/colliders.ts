// Kollisionskörper: Wände, Möbel, Geländer, Aufzugstürme, Treppen und Rolltreppen. Rein aus Plandaten berechnet.

import { CATALOG } from './catalog'
import { FURNISHED } from './furnish'
import { WALL_T, wallsOfRoom } from './walls'
import { ELEVATORS, ELEVATOR_SIZE, LEVELS, LEVEL_H, RAMPS, ROOMS, ROOF_Y, platformsOfLevel, voidRails } from '../plan/hall.plan'
import type { Ramp, Rect } from '../plan/hall.types'
import { rampHeight } from './surfaces'

/** Wirkt, wenn die Körpermitte der Figur zwischen y0 und y1 liegt. */
export interface Collider extends Rect {
  y0: number
  y1: number
}

const box = (cx: number, cz: number, hw: number, hd: number, y0: number, y1: number): Collider => ({ x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, y0, y1 })

/** Rechteck mit Drehung um yaw als achsparallele Hülle */
function rotatedBox(x: number, z: number, w: number, d: number, yaw: number, y0: number, y1: number): Collider {
  const c = Math.abs(Math.cos(yaw))
  const s = Math.abs(Math.sin(yaw))
  return box(x, z, (w * c + d * s) / 2, (w * s + d * c) / 2, y0, y1)
}

function slices(r: Ramp, side: 'a' | 'b', count: number): Collider[] {
  const out: Collider[] = []
  const alongX = Math.abs(r.dir[0]) > 0.5
  const len = r.length
  for (let i = 0; i < count; i++) {
    const t0 = i / count
    const t1 = (i + 1) / count
    const p = (t: number): [number, number] => [r.start[0] + r.dir[0] * len * t, r.start[1] + r.dir[1] * len * t]
    const [ax, az] = p(t0)
    const [bx, bz] = p(t1)
    const h0 = rampHeight(r, ax, az)
    const h1 = rampHeight(r, bx, bz)
    const lo = Math.min(h0, h1) - 0.5
    const hi = Math.max(h0, h1) + 1.4
    const rect = r.rect
    const t = 0.06
    if (alongX) {
      const z = side === 'a' ? rect.z0 - t : rect.z1 + t
      out.push({ x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: z - t, z1: z + t, y0: lo, y1: hi })
    } else {
      const x = side === 'a' ? rect.x0 - t : rect.x1 + t
      out.push({ x0: x - t, x1: x + t, z0: Math.min(az, bz), z1: Math.max(az, bz), y0: lo, y1: hi })
    }
  }
  return out
}

function build(): Collider[] {
  const out: Collider[] = []
  // Wände aller Räume
  for (const room of ROOMS) {
    const y = room.level * LEVEL_H
    for (const w of wallsOfRoom(room)) if (!w.lintel) out.push({ x0: w.x0, x1: w.x1, z0: w.z0, z1: w.z1, y0: y - 0.3, y1: y + LEVEL_H })
  }
  // Möbel
  for (const it of FURNISHED.items) {
    if (!it.collide) continue
    const y = it.level * LEVEL_H
    out.push(rotatedBox(it.x, it.z, it.w, it.d, it.yaw, y - 0.3, y + 2.2))
  }
  // Geländer am Luftraum
  for (let l = 1; l < LEVELS; l++) {
    const y = l * LEVEL_H
    for (const e of voidRails(l)) {
      let cur = e.from
      const gaps = [...e.gaps].sort((a, b) => a[0] - b[0])
      const segs: Array<[number, number]> = []
      for (const [g0, g1] of gaps) {
        if (g0 > cur) segs.push([cur, g0])
        cur = Math.max(cur, g1)
      }
      if (cur < e.to) segs.push([cur, e.to])
      for (const [a, b] of segs) {
        out.push(e.axis === 'x' ? { x0: e.at - 0.06, x1: e.at + 0.06, z0: a, z1: b, y0: y - 0.2, y1: y + 1.3 } : { x0: a, x1: b, z0: e.at - 0.06, z1: e.at + 0.06, y0: y - 0.2, y1: y + 1.3 })
      }
    }
  }
  // Brücken: Geländer an den Längsseiten
  for (let l = 1; l < LEVELS; l++) {
    const y = l * LEVEL_H
    for (const p of platformsOfLevel(l).filter((q) => q.kind === 'bridge')) {
      for (const x of [p.rect.x0, p.rect.x1]) out.push({ x0: x - 0.06, x1: x + 0.06, z0: p.rect.z0, z1: p.rect.z1, y0: y - 0.2, y1: y + 1.3 })
    }
  }
  // Aufzugstürme (alle Ebenen)
  for (const e of ELEVATORS) out.push(box(e.x, e.z, ELEVATOR_SIZE / 2 + 0.1, ELEVATOR_SIZE / 2 + 0.1, -1, ROOF_Y))
  // Treppen und Rolltreppen
  for (const r of RAMPS) {
    if (r.kind === 'stairs') {
      out.push(...slices(r, 'a', 14), ...slices(r, 'b', 14))
    } else {
      out.push(...slices(r, 'a', 10), ...slices(r, 'b', 10))
    }
  }
  return out
}

export const BASE_COLLIDERS: readonly Collider[] = build()
export { CATALOG, WALL_T }
