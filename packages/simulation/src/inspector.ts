import type { SimulationState } from './state';
import type { ActivityKind, Agent, AgentIntent, AgentStatus, DepartmentId, Location, RouteStageKind } from './types';

export interface AgentInspectorData {
  id: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  capabilities: string[];
  status: AgentStatus;
  intent: AgentIntent;
  activity: ActivityKind | null;
  location: Location;
  currentTask: { id: string; title: string; status: string; origin: string } | null;
  desk: string | null;
  holdAnchor: string | null;
  meeting: { id: string; title: string; status: string } | null;
  /** Wartende Aufgaben der Abteilung des Agenten. */
  queue: { departmentQueued: number };
  route: { stage: RouteStageKind; stageIndex: number; stageCount: number; destination: Location } | null;
  breakKind: string | null;
  protectedFromMock: boolean;
  lastEvent: { timeMs: number; type: string; text: string } | null;
}

export function inspectAgent(state: SimulationState, a: Agent): AgentInspectorData {
  const task = a.taskId ? state.tasks[a.taskId] : undefined;
  const meeting = a.meetingId ? state.meetings[a.meetingId] : undefined;
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    departmentId: a.departmentId,
    capabilities: [...a.capabilities],
    status: a.status,
    intent: a.intent,
    activity: a.activity,
    location: { ...a.location },
    currentTask: task ? { id: task.id, title: task.title, status: task.status, origin: task.origin } : null,
    desk: a.deskAnchorId,
    holdAnchor: a.holdAnchorId,
    meeting: meeting ? { id: meeting.id, title: meeting.title, status: meeting.status } : null,
    queue: { departmentQueued: state.queues[a.departmentId].length },
    route: a.route
      ? { stage: a.route.stages[a.route.stageIndex]!.kind, stageIndex: a.route.stageIndex, stageCount: a.route.stages.length, destination: { ...a.route.destination } }
      : null,
    breakKind: a.breakPlan?.kind ?? null,
    protectedFromMock: !!task && task.origin === 'EXTERNAL',
    lastEvent: a.lastEvent ? { ...a.lastEvent } : null,
  };
}
