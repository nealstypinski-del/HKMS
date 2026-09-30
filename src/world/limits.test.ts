import { describe, expect, it } from 'vitest'
import { allowedLaunch, MAX_AGENTS_TOTAL, MAX_LAUNCH_AT_ONCE, sanitizeCount } from './limits'
import { useWorld } from './store'

describe('Eingabeprüfung Agentenstart', () => {
  it('macht aus Unsinn eine sichere Zahl', () => {
    for (const bad of [NaN, Infinity, -Infinity, -5, null, undefined, '', 'abc', {}, [], true]) expect(sanitizeCount(bad), String(bad)).toBe(0)
    expect(sanitizeCount('12')).toBe(12)
    expect(sanitizeCount(7.9)).toBe(7)
  })
  it('begrenzt einen Massenstart', () => {
    expect(allowedLaunch(100000, 0)).toEqual({ count: MAX_LAUNCH_AT_ONCE, reason: 'per-launch-cap' })
    expect(allowedLaunch(50, MAX_AGENTS_TOTAL - 10)).toEqual({ count: 10, reason: 'total-cap' })
    expect(allowedLaunch(5, MAX_AGENTS_TOTAL)).toEqual({ count: 0, reason: 'full' })
    expect(allowedLaunch(-3, 0).reason).toBe('invalid')
    expect(allowedLaunch(10, 0)).toEqual({ count: 10, reason: 'ok' })
  })
})

describe('Store: launchAgents mit Fehlbedienung', () => {
  const st = () => useWorld.getState()
  it('100000 Agenten werden auf die Obergrenze gekürzt, die Welt bleibt unter dem Limit', () => {
    st().removeAgents(() => true)
    st().launchAgents({ floorId: 'floor-herkulesjobs', count: 100000 })
    expect(Object.keys(st().agents).length).toBe(MAX_LAUNCH_AT_ONCE)
    expect(st().notice).toContain('Höchstens')
    for (let i = 0; i < 10; i++) st().launchAgents({ floorId: 'floor-herkulesjobs', count: 100000 })
    expect(Object.keys(st().agents).length).toBe(MAX_AGENTS_TOTAL)
    expect(st().launchAgents({ count: 5 })).toEqual([])
  })
  it('ungültige Anzahl, unbekannte Etage und Abteilung führen nicht zum Absturz', () => {
    st().removeAgents(() => true)
    expect(st().launchAgents({ floorId: 'floor-gibt-es-nicht', count: NaN })).toEqual([])
    expect(st().launchAgents({ floorId: 'floor-gibt-es-nicht', count: -1 })).toEqual([])
    const ids = st().launchAgents({ floorId: 'floor-gibt-es-nicht', departmentId: 'dept-quatsch', count: 3 })
    expect(ids.length).toBe(3)
    // Auf der aktuellen Etage gelandet, nicht in einer erfundenen
    for (const id of ids) expect(st().agents[id].floorId).toBe(st().floorId)
  })
  it('Stresstest mit Unsinn bleibt begrenzt', () => {
    st().removeAgents(() => true)
    st().stress(1e9)
    expect(Object.keys(st().agents).length).toBe(MAX_LAUNCH_AT_ONCE)
    st().stress(NaN as unknown as number)
    expect(Object.keys(st().agents).filter((k) => k.startsWith('agent-stress-')).length).toBe(0)
  })
})
