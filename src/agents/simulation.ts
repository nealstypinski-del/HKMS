// Demo Modus "Simulate Workday": steuert Agenten über denselben Service wie die Debug Aktionen.
// Deterministisch (Seed PRNG), damit Abläufe reproduzierbar sind. Keine echte KI, keine Netzwerkzugriffe.

import { create } from 'zustand'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { setStatus } from './agent.service'
import { useAgentStore } from './agent.store'
import type { Agent } from './agent.types'

export type SimulationSpeed = 1 | 2 | 4

interface SimulationState {
  running: boolean
  speed: SimulationSpeed
}

export const useSimulationStore = create<SimulationState>(() => ({ running: false, speed: 1 }))

const BASE_INTERVAL_MS = 2600
const MAX_CHANGES_PER_TICK = 3

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const floorOf = (a: Agent): number => INITIAL_DEPARTMENTS.find((d) => d.id === a.department)?.floor ?? 0

export interface Simulation {
  tick: () => number
}

export function createSimulation(seed = 20260930): Simulation {
  const rand = mulberry32(seed)
  const meetingEndsAt = new Map<string, number>()
  let n = 0

  const tick = (): number => {
    n += 1
    let changes = 0
    const change = (id: string, status: Agent['status']): void => {
      if (changes >= MAX_CHANGES_PER_TICK) return
      if (setStatus(id, status)) changes += 1
    }
    const list = useAgentStore.getState().order.map((id) => useAgentStore.getState().agents[id] as Agent)
    const working = list.filter((a) => a.status === 'working').length

    for (const a of list) {
      const r = rand()
      switch (a.status) {
        case 'idle':
          if (r < (working < 4 ? 0.55 : 0.28)) change(a.id, 'working')
          else if (r > 0.93) change(a.id, 'break')
          break
        case 'working':
          if (r < 0.1) change(a.id, 'waiting')
          else if (r > 0.9 && working > 3) change(a.id, 'idle')
          break
        case 'waiting':
          if (r < 0.4) change(a.id, 'working')
          break
        case 'break':
          if (r < 0.28) change(a.id, 'idle')
          break
        case 'meeting':
          if (n >= (meetingEndsAt.get(a.id) ?? 0)) change(a.id, 'idle')
          break
        case 'offline':
          break
      }
    }

    // Alle paar Ticks ein kleines Meeting auf einer Etage.
    if (n % 7 === 0) {
      const floor = 1 + Math.floor(rand() * 3)
      const group = list.filter((a) => floorOf(a) === floor && (a.status === 'idle' || a.status === 'waiting')).slice(0, 3)
      if (group.length >= 2) {
        for (const a of group) {
          meetingEndsAt.set(a.id, n + 3 + Math.floor(rand() * 2))
          setStatus(a.id, 'meeting')
          changes += 1
        }
      }
    }
    return changes
  }
  return { tick }
}

let timer: ReturnType<typeof setInterval> | undefined
let current: Simulation | undefined

function schedule(): void {
  if (timer) clearInterval(timer)
  timer = setInterval(() => current?.tick(), BASE_INTERVAL_MS / useSimulationStore.getState().speed)
}

export function startSimulation(): void {
  current = createSimulation()
  useSimulationStore.setState({ running: true })
  current.tick()
  schedule()
}

export function stopSimulation(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  useSimulationStore.setState({ running: false })
}

export function setSimulationSpeed(speed: SimulationSpeed): void {
  useSimulationStore.setState({ speed })
  if (useSimulationStore.getState().running) schedule()
}
