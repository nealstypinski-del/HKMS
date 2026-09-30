import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER, HAIR_STYLES, SKIN } from './avatar'
import { DEFAULT_GRAPHICS, QUALITY_PRESETS } from './graphicsSettings'
import {
  defaultPersisted, loadPersisted, MAX_STORED_BYTES, sanitizeAvatar, sanitizeGraphics, savePersisted, STORAGE_KEY, type StorageLike,
} from './persist'

const mem = (initial?: string): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) } }
}

describe('Lokaler Speicher: feindliche Eingaben', () => {
  const hostile = [
    'kein json', '{', '[]', 'null', '42', '"text"', 'true', '{"graphics": 5, "player": "x", "timeMode": {}}',
    '{"graphics": {"quality": "ultra", "shadows": "yes", "ao": 1}, "player": {"skinVariant": -1, "hairStyle": "irokese"}}',
    '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}}',
  ]
  it('liefert bei jedem Müll vollständige gültige Werte und wirft nie', () => {
    for (const text of hostile) {
      const p = loadPersisted(mem(text))
      expect(p.graphics.quality, text).toMatch(/^(low|medium|high)$/)
      expect(typeof p.graphics.shadows).toBe('boolean')
      expect(Number.isInteger(p.player.skinVariant) && p.player.skinVariant >= 0 && p.player.skinVariant < SKIN.length, text).toBe(true)
      expect(HAIR_STYLES).toContain(p.player.hairStyle)
      expect(['auto', 'day', 'evening', 'night']).toContain(p.timeMode)
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
  it('ungültige Einzelwerte fallen einzeln auf sichere Werte zurück, gültige bleiben erhalten', () => {
    const g = sanitizeGraphics({ quality: 'medium', shadows: 'ja', bloom: false, labels: false })
    expect(g.quality).toBe('medium')
    expect(g.shadows).toBe(QUALITY_PRESETS.medium.shadows) // ungültig → Voreinstellung der Qualität
    expect(g.bloom).toBe(false) // gültig → bleibt
    expect(g.labels).toBe(false)
    const a = sanitizeAvatar({ skinVariant: 2, shirtVariant: 99, hairStyle: 'bun', headwear: 'crown', accessory: 'laser' })
    expect(a.skinVariant).toBe(2)
    expect(a.shirtVariant).toBe(DEFAULT_PLAYER.shirtVariant)
    expect(a.hairStyle).toBe('bun')
    expect(a.headwear).toBe('crown')
    expect(a.accessory).toBe(DEFAULT_PLAYER.accessory)
  })
  it('lehnt Kommazahlen, NaN, Unendlich und Text als Variante ab', () => {
    for (const bad of [1.5, NaN, Infinity, '2', null, {}, [], -0.5]) expect(sanitizeAvatar({ skinVariant: bad }).skinVariant, String(bad)).toBe(DEFAULT_PLAYER.skinVariant)
  })
  it('verwirft zu große Inhalte, ohne sie zu parsen', () => {
    const big = JSON.stringify({ graphics: { quality: 'low' }, pad: 'x'.repeat(MAX_STORED_BYTES) })
    expect(loadPersisted(mem(big))).toEqual(defaultPersisted())
  })
  it('ein Speicher, der beim Lesen wirft, oder kein Speicher liefert Standardwerte', () => {
    const throwing: StorageLike = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('QuotaExceeded') } }
    expect(loadPersisted(throwing)).toEqual(defaultPersisted())
    expect(loadPersisted(null)).toEqual(defaultPersisted())
  })
  it('Speichern: voller oder gesperrter Speicher gibt false zurück statt zu werfen', () => {
    const throwing: StorageLike = { getItem: () => null, setItem() { throw new Error('QuotaExceededError') } }
    expect(savePersisted(defaultPersisted(), throwing)).toBe(false)
    expect(savePersisted(defaultPersisted(), null)).toBe(false)
  })
  it('Hin und zurück: gespeicherte Werte kommen unverändert wieder heraus', () => {
    const s = mem()
    const p = defaultPersisted()
    p.graphics = { ...DEFAULT_GRAPHICS, quality: 'low', ...QUALITY_PRESETS.low, labels: false }
    p.player = { ...DEFAULT_PLAYER, headwear: 'crown', hairStyle: 'mohawk' }
    p.timeMode = 'night'
    expect(savePersisted(p, s)).toBe(true)
    expect(loadPersisted(s)).toEqual(p)
  })
  it('Speichern bereinigt beschädigte Eingaben, bevor sie auf die Platte gehen', () => {
    const s = mem()
    const dirty = { graphics: { quality: 'ultra' }, player: { skinVariant: 'x' }, timeMode: 'mitternacht' } as never
    expect(savePersisted(dirty, s)).toBe(true)
    expect(loadPersisted(s)).toEqual(defaultPersisted())
  })
})
