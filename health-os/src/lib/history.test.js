import { describe, expect, it } from 'vitest'
import { badgeCounts, badgesOf, daySuccess, lastNDays, makeSnapshot, mergeWhoopHistory, streak, weekAdvice, xpByDay } from './history.js'

const NOW = new Date(2026, 9, 29, 12, 0)
const ok = { steps: 26000, kcal: 1300 }

describe('Streak', () => {
  it('zählt Tage in Folge; heutiger offener Tag bricht nicht', () => {
    const days = { '2026-10-28': ok, '2026-10-27': ok, '2026-10-26': { steps: 5000, kcal: 1200 } }
    expect(streak(days, NOW)).toBe(2)
    expect(streak({ ...days, '2026-10-29': ok }, NOW)).toBe(3)
  })
  it('Lücke beendet den Streak', () => {
    expect(streak({ '2026-10-27': ok }, NOW)).toBe(0)
  })
  it('ohne geloggte kcal kein Erfolg', () => {
    expect(daySuccess({ steps: 30000, kcal: 0 })).toBe(false)
    expect(daySuccess({ steps: 30000, kcal: 1500 })).toBe(false)
    expect(daySuccess(ok)).toBe(true)
  })
})

describe('Badges', () => {
  it('erkennt erreichte Ziele', () => {
    expect(badgesOf({ steps: 30500, water: 5.5, protein: 175, kcal: 1390, sleepH: 6.5, blocksDone: 3, crossfit: true }).sort())
      .toEqual(['allBlocks', 'hydration', 'ironRaid', 'macros', 'steps30k'])
  })
  it('zählt über die Historie', () => {
    expect(badgeCounts({ a: { steps: 31000 }, b: { steps: 30000 }, c: { steps: 100 } }).steps30k).toBe(2)
  })
})

describe('Historie', () => {
  it('lastNDays füllt Lücken', () => {
    const w = lastNDays({ '2026-10-29': { steps: 1 } }, 3, NOW)
    expect(w.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29'])
    expect(w[2].steps).toBe(1)
    expect(w[0].steps).toBeUndefined()
  })
  it('Whoop-Rückfüllung überschreibt keine vorhandenen Werte', () => {
    const d = mergeWhoopHistory({ '2026-10-28': { sleepH: 8 } }, [{ date: '2026-10-28', score: 70.4, hrv: 61.2, rhr: 55 }], [{ date: '2026-10-28', total: 6.1 }, { date: '2026-10-27', total: 7 }])
    expect(d['2026-10-28']).toMatchObject({ sleepH: 8, recovery: 70, hrv: 61, rhr: 55 })
    expect(d['2026-10-27'].sleepH).toBe(7)
  })
  it('Snapshot rundet und lässt Unbekanntes weg', () => {
    const s = makeSnapshot({ daily: { kcal: 1234.6, protein: 171.2, carbs: 10, water: 5.456, missed: [false, true, false], crossfit: true, joker: false }, steps: 12345.7, weight: 131.24, sleepH: 6.789, bio: {}, blocksDone: 2 })
    expect(s).toMatchObject({ steps: 12346, kcal: 1235, water: 5.46, weight: 131.2, blocksMissed: 1 })
    expect(s.recovery).toBeUndefined()
  })
  it('XP je Tag aus Ledger-Schlüsseln', () => {
    expect(xpByDay({ 'steps:2026-10-29': 300, 'block:2026-10-29:1': 100, 'wo:abc': 50, 'cf:2026-10-28': 400 })).toEqual({ '2026-10-29': 400, '2026-10-28': 400 })
  })
  it('Wochen-Hinweise nennen konkrete Punkte', () => {
    const w = Array.from({ length: 7 }, () => ({ steps: 15000, kcal: 1600, protein: 120, sleepH: 6 }))
    const tips = weekAdvice(w)
    expect(tips.length).toBe(3)
    expect(tips[0]).toMatch(/Schritte/)
  })
})
