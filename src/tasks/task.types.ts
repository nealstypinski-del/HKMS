export type TaskStatus = 'queued' | 'running' | 'waiting' | 'paused' | 'done' | 'failed'

export interface Task {
  id: string
  title: string
  departmentId: string
  agentId?: string
  status: TaskStatus
  providerId: string
  createdAt: number
  updatedAt: number
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  queued: 'Wartet in Queue',
  running: 'Läuft',
  waiting: 'Wartet auf Freigabe',
  paused: 'Pausiert',
  done: 'Erledigt',
  failed: 'Fehlgeschlagen',
}
