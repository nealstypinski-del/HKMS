// Gehzyklus über die zurückgelegte Strecke (nicht über die Zeit). Dadurch stehen die Füße nie "gleitend" still:
// wer sich nicht bewegt, läuft nicht, wer schneller geht, macht schnellere Schritte.
// Vorzeichen: negative x Rotation = Glied nach vorn (wie bei der sitzenden Pose).

/** Strecke pro Schritt (Halbzyklus) in Metern */
export const STRIDE = 0.7

export interface GaitPose {
  hipL: number
  hipR: number
  kneeL: number
  kneeR: number
  armL: number
  armR: number
  /** Drehung des Beckens um die Hochachse */
  pelvisYaw: number
  /** Gegendrehung der Schultern */
  shoulderYaw: number
  /** Höhenversatz des Körpers in Metern */
  bob: number
  /** Vorneigung des Oberkörpers */
  lean: number
}

/** Phase nach einem Schritt der Länge `distance` (Meter). Ein voller Zyklus sind zwei Schritte. */
export const advancePhase = (phase: number, distance: number): number => (phase + (distance / STRIDE) * Math.PI) % (Math.PI * 2)

/** `amount` 0 = stehen, 1 = gehen. `run` verstärkt die Schwünge. */
export function gaitPose(phase: number, amount: number, run = false): GaitPose {
  const a = Math.max(0, Math.min(1, amount))
  const hip = (run ? 0.95 : 0.62) * a
  const knee = (run ? 1.25 : 0.85) * a
  const arm = (run ? 1.0 : 0.55) * a
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  return {
    hipL: -hip * s,
    hipR: hip * s,
    kneeL: Math.max(0, c) * knee,
    kneeR: Math.max(0, -c) * knee,
    armL: arm * s,
    armR: -arm * s,
    pelvisYaw: 0.14 * s * a,
    shoulderYaw: -0.18 * s * a,
    bob: (1 - Math.abs(s)) * (run ? 0.07 : 0.045) * a,
    lean: (run ? 0.16 : 0.05) * a,
  }
}
