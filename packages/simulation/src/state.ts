import { createClockState, DEFAULT_START_MS, type ClockState } from './clock';
import { buildLayout, layoutOptionsForRoster, GROUND_FLOOR, type LayoutOptions } from './layout';
import type { LogState } from './log';
import { hashSeed } from './rng';
import { makeRoster, makeRosterOfSize, type AgentSeed } from './roster';
import type {
  ActivityAnchor,
  Agent,
  AgentId,
  AnchorId,
  DepartmentId,
  LayoutData,
  Meeting,
  MeetingSpec,
  OperationsMode,
  SimConfig,
  Task,
  TaskId,
  TaskSpec,
  TaskSummary,
  WorkflowRunId,
} from './types';

export type WorkProfile = 'BALANCED' | 'HJ_SALES' | 'KM_TREND' | 'DEV';

export interface GeneratorState {
  enabled: boolean;
  profile: WorkProfile;
  /** Angestrebte Auslastung (0 bis 1) der online Agenten. */
  targetUtilization: number;
  nextAtMs: number | null;
  /** Anteil der Ankünfte, die als mehrstufiger Workflow starten. */
  workflowShare: number;
  /** Multiplikator für die Freigabewahrscheinlichkeit. */
  approvalScale: number;
}

export type ScheduledAction =
  | { type: 'START_WORKFLOW'; workflowId: string; priority?: TaskSpec['priority'] }
  | { type: 'CREATE_TASK'; spec: TaskSpec }
  | { type: 'CREATE_MEETING'; spec: MeetingSpec }
  | { type: 'SET_GENERATOR'; patch: Partial<GeneratorState> }
  | { type: 'GRANT_ALL_APPROVALS' };

export interface ScheduledCommand {
  id: number;
  atMs: number;
  action: ScheduledAction;
}

export interface WorkflowRun {
  id: WorkflowRunId;
  workflowId: string;
  stepIndex: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  priority: TaskSpec['priority'];
  /** Agent, der den jeweiligen Schritt bearbeitet hat. */
  agentByStep: Record<number, AgentId>;
  currentTaskId: TaskId | null;
  currentMeetingId: string | null;
  startedAtMs: number;
}

export interface InitOptions {
  seed: string;
  rosterCopies: number;
  /** Alternative zu rosterCopies: genau n Agenten (zyklisch). */
  rosterSize?: number;
}

export const SIMULATION_STATE_VERSION = 1;

export interface SimulationState {
  version: typeof SIMULATION_STATE_VERSION;
  seed: string;
  rngState: number;
  init: InitOptions;
  config: SimConfig;
  clock: ClockState;
  accumulatorMs: number;
  tickCount: number;
  eventSeq: number;

  running: boolean;
  operations: OperationsMode;
  scenarioId: string | null;
  generator: GeneratorState;
  schedule: ScheduledCommand[];

  layout: LayoutData;
  anchors: Record<AnchorId, ActivityAnchor>;
  agentOrder: AgentId[];
  agents: Record<AgentId, Agent>;
  tasks: Record<TaskId, Task>;
  /** Warteschlangen je Abteilung (Task Ids in Einreihungsreihenfolge). */
  queues: Record<DepartmentId | 'ANY', TaskId[]>;
  meetings: Record<string, Meeting>;
  workflowRuns: Record<WorkflowRunId, WorkflowRun>;
  taskHistory: TaskSummary[];
  meetingHistory: Array<{ id: string; title: string; status: Meeting['status']; participantAgentIds: AgentId[]; endedAtMs: number | null }>;
  counters: Record<string, number>;
  log: LogState;
}

export const DEFAULT_CONFIG: SimConfig = {
  tickIntervalMs: 250,
  walkSpeedMps: 1.4,
  movementMode: 'SIMULATED',
  confirmTimeoutFactor: 4,
  approvalBehavior: 'GO_TO_WAITING_AREA',
  timeZone: 'Europe/Berlin',
  mockAutoApproveAfterMs: null,
  operations: 'CONTINUOUS_OPERATIONS',
  workday: { startMinute: 8 * 60, endMinute: 18 * 60, arrivalWindowMs: 10 * 60_000 },
  idle: {
    decisionMinMs: 20_000,
    decisionMaxMs: 90_000,
    stayWeight: 6,
    kitchenWeight: 3,
    loungeWeight: 2,
    wanderWeight: 1,
    wellnessWeight: 1,
    breakCooldownMs: 300_000,
    maxBreakShare: 0.25,
  },
  timings: {
    standUpMs: 700,
    completedLingerMs: 1500,
    idleTransitionMinMs: 500,
    idleTransitionMaxMs: 2500,
    elevatorWaitMs: 3000,
    elevatorEnterMs: 1000,
    elevatorFloorMs: 2000,
    elevatorExitMs: 1000,
    meetingScheduleTimeoutMs: 300_000,
    meetingAssembleTimeoutMs: 180_000,
    defaultMeetingMs: 45_000,
  },
  agingMs: 120_000,
  logCapacity: 500,
  historyCapacity: 200,
  invariantCheckEveryTicks: 0,
  autosaveEveryTicks: 0,
};

export const DEFAULT_GENERATOR: GeneratorState = {
  enabled: false,
  profile: 'BALANCED',
  targetUtilization: 0.55,
  nextAtMs: null,
  workflowShare: 0.12,
  approvalScale: 1,
};

export function mergeConfig(base: SimConfig, patch: DeepPartial<SimConfig> = {}): SimConfig {
  return {
    ...base,
    ...(patch as Partial<SimConfig>),
    workday: { ...base.workday, ...(patch.workday ?? {}) },
    idle: { ...base.idle, ...(patch.idle ?? {}) },
    timings: { ...base.timings, ...(patch.timings ?? {}) },
  };
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface CreateStateOptions extends Partial<InitOptions> {
  config?: DeepPartial<SimConfig>;
  startMs?: number;
  /** Eigenes Roster (überschreibt rosterCopies / rosterSize). Nur für Tests. */
  roster?: AgentSeed[];
  layout?: LayoutOptions;
}

export function rosterFor(init: InitOptions): AgentSeed[] {
  if (init.rosterSize !== undefined) return makeRosterOfSize(init.rosterSize);
  return makeRoster(init.rosterCopies);
}

export function createInitialState(opts: CreateStateOptions = {}): SimulationState {
  const init: InitOptions = {
    seed: opts.seed ?? 'HERKULES-001',
    rosterCopies: opts.rosterCopies ?? 1,
    ...(opts.rosterSize !== undefined ? { rosterSize: opts.rosterSize } : {}),
  };
  const seeds = opts.roster ?? rosterFor(init);
  const layoutOpts = opts.layout ?? layoutOptionsForRoster(seeds);
  const { layout, anchors } = buildLayout(layoutOpts);
  const config = mergeConfig(DEFAULT_CONFIG, opts.config);

  const agents: Record<AgentId, Agent> = {};
  const agentOrder: AgentId[] = [];
  seeds.forEach((s) => {
    agentOrder.push(s.id);
    agents[s.id] = {
      id: s.id,
      name: s.name,
      role: s.role,
      departmentId: s.departmentId,
      capabilities: [...s.capabilities],
      providerId: s.providerId,
      demo: true,
      status: 'OFFLINE',
      intent: 'IDLE',
      activity: null,
      location: { floorId: GROUND_FLOOR, zoneId: 'lobby', anchorId: null },
      taskId: null,
      meetingId: null,
      deskAnchorId: null,
      holdAnchorId: null,
      occupiedAnchorId: null,
      preferredDeskId: null,
      preferredBenchId: null,
      route: null,
      breakPlan: null,
      wake: null,
      tasksCompleted: 0,
      lastBreakEndMs: 0,
      lastEvent: null,
    };
  });

  return {
    version: SIMULATION_STATE_VERSION,
    seed: init.seed,
    rngState: hashSeed(init.seed),
    init,
    config,
    clock: createClockState(opts.startMs ?? DEFAULT_START_MS),
    accumulatorMs: 0,
    tickCount: 0,
    eventSeq: 0,
    running: false,
    operations: config.operations,
    scenarioId: null,
    generator: { ...DEFAULT_GENERATOR },
    schedule: [],
    layout,
    anchors,
    agentOrder,
    agents,
    tasks: {},
    queues: { HERKULESJOBS: [], KASSELMEMES: [], SHARED: [], ANY: [] },
    meetings: {},
    workflowRuns: {},
    taskHistory: [],
    meetingHistory: [],
    counters: {},
    log: { seq: 0, entries: [] },
  };
}
