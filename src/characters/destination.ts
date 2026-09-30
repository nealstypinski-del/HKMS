// Übersetzt den Agentenstatus in eine geordnete Liste möglicher Zielplätze (Waypoints).

import type { Agent, Desk } from '../agents/agent.types'
import type { Slot } from '../config/floorLayouts'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { deskSlot, slotsOf } from '../navigation/slots'

export const departmentFloor = (departmentId: string): number => INITIAL_DEPARTMENTS.find((d) => d.id === departmentId)?.floor ?? 0

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Bevorzugter Ruheplatz im Leerlauf: Agentenbank oder Lounge, stabil pro Agent. */
export const prefersBench = (agentId: string): boolean => hash(agentId) % 2 === 0

export function candidateSlots(agent: Agent, desk: Desk | undefined): Slot[] {
  switch (agent.status) {
    case 'working':
    case 'waiting':
      return desk ? [deskSlot(desk)] : slotsOf(0, 'agentBench')
    case 'idle': {
      const bench = slotsOf(0, 'agentBench')
      const lounge = slotsOf(0, 'lounge')
      return prefersBench(agent.id) ? [...bench, ...lounge] : [...lounge, ...bench]
    }
    case 'break':
      return [...slotsOf(0, 'kitchen'), ...slotsOf(0, 'lounge')]
    case 'meeting':
      return [...slotsOf(departmentFloor(agent.department), 'meetingRoom'), ...slotsOf(0, 'lounge')]
    case 'offline':
      return []
  }
}
