import { describe, expect, it } from 'vitest'
import { effectiveGraphics, QUALITY_PRESETS, type Graphics } from './store'

const base: Graphics = { quality: 'high', labels: true, performanceMode: false, ...QUALITY_PRESETS.high }

describe('effectiveGraphics', () => {
  it('liefert ohne Performance Modus dieselbe Referenz', () => {
    expect(effectiveGraphics(base)).toBe(base)
  })
  it('liefert im Performance Modus eine stabile Referenz und schaltet teure Effekte ab', () => {
    const g = { ...base, performanceMode: true }
    const a = effectiveGraphics(g)
    expect(effectiveGraphics(g)).toBe(a) // Zustand Selektoren brauchen Referenzgleichheit
    expect(a.shadows || a.ao || a.bloom || a.reflections || a.hqLighting || a.activityFx).toBe(false)
    expect(a.labels).toBe(true)
  })
})
