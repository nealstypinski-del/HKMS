import { PROFILE, STEP_BLOCKS, BASELINE_STEPS, COLORS } from './constants.js'

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const fmt = (n, k = 0) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: k, maximumFractionDigits: k })
export const pad = (n) => String(n).padStart(2, '0')
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * Auto-Rebalance Engine.
 *   ΔS = Σ Soll-Schritte der ausgefallenen Blöcke
 *   S_new = S_base + ΔS / N_remaining
 * Offene Blöcke = nicht verpasst, nicht erledigt, nicht durch Schwimmen ersetzt.
 * Ohne offene Blöcke wandert ΔS auf morgen (Block 1).
 * Wasser-Joker: Ausfall-Delta entfällt, der betroffene Block wird durch 45 Min Pool ersetzt.
 *
 * @param {{missed:boolean[], done:boolean[], joker:boolean}} s
 */
export function planBlocks({ missed, done, joker }) {
  const base = STEP_BLOCKS.map((b) => b.base)
  const eff = base.slice()
  const add = base.map(() => 0)
  let tomorrow = 0

  // Schwimm-Slot: erster verpasster Block, sonst der letzte offene
  let swimIdx = -1
  if (joker) {
    swimIdx = missed.indexOf(true)
    if (swimIdx < 0) {
      for (let i = base.length - 1; i >= 0; i--) if (!done[i]) { swimIdx = i; break }
    }
    if (swimIdx >= 0) eff[swimIdx] = 0
  }

  let delta = 0
  missed.forEach((m, i) => {
    if (!m || i === swimIdx) return
    delta += base[i]
    eff[i] = 0
  })
  const remaining = base.map((_, i) => i).filter((i) => !missed[i] && !done[i] && i !== swimIdx)
  if (delta > 0) {
    if (remaining.length === 0) tomorrow = delta
    else remaining.forEach((i) => { eff[i] += delta / remaining.length; add[i] += delta / remaining.length })
  }
  const blockTarget = eff.reduce((a, b) => a + b, 0)
  return { base, eff, add, delta, remaining, swimIdx, tomorrow, blockTarget, target: blockTarget + BASELINE_STEPS }
}

/** Zustandsfarbe eines Blocks: Cyan normal, Amber bei Kompensation. */
export function blockTone({ missed, done, added, swim }) {
  if (swim) return { key: 'swim', color: COLORS.royal }
  if (missed) return { key: 'missed', color: COLORS.crimson }
  if (done) return { key: 'done', color: COLORS.emerald }
  if (added) return { key: 'comp', color: COLORS.amber }
  return { key: 'idle', color: COLORS.cyan }
}

// ── Körperzusammensetzung ──
export const bmi = (kg) => kg / PROFILE.heightM ** 2
/** US-Navy (Männer). Umfänge in cm. */
export function navyBodyFat(neckCm, waistCm, heightCm = PROFILE.heightCm) {
  if (!(neckCm > 0) || !(waistCm > neckCm)) return NaN
  return 86.01 * Math.log10((waistCm - neckCm) / 2.54) - 70.041 * Math.log10(heightCm / 2.54) + 36.76
}
export const deurenbergBodyFat = (kg, age = PROFILE.age) => 1.2 * bmi(kg) + 0.23 * age - 10.8 - 5.4

// ── Massenmodell: Wasser-Initialverlust + Fettabbau (7.000 kcal/kg) ──
export const modelMass = (day, deficit) => PROFILE.startKg - 3.5 * (1 - Math.exp(-day / 3)) - (day * deficit) / 7000

export function currentPhase(kg) {
  return kg > 120 ? 0 : kg > 108 ? 1 : kg > 95 ? 2 : 3
}
export const phaseProgress = (kg, ph) => clamp((ph.from - kg) / (ph.from - ph.to), 0, 1)
export const phase3Deficit = () => Math.round((13 * 7000) / 31 / 10) * 10

/** Trajektorie über 84 Tage (09.10. → 31.12.) für den Netto-Tunnel. */
export function buildTunnel({ intake, active, bmr = PROFILE.bmr }) {
  const tdee = bmr + active
  const deficit = tdee - intake
  const m23 = modelMass(23, deficit)
  const rows = []
  for (let d = 0; d <= 84; d++) {
    const ph = d < 23 ? 0 : d < 53 ? 1 : 2
    const tdeeD = ph === 0 ? tdee : ph === 1 ? intake + 2500 : intake + phase3Deficit()
    const mass = d <= 23 ? modelMass(d, deficit)
      : d <= 53 ? m23 + (108 - m23) * ((d - 23) / 30)
      : 108 + (95 - 108) * ((d - 53) / 31)
    const date = new Date(PROFILE.startDate.getTime() + d * 864e5)
    rows.push({ d, label: `${date.getDate()}.${date.getMonth() + 1}.`, tdee: tdeeD, intake, net: tdeeD - intake, mass: +mass.toFixed(2), ph })
  }
  return { rows, tdee, deficit, finalAt23: m23 }
}

// ── Retatrutid (Halbwertszeit ~6 Tage, wöchentliche Gabe) ──
export const doseMg = (ui) => ui * 0.05 // 50 UI = 2,5 mg in 0,5 ml
export function decayCurve(ui, days = 35, injectEvery = 7, halfLife = 6) {
  const mg = doseMg(ui)
  const out = []
  for (let t = 0; t <= days; t += 0.5) {
    let c = 0
    for (let k = 0; k * injectEvery <= t; k++) c += mg * 0.5 ** ((t - k * injectEvery) / halfLife)
    out.push({ t, c: +c.toFixed(3) })
  }
  return out
}
/** Sättigungs-Suppression 0–100 % auf Basis des Plasmaspiegels im Steady State. */
export function satiety(ui, daysSinceInjection = 2, halfLife = 6) {
  const mg = doseMg(ui)
  let c = 0
  for (let k = 0; k < 6; k++) c += mg * 0.5 ** ((daysSinceInjection + 7 * k) / halfLife)
  return Math.round(100 * (1 - Math.exp(-c / 1.2)))
}

// ── XP / Level (80 Level à 300 XP = 24.000 XP) ──
export const XP_CAP = 24000
export const XP_PER_LEVEL = 300
export function levelInfo(xp) {
  const total = clamp(Math.round(xp), 0, XP_CAP)
  const level = Math.min(80, 1 + Math.floor(total / XP_PER_LEVEL))
  const pct = total / XP_CAP
  const title = level >= 80 ? 'TITAN · MASTER' : pct >= 0.75 ? 'TITAN' : pct >= 0.25 ? 'GLYCOGEN DESTROYER' : 'ZONE-2 INITIATE'
  return { total, level, pct, title, intoLevel: total % XP_PER_LEVEL, cap: XP_CAP }
}

// ── Command Banner (eine Anweisung pro Zeitslot) ──
export function commandFor({ now, plan, steps, state, sleepH }) {
  const tmin = now.getHours() * 60 + now.getMinutes()
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const remain = Math.max(0, plan.target - steps)
  const b1Open = !state.done[0] && !state.missed[0]
  const compIdx = plan.add.findIndex((a, i) => a > 0 && !state.missed[i] && i !== plan.swimIdx)
  const NAMES = ['MORGEN-WALK', 'NACHMITTAGS-WALK', 'ABEND-WALK']
  const joker = state.joker && plan.swimIdx >= 0
  let text
  let mode = 'normal'
  if (sleepH < 6 && tmin >= 1260) { text = 'CORTISOL-ALARM. KEINE NACHT-MÄRSCHE. SOFORT SCHLAFEN.'; mode = 'alarm' }
  else if (compIdx >= 0) { text = `ANPASSUNG: ${NAMES[compIdx]} ERHÖHT AUF +${fmt(plan.add[compIdx])} SCHRITTE. EXECUTE NOW.`; mode = 'comp' }
  else if (joker) { text = 'WASSER-JOKER: 45 MIN POOL-SESSION. 400 KCAL. KEINE GELENKBELASTUNG.'; mode = 'joker' }
  else if (tmin >= 1320 || tmin < 330) text = 'CURFEW. LICHTER AUS. 7,5 STD SCHLAF FÜR STH-AUSSCHÜTTUNG.'
  else if (tmin < 350) text = 'SYSTEM IGNITION. AUFSTEHEN. 0,5 L WASSER + ELEKTROLYTE.'
  else if (tmin < 360) text = 'BEFEHL: SCHUHE AN. MORGEN-MARSCH STARTEN.'
  else if (tmin < 435) text = b1Open ? 'BEFEHL: MORGEN-MARSCH LÄUFT. ZONE 2. VOICE-DIKTAT AN.' : 'MORGEN-MARSCH ERLEDIGT. FOKUSARBEIT.'
  else if (tmin < 705) {
    if (b1Open) { text = 'MORGEN-MARSCH OFFEN. JETZT NACHHOLEN.'; mode = 'comp' }
    else text = 'FOKUSARBEIT. 12:00 UHR CROSSFIT. TASCHE PACKEN.'
  }
  else if (tmin < 720) text = `AUFBRECHEN. IRON RAID IN ${720 - tmin} MIN.`
  else if (tmin < 780) text = state.crossfit ? 'IRON RAID ERLEDIGT. REGENERATION.' : 'IRON RAID. CROSSFIT. JETZT.'
  else if (tmin < 1260) text = remain > 0 ? `SCHRITTE AUFHOLEN: ${fmt(remain)} OFFEN. NÄCHSTER BLOCK JETZT.` : '30.000 SCHRITTE ERREICHT. RUNTERFAHREN.'
  else text = `RUNTERFAHREN. CURFEW IN ${1320 - tmin} MIN.`
  const color = { normal: COLORS.cyan, comp: COLORS.amber, alarm: COLORS.crimson, joker: COLORS.royal }[mode]
  return { time: hhmm, text, mode, color }
}

export function curfewCountdown(now) {
  const lock = new Date(now)
  lock.setHours(22, 0, 0, 0)
  const ms = lock - now
  if (ms <= 0) return { label: 'LOCKOUT', ms, color: COLORS.crimson }
  const s = Math.floor(ms / 1000)
  return { label: `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`, ms, color: ms < 36e5 ? COLORS.amber : COLORS.cyan }
}

// ── Prognose: IST-Projektion vs. SOLL-Pfad (09.10. → 31.12.) ──
export function forecastWeight({ weight, deficit, day, rows, target = PROFILE.targetKg }) {
  const rate = Math.max(0, deficit) / 7000 // kg/Tag
  const out = rows.filter((r) => r.d >= day && (r.d - day) % 7 === 0 || r.d === 84).map((r) => {
    const t = r.d - day
    const ist = Math.max(target, weight - rate * Math.max(0, t))
    const band = t <= 0 ? 0 : 0.4 + 0.035 * t
    return { d: r.d, label: r.label, soll: r.mass, ist: +ist.toFixed(2), lo: +(ist - band).toFixed(2), hi: +(ist + band).toFixed(2) }
  })
  const soll = rows[clamp(day, 0, 84)].mass
  const diff = weight - soll
  const check = diff <= 0.5 ? { key: 'ok', text: 'Kurs halten', sub: 'Aktuell im Planbereich.' }
    : diff <= 1.5 ? { key: 'warn', text: 'Leicht nachsteuern', sub: `${fmt(diff, 1)} kg über SOLL – Schritte/Intake prüfen.` }
    : { key: 'bad', text: 'Gegensteuern', sub: `${fmt(diff, 1)} kg über SOLL – Blöcke nachholen, Intake ≤ 1.400.` }
  return { rows: out, diff, soll, check, endIst: out.at(-1)?.ist ?? weight }
}

// ── Heute im Soll? Tagesdefizit-Modellziel = Bewegung + Ernährungsbeitrag ──
export function todayOnTrack({ deficitGoal, walkKcal, crossfit, swim, kcalLogged, bmr = PROFILE.bmr }) {
  const move = walkKcal + (crossfit ? 450 : 0) + (swim ? 400 : 0)
  const food = bmr - (kcalLogged > 0 ? kcalLogged : PROFILE.kcalCeiling)
  const total = move + food
  return { move, food, total, goal: deficitGoal, pct: clamp(total / deficitGoal, 0, 1.5) }
}

// ── Spaziergang-Kalkulation (Annahme: 107 Schritte/Min, Verbrauch aus Aktiv-kcal / 30.000 Schritte) ──
export const STEPS_PER_MIN = 107
export function walkKcalTable(activeKcal, minutes = [30, 60, 75, 90, 120]) {
  const perStep = activeKcal / PROFILE.stepTarget
  return minutes.map((m) => ({ min: m, steps: Math.round(m * STEPS_PER_MIN), kcal: Math.round(m * STEPS_PER_MIN * perStep) }))
}

// ── Makro-Ziele (kcal-Ceiling 1.400, Protein ≥ 170 g, Carbs ≤ 25 g, Fett = Rest) ──
export function macroGoals() {
  const fat = Math.floor((PROFILE.kcalCeiling - PROFILE.proteinMinG * 4 - PROFILE.carbWarnG * 4) / 9)
  return { protein: PROFILE.proteinMinG, carbs: PROFILE.carbWarnG, fat }
}

// ── Mission-Leiste ──
export function missionStats(weight, now = new Date(), target = PROFILE.targetKg) {
  const total = PROFILE.startKg - target
  const lost = PROFILE.startKg - weight
  return { total, lost, remaining: Math.max(0, weight - target), pct: clamp(lost / total, 0, 1), daysLeft: Math.max(0, Math.ceil((PROFILE.deadline - now) / 864e5)) }
}

/** Tageslicht-Stimmung für den Hub: 0 = Nacht … 1 = Tag. */
export function daylight(now) {
  const h = now.getHours() + now.getMinutes() / 60
  return clamp(Math.sin(((h - 6) / 16) * Math.PI), 0, 1)
}

/**
 * Geschätztes Hypnogramm aus Phasensummen (Whoop liefert pro Nacht nur Summen).
 * Modell: 5 Zyklen, Tiefschlaf früh, REM spät. Ergebnis: Segmente { stage, h } (Σ h = total).
 */
export function estimateHypnogram({ deep, rem, light }, cycles = 5) {
  const wDeep = [0.38, 0.28, 0.2, 0.1, 0.04]
  const wRem = [0.08, 0.14, 0.2, 0.26, 0.32]
  const wLight = [0.2, 0.2, 0.2, 0.2, 0.2]
  const norm = (w) => { const t = w.reduce((a, b) => a + b, 0); return w.map((x) => x / t) }
  const d = norm(wDeep), r = norm(wRem), l = norm(wLight)
  const segs = []
  for (let i = 0; i < cycles; i++) {
    const ld = light * l[i]
    segs.push({ stage: 'Leicht', h: ld / 2 }, { stage: 'Tief', h: deep * d[i] }, { stage: 'Leicht', h: ld / 2 }, { stage: 'REM', h: rem * r[i] })
  }
  return segs.filter((s) => s.h > 0.001)
}

const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
/** 7-Tage-Trend aus dem Gewichts-Log { 'YYYY-MM-DD': kg }. Fehlende Tage = null. */
export function trend7(weightLog, weight, now = new Date()) {
  const series = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const v = weightLog[dayKey(d)] ?? (i === 0 ? weight : null)
    series.push({ day: DOW[d.getDay()], kg: v })
  }
  const vals = series.map((p) => p.kg).filter((v) => v != null)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : weight
  const first = vals.length > 1 ? vals[0] : null
  return { series, avg, delta: first == null ? null : vals.at(-1) - first, points: vals.length }
}

/** Statisches Rechenmodell für das Mission-Panel (7.000 kcal/kg, Tage bis Deadline). */
export function rechenmodell(weight, target, now = new Date()) {
  const kg = Math.max(0, weight - target)
  const days = Math.max(1, Math.ceil((PROFILE.deadline - now) / 864e5))
  const kcal = kg * 7000
  return { kg, days, kcal, perDay: kcal / days, perWeek: (kg / days) * 7 }
}
