import { FLOOR_H, SLAB_H } from './constants'
import type { Rect, Vec2 } from './types'

/**
 * Vertikale Verbindungen zwischen Etagen. Eine Treppe (Spieler steigt selbst) und zwei Rolltreppen (fahren automatisch).
 * Alle Angaben in Weltkoordinaten. Die Steigung läuft entlang der x Achse.
 */
export type ConnectorKind = 'stairs' | 'escalatorUp' | 'escalatorDown'

export interface Connector {
  id: string
  kind: ConnectorKind
  lower: string
  upper: string
  /** Grundfläche. Auf beiden Etagen blockiert (unten der Aufbau, oben die Deckenöffnung). */
  lane: Rect
  /** x am unteren und oberen Ende der Steigung. */
  xLow: number
  xHigh: number
  /** Einstieg unten: Rechteck vor dem unteren Ende. */
  lowerBoard: Rect | null
  /** Einstieg oben (nur bei Wegen nach unten). */
  upperBoard: Rect | null
  lowerExit: Vec2
  upperExit: Vec2
  /** Rolltreppe: feste Richtung. Treppe: null, der Spieler bestimmt die Richtung. */
  auto: 'up' | 'down' | null
}

export const STEP_RISE = FLOOR_H // Höhenunterschied zwischen zwei Etagen (Oberkante Boden zu Oberkante Boden)
export const connectors: Connector[] = [
  {
    id: 'stairs-0-1', kind: 'stairs', lower: 'floor-lobby', upper: 'floor-shared',
    lane: { x0: -22, x1: -14.7, z0: -2.9, z1: -0.7 }, xLow: -14.7, xHigh: -22,
    lowerBoard: { x0: -14.7, x1: -14.0, z0: -2.7, z1: -0.9 }, upperBoard: { x0: -21.9, x1: -20.4, z0: -0.95, z1: -0.28 },
    lowerExit: { x: -13.3, z: -1.8 }, upperExit: { x: -21.1, z: 0.35 }, auto: null,
  },
  {
    id: 'escalator-up-0-1', kind: 'escalatorUp', lower: 'floor-lobby', upper: 'floor-shared',
    lane: { x0: 14.7, x1: 22, z0: -2.7, z1: -1.6 }, xLow: 14.7, xHigh: 22,
    lowerBoard: { x0: 14.0, x1: 14.7, z0: -2.6, z1: -1.7 }, upperBoard: null,
    lowerExit: { x: 13.3, z: -2.15 }, upperExit: { x: 21.2, z: 0.75 }, auto: 'up',
  },
  {
    id: 'escalator-down-1-0', kind: 'escalatorDown', lower: 'floor-lobby', upper: 'floor-shared',
    lane: { x0: 14.7, x1: 22, z0: -1.4, z1: -0.3 }, xLow: 14.7, xHigh: 22,
    lowerBoard: null, upperBoard: { x0: 20.4, x1: 21.9, z0: -0.4, z1: 0.12 },
    lowerExit: { x: 13.3, z: -0.85 }, upperExit: { x: 21.2, z: 0.75 }, auto: 'down',
  },
]

export const connectorsOn = (floorId: string) => connectors.filter((c) => c.lower === floorId || c.upper === floorId)
export const laneLength = (c: Connector) => Math.abs(c.xHigh - c.xLow)
export const laneCenterZ = (c: Connector) => (c.lane.z0 + c.lane.z1) / 2
export const heightAt = (t: number) => t * STEP_RISE
/** x Position entlang der Steigung für 0 <= t <= 1 */
export const xAt = (c: Connector, t: number) => c.xLow + (c.xHigh - c.xLow) * t
export const inRect = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1

/** Deckenöffnungen der oberen Etage (für die Bodenplatte). */
export const slabHoles = (floorId: string): Rect[] => {
  const holes: Rect[] = []
  const stairsLanes = connectors.filter((c) => c.upper === floorId)
  for (const c of stairsLanes) holes.push(c.lane)
  return holes
}

/** Sperrflächen für das Navigationsgitter einer Etage. */
export const blockedRects = (floorId: string): Rect[] => connectorsOn(floorId).map((c) => c.lane)

export const SLAB_TOP = SLAB_H

export interface Ride {
  id: string
  /** 0 = unten, 1 = oben */
  t: number
}

export interface PlayerLike { x: number; z: number; floorId: string; dy: number; ride: Ride | null }

/** Beginnt eine Fahrt, wenn der Spieler in die Einstiegszone läuft und sich in Richtung Steigung bewegt. */
export function tryBoard(p: PlayerLike, nx: number, nz: number, dirX: number, dirZ: number): Connector | null {
  for (const c of connectorsOn(p.floorId)) {
    const ascending = Math.sign(c.xHigh - c.xLow)
    if (p.floorId === c.lower && c.lowerBoard && inRect(c.lowerBoard, nx, nz)) {
      // muss sich in Aufwärtsrichtung bewegen (Treppe) bzw. auf die Rolltreppe zulaufen
      if (dirX * ascending > 0.2) { p.ride = { id: c.id, t: 0 }; return c }
    }
    if (p.floorId === c.upper && c.upperBoard && inRect(c.upperBoard, nx, nz)) {
      if (dirZ < -0.2) { p.ride = { id: c.id, t: 1 }; return c }
    }
  }
  return null
}

export const SPEEDS = { stairs: 2.3, escalator: 0.85 }

/**
 * Bewegt eine laufende Fahrt weiter. Rückgabe: Ziel, wenn der Spieler die Etage wechselt.
 * axisInput: Bewegungswunsch entlang der x Achse (Welt), -1..1.
 */
export function stepRide(p: PlayerLike, dt: number, axisInput: number): { floor: string; pos: Vec2 } | null {
  const r = p.ride
  if (!r) return null
  const c = connectors.find((k) => k.id === r.id)!
  const L = laneLength(c)
  const ascending = Math.sign(c.xHigh - c.xLow)
  let dt_ = 0
  if (c.auto === 'up') dt_ = SPEEDS.escalator + Math.max(0, axisInput * ascending) * 0.5
  else if (c.auto === 'down') dt_ = -SPEEDS.escalator
  else dt_ = axisInput * ascending * SPEEDS.stairs
  r.t += (dt_ * dt) / L
  if (r.t >= 1) { p.ride = null; p.dy = 0; return { floor: c.upper, pos: c.upperExit } }
  if (r.t <= 0) { p.ride = null; p.dy = 0; return { floor: c.lower, pos: c.lowerExit } }
  p.x = xAt(c, r.t)
  p.z = Math.max(c.lane.z0 + 0.35, Math.min(c.lane.z1 - 0.35, p.z))
  if (c.lane.z1 - c.lane.z0 < 1.3) p.z = laneCenterZ(c)
  p.dy = heightAt(r.t)
  return null
}
