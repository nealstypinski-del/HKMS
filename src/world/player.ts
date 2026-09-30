import type { Ride } from './connectors'

/** Veränderlicher Laufzeitzustand des Spielers. Reine Sicht, kein Geschäftszustand. */
export const player = {
  // Start: draußen vor dem Eingang, Blick auf die Fassade
  x: 0,
  z: 26,
  yaw: Math.PI,
  walkClock: 0,
  walking: false,
  floorId: 'floor-lobby',
  /** Nächster Etagenwechsel setzt den Spieler nicht an den Aufzug (z. B. Betreten von außen, Treppe). */
  skipSpawn: false,
  /** Höhe über dem Boden der aktuellen Etage (Treppe, Rolltreppe). */
  dy: 0,
  ride: null as Ride | null,
}
