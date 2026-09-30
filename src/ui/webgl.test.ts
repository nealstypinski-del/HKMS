import { describe, expect, it } from 'vitest'
import { describeError } from './ErrorBoundary'
import { isTooSmall, MIN_H, MIN_W } from './TooSmall'
import { detectWebGL } from './webgl'

describe('WebGL Erkennung', () => {
  it('erkennt WebGL2 und fällt auf WebGL1 zurück', () => {
    expect(detectWebGL(() => ({ getContext: (id) => (id === 'webgl2' ? {} : null) })).ok).toBe(true)
    expect(detectWebGL(() => ({ getContext: (id) => (id === 'webgl' ? {} : null) })).ok).toBe(true)
  })
  it('meldet fehlendes WebGL, ohne zu werfen', () => {
    expect(detectWebGL(() => ({ getContext: () => null }))).toEqual({ ok: false, reason: 'no-context' })
  })
  it('fängt Ausnahmen beim Erzeugen ab und liefert die Angabe', () => {
    const r = detectWebGL(() => { throw new Error('canvas gesperrt') })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('error')
    expect(r.detail).toBe('canvas gesperrt')
    expect(detectWebGL(() => ({ getContext: () => { throw 'kaputt' } })).detail).toBe('kaputt')
  })
})

describe('Fehlertext und Fenstergröße', () => {
  it('beschreibt beliebige geworfene Werte', () => {
    expect(describeError(new TypeError('x'))).toBe('TypeError: x')
    expect(describeError('text')).toBe('text')
    expect(describeError({ toString() { throw new Error('bösartig') } })).toBe('Unbekannter Fehler')
    expect(describeError(undefined)).toBe('undefined')
  })
  it('erkennt zu kleine Fenster an der Grenze', () => {
    expect(isTooSmall(MIN_W, MIN_H)).toBe(false)
    expect(isTooSmall(MIN_W - 1, MIN_H)).toBe(true)
    expect(isTooSmall(MIN_W, MIN_H - 1)).toBe(true)
    expect(isTooSmall(0, 0)).toBe(true)
  })
})
