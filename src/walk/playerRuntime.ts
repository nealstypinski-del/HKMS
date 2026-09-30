import { spawnPlayer, type PlayerState } from './playerPhysics'

/** Laufzeitzustand des Spielers (nicht reaktiv, wird pro Frame gelesen). */
export const player: PlayerState = spawnPlayer()

export const walkCamera = { yaw: 0, pitch: 0.3, dist: 5.5 }

export function resetPlayer(): void {
  Object.assign(player, spawnPlayer())
  walkCamera.yaw = 0
  walkCamera.pitch = 0.3
  walkCamera.dist = 5.5
}

/** Messwerte der Gelenke für Tests im Browser. */
export const poseProbe = { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, phase: 0 }
