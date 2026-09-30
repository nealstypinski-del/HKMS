import type {
  ActivityKind,
  AgentId,
  AgentIntent,
  AgentMessage,
  AgentStatus,
  AnchorId,
  ArrivalAction,
  BreakKind,
  DepartmentId,
  Location,
  MeetingId,
  MeetingOrigin,
  OperationsMode,
  Priority,
  RouteStage,
  TaskDepartment,
  TaskId,
  TaskOrigin,
  WorkflowRunId,
  ZoneId,
} from './types';
import type { ClockMode, SimSpeed } from './clock';

/** Alle Ereignisse mit typisierter Nutzlast. Keine Strings ohne Typ. */
export interface SimEventMap {
  SIMULATION_STARTED: { operations: OperationsMode; scenarioId: string | null };
  SIMULATION_PAUSED: Record<string, never>;
  SIMULATION_RESUMED: Record<string, never>;
  SIMULATION_RESET: { seed: string };
  CLOCK_CHANGED: { mode: ClockMode; speed: SimSpeed };

  TASK_CREATED: {
    taskId: TaskId;
    title: string;
    departmentId: TaskDepartment;
    priority: Priority;
    origin: TaskOrigin;
    requiredCapabilities: string[];
  };
  TASK_ASSIGNED: { taskId: TaskId; agentId: AgentId; deskAnchorId: AnchorId };
  TASK_STARTED: { taskId: TaskId; agentId: AgentId };
  TASK_COMPLETED: { taskId: TaskId; agentId: AgentId | null; durationMs: number };
  TASK_FAILED: { taskId: TaskId; agentId: AgentId | null; reason: string };
  TASK_CANCELLED: { taskId: TaskId; agentId: AgentId | null };
  TASK_REQUEUED: { taskId: TaskId; reason: string };

  AGENT_AVAILABLE: { agentId: AgentId; location: Location };
  AGENT_ASSIGNED: { agentId: AgentId; taskId: TaskId; deskAnchorId: AnchorId };
  AGENT_STATUS_CHANGED: { agentId: AgentId; from: AgentStatus; to: AgentStatus; intent: AgentIntent };
  AGENT_INTENT_CHANGED: { agentId: AgentId; from: AgentIntent; to: AgentIntent; activity: ActivityKind | null };
  AGENT_MOVEMENT_REQUESTED: {
    agentId: AgentId;
    intent: AgentIntent;
    destination: Location;
    destinationAnchorId: AnchorId | null;
    stages: RouteStage[];
  };
  AGENT_ROUTE_STAGE_STARTED: { agentId: AgentId; stageIndex: number; stage: RouteStage };
  AGENT_ARRIVED: { agentId: AgentId; location: Location; arrival: ArrivalAction };

  BREAK_STARTED: { agentId: AgentId; kind: BreakKind; anchorId: AnchorId; activity: ActivityKind; visualOnly: true };
  BREAK_ENDED: { agentId: AgentId; kind: BreakKind; reason: 'COMPLETED' | 'INTERRUPTED' };

  MEETING_CREATED: { meetingId: MeetingId; title: string; participantAgentIds: AgentId[]; origin: MeetingOrigin };
  MEETING_ASSEMBLING: {
    meetingId: MeetingId;
    roomId: ZoneId;
    participantAgentIds: AgentId[];
    seatByAgent: Record<AgentId, AnchorId>;
  };
  MEETING_STARTED: { meetingId: MeetingId; roomId: ZoneId };
  MEETING_COMPLETED: { meetingId: MeetingId };
  MEETING_CANCELLED: { meetingId: MeetingId; reason: string };

  APPROVAL_REQUIRED: { taskId: TaskId; agentId: AgentId | null; departmentId: TaskDepartment; title: string };
  APPROVAL_GRANTED: { taskId: TaskId; agentId: AgentId | null; by: 'HUMAN' | 'MOCK_AUTO' };
  APPROVAL_DENIED: { taskId: TaskId; agentId: AgentId | null };

  /** Echte Agentenkommunikation (unabhängig von ihrer Visualisierung). */
  AGENT_MESSAGE: AgentMessage;

  PROVIDER_STARTED: { providerId: string };
  PROVIDER_STOPPED: { providerId: string; reason?: string };

  WORKFLOW_STARTED: { runId: WorkflowRunId; workflowId: string };
  WORKFLOW_STEP_STARTED: { runId: WorkflowRunId; workflowId: string; stepIndex: number };
  WORKFLOW_COMPLETED: { runId: WorkflowRunId; workflowId: string; outcome: 'COMPLETED' | 'FAILED' };
}

export type SimEventType = keyof SimEventMap;

export interface SimEventEnvelope<K extends SimEventType> {
  type: K;
  seq: number;
  /** Simulationszeit in ms (Unix Epoche der Simulation). */
  timeMs: number;
  payload: SimEventMap[K];
}

export type SimEvent = { [K in SimEventType]: SimEventEnvelope<K> }[SimEventType];

export type EventHandler<K extends SimEventType> = (event: SimEventEnvelope<K>) => void;
export type AnyEventHandler = (event: SimEvent) => void;
export type Unsubscribe = () => void;

/**
 * Ereignisbus mit Warteschlange. Ereignisse werden erst beim flush() ausgeliefert, damit
 * Handler den Zustand nie mitten in einer Berechnung sehen. Handler dürfen Kommandos
 * absetzen, neue Ereignisse werden in derselben flush Schleife nachgeliefert.
 */
export class EventBus {
  seq = 0;
  lastHandlerError: unknown = null;
  private handlers = new Map<SimEventType, Set<(e: never) => void>>();
  private anyHandlers = new Set<AnyEventHandler>();
  private queue: SimEvent[] = [];
  private flushing = false;

  constructor(seq = 0) {
    this.seq = seq;
  }

  emit<K extends SimEventType>(type: K, timeMs: number, payload: SimEventMap[K]): void {
    this.seq += 1;
    this.queue.push({ type, seq: this.seq, timeMs, payload } as SimEvent);
  }

  on<K extends SimEventType>(type: K, handler: EventHandler<K>): Unsubscribe {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as (e: never) => void);
    return () => set!.delete(handler as (e: never) => void);
  }

  onAny(handler: AnyEventHandler): Unsubscribe {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  flush(): void {
    if (this.flushing) return;
    this.flushing = true;
    try {
      for (let i = 0; i < this.queue.length; i++) {
        const event = this.queue[i]!;
        const specific = this.handlers.get(event.type);
        if (specific) for (const h of specific) this.safe(() => (h as (e: SimEvent) => void)(event));
        for (const h of this.anyHandlers) this.safe(() => h(event));
      }
    } finally {
      this.queue = [];
      this.flushing = false;
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this.lastHandlerError = err;
    }
  }
}

export type { DepartmentId };
