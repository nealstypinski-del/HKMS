/**
 * Gangzyklus als reine Funktion. phase in Radiant (wächst mit der zurückgelegten Strecke).
 * Alle Winkel um die x Achse, Vorzeichen wie in three.js (negativ = nach vorn schwingen bei Oberschenkeln).
 */
export interface GaitAngles {
  thighL: number; thighR: number
  shinL: number; shinR: number
  armL: number; armR: number
  /** Körperhöhe relativ zur Stehhöhe (m) */
  bob: number
  /** Neigung nach vorn (rad) */
  lean: number
}

export function gait(phase: number, amount = 1): GaitAngles {
  const s = Math.sin(phase)
  const swing = s * 0.75 * amount
  return {
    thighL: swing,
    thighR: -swing,
    // Kniebeugung im Schwungbein
    shinL: Math.max(0, -Math.sin(phase)) * 0.9 * amount,
    shinR: Math.max(0, Math.sin(phase)) * 0.9 * amount,
    // Arme gegengleich zu den Beinen
    armL: -swing * 0.9,
    armR: swing * 0.9,
    bob: Math.abs(s) * 0.03 * amount,
    lean: 0.06 * amount,
  }
}

/** Nächstgelegene diskrete Pose (0..frames-1) für vorberechnete Geometrien. */
export function gaitFrame(phase: number, frames: number): number {
  const t = ((phase / (Math.PI * 2)) % 1 + 1) % 1
  return Math.round(t * frames) % frames
}

/** Phase eines Rahmens. Rahmen 0 ist der Durchgang, bei frames/4 liegt das Extrem. */
export const framePhase = (frame: number, frames: number) => (frame / frames) * Math.PI * 2

/** Anzahl vorberechneter Gehposen für ferne Figuren. */
export const WALK_FRAMES = 8

/** Diagnosezähler für Tests und das Entwickler Overlay. */
export const animStats = { midSwaps: 0, fullLegSamples: [] as number[] }
