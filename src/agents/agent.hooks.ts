import { useShallow } from 'zustand/react/shallow'
import { isActiveTask } from '../tasks/task.store'
import { useTaskStore } from '../tasks/task.store'
import { computeAgentStats, useAgentStore, type AgentStats } from './agent.store'

export const useAgentStats = (): AgentStats => useAgentStore(useShallow((s) => computeAgentStats(s.agents)))

export const useOpenTaskCount = (): number => useTaskStore((s) => Object.values(s.tasks).filter(isActiveTask).length)

/** Kompakte Zusammenfassung einer Abteilung als primitiver Wert (vermeidet unnötige Renders). */
export const useDepartmentSummary = (departmentId: string): { total: number; working: number; waiting: number } => {
  const key = useAgentStore((s) => {
    let total = 0
    let working = 0
    let waiting = 0
    for (const a of Object.values(s.agents)) {
      if (a.department !== departmentId) continue
      total++
      if (a.status === 'working') working++
      if (a.status === 'waiting') waiting++
    }
    return `${total}|${working}|${waiting}`
  })
  const [total, working, waiting] = key.split('|').map(Number) as [number, number, number]
  return { total, working, waiting }
}
