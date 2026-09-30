// Kleine, reine State Machine für Figuren. Sie kennt keine 3D Objekte und keine Stores.
//
//   IDLE --Task--> WALKING_TO_DESK --angekommen--> WORKING --braucht Freigabe--> WAITING
//   WAITING --Freigabe--> WORKING --Task fertig--> WALKING_TO_IDLE --angekommen--> IDLE
//   dazu: WALKING_TO_BREAK / ON_BREAK, WALKING_TO_MEETING / IN_MEETING, OFFLINE

import type { AgentStatus } from '../agents/agent.types'

export type CharacterPhase =
  | 'IDLE'
  | 'WALKING_TO_DESK'
  | 'WORKING'
  | 'WAITING'
  | 'WALKING_TO_IDLE'
  | 'WALKING_TO_BREAK'
  | 'ON_BREAK'
  | 'WALKING_TO_MEETING'
  | 'IN_MEETING'
  | 'OFFLINE'

export type MachineEvent = { type: 'STATUS'; status: AgentStatus } | { type: 'ARRIVED'; status: AgentStatus }

export function transition(phase: CharacterPhase, event: MachineEvent): CharacterPhase {
  if (event.type === 'STATUS') {
    switch (event.status) {
      case 'working':
        return phase === 'WORKING' || phase === 'WAITING' ? 'WORKING' : 'WALKING_TO_DESK'
      case 'waiting':
        return phase === 'WORKING' || phase === 'WAITING' ? 'WAITING' : 'WALKING_TO_DESK'
      case 'idle':
        return phase === 'IDLE' ? 'IDLE' : 'WALKING_TO_IDLE'
      case 'break':
        return phase === 'ON_BREAK' ? 'ON_BREAK' : 'WALKING_TO_BREAK'
      case 'meeting':
        return phase === 'IN_MEETING' ? 'IN_MEETING' : 'WALKING_TO_MEETING'
      case 'offline':
        return 'OFFLINE'
    }
  }
  switch (phase) {
    case 'WALKING_TO_DESK':
      return event.status === 'waiting' ? 'WAITING' : 'WORKING'
    case 'WALKING_TO_IDLE':
      return 'IDLE'
    case 'WALKING_TO_BREAK':
      return 'ON_BREAK'
    case 'WALKING_TO_MEETING':
      return 'IN_MEETING'
    default:
      return phase
  }
}

export const isWalking = (phase: CharacterPhase): boolean => phase.startsWith('WALKING')

export const PHASE_LABEL: Record<CharacterPhase, string> = {
  IDLE: 'Wartet',
  WALKING_TO_DESK: 'Geht zum Arbeitsplatz',
  WORKING: 'Arbeitet',
  WAITING: 'Wartet auf Freigabe',
  WALKING_TO_IDLE: 'Geht zur Agentenbank',
  WALKING_TO_BREAK: 'Geht in die Pause',
  ON_BREAK: 'In der Pause',
  WALKING_TO_MEETING: 'Geht ins Meeting',
  IN_MEETING: 'Im Meeting',
  OFFLINE: 'Offline',
}
