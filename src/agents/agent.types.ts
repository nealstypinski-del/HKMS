export type AgentStatus = 'idle' | 'working' | 'meeting' | 'waiting' | 'break' | 'offline'
export type ProviderId = 'mock' | 'claude' | 'codex' | 'auto'
export type ComputerState = 'offline' | 'idle' | 'working' | 'waiting'

export interface AgentAvatar {
  skinVariant: string
  hairStyle: string
  hairVariant: string
  shirtStyle: string
  shirtVariant: string
  pantsVariant: string
  accessory?: string
}

export interface Agent {
  id: string
  displayName: string
  role: string
  department: string
  status: AgentStatus
  provider: ProviderId
  currentTaskId?: string
  deskId?: string
  /** Bevorzugter Arbeitsplatz, wird bei Aufgabenvergabe zuerst versucht */
  homeDeskId?: string
  avatar: AgentAvatar
}

export interface Desk {
  id: string
  departmentId: string
  /** Weltposition der Schreibtischmitte [x, Etagenhöhe, z] */
  position: [number, number, number]
  label: string
  assignedAgentId?: string
  computer: {
    state: ComputerState
    provider?: string
    terminalSessionId?: string
  }
}

export const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: 'Frei', color: '#c9d3ea' },
  working: { label: 'Arbeitet', color: '#3ddc84' },
  waiting: { label: 'Wartet auf Freigabe', color: '#ffc94d' },
  break: { label: 'Pause', color: '#4dd2e8' },
  meeting: { label: 'Meeting', color: '#6ea8ff' },
  offline: { label: 'Offline', color: '#59627f' },
}

export const AGENT_STATUSES: readonly AgentStatus[] = ['idle', 'working', 'waiting', 'break', 'meeting', 'offline']
