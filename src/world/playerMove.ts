import { angleDiff } from './angles'
import { connectors, SPEEDS, stepRide, tryBoard, type Ride } from './connectors'
import { unstick, walkable } from './walk'

/**
 * Spielerbewegung für Dritte Person und Ego: Kollision, Treppe, Rolltreppe, Rettung aus gesperrten Feldern.
 * Eine Aufgabe: aus Eingabe und Zustand die nächste Spielerposition berechnen. Kennt weder Kamera noch Store,
 * deshalb ist sie mit Fuzzing testbar.
 */
export interface MovingPlayer {
  x: number
  z: number
  yaw: number
  walkClock: number
  walking: boolean
  floorId: string
  dy: number
  ride: Ride | null
}

export interface MoveHooks {
  switchFloor(id: string): void
  setClimbing(b: boolean): void
  isClimbing(): boolean
}

export const RUN = 5.0
export const WALK = 2.7
const num = (v: number) => (Number.isFinite(v) ? v : 0)

export function movePlayerStep(
  p: MovingPlayer, floorId: string, dtRaw: number, dirXRaw: number, dirZRaw: number, run: boolean, faceMove: boolean, hooks: MoveHooks,
): void {
  // Ungültige Zeitschritte und Eingaben (NaN, negativ, riesig) werden neutralisiert.
  const dt = Math.min(Math.max(num(dtRaw), 0), 0.1)
  const dirX = num(dirXRaw), dirZ = num(dirZRaw)

  // Fahrt auf Treppe oder Rolltreppe
  if (p.ride) {
    if (!hooks.isClimbing()) hooks.setClimbing(true) // nach Ansichtswechsel wieder beide Etagen zeichnen
    const res = stepRide(p, dt, dirX)
    const c = connectors.find((k) => k.id === p.ride?.id)
    // Auf der Treppe steigt die Figur mit Beinbewegung, auf der Rolltreppe steht sie
    const climbing = c?.kind === 'stairs' && Math.abs(dirX) > 0.05
    p.walking = climbing
    if (climbing) p.walkClock += Math.abs(dirX) * SPEEDS.stairs * dt * 3.2
    if (c) {
      const travel = Math.sign(c.xHigh - c.xLow) * (c.auto === 'down' ? -1 : 1)
      p.yaw += angleDiff(p.yaw, Math.atan2(travel, 0)) * Math.min(1, 6 * dt)
    }
    if (res) {
      p.floorId = res.floor
      p.x = res.pos.x; p.z = res.pos.z; p.dy = 0
      hooks.switchFloor(res.floor)
      hooks.setClimbing(false)
    }
    return
  }

  // Steht die Figur in einem gesperrten Feld oder außerhalb der Welt oder hat eine ungültige Position, wird sie gerettet.
  if (!walkable(floorId, p.x, p.z)) { const u = unstick(floorId, p.x, p.z); p.x = u.x; p.z = u.z }

  const len = Math.hypot(dirX, dirZ)
  if (len < 1e-3) { p.walking = false; return }
  const ux = dirX / len, uz = dirZ / len
  const speed = (run ? RUN : WALK) * dt * Math.min(1, len)
  const dx = ux * speed, dz = uz * speed

  // Einstieg auf Treppe oder Rolltreppe
  const boarded = tryBoard(p, p.x + dx, p.z + dz, ux, uz)
  if (boarded) {
    if (p.floorId !== boarded.lower) { p.floorId = boarded.lower; hooks.switchFloor(boarded.lower) }
    hooks.setClimbing(true)
    p.walking = false
    p.x = boarded.xLow + (boarded.xHigh - boarded.xLow) * p.ride!.t
    return
  }

  // Achsen getrennt prüfen, damit man an Wänden entlanggleitet statt hängen zu bleiben
  if (walkable(floorId, p.x + dx, p.z)) p.x += dx
  if (walkable(floorId, p.x, p.z + dz)) p.z += dz
  p.walking = true
  p.walkClock += speed * 3.2
  if (faceMove) p.yaw += angleDiff(p.yaw, Math.atan2(ux, uz)) * Math.min(1, 12 * dt)
}
