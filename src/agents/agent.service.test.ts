import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskStore } from '../tasks/task.store'
import { bootstrap, resetDemo, setStatus } from './agent.service'
import { useAgentStore } from './agent.store'

const agent = (id: string) => useAgentStore.getState().agents[id]!
const desk = (id: string) => useAgentStore.getState().desks[id]!

describe('agentService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetDemo()
  })
  afterEach(() => vi.useRealTimers())

  it('startet mit konsistenten Arbeitsplätzen für arbeitende und wartende Agenten', async () => {
    await vi.advanceTimersByTimeAsync(2000)
    const a = agent('hj-lead-research')
    expect(a.status).toBe('working')
    expect(a.deskId).toBe('hj-sales-01')
    expect(desk('hj-sales-01').assignedAgentId).toBe(a.id)
    expect(desk('hj-sales-01').computer.state).toBe('working')
    expect(desk('hj-sales-01').computer.terminalSessionId).toMatch(/^mock-session-/)
    expect(agent('hj-sales').status).toBe('waiting')
    expect(desk('hj-sales-02').computer.state).toBe('waiting')
  })

  it('weist beim Arbeiten einen Platz zu und gibt ihn bei Idle frei', async () => {
    expect(agent('hj-outreach').deskId).toBeUndefined()
    setStatus('hj-outreach', 'working')
    await vi.advanceTimersByTimeAsync(2000)
    const a = agent('hj-outreach')
    expect(a.deskId).toBe('hj-sales-03')
    expect(desk('hj-sales-03').computer.state).toBe('working')
    expect(useTaskStore.getState().tasks[a.currentTaskId!]!.status).toBe('running')

    setStatus('hj-outreach', 'idle')
    expect(agent('hj-outreach').deskId).toBeUndefined()
    expect(desk('hj-sales-03').assignedAgentId).toBeUndefined()
    expect(desk('hj-sales-03').computer.state).toBe('offline')
  })

  it('pausiert die Aufgabe bei Break und setzt sie danach fort', async () => {
    await vi.advanceTimersByTimeAsync(2000)
    const taskId = agent('hj-lead-research').currentTaskId!
    setStatus('hj-lead-research', 'break')
    expect(useTaskStore.getState().tasks[taskId]!.status).toBe('paused')
    setStatus('hj-lead-research', 'working')
    expect(agent('hj-lead-research').currentTaskId).toBe(taskId)
    expect(useTaskStore.getState().tasks[taskId]!.status).toBe('running')
  })

  it('bootstrap ist wiederholbar ohne doppelte Sessions', () => {
    bootstrap()
    bootstrap()
    expect(Object.values(useTaskStore.getState().tasks).length).toBeGreaterThan(0)
  })
})
