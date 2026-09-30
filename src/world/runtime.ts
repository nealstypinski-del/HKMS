// Flüchtiger Laufzeitzustand der 3D Welt (nicht reaktiv, nicht persistiert).
// Wird nur in useFrame gelesen und geschrieben, damit React nicht pro Frame rendert.

import { FLOORS } from '../config/office.config'

export interface LiveCharacter {
  x: number
  y: number
  z: number
  floor: number
  visible: boolean
}

/** Aktuelle Weltposition jeder Figur (für Kamera Fokus und Hover). */
export const characterRegistry = new Map<string, LiveCharacter>()
/** Sitzt gerade jemand am Arbeitsplatz? Der Monitor aktiviert sich erst dann. */
export const deskOccupancy = new Map<string, boolean>()
/** Anhebung ausgeblendeter Etagen, 0 = an Ort und Stelle. */
export const floorLift: number[] = FLOORS.map(() => 0)
/** Höhe der Aufzugskabine. */
export const elevatorCar = { y: 0 }

export const LIFT_DISTANCE = 7
