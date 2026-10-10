import { useCallback, useEffect, useState } from 'react'
import {
  whoopApi, normalizeRecovery, normalizeHrvSeries, normalizeSleep, normalizeWorkouts,
} from '../mcp/whoopClient.js'

const EMPTY = { status: 'connecting', error: null, recovery: null, hrv: [], sleep: [], workouts: [], syncedAt: null, log: [] }

/**
 * Pollt die Whoop-MCP-Bridge:
 *   whoop_get_recovery -> Recovery, HRV, Ruhepuls, SpO2
 *   whoop_get_sleep    -> Schlafarchitektur (7 Nächte)
 *   whoop_get_workouts -> Workouts (-> XP im Aufrufer)
 * status: 'connecting' | 'connected' | 'offline'
 */
export function useWhoop(intervalMs = 5 * 60 * 1000) {
  const [data, setData] = useState(EMPTY)

  const sync = useCallback(async () => {
    const stamp = () => new Date().toLocaleTimeString('de-DE')
    const entries = []
    try {
      const st = await whoopApi.status()
      if (!st.connected) throw new Error(st.error || 'Bridge ohne MCP-Verbindung')
      const [rec, slp, wo] = await Promise.allSettled([whoopApi.recovery(7), whoopApi.sleep(8), whoopApi.workouts(10)])
      const next = {}
      if (rec.status === 'fulfilled') {
        next.recovery = normalizeRecovery(rec.value); next.hrv = normalizeHrvSeries(rec.value)
        entries.push({ tag: 'whoop_get_recovery', msg: next.recovery ? `Recovery ${next.recovery.score ?? '–'} % · HRV ${Math.round(next.recovery.hrv ?? 0)} ms` : 'keine Daten', ok: true })
      } else entries.push({ tag: 'whoop_get_recovery', msg: rec.reason.message, ok: false })
      if (slp.status === 'fulfilled') {
        next.sleep = normalizeSleep(slp.value)
        entries.push({ tag: 'whoop_get_sleep', msg: `${next.sleep.length} Nächte geladen`, ok: true })
      } else entries.push({ tag: 'whoop_get_sleep', msg: slp.reason.message, ok: false })
      if (wo.status === 'fulfilled') {
        next.workouts = normalizeWorkouts(wo.value)
        entries.push({ tag: 'whoop_get_workouts', msg: `${next.workouts.length} Workouts`, ok: true })
      } else entries.push({ tag: 'whoop_get_workouts', msg: wo.reason.message, ok: false })
      setData((d) => ({ ...d, ...next, status: 'connected', error: null, syncedAt: new Date(), log: [...entries.map((e) => ({ ...e, ts: stamp() })), ...d.log].slice(0, 6) }))
    } catch (e) {
      setData((d) => ({ ...d, status: 'offline', error: String(e.message || e), log: [{ ts: stamp(), tag: 'bridge', msg: String(e.message || e), ok: false }, ...d.log].slice(0, 6) }))
    }
  }, [])

  useEffect(() => {
    sync()
    const id = setInterval(sync, intervalMs)
    return () => clearInterval(id)
  }, [sync, intervalMs])

  return { ...data, sync }
}
