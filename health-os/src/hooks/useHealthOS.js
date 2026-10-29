import { useEffect, useMemo, useRef, useState } from 'react'
import { PROFILE, STEP_BLOCKS, CROSSFIT, DOSES } from '../lib/constants.js'
import { dayKey, clamp, levelInfo, commandFor, curfewCountdown, buildTunnel, navyBodyFat, deurenbergBodyFat, forecastWeight, trend7, rechenmodell, todayOnTrack, walkKcalTable, macroGoals, missionStats, daylight } from '../lib/calc.js'
import { usePersistentState, useDailyState, useSyncMode } from './usePersistentState.js'
import { useAutoRebalance } from './useAutoRebalance.js'
import { useNow } from './useNow.js'
import { useWhoop } from './useWhoop.js'
import { workoutXp } from '../mcp/whoopClient.js'
import { badgeCounts, makeSnapshot, mergeWhoopHistory, prune, streak as streakOf, xpByDay, xpLabel } from '../lib/history.js'

// Fallback, solange die Bridge nie verbunden war (wird im UI als DEMO gekennzeichnet).
export const DEMO_WHOOP = { score: 88, hrv: 73, rhr: 58, spo2: 96, resp: 15.5 }
const DEMO_NIGHTS = [[1.6, 1.9, 4.0], [1.4, 1.7, 3.9], [1.7, 2.0, 4.1], [1.5, 1.8, 3.6], [1.8, 2.0, 3.9], [1.6, 1.9, 4.2], [1.7, 2.1, 3.9]]
const DEMO_HRV = [70, 72, 75, 71, 74, 72, 73]

const initDaily = () => ({
  steps: 0,
  missed: STEP_BLOCKS.map(() => false),
  done: STEP_BLOCKS.map(() => false),
  joker: false,
  swimDone: false,
  crossfit: false,
  water: 0,
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  meals: [],
  electrolytes: [false, false, false],
  jointPain: 3,
  voice: true,
})

export function useHealthOS() {
  const now = useNow()
  const whoop = useWhoop()

  // ── Persistenz (Weight, Steps, Water, Dose …) ──
  const [weight, setWeight] = usePersistentState('weight', PROFILE.startKg)
  const [weightLog, setWeightLog] = usePersistentState('weightLog', {})
  const [dose, setDose] = usePersistentState('dose', 50)
  const [measure, setMeasure] = usePersistentState('measure', { neck: 40, waist: 118 })
  const [activeKcal, setActiveKcal] = usePersistentState('activeKcal', 2000)
  const [ledger, setLedger] = usePersistentState('xpLedger', {})
  const [whoopCache, setWhoopCache] = usePersistentState('whoopCache', null)
  const [daily, setDaily, patchDaily] = useDailyState('daily', initDaily)
  const [target, setTarget] = usePersistentState('targetKg', PROFILE.targetKg)
  const [view, setView] = usePersistentState('view', 'hq') // 'hq' | 'analyse' (pro Gerät)
  const [days, setDays] = usePersistentState('days', {}) // Tages-Snapshots für Verlauf/Woche
  const [pharmaLog, setPharmaLog] = usePersistentState('pharmaLog', []) // [{ id, date, ui, note }] – reine Erfassung
  const [health] = usePersistentState('health', {}) // Auto Health Export: { 'YYYY-MM-DD': { steps, activeKcal, restingHr } }
  const syncMode = useSyncMode()
  const hydrated = syncMode !== 'connecting' // vor dem Server-Abgleich keine abgeleiteten Werte schreiben (würde Serverdaten überschreiben)
  const [room, setRoom] = useState(null)

  // Whoop-Daten cachen, damit Offline-Start den letzten Stand zeigt
  useEffect(() => {
    if (whoop.status === 'connected') setWhoopCache({ recovery: whoop.recovery, hrv: whoop.hrv, sleep: whoop.sleep, at: whoop.syncedAt })
  }, [whoop.status, whoop.recovery, whoop.hrv, whoop.sleep, whoop.syncedAt, setWhoopCache])

  const live = whoop.status === 'connected'
  const src = live ? { recovery: whoop.recovery, hrv: whoop.hrv, sleep: whoop.sleep } : whoopCache
  const demo = !src?.recovery
  const rec = src?.recovery ?? null
  const bio = {
    score: rec?.score ?? DEMO_WHOOP.score,
    hrv: rec?.hrv ?? DEMO_WHOOP.hrv,
    rhr: rec?.rhr ?? DEMO_WHOOP.rhr,
    spo2: rec?.spo2 ?? DEMO_WHOOP.spo2,
    resp: src?.sleep?.at(-1)?.resp ?? DEMO_WHOOP.resp,
    hrvSeries: src?.hrv?.length > 1 ? src.hrv : DEMO_HRV,
  }
  const nights = src?.sleep?.length ? src.sleep : DEMO_NIGHTS.map(([deep, rem, light], i) => ({ deep, rem, light, total: deep + rem + light, date: new Date(now.getTime() - (6 - i) * 864e5).toISOString() }))
  const sleepH = nights.at(-1).total
  const alarm = sleepH < 6

  // ── Auto-Rebalance ──
  const plan = useAutoRebalance(daily)
  // Schritte: Auto-Health-Wert (iPhone) oder manuelle Eingabe – der höhere zählt, nie weniger als vorher
  const healthSteps = health[dayKey()]?.steps ?? 0
  const stepsTotal = Math.max(daily.steps, healthSteps)
  const stepSource = healthSteps > 0 && healthSteps >= daily.steps ? 'AUTO HEALTH' : 'MANUELL'
  const steps = Math.min(stepsTotal, plan.target)

  // Blockfortschritt: Schritte füllen die Blöcke der Reihe nach
  const blocks = useMemo(() => {
    let rem = stepsTotal
    return STEP_BLOCKS.map((b, i) => {
      const eff = plan.eff[i]
      const swim = i === plan.swimIdx
      const missed = daily.missed[i]
      const taken = swim || missed ? 0 : Math.min(rem, eff)
      if (!swim && !missed) rem -= taken
      const done = swim ? daily.swimDone : daily.done[i] || (eff > 0 && taken >= eff)
      return { ...b, i, eff, added: plan.add[i], swim, missed, done, taken, frac: eff > 0 ? taken / eff : swim && daily.swimDone ? 1 : 0 }
    })
  }, [daily, plan, stepsTotal])

  // ── Whoop-Workouts -> XP ──
  const today = dayKey()
  const todaysWorkouts = useMemo(
    () => (live ? whoop.workouts : []).filter((w) => w.start && dayKey(new Date(w.start)) === today),
    [live, whoop.workouts, today],
  )
  const whoopCrossfit = todaysWorkouts.some((w) => workoutXp(w).kind === 'crossfit')

  const xpEntries = useMemo(() => {
    const e = {}
    e[`steps:${today}`] = Math.floor(steps / 10)
    blocks.forEach((b) => { if (b.done && !b.swim) e[`block:${today}:${b.i}`] = 100 })
    if (daily.swimDone) e[`swim:${today}`] = 250
    if (daily.crossfit && !whoopCrossfit) e[`cf:${today}`] = CROSSFIT.xp
    if (daily.water >= 5) e[`water:${today}`] = 100
    if (weightLog[today]) e[`weight:${today}`] = 20
    if (live) whoop.workouts.filter((w) => w.start && new Date(w.start) >= PROFILE.startDate).forEach((w) => { e[`wo:${w.id}`] = workoutXp(w).xp })
    return e
  }, [steps, blocks, daily.swimDone, daily.crossfit, daily.water, weightLog, whoopCrossfit, live, whoop.workouts, today])

  useEffect(() => {
    if (!hydrated) return
    setLedger((l) => {
      const keys = Object.keys(xpEntries)
      if (keys.every((k) => l[k] === xpEntries[k])) return l
      return { ...l, ...xpEntries }
    })
  }, [xpEntries, setLedger, hydrated])

  const SEED_XP = 14500
  const xp = levelInfo(SEED_XP + Object.values(ledger).reduce((a, b) => a + b, 0))

  // ── Level-Up (einmalig je Gerät) und XP-Feed (nur Änderungen dieser Sitzung) ──
  const [lastLevel, setLastLevel] = usePersistentState('lastLevel', null) // nur lokal (nicht synchronisiert)
  const [levelUp, setLevelUp] = useState(null)
  useEffect(() => {
    if (syncMode === 'connecting') return // erst nach dem Server-Abgleich vergleichen (sonst falscher Level-Up auf neuen Geräten)
    if (lastLevel == null || xp.level < lastLevel) { setLastLevel(xp.level); return }
    if (xp.level > lastLevel) { setLevelUp({ level: xp.level, title: xp.title }); setLastLevel(xp.level) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp.level, syncMode])
  const prevLedger = useRef(null)
  const [xpFeed, setXpFeed] = useState([])
  useEffect(() => {
    if (prevLedger.current) {
      const items = Object.entries(ledger)
        .map(([k, v]) => ({ k, d: v - (prevLedger.current[k] ?? 0) }))
        .filter(({ k, d }) => d > 0 && (!k.startsWith('steps:') || d >= 50))
        .map(({ k, d }) => ({ ts: Date.now(), label: xpLabel(k), xp: d }))
      if (items.length) setXpFeed((f) => [...items, ...f].slice(0, 8))
    }
    prevLedger.current = ledger
  }, [ledger])

  // ── Historie: heutigen Schnappschuss schreiben, Whoop-Verlauf rückfüllen ──
  const snapshot = makeSnapshot({ daily, steps: stepsTotal, weight, sleepH, bio, blocksDone: blocks.filter((b) => b.done).length })
  const snapJson = JSON.stringify(snapshot)
  useEffect(() => {
    if (!hydrated) return
    const snap = JSON.parse(snapJson)
    const cur = days[today] ?? {}
    const merged = { ...cur, ...Object.fromEntries(Object.entries(snap).filter(([, v]) => v !== undefined && v !== null)) }
    if (JSON.stringify(merged) !== JSON.stringify(cur)) setDays(prune({ ...days, [today]: merged }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapJson, today, hydrated])
  useEffect(() => {
    if (!hydrated || !live || !whoop.history) return
    const merged = mergeWhoopHistory(days, whoop.history.rec, whoop.history.sleep)
    if (JSON.stringify(merged) !== JSON.stringify(days)) setDays(merged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, whoop.history, hydrated])
  const streakN = streakOf(days, now)
  const badges = badgeCounts(days)
  const xpDay = xpByDay(ledger)

  // ── Abgeleitete Werte ──
  const tunnel = useMemo(() => buildTunnel({ intake: PROFILE.kcalCeiling, active: activeKcal }), [activeKcal])
  const actualDeficit = PROFILE.bmr + activeKcal - (daily.kcal || PROFILE.kcalCeiling)
  const walkKcal = Math.round((steps * activeKcal) / PROFILE.stepTarget)
  const tons = steps * 0.35
  const planTons = plan.target * 0.35

  const bmiNavy = navyBodyFat(measure.neck, measure.waist)
  const bf = {
    navy: bmiNavy,
    deu: deurenbergBodyFat(weight),
    use: Number.isFinite(bmiNavy) ? bmiNavy : deurenbergBodyFat(weight),
  }
  bf.fatKg = (weight * bf.use) / 100
  bf.leanKg = weight - bf.fatKg

  const dayIdx = clamp(Math.floor((now - PROFILE.startDate) / 864e5), 0, 84)
  const forecast = useMemo(() => forecastWeight({ weight, deficit: tunnel.deficit, day: dayIdx, rows: tunnel.rows, target }), [weight, tunnel, dayIdx, target])
  const onTrack = todayOnTrack({ deficitGoal: tunnel.deficit, walkKcal, crossfit: daily.crossfit || whoopCrossfit, swim: daily.swimDone, kcalLogged: daily.kcal })
  const walkTable = walkKcalTable(activeKcal)
  const macros = { goals: macroGoals(), now: { protein: daily.protein, carbs: daily.carbs, fat: daily.fat } }
  const mission = missionStats(weight, now, target)
  const trend = trend7(weightLog, weight, now)
  const model = rechenmodell(weight, target, now)
  const light = daylight(now)
  const sourceLabel = live ? (whoop.test ? 'TEST-MCP' : 'LIVE · MCP') : demo ? 'DEMO' : 'CACHE'

  const command = commandFor({ now, plan, steps, state: daily, sleepH })
  const curfew = curfewCountdown(now)
  const dayN = clamp(Math.floor((now - PROFILE.startDate) / 864e5), 0, 84) + 1

  // ── Aktionen ──
  const actions = {
    submitWeight: (kg) => {
      if (!(kg > 60 && kg < 250)) return false
      setWeight(Math.round(kg * 10) / 10)
      setWeightLog((l) => ({ ...l, [today]: kg }))
      return true
    },
    addSteps: (n) => patchDaily((d) => ({ steps: clamp(Math.max(d.steps, healthSteps) + n, 0, 60000) })),
    setSteps: (n) => patchDaily({ steps: clamp(n, 0, 60000) }),
    toggleMissed: (i) => patchDaily((d) => {
      const missed = d.missed.slice(); missed[i] = !missed[i]
      const done = d.done.slice(); if (missed[i]) done[i] = false
      return { missed, done, swimDone: false }
    }),
    toggleDone: (i) => patchDaily((d) => {
      const done = d.done.slice(); done[i] = !done[i]
      const missed = d.missed.slice(); if (done[i]) missed[i] = false
      return { done, missed }
    }),
    toggleJoker: () => patchDaily((d) => ({ joker: !d.joker, swimDone: false })),
    toggleSwim: () => patchDaily((d) => ({ swimDone: !d.swimDone })),
    toggleCrossfit: () => patchDaily((d) => ({ crossfit: !d.crossfit })),
    setWater: (l) => patchDaily({ water: clamp(Math.round(l * 100) / 100, 0, 12) }),
    setNutrition: (p) => patchDaily(p),
    logMeal: (m) => patchDaily((d) => ({
      meals: [...d.meals, { ...m, t: Date.now() }].slice(-20),
      kcal: d.kcal + m.kcal, protein: d.protein + m.protein, carbs: d.carbs + m.carbs, fat: d.fat + m.fat,
    })),
    undoMeal: () => patchDaily((d) => {
      const m = d.meals.at(-1)
      return m ? { meals: d.meals.slice(0, -1), kcal: Math.max(0, d.kcal - m.kcal), protein: Math.max(0, d.protein - m.protein), carbs: Math.max(0, d.carbs - m.carbs), fat: Math.max(0, d.fat - m.fat) } : {}
    }),
    addInjection: ({ date, ui, note }) => setPharmaLog((l) => [...l, { id: `${Date.now()}`, date, ui: Number(ui), note: String(note || '').slice(0, 120) }].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-200)),
    removeInjection: (id) => setPharmaLog((l) => l.filter((e) => e.id !== id)),
    setView, setRoom,
    setTarget: (kg) => kg >= 80 && kg < weight && setTarget(Math.round(kg * 10) / 10),
    toggleElectrolyte: (i) => patchDaily((d) => { const e = d.electrolytes.slice(); e[i] = !e[i]; return { electrolytes: e } }),
    setJoint: (v) => patchDaily({ jointPain: clamp(v, 1, 10) }),
    toggleVoice: () => patchDaily((d) => ({ voice: !d.voice })),
    setDose: (u) => DOSES.includes(u) && setDose(u),
    setMeasure: (p) => setMeasure((m) => ({ ...m, ...p })),
    setActiveKcal,
    resetDay: () => setDaily(initDaily()),
  }

  return {
    now, whoop, live, demo, bio, nights, sleepH, alarm, dayN,
    weight, dose, measure, activeKcal, daily, plan, steps, blocks, tunnel, actualDeficit,
    walkKcal, tons, planTons, bf, xp, command, curfew, todaysWorkouts,
    levelUp, dismissLevelUp: () => setLevelUp(null), xpFeed, pharmaLog, days, streakN, badges, xpDay, workoutHistory: whoop.workoutHistory,
    view, room, target, syncMode, stepSource, healthSteps, trend, model, weightLog, forecast, onTrack, walkTable, macros, mission, light, sourceLabel, dayIdx, whoopCrossfit,
    actions,
  }
}
