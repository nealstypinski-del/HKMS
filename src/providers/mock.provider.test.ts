import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockProvider } from './mock.provider'

describe('MockProvider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('durchläuft starting und working und schreibt Terminal Zeilen', async () => {
    const p = new MockProvider({ startDelayMs: 1000, lineIntervalMs: 500 })
    const s = await p.startSession({ agentId: 'a1', role: 'Developer Agent', taskTitle: 'Test' })
    expect((await p.getSessionStatus(s.id)).state).toBe('starting')
    await vi.advanceTimersByTimeAsync(1100)
    expect((await p.getSessionStatus(s.id)).state).toBe('working')
    await vi.advanceTimersByTimeAsync(1600)
    const status = await p.getSessionStatus(s.id)
    expect(status.lines.length).toBeGreaterThan(3)
    expect(status.lines[0]!.text).toContain('simuliert')
    p.dispose()
  })

  it('unterstützt waiting, completed und failed über simulateState und meldet Ereignisse', async () => {
    const p = new MockProvider({ startDelayMs: 10 })
    const events: string[] = []
    p.onSessionEvent((e) => events.push(e.state))
    const s = await p.startSession({ agentId: 'a2', role: 'Sales Agent' })
    await vi.advanceTimersByTimeAsync(20)
    p.simulateState(s.id, 'waiting')
    p.simulateState(s.id, 'completed')
    expect(events).toEqual(['starting', 'working', 'waiting', 'completed'])
    p.dispose()
  })

  it('meldet einen Fehler für unbekannte Sessions', async () => {
    const p = new MockProvider()
    await expect(p.getSessionStatus('nope')).rejects.toThrow()
  })
})
