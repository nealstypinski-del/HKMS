// Historie: Tages-Snapshots, Streak, Badges. Reine Funktionen (getestet in history.test.js).
import { PROFILE } from './constants.js'
import { dayKey } from './calc.js'

export const GOALS = { steps: PROFILE.stepTarget, stepsStreak: PROFILE.stepTarget * 0.8, water: 5, sleepH: 7, kcal: PROFILE.kcalCeiling, protein: PROFILE.proteinMinG }

/** Schnappschuss des heutigen Tages (nur Werte, die wir wirklich haben). */
export function makeSnapshot({ daily, steps, weight, sleepH, bio, blocksDone }) {
  return {
    steps: Math.round(steps),
    kcal: Math.round(daily.kcal || 0),
    protein: Math.round(daily.protein || 0),
    carbs: Math.round(daily.carbs || 0),
    water: Math.round((daily.water || 0) * 100) / 100,
    weight: +weight.toFixed(1),
    sleepH: +sleepH.toFixed(2),
    recovery: bio?.score != null ? Math.round(bio.score) : undefined,
    hrv: bio?.hrv != null ? Math.round(bio.hrv) : undefined,
    rhr: bio?.rhr != null ? Math.round(bio.rhr) : undefined,
    blocksDone,
    blocksMissed: daily.missed.filter(Boolean).length,
    crossfit: !!daily.crossfit,
    joker: !!daily.joker,
    joint: daily.jointPain,
  }
}

/** Whoop-Rückfüllung: füllt nur fehlende Felder vergangener Tage (überschreibt keine Eingaben). */
export function mergeWhoopHistory(days, recHist = [], sleepHist = []) {
  const next = { ...days }
  const fill = (date, vals) => {
    const cur = { ...(next[date] ?? {}) }
    let changed = false
    for (const [k, v] of Object.entries(vals)) if (v != null && cur[k] == null) { cur[k] = v; changed = true }
    if (changed) next[date] = cur
  }
  for (const r of recHist) if (r.date) fill(r.date, { recovery: r.score != null ? Math.round(r.score) : undefined, hrv: r.hrv != null ? Math.round(r.hrv) : undefined, rhr: r.rhr != null ? Math.round(r.rhr) : undefined })
  for (const s of sleepHist) if (s.date) fill(s.date, { sleepH: +s.total.toFixed(2) })
  return prune(next)
}

export function prune(days, keep = 120) {
  const keys = Object.keys(days).sort()
  if (keys.length <= keep) return days
  const out = { ...days }
  for (const k of keys.slice(0, keys.length - keep)) delete out[k]
  return out
}

/** Letzte n Kalendertage (älteste zuerst); fehlende Tage = {}. */
export function lastNDays(days, n, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))
    const key = dayKey(d)
    return { date: key, d, ...(days[key] ?? {}) }
  })
}

// ── Streak: Tage in Folge mit ≥ 80 % der Schritte UND Intake ≤ 1.400 kcal (geloggt) ──
export const daySuccess = (s) => !!s && (s.steps ?? 0) >= GOALS.stepsStreak && (s.kcal ?? 0) > 0 && s.kcal <= GOALS.kcal

/** Aktueller Streak; läuft der heutige Tag noch, zählt er nur, wenn er schon erfolgreich ist (bricht den Streak nicht). */
export function streak(days, now = new Date()) {
  let n = 0
  for (let i = 0; i < 400; i++) {
    const key = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
    if (daySuccess(days[key])) n++
    else if (i === 0) continue
    else break
  }
  return n
}

export const BADGES = [
  { id: 'steps30k', label: '30k Schritte', hint: '≥ 30.000 Schritte an einem Tag', test: (s) => (s.steps ?? 0) >= GOALS.steps },
  { id: 'allBlocks', label: 'Alle Blöcke', hint: 'Alle 3 Bewegungs-Blöcke erledigt', test: (s) => (s.blocksDone ?? 0) >= 3 },
  { id: 'hydration', label: 'Hydration', hint: `≥ ${GOALS.water} Liter Wasser`, test: (s) => (s.water ?? 0) >= GOALS.water },
  { id: 'sleep7', label: 'Schlaf 7+', hint: `≥ ${GOALS.sleepH} Std Schlaf`, test: (s) => (s.sleepH ?? 0) >= GOALS.sleepH },
  { id: 'macros', label: 'Makro-Treffer', hint: `≤ ${GOALS.kcal} kcal und ≥ ${GOALS.protein} g Protein`, test: (s) => (s.kcal ?? 0) > 0 && s.kcal <= GOALS.kcal && (s.protein ?? 0) >= GOALS.protein },
  { id: 'ironRaid', label: 'Iron Raid', hint: 'CrossFit absolviert', test: (s) => !!s.crossfit },
]
export const STREAK_BADGES = [3, 7, 14, 30]

export const badgesOf = (snap) => BADGES.filter((b) => snap && b.test(snap)).map((b) => b.id)

/** Wie oft jedes Badge in der Historie erreicht wurde. */
export function badgeCounts(days) {
  const counts = Object.fromEntries(BADGES.map((b) => [b.id, 0]))
  for (const s of Object.values(days)) for (const id of badgesOf(s)) counts[id]++
  return counts
}

/** XP je Kalendertag aus dem Ledger (Schlüssel enthalten ein Datum, z. B. steps:2026-10-29). */
export function xpByDay(ledger) {
  const out = {}
  for (const [k, v] of Object.entries(ledger)) { const m = k.match(/\d{4}-\d{2}-\d{2}/); if (m) out[m[0]] = (out[m[0]] ?? 0) + v }
  return out
}

const avg = (xs) => { const v = xs.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
export const average = avg

/** Regelbasierter Wochen-Hinweis (keine KI): bis zu 3 konkrete Punkte. */
export function weekAdvice(week) {
  const logged = week.filter((d) => d.steps != null)
  if (!logged.length) return ['Noch keine Tageswerte – Schritte und Mahlzeiten eintragen, dann erscheinen hier Hinweise.']
  const tips = []
  const aSteps = avg(logged.map((d) => d.steps)), aSleep = avg(week.map((d) => d.sleepH)), aProt = avg(week.filter((d) => d.protein > 0).map((d) => d.protein))
  const over = week.filter((d) => d.kcal > GOALS.kcal).length
  if (aSteps < GOALS.stepsStreak) tips.push(`Ø ${Math.round(aSteps).toLocaleString('de-DE')} Schritte: Block 2 und 3 früher starten, damit die 24.000 gehalten werden.`)
  if (aSleep != null && aSleep < GOALS.sleepH) tips.push(`Ø ${aSleep.toFixed(1).replace('.', ',')} Std Schlaf: Curfew-Routine ab 21:30 ernst nehmen.`)
  if (over >= 2) tips.push(`${over} Tage über ${GOALS.kcal} kcal: Mahlzeiten vorplanen, kalorienreiche Snacks streichen.`)
  if (aProt != null && aProt < GOALS.protein) tips.push(`Ø ${Math.round(aProt)} g Protein (Ziel ≥ ${GOALS.protein} g): eine Protein-Mahlzeit fest einplanen.`)
  return tips.length ? tips.slice(0, 3) : ['Woche im Plan – Kurs halten.']
}
