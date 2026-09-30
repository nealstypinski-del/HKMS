/**
 * Gemeinsame Typen der Simulation. Kein Three.js, kein DOM, keine Laufzeitabhängigkeiten.
 * Alles hier ist reine, serialisierbare Datenstruktur (JSON tauglich).
 *
 * Hinweis Terminal 1: Sobald eine zentrale Domain (Agent, Task, Department) existiert,
 * werden diese Typen darauf abgebildet (siehe docs/INTEGRATION.md).
 */

export type AgentId = string;
export type TaskId = string;
export type AnchorId = string;
export type MeetingId = string;
export type FloorId = string;
export type ZoneId = string;
export type WorkflowRunId = string;

// ---------------------------------------------------------------------------
// Agentenzustand
// ---------------------------------------------------------------------------

export const AGENT_STATUSES = [
  'OFFLINE',
  'AVAILABLE',
  'ASSIGNED',
  'MOVING',
  'WORKING',
  'WAITING',
  'MEETING',
  'BREAK',
  'ERROR',
  'COMPLETED',
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_INTENTS = [
  'GO_TO_DESK',
  'USE_WORKSTATION',
  'GO_TO_AGENT_BENCH',
  'SIT_ON_AGENT_BENCH',
  'GO_TO_KITCHEN',
  'USE_KITCHEN',
  'GO_TO_LOUNGE',
  'SIT_IN_LOUNGE',
  'GO_TO_MEETING',
  'ATTEND_MEETING',
  'GO_TO_ELEVATOR',
  'CHANGE_FLOOR',
  'WAIT_FOR_APPROVAL',
  'RETURN_TO_DESK',
  'WANDER',
  'IDLE',
] as const;
export type AgentIntent = (typeof AGENT_INTENTS)[number];

/** Sichtbare Tätigkeit an einem Anker. CHAT_VISUAL ist reine Optik, keine echte Agentenkommunikation. */
export type ActivityKind =
  | 'WORK'
  | 'SIT'
  | 'STAND'
  | 'WAIT'
  | 'USE_KITCHEN'
  | 'CHAT_VISUAL'
  | 'READ'
  | 'REST'
  | 'ATTEND_MEETING'
  | 'WAIT_FOR_APPROVAL'
  | 'WATCH_TV';

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------

export const DEPARTMENTS = ['HERKULESJOBS', 'KASSELMEMES', 'SHARED'] as const;
export type DepartmentId = (typeof DEPARTMENTS)[number];
export type TaskDepartment = DepartmentId | 'ANY';

export type KnownCapability =
  | 'research'
  | 'lead_research'
  | 'lead_enrichment'
  | 'company_analysis'
  | 'job_research'
  | 'sales'
  | 'outreach'
  | 'follow_up'
  | 'copywriting'
  | 'recruiting_content'
  | 'customer_success'
  | 'account_management'
  | 'trend_detection'
  | 'local_research'
  | 'editorial'
  | 'caption'
  | 'creative'
  | 'video'
  | 'community'
  | 'partnerships'
  | 'coding'
  | 'review'
  | 'testing'
  | 'automation'
  | 'operations'
  | 'giveaway'
  | 'product_knowledge';
/** Erweiterbar: echte Provider dürfen eigene Capabilities mitbringen. */
export type Capability = KnownCapability | (string & {});

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

// ---------------------------------------------------------------------------
// Semantische Orte
// ---------------------------------------------------------------------------

export interface Location {
  floorId: FloorId;
  zoneId: ZoneId;
  anchorId: AnchorId | null;
}

export type AnchorType =
  | 'DESK'
  | 'CHAIR'
  | 'BENCH'
  | 'SOFA'
  | 'COFFEE_MACHINE'
  | 'KITCHEN_COUNTER'
  | 'MEETING_SEAT'
  | 'ELEVATOR'
  | 'WAITING_POINT'
  | 'WHITEBOARD'
  /** Fernseher: nicht belegbar (Kapazität 0), nur Blickziel für Sofas. */
  | 'TV';

export interface Point {
  x: number;
  y: number;
}

export interface ActivityAnchor {
  id: AnchorId;
  type: AnchorType;
  floorId: FloorId;
  zoneId: ZoneId;
  capacity: number;
  /** Agenten, die den Anker gerade physisch belegen. */
  occupants: AgentId[];
  /** Agenten, die den Anker reserviert haben und noch unterwegs sind (oder deren Schreibtisch zeitweise verlassen ist). */
  reservedBy: AgentId[];
  allowedActivities: ActivityKind[];
  /** Nur für Schreibtische, Bänke, Warteplätze: zugehörige Abteilung. */
  departmentId?: DepartmentId;
  /** Blickziel, z. B. der Fernseher, auf den ein Sofa ausgerichtet ist. */
  focusAnchorId?: AnchorId;
  /**
   * Abstrakte Grundrisskoordinate in Metern (nur zur Laufzeitschätzung von Wegen).
   * Terminal 3 löst Anker selbst in echte Weltpositionen auf und ignoriert diese Werte.
   */
  hint: Point;
}

export type ZoneKind =
  | 'DESKS'
  | 'AGENT_BENCH'
  | 'KITCHEN'
  | 'LOUNGE'
  | 'MEETING_ROOM'
  | 'ELEVATOR_LOBBY'
  | 'WAITING_AREA'
  | 'LOBBY'
  | 'WELLNESS';

export interface ZoneDef {
  id: ZoneId;
  floorId: FloorId;
  kind: ZoneKind;
  label: string;
  departmentId?: DepartmentId;
  center: Point;
}

export interface FloorDef {
  id: FloorId;
  index: number;
  label: string;
  departmentId: DepartmentId | null;
}

export interface LayoutData {
  floors: FloorDef[];
  zones: ZoneDef[];
}

// ---------------------------------------------------------------------------
// Bewegung (Absicht, keine Animation)
// ---------------------------------------------------------------------------

export type RouteStageKind =
  | 'STAND_UP'
  | 'WALK_TO_ELEVATOR'
  | 'WAIT_FOR_ELEVATOR'
  | 'ENTER_ELEVATOR'
  | 'CHANGE_FLOOR'
  | 'EXIT_ELEVATOR'
  | 'WALK_TO_DESTINATION';

export interface RouteStage {
  kind: RouteStageKind;
  from: Location;
  to: Location;
  durationMs: number;
}

export type ArrivalAction = 'WORK' | 'BENCH' | 'BREAK_STEP' | 'MEETING' | 'WAIT_AREA' | 'STAND' | 'GO_OFFLINE';

export interface Route {
  id: string;
  stages: RouteStage[];
  stageIndex: number;
  stageStartedAtMs: number;
  stageEndsAtMs: number;
  /** Status, den der Agent während des Wegs hat. */
  travelStatus: AgentStatus;
  /** Absicht des Ziels, z. B. GO_TO_DESK. Aufzugsphasen überschreiben sie zeitweise. */
  purposeIntent: AgentIntent;
  destination: Location;
  arrival: ArrivalAction;
}

export type BreakKind = 'KITCHEN' | 'LOUNGE' | 'WANDER' | 'WELLNESS';

export interface BreakStep {
  anchorId: AnchorId;
  walkIntent: AgentIntent;
  intent: AgentIntent;
  activity: ActivityKind;
  durationMs: number;
}

export interface BreakPlan {
  kind: BreakKind;
  steps: BreakStep[];
  stepIndex: number;
}

export type WakeKind =
  | 'ROUTE_STAGE'
  | 'WORK_DONE'
  | 'IDLE_DECISION'
  | 'IDLE_TRANSITION'
  | 'COMPLETED_LINGER'
  | 'BREAK_STEP_END'
  | 'ARRIVE_AT_WORK'
  | 'AUTO_APPROVE';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  departmentId: DepartmentId;
  capabilities: Capability[];
  /** Herkunft des Agenten. Mock Agenten haben providerId "mock". Immer Demo Daten. */
  providerId: string;
  demo: true;

  status: AgentStatus;
  intent: AgentIntent;
  activity: ActivityKind | null;
  location: Location;

  taskId: TaskId | null;
  meetingId: MeetingId | null;
  /** Zugewiesener Schreibtisch (bleibt reserviert, solange die Aufgabe aktiv ist). */
  deskAnchorId: AnchorId | null;
  /** Aktuell reservierter oder belegter Nicht Schreibtisch Anker (Bank, Küche, Sitz im Meeting ...). */
  holdAnchorId: AnchorId | null;
  /** Anker, den der Agent physisch belegt. */
  occupiedAnchorId: AnchorId | null;
  preferredDeskId: AnchorId | null;
  preferredBenchId: AnchorId | null;

  route: Route | null;
  breakPlan: BreakPlan | null;
  wake: { atMs: number; kind: WakeKind } | null;

  tasksCompleted: number;
  lastBreakEndMs: number;
  lastEvent: { timeMs: number; type: string; text: string } | null;
}

// ---------------------------------------------------------------------------
// Aufgaben
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_HUMAN'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TaskOrigin = 'MOCK' | 'EXTERNAL';
export type ApprovalState = 'NONE' | 'PENDING' | 'GRANTED' | 'DENIED';

export interface ExternalRef {
  providerId: string;
  sessionId: string;
}

export interface TaskSpec {
  title: string;
  departmentId: TaskDepartment;
  requiredCapabilities: Capability[];
  priority?: Priority;
  /** Mock Arbeitsdauer. Bei EXTERNAL Aufgaben ignoriert (Ende kommt vom Provider). */
  workDurationMs?: number;
  requiresApproval?: boolean;
  /** Arbeit, die nach erteilter Freigabe noch folgt (0 = Aufgabe endet mit der Freigabe). */
  postApprovalWorkMs?: number;
  /** Aufgabe MUSS von diesem Agenten bearbeitet werden. */
  pinnedAgentId?: AgentId;
  origin?: TaskOrigin;
  /** Vorbereitung für Zusammenarbeit, noch ohne eigene Logik. */
  collaboratorAgentIds?: AgentId[];
  parentTaskId?: TaskId;
  workflowRunId?: WorkflowRunId;
  workflowStepIndex?: number;
  externalRef?: ExternalRef;
}

export interface Task {
  id: TaskId;
  seq: number;
  title: string;
  departmentId: TaskDepartment;
  requiredCapabilities: Capability[];
  priority: Priority;
  status: TaskStatus;
  origin: TaskOrigin;

  primaryAgentId: AgentId | null;
  collaboratorAgentIds: AgentId[];
  pinnedAgentId: AgentId | null;

  createdAtMs: number;
  assignedAtMs: number | null;
  startedAtMs: number | null;
  finishedAtMs: number | null;

  workDurationMs: number;
  remainingWorkMs: number;
  workEndsAtMs: number | null;
  requiresApproval: boolean;
  postApprovalWorkMs: number;
  approval: ApprovalState;
  approvalRequestedAtMs: number | null;

  parentTaskId: TaskId | null;
  workflowRunId: WorkflowRunId | null;
  workflowStepIndex: number | null;
  externalRef: ExternalRef | null;
  failReason: string | null;
}

export interface TaskSummary {
  id: TaskId;
  title: string;
  departmentId: TaskDepartment;
  status: TaskStatus;
  origin: TaskOrigin;
  primaryAgentId: AgentId | null;
  createdAtMs: number;
  finishedAtMs: number | null;
  failReason: string | null;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export type MeetingStatus = 'SCHEDULED' | 'ASSEMBLING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type MeetingOrigin = 'MOCK' | 'WORKFLOW' | 'MANUAL' | 'AGENT_MESSAGE';

export interface Meeting {
  id: MeetingId;
  title: string;
  participantAgentIds: AgentId[];
  roomId: ZoneId | null;
  taskId: TaskId | null;
  status: MeetingStatus;
  origin: MeetingOrigin;
  durationMs: number;
  /** Sitz je Agent, sobald der Raum reserviert ist. */
  seatByAgent: Record<AgentId, AnchorId>;
  createdAtMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  endsAtMs: number | null;
  assembleStartedAtMs: number | null;
  workflowRunId: WorkflowRunId | null;
  cancelReason: string | null;
}

export interface MeetingSpec {
  title: string;
  participantAgentIds: AgentId[];
  roomId?: ZoneId;
  taskId?: TaskId;
  durationMs?: number;
  origin?: MeetingOrigin;
  workflowRunId?: WorkflowRunId;
}

// ---------------------------------------------------------------------------
// Agentennachrichten (Vorbereitung echte Kommunikation)
// ---------------------------------------------------------------------------

export interface AgentMessage {
  fromAgentId: AgentId;
  toAgentId: AgentId;
  taskId?: TaskId;
  type: string;
  timestamp: number;
  /** Nur ein Wunsch für die Visualisierung. Die echte Kommunikation läuft unabhängig davon. */
  visualizeAsMeeting?: boolean;
}

// ---------------------------------------------------------------------------
// Ergebnisse
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'NOT_FOUND'
  | 'INVALID'
  | 'AGENT_PROTECTED'
  | 'AGENT_UNAVAILABLE'
  | 'AGENT_IN_MEETING'
  | 'NO_CAPACITY'
  | 'NO_ROOM'
  | 'WRONG_STATE';

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; error: string };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: ErrorCode, error: string): Result<never> => ({ ok: false, code, error });

// ---------------------------------------------------------------------------
// Betrieb und Konfiguration
// ---------------------------------------------------------------------------

export type OperationsMode = 'WORKDAY' | 'CONTINUOUS_OPERATIONS';
export type MovementMode = 'SIMULATED' | 'RENDERER_CONFIRMED';
export type ApprovalBehavior = 'STAY_AT_DESK' | 'GO_TO_WAITING_AREA';

export interface SimConfig {
  /** Logische Simulationszeit pro Tick. 250 ms entspricht 4 Ticks pro Sekunde. */
  tickIntervalMs: number;
  walkSpeedMps: number;
  /**
   * SIMULATED: die Simulation schätzt Wegzeiten selbst.
   * RENDERER_CONFIRMED: Terminal 3 bestätigt jede Etappe (engine.confirmRouteStage), mit Timeout als Rückfall.
   */
  movementMode: MovementMode;
  confirmTimeoutFactor: number;
  approvalBehavior: ApprovalBehavior;
  /** IANA Zeitzone der Simulationszeit (Arbeitstag, Log). Standard Europe/Berlin. */
  timeZone: string;
  /** Nur für MOCK Aufgaben. null = nie automatisch freigeben. Echte Aufgaben werden NIE automatisch freigegeben. */
  mockAutoApproveAfterMs: number | null;
  operations: OperationsMode;
  workday: { startMinute: number; endMinute: number; arrivalWindowMs: number };
  idle: {
    decisionMinMs: number;
    decisionMaxMs: number;
    stayWeight: number;
    kitchenWeight: number;
    loungeWeight: number;
    wanderWeight: number;
    wellnessWeight: number;
    breakCooldownMs: number;
    /** Höchstanteil verfügbarer Agenten, die gleichzeitig Pause machen dürfen. */
    maxBreakShare: number;
  };
  timings: {
    standUpMs: number;
    completedLingerMs: number;
    idleTransitionMinMs: number;
    idleTransitionMaxMs: number;
    elevatorWaitMs: number;
    elevatorEnterMs: number;
    elevatorFloorMs: number;
    elevatorExitMs: number;
    meetingScheduleTimeoutMs: number;
    meetingAssembleTimeoutMs: number;
    defaultMeetingMs: number;
  };
  /** Wartezeit, nach der ein wartender LOW/NORMAL Auftrag eine Stufe höher priorisiert wird. 0 = aus. */
  agingMs: number;
  logCapacity: number;
  historyCapacity: number;
  /** 0 = aus. Sonst werden alle N Ticks die Invarianten geprüft und bei Verstoß geworfen. */
  invariantCheckEveryTicks: number;
  autosaveEveryTicks: number;
}
