import { HALF_D, HALF_W } from './constants'
import { getFloor } from './generate'
import { getNav } from './nav'

/** Halbe Breite der Eingangsöffnung in der Glasfassade des Erdgeschosses. */
export const ENTRANCE_HALF = 2.4

/** Rand der begehbaren Welt (Meter vom Gebäude). Dahinter endet die Fläche, man kommt nicht ins Leere. */
export const WORLD_LIMIT = 220

export const isOutside = (x: number, z: number) => Math.abs(x) > HALF_W || Math.abs(z) > HALF_D

/**
 * Begehbarkeit für den Spieler in Ego Ansicht. Innen zählt das Navigationsgitter der Etage,
 * im Erdgeschoss ist außen alles frei (leere Fläche), die Fassade lässt nur den Eingang durch.
 */
export function walkable(floorId: string, x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  const nav = getNav(floorId)
  if (getFloor(floorId).config.level !== 0) return !nav.isBlocked(x, z)
  if (Math.hypot(x, z) > WORLD_LIMIT) return false
  if (Math.abs(x) < ENTRANCE_HALF && z > HALF_D - 1.2 && z < HALF_D + 1.4) return true
  if (Math.abs(x) < HALF_W && Math.abs(z) < HALF_D) return !nav.isBlocked(x, z)
  return !(Math.abs(x) < HALF_W + 0.5 && Math.abs(z) < HALF_D + 0.5)
}

/**
 * Nächster begehbarer Punkt zu (x, z). Rettet einen Spieler, der in Möbeln, Wänden oder außerhalb der Welt steht
 * (oder dessen Position ungültig ist). Fällt im Notfall auf den Aufzugsausgang der Etage zurück.
 */
export function unstick(floorId: string, x: number, z: number): { x: number; z: number } {
  if (Number.isFinite(x) && Number.isFinite(z) && walkable(floorId, x, z)) return { x, z }
  const f = getFloor(floorId)
  const cx = Number.isFinite(x) ? x : f.elevatorExit.x
  const cz = Number.isFinite(z) ? z : f.elevatorExit.z
  for (let r = 0.25; r <= 12; r += 0.25) {
    const n = Math.max(8, Math.round(r * 16))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r
      if (walkable(floorId, px, pz)) return { x: px, z: pz }
    }
  }
  return { x: f.elevatorExit.x, z: f.elevatorExit.z }
}
