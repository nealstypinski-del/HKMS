import { describe, expect, it } from 'vitest'
import { planBlocks, navyBodyFat, levelInfo, forecastWeight, todayOnTrack, walkKcalTable, macroGoals, missionStats, buildTunnel, trend7, rechenmodell } from './calc.js'
import { normalizeRecovery, normalizeSleep, normalizeWorkouts, workoutXp } from '../mcp/whoopClient.js'

const none = [false, false, false]

describe('planBlocks (Auto-Rebalance)', () => {
  it('Basisplan = 30.000 Schritte', () => {
    const p = planBlocks({ missed: none, done: none, joker: false })
    expect(p.target).toBe(30000)
    expect(p.add).toEqual([0, 0, 0])
  })
  it('verpasster Block 2 -> +6000 auf den einzigen offenen Block, wenn Block 1 erledigt', () => {
    const p = planBlocks({ missed: [false, true, false], done: [true, false, false], joker: false })
    expect(p.add).toEqual([0, 0, 6000])
    expect(p.target).toBe(30000)
  })
  it('ΔS wird gleichmäßig auf N offene Blöcke verteilt', () => {
    const p = planBlocks({ missed: [true, false, false], done: none, joker: false })
    expect(p.add).toEqual([0, 4000, 4000])
    expect(p.eff).toEqual([0, 10000, 10000])
  })
  it('ohne offene Blöcke wandert ΔS auf morgen', () => {
    const p = planBlocks({ missed: [false, false, true], done: [true, true, false], joker: false })
    expect(p.tomorrow).toBe(6000)
  })
  it('Wasser-Joker: Delta entfällt, Ziel sinkt, Schwimm-Slot gesetzt', () => {
    const p = planBlocks({ missed: [false, true, false], done: none, joker: true })
    expect(p.swimIdx).toBe(1)
    expect(p.add).toEqual([0, 0, 0])
    expect(p.target).toBe(24000)
  })
})

describe('Formeln', () => {
  it('Navy-Formel liefert plausiblen KFA', () => {
    const v = navyBodyFat(40, 118)
    expect(v).toBeGreaterThan(30)
    expect(v).toBeLessThan(45)
  })
  it('Level-Skala 1–80', () => {
    expect(levelInfo(14500).level).toBe(49)
    expect(levelInfo(99999).level).toBe(80)
  })
})

describe('Whoop-Normalisierer', () => {
  it('Recovery (API-v1-Format)', () => {
    const r = normalizeRecovery({ records: [{ score: { recovery_score: 88, hrv_rmssd_milli: 73.2, resting_heart_rate: 58, spo2_percentage: 96 } }] })
    expect(r).toMatchObject({ score: 88, hrv: 73.2, rhr: 58, spo2: 96 })
  })
  it('Sleep: Stunden pro Phase', () => {
    const n = normalizeSleep({ records: [{ end: '2026-10-10T05:00:00Z', score: { respiratory_rate: 15.5, stage_summary: { total_slow_wave_sleep_time_milli: 36e5 * 1.6, total_rem_sleep_time_milli: 36e5 * 1.9, total_light_sleep_time_milli: 36e5 * 4 } } }] })
    expect(n[0].total).toBeCloseTo(7.5)
    expect(n[0].resp).toBe(15.5)
  })
  it('Workouts -> XP', () => {
    const [w] = normalizeWorkouts({ records: [{ id: 1, sport_name: 'Functional Fitness', start: '2026-10-10T10:00:00Z', end: '2026-10-10T10:45:00Z' }] })
    expect(w.minutes).toBe(45)
    expect(workoutXp(w)).toEqual({ xp: 400, kind: 'crossfit' })
  })
})

describe('Fusion-Module', () => {
  const { rows, deficit } = buildTunnel({ intake: 1400, active: 2000 })
  it('Prognose: Check-in je nach Abweichung', () => {
    expect(forecastWeight({ weight: 131, deficit, day: 0, rows }).check.key).toBe('ok')
    expect(forecastWeight({ weight: 134, deficit, day: 0, rows }).check.key).toBe('bad')
  })
  it('Prognose endet nicht unter 90 kg und enthält Silvester', () => {
    const f = forecastWeight({ weight: 100, deficit, day: 20, rows })
    expect(f.rows.at(-1).d).toBe(84)
    expect(Math.min(...f.rows.map((r) => r.ist))).toBeGreaterThanOrEqual(90)
  })
  it('Heute im Soll: Bewegung + Ernährung', () => {
    const t = todayOnTrack({ deficitGoal: 2800, walkKcal: 1000, crossfit: true, swim: false, kcalLogged: 1400 })
    expect(t.move).toBe(1450)
    expect(t.food).toBe(800)
    expect(t.total).toBe(2250)
  })
  it('Spaziergang-Tabelle skaliert linear', () => {
    const [a, b] = walkKcalTable(2000, [30, 60])
    expect(b.kcal).toBeGreaterThanOrEqual(a.kcal * 2 - 1)
  })
  it('Makros summieren sich auf das Kalorienlimit', () => {
    const g = macroGoals()
    expect(g.protein * 4 + g.carbs * 4 + g.fat * 9).toBeLessThanOrEqual(1400)
  })
  it('Mission: 42 kg gesamt', () => {
    expect(missionStats(132).total).toBe(42)
    expect(missionStats(111).pct).toBeCloseTo(0.5)
  })
})

describe('Trend & Rechenmodell', () => {
  it('trend7: einzelner Eintrag -> Mittel = Gewicht, kein Delta', () => {
    const t = trend7({}, 131.2, new Date(2026, 9, 28))
    expect(t.avg).toBeCloseTo(131.2)
    expect(t.delta).toBeNull()
    expect(t.series).toHaveLength(7)
  })
  it('trend7: Delta aus erstem/letztem Wert', () => {
    const t = trend7({ '2026-10-22': 133, '2026-10-28': 131.5 }, 131.5, new Date(2026, 9, 28))
    expect(t.delta).toBeCloseTo(-1.5)
  })
  it('Rechenmodell: kcal = kg × 7000', () => {
    const r = rechenmodell(132, 90, new Date(2026, 9, 9))
    expect(r.kcal).toBe(42 * 7000)
    expect(r.perDay).toBeCloseTo(r.kcal / r.days)
  })
  it('Mission mit eigenem Ziel', () => {
    expect(missionStats(132, new Date(), 92).total).toBe(40)
  })
})
