// Spielerphysik für den Rundgang. Reine Funktionen, unabhängig von React und Three.js.

import { COLLIDERS, groundAt, levelOfHeight, resolveCollisions, solidAt, type Collider } from '../config/walkWorld'

export interface PlayerState {
  x: number
  y: number
  z: number
  /** Blickrichtung der Figur (0 = +z) */
  yaw: number
  vx: number
  vz: number
  vy: number
  moving: boolean
  running: boolean
  level: number
  /** trägt gerade eine Rolltreppe */
  carried: boolean
}

export const WALK_SPEED = 2.6
export const RUN_SPEED = 4.6
const ACCEL = 14

export const spawnPlayer = (): PlayerState => ({ x: 0, y: 0, z: 1.8, yaw: Math.PI, vx: 0, vz: 0, vy: 0, moving: false, running: false, level: 0, carried: false })

const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a))

/** Ein Schritt. (dirX, dirZ) ist die gewünschte Bewegungsrichtung in Weltkoordinaten (Betrag 0 bis 1). */
export function stepPlayer(p: PlayerState, dirX: number, dirZ: number, run: boolean, dt: number, colliders: readonly Collider[] = COLLIDERS): void {
  const mag = Math.hypot(dirX, dirZ)
  const speed = run ? RUN_SPEED : WALK_SPEED
  const tx = mag > 0.01 ? (dirX / Math.max(mag, 1)) * speed : 0
  const tz = mag > 0.01 ? (dirZ / Math.max(mag, 1)) * speed : 0
  const k = Math.min(1, ACCEL * dt)
  p.vx += (tx - p.vx) * k
  p.vz += (tz - p.vz) * k
  p.moving = Math.hypot(p.vx, p.vz) > 0.2
  p.running = run && p.moving

  const g0 = groundAt(p.x, p.z, p.y)
  p.carried = g0.carry[0] !== 0 || g0.carry[1] !== 0
  const nx = p.x + (p.vx + g0.carry[0]) * dt
  const nz = p.z + (p.vz + g0.carry[1]) * dt
  let [rx, rz] = resolveCollisions(nx, nz, p.y, colliders)
  if (solidAt(rx, rz, p.y)) {
    // Massive Stufen oder Tragwerk: erst nur in x, dann nur in z versuchen, sonst stehen bleiben
    if (!solidAt(rx, p.z, p.y)) rz = p.z
    else if (!solidAt(p.x, rz, p.y)) rx = p.x
    else {
      rx = p.x
      rz = p.z
    }
  }
  p.x = rx
  p.z = rz

  const g = groundAt(p.x, p.z, p.y)
  const diff = g.y - p.y
  if (diff >= 0 || diff > -0.45) {
    // Rampe oder Stufe: der Höhe folgen
    p.y += diff * Math.min(1, 22 * dt)
    p.vy = 0
  } else {
    // Fallen (z. B. über eine Kante)
    p.vy = Math.min(p.vy + 22 * dt, 12)
    p.y = Math.max(g.y, p.y - p.vy * dt)
  }
  if (p.moving) p.yaw += angleDiff(p.yaw, Math.atan2(p.vx, p.vz)) * Math.min(1, 12 * dt)
  p.level = levelOfHeight(p.y)
}
