import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemo } from './agent.service'
import { useAgentStore } from './agent.store'
import { createSimulation, mulberry32 } from './simulation'

const snapshot = () => Object.values(useAgentStore.getState().agents).map((a) => `${a.id}:${a.status}`).join('|')

describe('Simulation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('PRNG ist deterministisch', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('erzeugt bei gleichem Seed denselben Ablauf und ändert Zustände', () => {
    const run = () => {
      resetDemo()
      const sim = createSimulation(7)
      for (let i = 0; i < 20; i++) sim.tick()
      return snapshot()
    }
    const first = run()
    const second = run()
    expect(first).toBe(second)
    resetDemo()
    expect(first).not.toBe(snapshot())
  })
})
