import { describe, expect, it } from 'vitest'
import { planBlocks, navyBodyFat, levelInfo } from './calc.js'
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
