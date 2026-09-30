import { describe, expect, it } from 'vitest'
import { gait, gaitFrame, framePhase } from '../render/gait'
import { ESC_HIDE, escalatorSink, escalatorStepPositions } from './escalator'

describe('Rolltreppe: Stufenbewegung', () => {
  const N = 26, L = 7.3
  it('Stufen wandern über die Zeit sichtbar (mehr als ein halber Stufenabstand pro Sekunde)', () => {
    const a = escalatorStepPositions(N, L, 0, 1)
    const b = escalatorStepPositions(N, L, 1, 1)
    // Die Stufe 0 legt in 1 s 0,85 m zurück, das ist mehr als ein Stufenabstand (7,3/26 = 0,28 m)
    const d = (b[0] - a[0] + 1) % 1
    expect(d * L).toBeCloseTo(0.85, 2)
    expect(d * L).toBeGreaterThan(L / N)
  })
  it('aufwärts und abwärts laufen in entgegengesetzte Richtung', () => {
    const up = escalatorStepPositions(N, L, 0.5, 1)[0]
    const down = escalatorStepPositions(N, L, 0.5, -1)[0]
    expect(up).toBeGreaterThan(0)
    expect(down).toBeGreaterThan(0.9)
  })
  it('das Band wiederholt sich exakt nach einem Stufenabstand', () => {
    const period = (L / N) / 0.85
    const a = escalatorStepPositions(N, L, 3, 1).sort((x, y) => x - y)
    const b = escalatorStepPositions(N, L, 3 + period, 1).sort((x, y) => x - y)
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6))
  })
  it('Stufen tauchen an beiden Enden ab und sind in der Mitte voll sichtbar', () => {
    expect(escalatorSink(0)).toBe(1)
    expect(escalatorSink(1)).toBe(1)
    expect(escalatorSink(0.5)).toBe(0)
    expect(escalatorSink(ESC_HIDE)).toBe(0)
    expect(escalatorSink(ESC_HIDE / 2)).toBeGreaterThan(0.3)
  })
})

describe('Laufanimation: Gangzyklus', () => {
  it('Beine und Arme schwingen gegengleich und wechseln über den Zyklus das Vorzeichen', () => {
    const a = gait(Math.PI / 2), b = gait((3 * Math.PI) / 2)
    expect(a.thighL).toBeGreaterThan(0.5)
    expect(a.thighR).toBeLessThan(-0.5)
    expect(b.thighL).toBeLessThan(-0.5)
    expect(a.armL).toBeLessThan(0) // Arm gegen das Bein
    expect(Math.sign(a.thighL)).toBe(-Math.sign(b.thighL))
  })
  it('im Stand (amount 0) ist alles ruhig', () => {
    const g = gait(1.234, 0)
    expect([g.thighL, g.thighR, g.shinL, g.shinR, g.armL, g.armR, g.bob, g.lean].map(Math.abs)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
  it('acht vorberechnete Posen decken den Zyklus ab und sind deutlich verschieden', () => {
    const frames = new Set<number>()
    const angles: number[] = []
    for (let p = 0; p < Math.PI * 2; p += 0.05) frames.add(gaitFrame(p, 8))
    expect(frames.size).toBe(8)
    for (let f = 0; f < 8; f++) angles.push(+gait(framePhase(f, 8)).thighL.toFixed(3))
    expect(new Set(angles).size).toBeGreaterThanOrEqual(5)
    // Extrem vorn und hinten sind enthalten
    expect(Math.max(...angles)).toBeGreaterThan(0.7)
    expect(Math.min(...angles)).toBeLessThan(-0.7)
  })
  it('gaitFrame ist periodisch und auch für negative Phasen definiert', () => {
    expect(gaitFrame(0.3, 4)).toBe(gaitFrame(0.3 + Math.PI * 2, 4))
    expect(gaitFrame(-0.3, 4)).toBeGreaterThanOrEqual(0)
    expect(gaitFrame(-0.3, 4)).toBeLessThan(4)
  })
})
