// Vertrag zwischen Geschäftszustand und Wasserdarstellung.
// Die Umgebung kennt NUR diese Struktur (kein Claude, kein Codex, kein Gmail, keine Kalender, keine Zugangsdaten).
//
// Dokumentierte Abbildung (Stand Loop 1, alles MOCK):
//   activityLevel        -> globale Wasserhelligkeit und Fließgeschwindigkeit
//   stages[x].activity   -> Helligkeit und Fließgeschwindigkeit dieser Stufe
//   stages[x].status     -> 'blocked' färbt Marker und Wasser der Stufe warm gelb und bremst den Fluss ('idle' dimmt den Marker)
//   stages[x].queued     -> nur Information für Marker, keine eigene Grafik
// Es werden keine weiteren Werte abgebildet. Das Wasser zeigt derzeit KEINE echten Kennzahlen.
import { CASCADE_STAGES } from '../config/bergpark.config.js'

export const STAGE_KEYS = CASCADE_STAGES.map((s) => s.key)

/** @returns {import('../types/outdoor.types.js').CascadeVisualizationState} */
export function createDefaultCascadeState() {
  const stages = {}
  for (const k of STAGE_KEYS) stages[k] = { activity: 0.6, status: 'normal', queued: 0 }
  return { activityLevel: 0.6, stages }
}

let state = createDefaultCascadeState()
const listeners = new Set()

export const getCascadeState = () => state
export const subscribeCascadeState = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

// Von außen (später echte Daten, jetzt Mock) setzen. Teilzustände sind erlaubt.
export function setCascadeVisualizationState(partial) {
  state = {
    ...state,
    ...partial,
    stages: Object.fromEntries(STAGE_KEYS.map((k) => [k, { ...state.stages[k], ...(partial?.stages?.[k] || {}) }])),
  }
  listeners.forEach((f) => f(state))
}

// Weich nachgeführte Laufzeitwerte für Shader und Marker (vom CascadeStateDriver pro Frame aktualisiert)
export const cascadeRuntime = {
  activity: 0.6,
  stageAct: new Float32Array(6).fill(0.6),
  stageBlocked: new Float32Array(6),
  stageIdle: new Float32Array(6),
}

export function stepCascadeRuntime(dt) {
  const k = 1 - Math.exp(-dt * 2.2)
  cascadeRuntime.activity += (state.activityLevel - cascadeRuntime.activity) * k
  STAGE_KEYS.forEach((key, i) => {
    const s = state.stages[key]
    cascadeRuntime.stageAct[i] += (s.activity - cascadeRuntime.stageAct[i]) * k
    cascadeRuntime.stageBlocked[i] += ((s.status === 'blocked' ? 1 : 0) - cascadeRuntime.stageBlocked[i]) * k
    cascadeRuntime.stageIdle[i] += ((s.status === 'idle' ? 1 : 0) - cascadeRuntime.stageIdle[i]) * k
  })
}
