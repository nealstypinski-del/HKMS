// Parser für das JSON von „Health Auto Export“ (REST-API-Automation).
// Erwartet { data: { metrics: [{ name, units, data: [{ date, qty, ... }] }] } }.
// Ergebnis: { 'YYYY-MM-DD': { steps?, activeKcal?, restingHr? } } – Tageswerte aus DIESER Lieferung.

const dayOf = (s) => String(s).slice(0, 10)
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : Number.isFinite(parseFloat(v)) ? parseFloat(v) : null)

export function parseHealthExport(body) {
  const metrics = body?.data?.metrics ?? body?.metrics
  if (!Array.isArray(metrics)) throw new Error('Kein "data.metrics"-Array im Body')
  const out = {}
  const day = (d) => (out[d] ??= {})
  for (const m of metrics) {
    const name = String(m?.name ?? '').toLowerCase()
    const rows = Array.isArray(m?.data) ? m.data : []
    if (name === 'step_count') {
      for (const r of rows) { const q = num(r.qty); if (q != null && r.date) { const d = day(dayOf(r.date)); d.steps = (d.steps ?? 0) + q } }
    } else if (name === 'active_energy' || name === 'active_energy_burned') {
      const kj = /kj|joule/i.test(m.units ?? '')
      for (const r of rows) { const q = num(r.qty); if (q != null && r.date) { const d = day(dayOf(r.date)); d.activeKcal = (d.activeKcal ?? 0) + (kj ? q / 4.184 : q) } }
    } else if (name === 'resting_heart_rate') {
      for (const r of rows) { const q = num(r.qty ?? r.Avg); if (q != null && r.date) day(dayOf(r.date)).restingHr = q }
    }
  }
  for (const d of Object.values(out)) {
    if (d.steps != null) d.steps = Math.round(d.steps)
    if (d.activeKcal != null) d.activeKcal = Math.round(d.activeKcal)
  }
  return out
}

/** Idempotent: Schritte/kcal nehmen nie ab (Teil-Lieferungen überschreiben volle Tage nicht). */
export function mergeHealth(existing = {}, incoming = {}, now = Date.now()) {
  const next = { ...existing }
  for (const [d, vals] of Object.entries(incoming)) {
    const cur = next[d] ?? {}
    const m = { ...cur }
    for (const k of ['steps', 'activeKcal']) if (vals[k] != null) m[k] = Math.max(cur[k] ?? 0, vals[k])
    if (vals.restingHr != null) m.restingHr = vals.restingHr
    m.updatedAt = now
    next[d] = m
  }
  // nur die letzten 120 Tage behalten
  const keys = Object.keys(next).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - 120))) delete next[k]
  return next
}
