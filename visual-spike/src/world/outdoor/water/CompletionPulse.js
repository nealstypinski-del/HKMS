// Abschlusspuls: Lichtpuls wandert den letzten Kaskadenabschnitt hinab, läuft ins Ergebnisbecken und erzeugt eine Welle.
// Mehrere Abschlüsse werden gebündelt (kein Partikelfeuerwerk). Rein visuell, ohne Geschäftslogik.
import { CASCADE, CASCADE_STAGES } from '../config/bergpark.config.js'

export const CATEGORY_COLORS = {
  workflow: [0.35, 1.0, 0.85],
  job: [1.0, 0.8, 0.35],
  content: [0.75, 0.6, 1.0],
  dev: [0.4, 0.7, 1.0],
  default: [0.7, 1.0, 0.95],
}

const MAX_PULSES = 8
const MAX_RIPPLES = 4
const START_V = (CASCADE.length / CASCADE_STAGES.length) * 4 // Beginn der Freigabestufe
const END_V = CASCADE.length + 3
const SPEED = 9
const BATCH_WINDOW = 0.7 // Sekunden

export const pulseState = {
  pending: [],
  pulses: Array.from({ length: MAX_PULSES }, () => ({ active: false, v: 0, strength: 0, color: [1, 1, 1], count: 0 })),
  ripples: Array.from({ length: MAX_RIPPLES }, () => ({ t0: -100, s: 0 })),
  poolGlow: 0,
  lastLaunch: -100,
  completed: 0,
  // Uniform Puffer
  uPulse: new Float32Array(MAX_PULSES * 4),
  uPulseCol: new Float32Array(MAX_PULSES * 3),
  uRipple: new Float32Array(MAX_RIPPLES * 2),
}

const now = () => performance.now() / 1000
export const worldTime = now

// Öffentliche Schnittstelle: ein Abschluss meldet sich an. category: 'workflow' | 'job' | 'content' | 'dev' | beliebig
export function triggerCompletionPulse(taskId, category = 'default') {
  pulseState.pending.push({ taskId, category, t: now() })
  pulseState.completed++
}

export function stepCompletionPulses(dt, maxPulses = MAX_PULSES) {
  const S = pulseState
  const t = now()
  // Bündeln: wartende Abschlüsse innerhalb des Zeitfensters werden zu EINEM Puls
  if (S.pending.length && (t - S.lastLaunch > BATCH_WINDOW) && (t - S.pending[0].t > 0.25 || S.pending.length >= 4)) {
    const batch = S.pending.splice(0, S.pending.length)
    const slot = S.pulses.findIndex((p, i) => !p.active && i < maxPulses) >= 0
      ? S.pulses.findIndex((p, i) => !p.active && i < maxPulses)
      : 0
    const first = batch[0]
    S.pulses[slot] = {
      active: true,
      v: START_V,
      strength: Math.min(1, 0.55 + 0.15 * batch.length),
      color: CATEGORY_COLORS[first.category] || CATEGORY_COLORS.default,
      count: batch.length,
    }
    S.lastLaunch = t
  }
  for (const p of S.pulses) {
    if (!p.active) continue
    p.v += SPEED * dt
    if (p.v >= END_V) {
      p.active = false
      const r = S.ripples.reduce((a, b) => (a.t0 < b.t0 ? a : b))
      r.t0 = t
      r.s = Math.min(1, 0.6 + 0.1 * p.count)
      S.poolGlow = Math.min(1, S.poolGlow + 0.5 * p.strength)
    }
  }
  S.poolGlow *= Math.exp(-dt * 0.7)
  // Uniform Puffer schreiben
  S.pulses.forEach((p, i) => {
    S.uPulse[i * 4] = p.v
    S.uPulse[i * 4 + 1] = p.active ? p.strength : 0
    S.uPulse[i * 4 + 2] = 2.2
    S.uPulseCol[i * 3] = p.color[0]
    S.uPulseCol[i * 3 + 1] = p.color[1]
    S.uPulseCol[i * 3 + 2] = p.color[2]
  })
  S.ripples.forEach((r, i) => {
    S.uRipple[i * 2] = r.t0
    S.uRipple[i * 2 + 1] = r.s
  })
}
