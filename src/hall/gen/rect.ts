import type { Rect } from '../plan/hall.types'

export const inside = (r: Rect, x: number, z: number): boolean => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
export const overlaps = (a: Rect, b: Rect, eps = 1e-6): boolean => a.x0 < b.x1 - eps && a.x1 > b.x0 + eps && a.z0 < b.z1 - eps && a.z1 > b.z0 + eps
export const width = (r: Rect): number => r.x1 - r.x0
export const depth = (r: Rect): number => r.z1 - r.z0
export const center = (r: Rect): [number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]

/** Zerlegt `base` in Rechtecke ohne die Löcher. */
export function subtractRects(base: Rect, holes: Rect[]): Rect[] {
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
      const z0 = Math.max(r.z0, h.z0)
      const z1 = Math.min(r.z1, h.z1)
      if (h.x0 > r.x0) next.push({ x0: r.x0, x1: h.x0, z0, z1 })
      if (h.x1 < r.x1) next.push({ x0: h.x1, x1: r.x1, z0, z1 })
    }
    rects = next
  }
  return rects
}
