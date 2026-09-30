import { AnchorBook } from './anchors';
import { SimulationClock, type SimSpeed } from './clock';
import type { Ctx, ExternalHooks } from './context';
import { DeskAssignmentService } from './desks';
import { EventBus, type AnyEventHandler, type EventHandler, type SimEventMap, type SimEventType, type Unsubscribe } from './events';
import { inspectAgent, type AgentInspectorData } from './inspector';
import { checkInvariants } from './invariants';
import { ActivityLog, type LogEntry } from './log';
import { computeMetrics, type SimulationMetrics } from './metrics';
import { RoutePlanner } from './movement';
import type { ProviderEvent } from './providers';
import { Rng } from './rng';
import { TaskRouter } from './routing';
import {
  createInitialState,
  mergeConfig,
  type CreateStateOptions,
  type DeepPartial,
  type GeneratorState,
  type SimulationState,
  type WorkflowRun,
} from './state';
import { AgentSystem } from './systems/agents';
import { MeetingSystem } from './systems/meetings';
import { MockWorkSystem } from './systems/mockWork';
import { TaskSystem } from './systems/tasks';
import { WorkflowSystem } from './systems/workflows';
import {
  AGENT_STATUSES,
  fail,
  ok,
  type ActivityAnchor,
  type Agent,
  type AgentId,
  type AgentMessage,
  type AgentStatus,
  type BreakKind,
  type DepartmentId,
  type ExternalRef,
  type Meeting,
  type MeetingSpec,
  type OperationsMode,
  type Priority,
  type Result,
  type SimConfig,
  type Task,
  type TaskId,
  type TaskSpec,
} from './types';

export interface StartOptions {
  operations?: OperationsMode;
  scenarioId?: string | null;
  /** true = Agenten sitzen sofort auf der Bank. false (nur WORKDAY) = Agenten treffen gestaffelt ein. */
  present?: boolean;
  generator?: Partial<GeneratorState>;
}

export interface QueueView {
  active: number;
  queued: number;
  waitingApproval: number;
}

const MAX_TICKS_PER_ADVANCE = 5000;

/**
 * SimulationEngine: Fassade über alle Teilsysteme.
 * Kennt weder Three.js noch DOM. Alles ist Zustand, Intent und Ereignis.
 */
export class SimulationEngine {
  readonly ctx: Ctx;
  /** Wird alle autosaveEveryTicks Ticks mit dem serialisierten Zustand aufgerufen. */
  onAutosave: ((json: string) => void) | null = null;
  private bus: EventBus;

  constructor(options: CreateStateOptions | { state: SimulationState } = {}) {
    const state = 'state' in options ? options.state : createInitialState(options);
    this.bus = new EventBus(state.eventSeq);
    const hooks: ExternalHooks = {};
    const ctx = { hooks, flags: { dispatchDirty: true } } as Ctx;
    this.ctx = ctx;
    this.attach(state);
    ctx.systems = {
      agents: new AgentSystem(ctx),
      tasks: new TaskSystem(ctx),
      meetings: new MeetingSystem(ctx),
      workflows: new WorkflowSystem(ctx),
      mock: new MockWorkSystem(ctx),
    };
  }

  static fromState(state: SimulationState): SimulationEngine {
    return new SimulationEngine({ state });
  }

  /** Hängt einen (neuen) Zustand ein. Ereignisabonnenten bleiben erhalten. */
  private attach(state: SimulationState): void {
    const c = this.ctx;
    const clock = new SimulationClock(state.clock);
    const anchors = new AnchorBook(state.anchors);
    c.state = state;
    c.bus = this.bus;
    c.clock = clock;
    c.log = new ActivityLog(state.log, state.config.logCapacity);
    c.rng = new Rng(state);
    c.anchors = anchors;
    c.router = new TaskRouter();
    c.desks = new DeskAssignmentService(anchors);
    c.planner = new RoutePlanner(state.layout.zones, anchors, () => c.state.config);
    c.agentList = state.agentOrder.map((id) => state.agents[id]!);
    c.statusCounts = Object.fromEntries(AGENT_STATUSES.map((s) => [s, 0])) as Record<AgentStatus, number>;
    for (const a of c.agentList) c.statusCounts[a.status] += 1;
    c.flags.dispatchDirty = true;
    c.now = () => clock.nowMs;
    c.emit = (type, payload) => this.bus.emit(type, clock.nowMs, payload);
    c.note = (agent, type, text) => {
      agent.lastEvent = { timeMs: clock.nowMs, type, text };
      c.log.add(clock.nowMs, 'AGENT', text, { agentId: agent.id });
    };
  }

  // -------------------------------------------------------------------------
  // Ereignisse
  // -------------------------------------------------------------------------

  on<K extends SimEventType>(type: K, handler: EventHandler<K>): Unsubscribe {
    return this.bus.on(type, handler);
  }
  onAny(handler: AnyEventHandler): Unsubscribe {
    return this.bus.onAny(handler);
  }
  /** Rückkanäle für spätere Provider. */
  setHooks(hooks: ExternalHooks): void {
    Object.assign(this.ctx.hooks, hooks);
  }

  private emit<K extends SimEventType>(type: K, payload: SimEventMap[K]): void {
    this.ctx.emit(type, payload);
  }
  private done<T>(value: T): T {
    this.bus.flush();
    return value;
  }

  // -------------------------------------------------------------------------
  // Lebenszyklus, Uhr
  // -------------------------------------------------------------------------

  /** START COMPANY SIMULATION */
  startCompany(opts: StartOptions = {}): void {
    const c = this.ctx;
    const s = c.state;
    s.running = true;
    s.operations = opts.operations ?? s.operations;
    s.config.operations = s.operations;
    s.scenarioId = opts.scenarioId ?? s.scenarioId;
    const present = opts.present ?? s.operations === 'CONTINUOUS_OPERATIONS';
    for (const a of c.agentList) {
      if (a.status !== 'OFFLINE') continue;
      if (present) c.systems.agents.placeAtBench(a);
      else c.systems.agents.scheduleArrival(a, false);
    }
    c.systems.mock.setGenerator({ enabled: true, ...(opts.generator ?? {}) });
    this.emit('SIMULATION_STARTED', { operations: s.operations, scenarioId: s.scenarioId });
    c.log.add(c.now(), 'SIMULATION', `Simulation started (${s.operations}${s.scenarioId ? `, ${s.scenarioId}` : ''})`);
    this.done(undefined);
  }

  pause(): void {
    if (this.ctx.clock.paused) return;
    this.ctx.clock.pause();
    this.emit('SIMULATION_PAUSED', {});
    this.emit('CLOCK_CHANGED', { mode: this.ctx.clock.mode, speed: this.ctx.clock.speed });
    this.done(undefined);
  }

  resume(): void {
    if (!this.ctx.clock.paused) return;
    this.ctx.clock.resume();
    this.emit('SIMULATION_RESUMED', {});
    this.emit('CLOCK_CHANGED', { mode: this.ctx.clock.mode, speed: this.ctx.clock.speed });
    this.done(undefined);
  }

  setSpeed(speed: SimSpeed): void {
    this.ctx.clock.setSpeed(speed);
    this.emit('CLOCK_CHANGED', { mode: this.ctx.clock.mode, speed });
    this.done(undefined);
  }

  /** Setzt alles auf den Anfang zurück (gleiche Seed, gleiche Konfiguration). */
  reset(seed?: string): void {
    const s = this.ctx.state;
    const next = createInitialState({
      seed: seed ?? s.seed,
      rosterCopies: s.init.rosterCopies,
      ...(s.init.rosterSize !== undefined ? { rosterSize: s.init.rosterSize } : {}),
      config: s.config as DeepPartial<SimConfig>,
      startMs: s.clock.startMs,
    });
    this.restore(next);
    this.emit('SIMULATION_RESET', { seed: next.seed });
    this.done(undefined);
  }

  /** Ersetzt den Zustand vollständig (Laden, Reset). Abonnenten bleiben erhalten. */
  restore(state: SimulationState): void {
    this.bus.seq = Math.max(this.bus.seq, state.eventSeq);
    this.attach(state);
  }

  setConfig(patch: DeepPartial<SimConfig>): void {
    const c = this.ctx;
    c.state.config = mergeConfig(c.state.config, patch);
    c.log = new ActivityLog(c.state.log, c.state.config.logCapacity);
  }

  // -------------------------------------------------------------------------
  // Ticks
  // -------------------------------------------------------------------------

  /** Ein logischer Tick (tickIntervalMs Simulationszeit). */
  tick(): void {
    const c = this.ctx;
    const s = c.state;
    c.clock.setNow(c.clock.nowMs + s.config.tickIntervalMs);
    s.tickCount += 1;
    const now = c.clock.nowMs;
    c.systems.mock.tick(now);
    c.systems.agents.tick(now);
    c.systems.meetings.tick(now);
    c.systems.tasks.dispatch();
    const every = s.config.invariantCheckEveryTicks;
    if (every > 0 && s.tickCount % every === 0) this.assertInvariants();
    const auto = s.config.autosaveEveryTicks;
    if (auto > 0 && this.onAutosave && s.tickCount % auto === 0) this.onAutosave(JSON.stringify(this.toState()));
    this.bus.flush();
  }

  /**
   * Von einem Treiber mit Realzeit Delta aufrufen (ein zentraler Timer).
   * Die Uhr rechnet in Simulationszeit um (Pause = 0, 1x, 2x, 5x, 10x).
   */
  advance(realDeltaMs: number): number {
    const s = this.ctx.state;
    const scaled = this.ctx.clock.scale(realDeltaMs);
    if (!s.running) return 0;
    s.accumulatorMs += scaled;
    let n = 0;
    while (s.accumulatorMs >= s.config.tickIntervalMs && n < MAX_TICKS_PER_ADVANCE) {
      s.accumulatorMs -= s.config.tickIntervalMs;
      this.tick();
      n += 1;
    }
    if (n === MAX_TICKS_PER_ADVANCE) s.accumulatorMs = 0;
    return n;
  }

  /** Simulationszeit vorspulen (Tests, Benchmarks). Respektiert die Pause, ignoriert die Geschwindigkeit. */
  runFor(simMs: number): number {
    const c = this.ctx;
    if (c.clock.paused || !c.state.running) return 0;
    const n = Math.floor(simMs / c.state.config.tickIntervalMs);
    for (let i = 0; i < n; i++) this.tick();
    return n;
  }

  // -------------------------------------------------------------------------
  // Aufgaben
  // -------------------------------------------------------------------------

  createTask(spec: TaskSpec): Result<Task> {
    return this.done(this.ctx.systems.tasks.create(spec));
  }

  cancelTask(id: TaskId): Result<Task> {
    const t = this.ctx.state.tasks[id];
    if (!t) return fail('NOT_FOUND', `Aufgabe ${id} unbekannt`);
    this.ctx.systems.tasks.cancel(t);
    return this.done(ok(t));
  }

  failTask(id: TaskId, reason: string): Result<Task> {
    const t = this.ctx.state.tasks[id];
    if (!t) return fail('NOT_FOUND', `Aufgabe ${id} unbekannt`);
    this.ctx.systems.tasks.failTask(t, reason);
    return this.done(ok(t));
  }

  completeTask(id: TaskId): Result<Task> {
    const t = this.ctx.state.tasks[id];
    if (!t) return fail('NOT_FOUND', `Aufgabe ${id} unbekannt`);
    if (t.status === 'QUEUED') return fail('WRONG_STATE', `Aufgabe ${id} ist noch nicht zugewiesen`);
    this.ctx.systems.tasks.complete(t);
    return this.done(ok(t));
  }

  /** Erzwingt eine Freigabeanfrage (Debug, oder wenn ein Provider "waiting" meldet). */
  requestApproval(id: TaskId): Result<Task> {
    const t = this.ctx.state.tasks[id];
    if (!t) return fail('NOT_FOUND', `Aufgabe ${id} unbekannt`);
    return this.done(this.ctx.systems.tasks.requestApproval(t));
  }

  grantApproval(id: TaskId): Result<Task> {
    return this.done(this.ctx.systems.tasks.grantApproval(id, 'HUMAN'));
  }

  denyApproval(id: TaskId): Result<Task> {
    return this.done(this.ctx.systems.tasks.denyApproval(id));
  }

  startWorkflow(workflowId: string, priority: Priority = 'NORMAL'): Result<WorkflowRun> {
    return this.done(this.ctx.systems.workflows.start(workflowId, priority));
  }

  // -------------------------------------------------------------------------
  // Meetings
  // -------------------------------------------------------------------------

  createMeeting(spec: MeetingSpec): Result<Meeting> {
    return this.done(this.ctx.systems.meetings.create(spec));
  }

  cancelMeeting(id: string, reason = 'MANUAL'): Result<Meeting> {
    const m = this.ctx.state.meetings[id];
    if (!m) return fail('NOT_FOUND', `Meeting ${id} unbekannt`);
    this.ctx.systems.meetings.cancel(m, reason);
    return this.done(ok(m));
  }

  /**
   * Echte Agentenkommunikation melden. Sie läuft unabhängig von der Visualisierung.
   * Nur wenn visualizeAsMeeting gesetzt ist UND keiner der Agenten eine echte Aufgabe bearbeitet,
   * wird zusätzlich ein kurzes optisches Meeting erzeugt.
   */
  ingestAgentMessage(msg: AgentMessage): Result<Meeting | null> {
    const c = this.ctx;
    if (!c.state.agents[msg.fromAgentId] || !c.state.agents[msg.toAgentId]) return fail('NOT_FOUND', 'Absender oder Empfänger unbekannt');
    this.emit('AGENT_MESSAGE', { ...msg });
    let meeting: Meeting | null = null;
    if (msg.visualizeAsMeeting) {
      const res = c.systems.meetings.create({
        title: `Agent message: ${msg.type}`,
        participantAgentIds: [msg.fromAgentId, msg.toAgentId],
        durationMs: 20_000,
        origin: 'AGENT_MESSAGE',
        ...(msg.taskId ? { taskId: msg.taskId } : {}),
      });
      if (res.ok) meeting = res.value;
      else c.log.add(c.now(), 'MEETING', `Visualization of message skipped: ${res.error}`);
    }
    return this.done(ok(meeting));
  }

  // -------------------------------------------------------------------------
  // Agenten
  // -------------------------------------------------------------------------

  private agentOrFail(id: AgentId): Result<Agent> {
    const a = this.ctx.state.agents[id];
    return a ? ok(a) : fail('NOT_FOUND', `Agent ${id} unbekannt`);
  }

  /** Löst den Agenten aus allem (Meeting, Pause, Mock Aufgabe) und macht ihn verfügbar. */
  private prepareIdle(a: Agent): Result<Agent> {
    const c = this.ctx;
    if (c.systems.agents.isProtected(a)) return fail('AGENT_PROTECTED', `${a.name} bearbeitet eine echte Aufgabe`);
    if (a.status === 'OFFLINE' || a.status === 'ERROR') return fail('AGENT_UNAVAILABLE', `${a.name} ist ${a.status}`);
    const meetingId = a.meetingId;
    c.systems.agents.interrupt(a);
    if (meetingId) c.systems.meetings.removeParticipant(meetingId, a);
    const task = a.taskId ? c.state.tasks[a.taskId] : undefined;
    if (task) {
      a.taskId = null;
      c.desks.release(a);
      c.systems.tasks.requeue(task, 'AGENT_REASSIGNED');
    }
    c.systems.agents.setState(a, 'AVAILABLE', 'IDLE', null);
    return ok(a);
  }

  setAgentAvailable(id: AgentId): Result<Agent> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    const p = this.prepareIdle(r.value);
    if (!p.ok) return this.done(p);
    this.ctx.systems.agents.sendToBench(r.value);
    return this.done(ok(r.value));
  }

  sendAgentToBench(id: AgentId): Result<Agent> {
    return this.setAgentAvailable(id);
  }

  sendAgentToBreak(id: AgentId, kind: BreakKind): Result<Agent> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    const p = this.prepareIdle(r.value);
    if (!p.ok) return this.done(p);
    if (!this.ctx.systems.agents.startBreak(r.value, kind)) {
      this.ctx.systems.agents.sendToBench(r.value);
      return this.done(fail('NO_CAPACITY', `Kein freier Platz für ${kind}`));
    }
    return this.done(ok(r.value));
  }

  sendAgentToKitchen(id: AgentId): Result<Agent> {
    return this.sendAgentToBreak(id, 'KITCHEN');
  }

  /** Debug: gibt dem Agenten sofort eine feste Mock Aufgabe. */
  setAgentWorking(id: AgentId, spec: Partial<TaskSpec> = {}): Result<Task> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    const a = r.value;
    if (a.taskId) return fail('AGENT_UNAVAILABLE', `${a.name} arbeitet bereits`);
    if (a.status === 'OFFLINE' || a.status === 'ERROR') return fail('AGENT_UNAVAILABLE', `${a.name} ist ${a.status}`);
    const res = this.ctx.systems.tasks.create({
      title: 'Debug task (DEMO)',
      departmentId: a.departmentId,
      requiredCapabilities: [a.capabilities[0]!],
      priority: 'HIGH',
      workDurationMs: 30_000,
      pinnedAgentId: a.id,
      ...spec,
    });
    this.ctx.systems.tasks.dispatch();
    return this.done(res);
  }

  setAgentError(id: AgentId, reason = 'DEBUG'): Result<Agent> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    this.ctx.systems.agents.setError(r.value, reason);
    return this.done(ok(r.value));
  }

  recoverAgent(id: AgentId): Result<Agent> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    if (r.value.status !== 'ERROR') return fail('WRONG_STATE', `${r.value.name} ist nicht im Fehlerzustand`);
    this.ctx.systems.agents.recover(r.value);
    return this.done(ok(r.value));
  }

  /** Terminal 3 bestätigt die aktuelle Etappe (nur Modus RENDERER_CONFIRMED). */
  confirmRouteStage(id: AgentId): Result<boolean> {
    const r = this.agentOrFail(id);
    if (!r.ok) return r;
    return this.done(ok(this.ctx.systems.agents.confirmRouteStage(r.value)));
  }

  // -------------------------------------------------------------------------
  // Provider Grenze
  // -------------------------------------------------------------------------

  applyProviderEvent(e: ProviderEvent): Result<Task | null> {
    const c = this.ctx;
    switch (e.type) {
      case 'provider.started':
        this.emit('PROVIDER_STARTED', { providerId: e.providerId });
        c.log.add(c.now(), 'PROVIDER', `Provider ${e.providerId} started`);
        return this.done(ok(null));
      case 'provider.stopped':
        this.emit('PROVIDER_STOPPED', { providerId: e.providerId, ...(e.reason ? { reason: e.reason } : {}) });
        c.log.add(c.now(), 'PROVIDER', `Provider ${e.providerId} stopped`);
        return this.done(ok(null));
      case 'provider.session.started': {
        if (c.systems.tasks.findExternal(e.providerId, e.sessionId)) return fail('INVALID', 'Session existiert bereits');
        const res = c.systems.tasks.create({
          title: e.title,
          departmentId: e.departmentId,
          requiredCapabilities: e.requiredCapabilities,
          priority: e.priority ?? 'NORMAL',
          origin: 'EXTERNAL',
          externalRef: { providerId: e.providerId, sessionId: e.sessionId },
          ...(e.agentId ? { pinnedAgentId: e.agentId } : {}),
        });
        c.systems.tasks.dispatch();
        return this.done(res);
      }
      default: {
        const t = c.systems.tasks.findExternal(e.providerId, e.sessionId);
        if (!t) return fail('NOT_FOUND', `Session ${e.sessionId} unbekannt`);
        if (e.type === 'provider.session.waiting') {
          const r = c.systems.tasks.requestApproval(t);
          return this.done(r.ok ? ok(t) : r);
        }
        if (e.type === 'provider.session.completed') c.systems.tasks.complete(t);
        else c.systems.tasks.failTask(t, e.reason);
        return this.done(ok(t));
      }
    }
  }

  /**
   * Abgleich nach Neustart: EXTERNAL Aufgaben, deren Provider Session nicht mehr lebt, scheitern.
   * Gibt die Ids der betroffenen Aufgaben zurück.
   */
  reconcileExternalTasks(liveSessions: readonly ExternalRef[]): TaskId[] {
    const c = this.ctx;
    const lost: TaskId[] = [];
    for (const t of Object.values(c.state.tasks)) {
      if (t.origin !== 'EXTERNAL') continue;
      const alive = t.externalRef && liveSessions.some((s) => s.providerId === t.externalRef!.providerId && s.sessionId === t.externalRef!.sessionId);
      if (!alive) {
        c.systems.tasks.failTask(t, 'PROVIDER_SESSION_LOST');
        lost.push(t.id);
      }
    }
    return this.done(lost);
  }

  // -------------------------------------------------------------------------
  // Abfragen (für Terminal 1 und Terminal 3)
  // -------------------------------------------------------------------------

  getState(): Readonly<SimulationState> {
    return this.ctx.state;
  }
  getAgents(): readonly Readonly<Agent>[] {
    return this.ctx.agentList;
  }
  getAgent(id: AgentId): Readonly<Agent> | undefined {
    return this.ctx.state.agents[id];
  }
  getTasks(): readonly Readonly<Task>[] {
    return Object.values(this.ctx.state.tasks);
  }
  getTask(id: TaskId): Readonly<Task> | undefined {
    return this.ctx.state.tasks[id];
  }
  getMeetings(): readonly Readonly<Meeting>[] {
    return Object.values(this.ctx.state.meetings);
  }
  getAnchors(): readonly Readonly<ActivityAnchor>[] {
    return Object.values(this.ctx.state.anchors);
  }
  getLayout() {
    return this.ctx.state.layout;
  }
  getQueues(): Record<DepartmentId | 'ANY', QueueView> {
    return this.ctx.systems.tasks.queueStats();
  }
  getMetrics(): SimulationMetrics {
    return computeMetrics(this.ctx.state, this.ctx.agentList, this.ctx.statusCounts);
  }
  getLog(limit = 50): readonly LogEntry[] {
    return this.ctx.log.recent(limit);
  }
  getClock() {
    const s = this.ctx.state.clock;
    return { mode: s.mode, speed: s.speed, nowMs: s.nowMs, startMs: s.startMs, wallMs: s.wallMs };
  }
  inspectAgent(id: AgentId): AgentInspectorData | null {
    const a = this.ctx.state.agents[id];
    return a ? inspectAgent(this.ctx.state, a) : null;
  }

  checkInvariants(): string[] {
    const errors = checkInvariants(this.ctx.state);
    const counts = Object.fromEntries(AGENT_STATUSES.map((s) => [s, 0])) as Record<AgentStatus, number>;
    for (const a of this.ctx.agentList) counts[a.status] += 1;
    for (const s of AGENT_STATUSES) if (counts[s] !== this.ctx.statusCounts[s]) errors.push(`Statuszähler ${s}: ${this.ctx.statusCounts[s]} statt ${counts[s]}`);
    return errors;
  }

  assertInvariants(): void {
    const errors = this.checkInvariants();
    if (errors.length > 0) throw new Error(`Invarianten verletzt (t=${this.ctx.state.tickCount}):\n${errors.slice(0, 10).join('\n')}`);
  }

  /** Lebender Zustand (für Speichern). Enthält nur JSON taugliche Daten. */
  toState(): SimulationState {
    this.ctx.state.eventSeq = this.bus.seq;
    return this.ctx.state;
  }
}
