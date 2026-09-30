import { create } from 'zustand'
import type { Task, TaskStatus } from './task.types'

interface TaskState {
  tasks: Record<string, Task>
  counter: number
  createTask: (input: { title: string; departmentId: string; agentId?: string; providerId: string; status?: TaskStatus }) => Task
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  clear: () => void
}

// Tasks sind Laufzeitdaten und werden in Loop 1 bewusst nicht persistiert.
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: {},
  counter: 0,
  createTask: (input) => {
    const n = get().counter + 1
    const now = Date.now()
    const task: Task = { id: `task-${n}`, title: input.title, departmentId: input.departmentId, agentId: input.agentId, providerId: input.providerId, status: input.status ?? 'queued', createdAt: now, updatedAt: now }
    set((s) => ({ counter: n, tasks: { ...s.tasks, [task.id]: task } }))
    return task
  },
  updateTask: (id, patch) =>
    set((s) => {
      const t = s.tasks[id]
      return t ? { tasks: { ...s.tasks, [id]: { ...t, ...patch, updatedAt: Date.now() } } } : s
    }),
  clear: () => set({ tasks: {}, counter: 0 }),
}))

export const isActiveTask = (t: Task): boolean => t.status === 'running' || t.status === 'waiting' || t.status === 'queued' || t.status === 'paused'
