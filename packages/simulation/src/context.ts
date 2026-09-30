import type { AnchorBook } from './anchors';
import type { SimulationClock } from './clock';
import type { DeskAssignmentService } from './desks';
import type { EventBus, SimEventMap, SimEventType } from './events';
import type { ActivityLog } from './log';
import type { RoutePlanner } from './movement';
import type { Rng } from './rng';
import type { TaskRouter } from './routing';
import type { SimulationState } from './state';
import type { AgentSystem } from './systems/agents';
import type { MeetingSystem } from './systems/meetings';
import type { MockWorkSystem } from './systems/mockWork';
import type { TaskSystem } from './systems/tasks';
import type { WorkflowSystem } from './systems/workflows';
import type { Agent, AgentStatus } from './types';

/** Gemeinsamer Kontext aller Teilsysteme. */
export interface Ctx {
  state: SimulationState;
  bus: EventBus;
  log: ActivityLog;
  clock: SimulationClock;
  rng: Rng;
  anchors: AnchorBook;
  router: TaskRouter;
  desks: DeskAssignmentService;
  planner: RoutePlanner;
  agentList: Agent[];
  statusCounts: Record<AgentStatus, number>;
  flags: { dispatchDirty: boolean };
  systems: {
    agents: AgentSystem;
    tasks: TaskSystem;
    meetings: MeetingSystem;
    workflows: WorkflowSystem;
    mock: MockWorkSystem;
  };
  hooks: ExternalHooks;
  now(): number;
  emit<K extends SimEventType>(type: K, payload: SimEventMap[K]): void;
  /** Merkt das letzte Ereignis am Agenten und schreibt in den Aktivitätslog. */
  note(agent: Agent, type: string, text: string): void;
}

/** Rückkanäle in die echte Welt (Provider). Bleiben ungesetzt, solange es keine echten Provider gibt. */
export interface ExternalHooks {
  onApprovalDecision?: (info: { taskId: string; externalRef: { providerId: string; sessionId: string } | null; granted: boolean }) => void;
}
