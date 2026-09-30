import type { Agent, AgentStatus, DepartmentId } from './types';
import { DEPARTMENTS } from './types';
import type { SimulationState } from './state';

export interface DepartmentMetrics {
  /** Agenten der Abteilung, die nicht offline oder im Fehlerzustand sind. */
  capacity: number;
  /** Agenten mit Aufgabe, Weg zur Aufgabe oder Meeting. */
  active: number;
  available: number;
  queueLength: number;
  waitingApproval: number;
}

export interface SimulationMetrics {
  totalAgents: number;
  availableAgents: number;
  workingAgents: number;
  waitingAgents: number;
  meetingAgents: number;
  breakAgents: number;
  offlineAgents: number;
  movingAgents: number;
  errorAgents: number;
  completedAgents: number;
  queuedTasks: number;
  activeTasks: number;
  waitingApprovalTasks: number;
  activeMeetings: number;
  /**
   * 0 bis 100. Reine Simulations/UI Metadaten (Umgebungsstimmung), KEIN Geschäftskennwert.
   * 55 % Arbeit und Bewegung, 20 % Meetings, 25 % Warteschlangendruck.
   */
  activityLevel: number;
  perDepartment: Record<DepartmentId, DepartmentMetrics>;
}

export function computeMetrics(state: SimulationState, agents: readonly Agent[], counts: Record<AgentStatus, number>): SimulationMetrics {
  const per = {} as Record<DepartmentId, DepartmentMetrics>;
  for (const d of DEPARTMENTS) per[d] = { capacity: 0, active: 0, available: 0, queueLength: 0, waitingApproval: 0 };
  for (const a of agents) {
    const m = per[a.departmentId];
    if (a.status !== 'OFFLINE' && a.status !== 'ERROR') m.capacity += 1;
    if (a.status === 'AVAILABLE') m.available += 1;
    if (a.status === 'ASSIGNED' || a.status === 'MOVING' || a.status === 'WORKING' || a.status === 'MEETING') m.active += 1;
  }
  let queued = 0;
  let active = 0;
  let waiting = 0;
  for (const t of Object.values(state.tasks)) {
    if (t.status === 'QUEUED') {
      queued += 1;
      if (t.departmentId !== 'ANY') per[t.departmentId].queueLength += 1;
    } else if (t.status === 'WAITING_FOR_HUMAN') {
      waiting += 1;
      if (t.departmentId !== 'ANY') per[t.departmentId].waitingApproval += 1;
    } else active += 1;
  }
  const total = agents.length;
  const online = total - counts.OFFLINE - counts.ERROR;
  let level = 0;
  if (online > 0) {
    const work = (counts.WORKING + counts.MOVING + counts.ASSIGNED) / online;
    const meet = counts.MEETING / online;
    const pressure = Math.min(1, queued / Math.max(1, online / 2));
    level = Math.round(100 * Math.min(1, Math.max(0, 0.55 * work + 0.2 * meet + 0.25 * pressure)));
  }
  return {
    totalAgents: total,
    availableAgents: counts.AVAILABLE,
    workingAgents: counts.WORKING,
    waitingAgents: counts.WAITING,
    meetingAgents: counts.MEETING,
    breakAgents: counts.BREAK,
    offlineAgents: counts.OFFLINE,
    movingAgents: counts.MOVING + counts.ASSIGNED,
    errorAgents: counts.ERROR,
    completedAgents: counts.COMPLETED,
    queuedTasks: queued,
    activeTasks: active,
    waitingApprovalTasks: waiting,
    activeMeetings: Object.keys(state.meetings).length,
    activityLevel: level,
    perDepartment: per,
  };
}
