// Client für die lokale Whoop-MCP-Bridge (server/whoop-bridge.mjs).
// Die Normalisierer akzeptieren sowohl das WHOOP-API-v1-Format (records[].score…)
// als auch flache Felder, weil die Tool-Ausgabe je nach whoop-ai-mcp-Version variiert.

const get = (o, ...paths) => {
  for (const p of paths) {
    const v = p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}
const records = (raw) => (Array.isArray(raw) ? raw : raw?.records ?? raw?.data ?? raw?.items ?? (raw && typeof raw === 'object' && !raw.text ? [raw] : []))
const num = (v) => (v == null || isNaN(Number(v)) ? undefined : Number(v))
const h = (ms) => (num(ms) ?? 0) / 36e5

export function normalizeRecovery(raw) {
  const r = records(raw)[0]
  if (!r) return null
  return {
    score: num(get(r, 'score.recovery_score', 'recovery_score', 'recovery')),
    hrv: num(get(r, 'score.hrv_rmssd_milli', 'hrv_rmssd_milli', 'hrv', 'hrv_ms')),
    rhr: num(get(r, 'score.resting_heart_rate', 'resting_heart_rate', 'rhr')),
    spo2: num(get(r, 'score.spo2_percentage', 'spo2_percentage', 'spo2')),
    skinTemp: num(get(r, 'score.skin_temp_celsius', 'skin_temp_celsius')),
    at: get(r, 'created_at', 'updated_at', 'date'),
  }
}
/** Mehrere Recovery-Records -> HRV-Verlauf (älteste zuerst). */
export const normalizeHrvSeries = (raw) =>
  records(raw).map((r) => num(get(r, 'score.hrv_rmssd_milli', 'hrv_rmssd_milli', 'hrv'))).filter((v) => v != null).reverse()

const localDay = (iso) => { const d = new Date(iso); return isNaN(d) ? undefined : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Recovery-Verlauf mit Datum (für die Historie). */
export const normalizeRecoveryHistory = (raw) => records(raw).map((r) => ({
  date: localDay(get(r, 'created_at', 'updated_at', 'date')),
  score: num(get(r, 'score.recovery_score', 'recovery_score', 'recovery')),
  hrv: num(get(r, 'score.hrv_rmssd_milli', 'hrv_rmssd_milli', 'hrv', 'hrv_ms')),
  rhr: num(get(r, 'score.resting_heart_rate', 'resting_heart_rate', 'rhr')),
})).filter((r) => r.date)

export function normalizeSleep(raw, keep = 7) {
  const nights = records(raw)
    .filter((r) => !r.nap)
    .map((r) => {
      const st = get(r, 'score.stage_summary', 'stage_summary') || {}
      const deep = h(get(st, 'total_slow_wave_sleep_time_milli') ?? get(r, 'deep_ms'))
      const rem = h(get(st, 'total_rem_sleep_time_milli') ?? get(r, 'rem_ms'))
      const light = h(get(st, 'total_light_sleep_time_milli') ?? get(r, 'light_ms'))
      const date = get(r, 'end', 'start', 'date', 'created_at')
      return {
        date, deep, rem, light, total: deep + rem + light,
        performance: num(get(r, 'score.sleep_performance_percentage', 'sleep_performance_percentage')),
        resp: num(get(r, 'score.respiratory_rate', 'respiratory_rate')),
      }
    })
    .filter((n) => n.total > 0)
    .reverse() // API liefert neueste zuerst
  return nights.slice(-keep)
}

/** Schlaf-Verlauf mit Aufwach-Datum. */
export const normalizeSleepHistory = (raw) => normalizeSleep(raw, 400).map((n) => ({ ...n, date: localDay(n.date) })).filter((n) => n.date)

export function normalizeWorkouts(raw) {
  return records(raw).map((w) => {
    const sport = String(get(w, 'sport_name', 'sport', 'name', 'activity') ?? 'Workout')
    const start = get(w, 'start', 'start_time')
    const end = get(w, 'end', 'end_time')
    const minutes = start && end ? Math.round((new Date(end) - new Date(start)) / 6e4) : num(get(w, 'duration_min')) ?? 0
    return {
      id: String(get(w, 'id', 'workout_id') ?? `${sport}:${start}`),
      sport, start, minutes,
      strain: num(get(w, 'score.strain', 'strain')),
      avgHr: num(get(w, 'score.average_heart_rate', 'average_heart_rate')),
      kcal: Math.round((num(get(w, 'score.kilojoule', 'kilojoule')) ?? 0) / 4.184) || num(get(w, 'calories')),
    }
  })
}

/** XP-Regel für erkannte Whoop-Workouts. */
export function workoutXp(w) {
  const s = w.sport.toLowerCase()
  if (/cross|functional|hiit|weight|strength|kraft/.test(s)) return { xp: 400, kind: 'crossfit' }
  if (/walk|geh|wander|hik|run|lauf/.test(s)) return { xp: Math.max(50, Math.round(w.minutes * 3)), kind: 'walk' }
  if (/swim|schwimm/.test(s)) return { xp: 250, kind: 'swim' }
  return { xp: Math.max(25, Math.round(w.minutes * 2)), kind: 'other' }
}

async function api(path) {
  const res = await fetch(`/api/whoop/${path}`, { headers: { Accept: 'application/json' } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

export const whoopApi = {
  status: () => api('status'),
  recovery: (limit = 7) => api(`recovery?limit=${limit}`),
  sleep: (limit = 8) => api(`sleep?limit=${limit}`),
  workouts: (limit = 10) => api(`workouts?limit=${limit}`),
  recoveryHistory: (days = 90) => api(`recovery?days=${days}`),
  sleepHistory: (days = 90) => api(`sleep?days=${days}`),
  workoutsHistory: (days = 30) => api(`workouts?days=${days}`),
}
