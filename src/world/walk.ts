import { HALF_D, HALF_W } from './constants'
import { getFloor } from './generate'
import { getNav } from './nav'

/** Halbe Breite der Eingangsöffnung in der Glasfassade des Erdgeschosses. */
export const ENTRANCE_HALF = 2.4

export const isOutside = (x: number, z: number) => Math.abs(x) > HALF_W || Math.abs(z) > HALF_D

/**
 * Begehbarkeit für den Spieler in Ego Ansicht. Innen zählt das Navigationsgitter der Etage,
 * im Erdgeschoss ist außen alles frei (leere Fläche), die Fassade lässt nur den Eingang durch.
 */
export function walkable(floorId: string, x: number, z: number): boolean {
  const nav = getNav(floorId)
  if (getFloor(floorId).config.level !== 0) return !nav.isBlocked(x, z)
  if (Math.abs(x) < ENTRANCE_HALF && z > HALF_D - 1.2 && z < HALF_D + 1.4) return true
  if (Math.abs(x) < HALF_W && Math.abs(z) < HALF_D) return !nav.isBlocked(x, z)
  return !(Math.abs(x) < HALF_W + 0.5 && Math.abs(z) < HALF_D + 0.5)
}
