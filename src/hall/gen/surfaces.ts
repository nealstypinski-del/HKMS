// Begehbare Flächen je Ebene und Rampen (Treppen, Rolltreppen) mit Höhenfunktion.

import { FOOT, LEVELS, LEVEL_H, RAMPS, platformsOfLevel, roomsOfLevel } from '../plan/hall.plan'
import type { Ramp, Rect } from '../plan/hall.types'
import { inside } from './rect'

export interface Surface {
  area: Rect
  level: number
  height: (x: number, z: number) => number
  /** Mitnahme in m/s (Rolltreppe) */
  carry?: [number, number]
  /** Massiver Körper darunter: zu hohe Stufen wirken wie eine Wand */
  solid?: boolean
  base?: number
}

/** Außengelände: Vorplatz und Umgebung der Halle (Ebene 0) */
export const GROUND: Rect = { x0: -90, x1: 90, z0: -60, z1: 90 }

export const rampHeight = (r: Ramp, x: number, z: number): number => {
  const t = ((x - r.start[0]) * r.dir[0] + (z - r.start[1]) * r.dir[1]) / r.length
  return r.y0 + (r.y1 - r.y0) * Math.max(0, Math.min(1, t))
}

function build(): Surface[] {
  const list: Surface[] = []
  list.push({ area: GROUND, level: 0, height: () => 0 })
  for (let l = 1; l < LEVELS; l++) {
    const y = l * LEVEL_H
    for (const room of roomsOfLevel(l)) list.push({ area: room, level: l, height: () => y })
    for (const p of platformsOfLevel(l)) list.push({ area: p.rect, level: l, height: () => y })
  }
  for (const r of RAMPS) {
    const carry: [number, number] | undefined = r.carry ? [r.dir[0] * r.carry, r.dir[1] * r.carry] : undefined
    list.push({ area: r.rect, level: r.fromLevel, height: (x, z) => rampHeight(r, x, z), carry, solid: true, base: r.y0 })
  }
  return list
}

export const SURFACES: readonly Surface[] = build()

export const STEP_UP = 0.5
export const BODY_MID = 0.9

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

export const levelOfHeight = (y: number): number => Math.max(0, Math.min(LEVELS - 1, Math.floor((y + 1.0) / LEVEL_H)))
export { FOOT }
