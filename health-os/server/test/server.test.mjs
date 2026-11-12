import { describe, expect, it } from 'vitest'
import { readFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../store.mjs'
import { mergeHealth, parseHealthExport } from '../healthExport.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/health-export.json', import.meta.url), 'utf8'))

describe('Store (Last-Write-Wins)', () => {
  it('neuerer Zeitstempel gewinnt, älterer wird abgelehnt', () => {
    const s = createStore(null)
    expect(s.set('weight', 131, 100).accepted).toBe(true)
    expect(s.set('weight', 130, 200).accepted).toBe(true)
    const r = s.set('weight', 140, 150)
    expect(r.accepted).toBe(false)
    expect(r.entry).toEqual({ v: 130, ts: 200 })
  })
  it('lehnt ungültige Schlüssel ab', () => {
    expect(() => createStore(null).set('../etc', 1)).toThrow()
  })
  it('schreibt atomar und lädt wieder', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'nhos-')), 'state.json')
    const s = createStore(f, { debounceMs: 1 })
    s.set('dose', 45, 5)
    s.flush()
    expect(existsSync(f)).toBe(true)
    expect(createStore(f).get('dose')).toEqual({ v: 45, ts: 5 })
  })
  it('meldet Änderungen über den Bus', () => {
    const s = createStore(null)
    const seen = []
    s.bus.on('change', (e) => seen.push(e))
    s.set('weight', 1, 1)
    expect(seen).toHaveLength(1)
  })
})

describe('Health Auto Export', () => {
  it('summiert Schritte je Tag, rechnet kJ in kcal um', () => {
    const p = parseHealthExport(fixture)
    expect(p['2026-10-29'].steps).toBe(8200)
    expect(p['2026-10-28'].steps).toBe(21044)
    expect(p['2026-10-29'].activeKcal).toBe(1000)
    expect(p['2026-10-29'].restingHr).toBe(57)
  })
  it('ignoriert unbekannte Metriken und lehnt Fremdformate ab', () => {
    expect(Object.keys(parseHealthExport(fixture))).toHaveLength(2)
    expect(() => parseHealthExport({ foo: 1 })).toThrow()
  })
  it('Merge ist idempotent und lässt Schritte nie sinken', () => {
    const full = mergeHealth({}, parseHealthExport(fixture), 1)
    const partial = mergeHealth(full, { '2026-10-29': { steps: 300 } }, 2)
    expect(partial['2026-10-29'].steps).toBe(8200)
    expect(mergeHealth(partial, parseHealthExport(fixture), 3)['2026-10-29'].steps).toBe(8200)
  })
  it('behält höchstens 120 Tage', () => {
    const many = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`2026-01-${String(i).padStart(3, '0')}`, { steps: 1 }]))
    expect(Object.keys(mergeHealth({}, many)).length).toBe(120)
  })
})
