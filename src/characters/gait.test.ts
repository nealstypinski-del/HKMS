import { describe, expect, it } from 'vitest'
import { STRIDE, advancePhase, gaitPose } from './gait'

describe('gait', () => {
  it('bleibt in Ruhe still', () => {
    const p = gaitPose(1.2, 0)
    expect(Math.abs(p.hipL) + Math.abs(p.kneeL) + Math.abs(p.armL) + p.bob).toBe(0)
  })

  it('zwei Schritte ergeben genau einen Zyklus', () => {
    expect(advancePhase(0, STRIDE * 2)).toBeCloseTo(0, 6)
    expect(advancePhase(0, STRIDE)).toBeCloseTo(Math.PI, 6)
  })

  it('Beine und Arme schwingen gegengleich und die Knie beugen nur beim Vorschwingen', () => {
    const p = gaitPose(Math.PI / 2, 1)
    expect(p.hipL).toBeCloseTo(-p.hipR, 6)
    expect(p.armL).toBeCloseTo(-p.armR, 6)
    expect(p.hipL).toBeLessThan(-0.5)
    const q = gaitPose(0.3, 1)
    expect(q.kneeL).toBeGreaterThan(0)
    expect(q.kneeR).toBe(0)
  })

  it('Laufen schwingt weiter als Gehen', () => {
    expect(Math.abs(gaitPose(Math.PI / 2, 1, true).hipL)).toBeGreaterThan(Math.abs(gaitPose(Math.PI / 2, 1).hipL))
  })
})
