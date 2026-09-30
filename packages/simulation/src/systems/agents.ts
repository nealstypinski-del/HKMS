import type { Ctx } from '../context';
import { DAY_MS, localDayStartMs } from '../clock';
import {
  elevatorLobbyId,
  floorKitchenZone,
  floorLoungeZone,
  GROUND_BENCH_ZONE,
  GROUND_FLOOR,
  GROUND_KITCHEN_ZONE,
  GROUND_LOUNGE_ZONE,
  homeBenchZone,
  ROOF_LOUNGE_ZONE,
  WELLNESS_ZONE,
} from '../layout';
import { WELLNESS_ZONES } from '../layoutRooms';
import { SEAT_TYPES } from '../movement';
import type {
  ActivityKind,
  Agent,
  AgentIntent,
  AgentStatus,
  AnchorId,
  AnchorType,
  ArrivalAction,
  BreakKind,
  BreakPlan,
  BreakStep,
  Location,
  Route,
  Task,
  WakeKind,
} from '../types';

const BREAK_LABEL: Record<BreakKind, string> = { KITCHEN: 'Küche', LOUNGE: 'Lounge', WANDER: 'Spaziergang', WELLNESS: 'Wellness' };
const ELEVATOR_WALK: ReadonlySet<string> = new Set(['WALK_TO_ELEVATOR', 'WAIT_FOR_ELEVATOR', 'ENTER_ELEVATOR']);
const ELEVATOR_STAGES: ReadonlySet<string> = new Set(['WALK_TO_ELEVATOR', 'WAIT_FOR_ELEVATOR', 'ENTER_ELEVATOR', 'CHANGE_FLOOR', 'EXIT_ELEVATOR']);

/**
 * Verhalten der Agenten: Zustandswechsel, Routen, Idle, Pausen, Bank, Feierabend.
 * Enthält keine Grafik. Alles läuft über Intents, semantische Ziele und Ereignisse.
 */
export class AgentSystem {
  constructor(private c: Ctx) {}

  // -------------------------------------------------------------------------
  // Zustand
  // -------------------------------------------------------------------------

  setState(a: Agent, status: AgentStatus, intent: AgentIntent, activity: ActivityKind | null = null): void {
    const c = this.c;
    const prevStatus = a.status;
    const prevIntent = a.intent;
    const prevActivity = a.activity;
    a.status = status;
    a.intent = intent;
    a.activity = activity;
    if (prevStatus !== status) {
      c.statusCounts[prevStatus] -= 1;
      c.statusCounts[status] += 1;
      c.emit('AGENT_STATUS_CHANGED', { agentId: a.id, from: prevStatus, to: status, intent });
      if (status === 'AVAILABLE') {
        c.emit('AGENT_AVAILABLE', { agentId: a.id, location: { ...a.location } });
        c.flags.dispatchDirty = true;
        c.note(a, 'AGENT_AVAILABLE', `${a.name} ist verfügbar`);
      }
    }
    if (prevIntent !== intent || prevActivity !== activity) {
      c.emit('AGENT_INTENT_CHANGED', { agentId: a.id, from: prevIntent, to: intent, activity });
    }
  }

  isProtected(a: Agent): boolean {
    if (!a.taskId) return false;
    const t = this.c.state.tasks[a.taskId];
    return !!t && t.origin === 'EXTERNAL';
  }

  locOf(anchorId: AnchorId): Location {
    const an = this.c.anchors.get(anchorId);
    return { floorId: an.floorId, zoneId: an.zoneId, anchorId };
  }

  // -------------------------------------------------------------------------
  // Anker halten
  // -------------------------------------------------------------------------

  /** Wechselt den gehaltenen (Nicht Schreibtisch) Anker. Ein noch belegter alter Anker wird beim Aufstehen frei. */
  switchHold(a: Agent, next: AnchorId | null): void {
    const c = this.c;
    const old = a.holdAnchorId;
    if (old && old !== next && a.occupiedAnchorId !== old) c.anchors.release(old, a.id);
    if (next && next !== old) c.anchors.reserve(next, a.id);
    a.holdAnchorId = next;
  }

  private occupy(a: Agent, anchorId: AnchorId): void {
    this.c.anchors.occupy(anchorId, a.id);
    a.occupiedAnchorId = anchorId;
  }

  private vacateOccupied(a: Agent): void {
    if (!a.occupiedAnchorId) return;
    this.c.anchors.vacate(a.occupiedAnchorId, a.id, a.occupiedAnchorId === a.deskAnchorId);
    a.occupiedAnchorId = null;
    a.location = { ...a.location, anchorId: null };
  }

  // -------------------------------------------------------------------------
  // Unterbrechen
  // -------------------------------------------------------------------------

  /**
   * Löst den Agenten aus Route, Pause, Arbeit und Ankerreservierungen (ohne neues Ziel).
   * Ein noch physisch belegter Anker bleibt belegt, bis die Etappe STAND_UP ihn freigibt.
   * Der zugewiesene Schreibtisch bleibt reserviert.
   */
  interrupt(a: Agent): void {
    const c = this.c;
    if (a.route) {
      const st = a.route.stages[a.route.stageIndex];
      if (st && ELEVATOR_STAGES.has(st.kind)) a.location = { ...st.to };
      a.route = null;
    }
    if (a.breakPlan) this.endBreakBookkeeping(a, 'INTERRUPTED');
    if (a.status === 'WORKING' && a.taskId) c.systems.tasks.suspend(c.state.tasks[a.taskId]);
    this.switchHold(a, null);
    a.wake = null;
  }

  private endBreakBookkeeping(a: Agent, reason: 'COMPLETED' | 'INTERRUPTED'): void {
    const plan = a.breakPlan;
    if (!plan) return;
    a.breakPlan = null;
    a.lastBreakEndMs = this.c.now();
    this.c.emit('BREAK_ENDED', { agentId: a.id, kind: plan.kind, reason });
    this.c.note(a, 'BREAK_ENDED', `${a.name} beendet die Pause (${BREAK_LABEL[plan.kind]}${reason === 'INTERRUPTED' ? ', unterbrochen' : ''})`);
  }

  // -------------------------------------------------------------------------
  // Routen
  // -------------------------------------------------------------------------

  startRoute(a: Agent, dest: Location, purposeIntent: AgentIntent, arrival: ArrivalAction, travelStatus: AgentStatus): void {
    const c = this.c;
    const occupied = a.occupiedAnchorId ? c.anchors.get(a.occupiedAnchorId) : null;
    const atDest = dest.anchorId !== null && a.occupiedAnchorId === dest.anchorId;
    const from: Location = { ...a.location };
    const seated = !!occupied && SEAT_TYPES.has(occupied.type);
    // Nicht Sitz Anker (Kaffeemaschine, Warteplatz) werden beim Losgehen sofort frei, Sitze erst nach STAND_UP.
    if (occupied && !seated && !atDest) this.vacateOccupied(a);
    const stages = atDest ? [] : c.planner.plan(from, dest, seated);
    const route: Route = {
      id: `${a.id}#${c.state.counters['route'] = (c.state.counters['route'] ?? 0) + 1}`,
      stages,
      stageIndex: 0,
      stageStartedAtMs: c.now(),
      stageEndsAtMs: c.now(),
      travelStatus,
      purposeIntent,
      destination: { ...dest },
      arrival,
    };
    c.emit('AGENT_MOVEMENT_REQUESTED', {
      agentId: a.id,
      intent: purposeIntent,
      destination: { ...dest },
      destinationAnchorId: dest.anchorId,
      stages: stages.map((s) => ({ ...s })),
    });
    if (stages.length === 0) {
      this.arrive(a, route);
      return;
    }
    a.route = route;
    this.beginStage(a, 0);
  }

  private beginStage(a: Agent, index: number): void {
    const c = this.c;
    const route = a.route!;
    const stage = route.stages[index]!;
    route.stageIndex = index;
    route.stageStartedAtMs = c.now();
    const cfg = c.state.config;
    const end =
      cfg.movementMode === 'SIMULATED'
        ? c.now() + stage.durationMs
        : c.now() + Math.max(stage.durationMs * cfg.confirmTimeoutFactor, 15_000);
    route.stageEndsAtMs = end;
    a.wake = { atMs: end, kind: 'ROUTE_STAGE' };

    const status: AgentStatus =
      stage.kind === 'STAND_UP' && route.travelStatus === 'MOVING' && route.purposeIntent === 'GO_TO_DESK' ? 'ASSIGNED' : route.travelStatus;
    const intent: AgentIntent = ELEVATOR_WALK.has(stage.kind) ? 'GO_TO_ELEVATOR' : stage.kind === 'CHANGE_FLOOR' ? 'CHANGE_FLOOR' : route.purposeIntent;
    this.setState(a, status, intent, null);
    c.emit('AGENT_ROUTE_STAGE_STARTED', { agentId: a.id, stageIndex: index, stage: { ...stage } });
  }

  private completeStage(a: Agent): void {
    const route = a.route;
    if (!route) return;
    const stage = route.stages[route.stageIndex]!;
    if (stage.kind === 'STAND_UP') this.vacateOccupied(a);
    a.location = { ...stage.to };
    if (route.stageIndex + 1 < route.stages.length) this.beginStage(a, route.stageIndex + 1);
    else this.arrive(a, route);
  }

  /** Terminal 3 meldet: aktuelle Etappe ist fertig gelaufen (nur im Modus RENDERER_CONFIRMED). */
  confirmRouteStage(a: Agent): boolean {
    if (this.c.state.config.movementMode !== 'RENDERER_CONFIRMED' || !a.route) return false;
    this.completeStage(a);
    return true;
  }

  private arrive(a: Agent, route: Route): void {
    const c = this.c;
    a.route = null;
    a.wake = null;
    a.location = { ...route.destination };
    const d = route.destination.anchorId;
    if (d && (d === a.deskAnchorId || d === a.holdAnchorId)) this.occupy(a, d);
    c.emit('AGENT_ARRIVED', { agentId: a.id, location: { ...a.location }, arrival: route.arrival });
    c.note(a, 'AGENT_ARRIVED', `${a.name} ist angekommen: ${d ?? a.location.zoneId}`);

    switch (route.arrival) {
      case 'WORK':
        c.systems.tasks.onAgentAtDesk(a);
        break;
      case 'BENCH':
        this.setState(a, 'AVAILABLE', 'SIT_ON_AGENT_BENCH', 'SIT');
        this.scheduleIdleDecision(a);
        break;
      case 'BREAK_STEP':
        this.beginBreakStep(a);
        break;
      case 'MEETING':
        this.setState(a, 'MEETING', 'ATTEND_MEETING', 'ATTEND_MEETING');
        c.systems.meetings.onParticipantArrived(a);
        break;
      case 'WAIT_AREA':
        this.setState(a, 'WAITING', 'WAIT_FOR_APPROVAL', 'WAIT_FOR_APPROVAL');
        break;
      case 'STAND':
        this.setState(a, 'AVAILABLE', 'IDLE', 'STAND');
        this.scheduleIdleDecision(a);
        break;
      case 'GO_OFFLINE':
        this.goOffline(a);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Aufgaben und Meetings (von anderen Systemen aufgerufen)
  // -------------------------------------------------------------------------

  beginAssignment(a: Agent, task: Task, deskId: AnchorId): void {
    this.interrupt(a);
    this.c.desks.reserve(a, deskId);
    a.taskId = task.id;
    this.setState(a, 'ASSIGNED', 'GO_TO_DESK', null);
    this.startRoute(a, this.locOf(deskId), 'GO_TO_DESK', 'WORK', 'MOVING');
  }

  /** Nach Ende, Fehler oder Abbruch der Aufgabe. */
  onTaskFinished(a: Agent): void {
    const c = this.c;
    if (a.route) a.route = null;
    if (a.breakPlan) this.endBreakBookkeeping(a, 'INTERRUPTED');
    this.switchHold(a, null);
    a.taskId = null;
    c.desks.release(a);
    a.wake = { atMs: c.now() + c.state.config.timings.completedLingerMs, kind: 'COMPLETED_LINGER' };
    this.setState(a, 'COMPLETED', 'IDLE', null);
  }

  startMeetingTravel(a: Agent, seatId: AnchorId): void {
    this.interrupt(a);
    this.switchHold(a, seatId);
    this.setState(a, 'MOVING', 'GO_TO_MEETING', null);
    this.startRoute(a, this.locOf(seatId), 'GO_TO_MEETING', 'MEETING', 'MOVING');
  }

  /** Nach Meeting (oder Abbruch): zurück an den Schreibtisch, sonst zur Bank. */
  afterMeeting(a: Agent): void {
    a.meetingId = null;
    this.interrupt(a);
    this.resumeOrBench(a);
  }

  resumeOrBench(a: Agent): void {
    const task = a.taskId ? this.c.state.tasks[a.taskId] : undefined;
    if (task && a.deskAnchorId && (task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED')) {
      this.setState(a, 'MOVING', 'RETURN_TO_DESK', null);
      this.startRoute(a, this.locOf(a.deskAnchorId), 'RETURN_TO_DESK', 'WORK', 'MOVING');
    } else {
      this.sendToBench(a);
    }
  }

  /** Zurück an den Schreibtisch, um weiterzuarbeiten (nach Freigabe). */
  resumeWork(a: Agent): void {
    if (!a.deskAnchorId) return;
    this.switchHold(a, null);
    a.wake = null;
    if (a.occupiedAnchorId === a.deskAnchorId) {
      this.c.systems.tasks.onAgentAtDesk(a);
    } else {
      this.setState(a, 'MOVING', 'RETURN_TO_DESK', null);
      this.startRoute(a, this.locOf(a.deskAnchorId), 'RETURN_TO_DESK', 'WORK', 'MOVING');
    }
  }

  /** Wartet auf Freigabe, optional in einer Warteplatzzone. */
  waitForApproval(a: Agent): void {
    const c = this.c;
    a.wake = null;
    if (c.state.config.approvalBehavior === 'GO_TO_WAITING_AREA' && a.deskAnchorId) {
      const floorId = c.anchors.get(a.deskAnchorId).floorId;
      const zone = c.state.layout.zones.find((z) => z.floorId === floorId && z.kind === 'WAITING_AREA');
      const wp = zone ? c.anchors.findFree('WAITING_POINT', a.id, { zoneId: zone.id }) : null;
      if (wp) {
        this.switchHold(a, wp.id);
        this.setState(a, 'WAITING', 'WAIT_FOR_APPROVAL', 'WAIT_FOR_APPROVAL');
        this.startRoute(a, this.locOf(wp.id), 'WAIT_FOR_APPROVAL', 'WAIT_AREA', 'WAITING');
        return;
      }
    }
    this.setState(a, 'WAITING', 'WAIT_FOR_APPROVAL', 'WAIT_FOR_APPROVAL');
  }

  // -------------------------------------------------------------------------
  // Bank, Idle
  // -------------------------------------------------------------------------

  /** Bank auf der eigenen Etage bevorzugt (Ausruhen), danach Erdgeschoss, danach irgendeine. */
  findBench(a: Agent): AnchorId | null {
    const c = this.c;
    if (a.preferredBenchId && c.anchors.has(a.preferredBenchId) && c.anchors.isFree(a.preferredBenchId, a.id)) return a.preferredBenchId;
    return (
      c.anchors.findFree('BENCH', a.id, { zoneId: homeBenchZone(a.departmentId) }) ??
      c.anchors.findFree('BENCH', a.id, { zoneId: GROUND_BENCH_ZONE }) ??
      c.anchors.findFree('BENCH', a.id)
    )?.id ?? null;
  }

  /** Stehplatz in der Bankzone der eigenen Etage, wenn keine Bank frei ist. */
  private standbyLocation(a: Agent): Location {
    const zoneId = homeBenchZone(a.departmentId);
    const z = this.c.state.layout.zones.find((x) => x.id === zoneId);
    return { floorId: z?.floorId ?? GROUND_FLOOR, zoneId: z ? zoneId : GROUND_BENCH_ZONE, anchorId: null };
  }

  sendToBench(a: Agent): void {
    const bench = this.findBench(a);
    this.setState(a, 'AVAILABLE', 'GO_TO_AGENT_BENCH', null);
    if (!bench) {
      this.switchHold(a, null);
      this.startRoute(a, this.standbyLocation(a), 'IDLE', 'STAND', 'AVAILABLE');
      return;
    }
    this.switchHold(a, bench);
    a.preferredBenchId = bench;
    this.startRoute(a, this.locOf(bench), 'GO_TO_AGENT_BENCH', 'BENCH', 'AVAILABLE');
  }

  /** Setzt einen Agenten ohne Weg direkt auf die Bank (nur beim Start der Firma). */
  placeAtBench(a: Agent): void {
    const bench = this.findBench(a);
    this.setState(a, 'AVAILABLE', 'IDLE', 'STAND');
    if (!bench) {
      a.location = this.standbyLocation(a);
      this.scheduleIdleDecision(a);
      return;
    }
    this.switchHold(a, bench);
    this.occupy(a, bench);
    a.preferredBenchId = bench;
    a.location = this.locOf(bench);
    this.setState(a, 'AVAILABLE', 'SIT_ON_AGENT_BENCH', 'SIT');
    this.scheduleIdleDecision(a);
  }

  scheduleIdleDecision(a: Agent): void {
    const c = this.c;
    const cfg = c.state.config.idle;
    a.wake = { atMs: c.now() + c.rng.int(cfg.decisionMinMs, cfg.decisionMaxMs), kind: 'IDLE_DECISION' };
  }

  private idleDecision(a: Agent): void {
    const c = this.c;
    const cfg = c.state.config.idle;
    if (a.status !== 'AVAILABLE') return;
    if (c.state.operations === 'WORKDAY' && !c.systems.mock.isWorkHours(c.now())) {
      this.leaveWork(a);
      return;
    }
    const at = a.occupiedAnchorId ? c.anchors.get(a.occupiedAnchorId) : null;
    if (!at || at.type !== 'BENCH') {
      this.sendToBench(a);
      return;
    }
    const counts = c.statusCounts;
    const canBreak =
      c.now() - a.lastBreakEndMs >= cfg.breakCooldownMs &&
      counts.BREAK < Math.max(1, Math.floor(cfg.maxBreakShare * (counts.AVAILABLE + counts.BREAK)));
    const choice = c.rng.weighted<'STAY' | BreakKind>([
      ['STAY', cfg.stayWeight],
      ['KITCHEN', canBreak ? cfg.kitchenWeight : 0],
      ['LOUNGE', canBreak ? cfg.loungeWeight : 0],
      ['WANDER', canBreak ? cfg.wanderWeight : 0],
      ['WELLNESS', canBreak ? cfg.wellnessWeight : 0],
    ]);
    if (choice === 'STAY' || !this.startBreak(a, choice)) this.scheduleIdleDecision(a);
  }

  // -------------------------------------------------------------------------
  // Pausen (Küche, Lounge, Wandern). Rein visuell / organisatorisch.
  // -------------------------------------------------------------------------

  /** Erster freier Anker des Typs in den Zonen, in dieser Reihenfolge. */
  private firstFree(a: Agent, type: AnchorType, zoneIds: readonly string[]) {
    for (const zoneId of zoneIds) {
      const found = this.c.anchors.findFree(type, a.id, { zoneId });
      if (found) return found;
    }
    return null;
  }

  private buildBreakPlan(a: Agent, kind: BreakKind): BreakPlan | null {
    const c = this.c;
    const steps: BreakStep[] = [];
    if (kind === 'KITCHEN') {
      // Erst die Teeküche der eigenen Etage, dann Küche und Café im Erdgeschoss.
      const coffee = this.firstFree(a, 'COFFEE_MACHINE', [floorKitchenZone(a.departmentId), GROUND_KITCHEN_ZONE]);
      if (!coffee) return null;
      steps.push({ anchorId: coffee.id, walkIntent: 'GO_TO_KITCHEN', intent: 'USE_KITCHEN', activity: 'USE_KITCHEN', durationMs: c.rng.int(10_000, 25_000) });
      if (c.rng.chance(0.5)) {
        const seat = c.anchors.findFree('CHAIR', a.id, { zoneId: coffee.zoneId });
        if (seat) steps.push({ anchorId: seat.id, walkIntent: 'GO_TO_KITCHEN', intent: 'USE_KITCHEN', activity: 'SIT', durationMs: c.rng.int(20_000, 60_000) });
      }
    } else if (kind === 'LOUNGE' || kind === 'WELLNESS') {
      let zones: readonly string[];
      if (kind === 'LOUNGE') zones = [floorLoungeZone(a.departmentId), GROUND_LOUNGE_ZONE];
      else { const start = c.rng.int(0, WELLNESS_ZONES.length - 1); zones = [...WELLNESS_ZONES.slice(start), ...WELLNESS_ZONES.slice(0, start)]; }
      const sofa = this.firstFree(a, 'SOFA', zones);
      if (!sofa) return null;
      const inWellness = sofa.type === 'SOFA' && sofa.allowedActivities.length === 3;
      const hasTv = !!sofa.focusAnchorId;
      const activity = inWellness
        ? 'REST'
        : c.rng.weighted<ActivityKind>([
            ['SIT', 2],
            ['CHAT_VISUAL', 3],
            ['WAIT', 1],
            ['READ', 2],
            ['REST', 1],
            ['WATCH_TV', hasTv ? 3 : 0],
          ]);
      steps.push({
        anchorId: sofa.id,
        walkIntent: 'GO_TO_LOUNGE',
        intent: 'SIT_IN_LOUNGE',
        activity,
        durationMs: inWellness ? c.rng.int(60_000, 180_000) : c.rng.int(30_000, 120_000),
      });
    } else {
      // Spaziergang: gern zu einem Messestand, sonst in die Lobby
      const booth = c.rng.chance(0.6) ? c.anchors.findFree('BOOTH', a.id, { zoneId: 'expo' }) : null;
      const pt = booth ?? c.anchors.findFree('WAITING_POINT', a.id, { zoneId: 'lobby' });
      if (!pt) return null;
      steps.push({ anchorId: pt.id, walkIntent: 'WANDER', intent: 'WANDER', activity: booth ? 'CHAT_VISUAL' : 'STAND', durationMs: c.rng.int(8_000, 20_000) });
    }
    return { kind, steps, stepIndex: 0 };
  }

  startBreak(a: Agent, kind: BreakKind): boolean {
    const c = this.c;
    if (this.isProtected(a) || a.taskId || a.meetingId) return false;
    const plan = this.buildBreakPlan(a, kind);
    if (!plan) return false;
    a.breakPlan = plan;
    const first = plan.steps[0]!;
    c.emit('BREAK_STARTED', { agentId: a.id, kind, anchorId: first.anchorId, activity: first.activity, visualOnly: true });
    c.note(a, 'BREAK_STARTED', `${a.name} macht Pause: ${BREAK_LABEL[kind]}`);
    this.nextBreakStep(a);
    return true;
  }

  private nextBreakStep(a: Agent): void {
    const plan = a.breakPlan;
    if (!plan) return;
    let step = plan.steps[plan.stepIndex];
    while (step && !this.c.anchors.isFree(step.anchorId, a.id)) {
      plan.stepIndex += 1;
      step = plan.steps[plan.stepIndex];
    }
    if (!step) {
      this.endBreak(a);
      return;
    }
    this.switchHold(a, step.anchorId);
    this.setState(a, 'BREAK', step.walkIntent, null);
    this.startRoute(a, this.locOf(step.anchorId), step.walkIntent, 'BREAK_STEP', 'BREAK');
  }

  private beginBreakStep(a: Agent): void {
    const plan = a.breakPlan;
    const step = plan?.steps[plan.stepIndex];
    if (!plan || !step) {
      this.endBreak(a);
      return;
    }
    this.setState(a, 'BREAK', step.intent, step.activity);
    a.wake = { atMs: this.c.now() + step.durationMs, kind: 'BREAK_STEP_END' };
  }

  private endBreakStep(a: Agent): void {
    if (!a.breakPlan) return;
    a.breakPlan.stepIndex += 1;
    this.nextBreakStep(a);
  }

  private endBreak(a: Agent): void {
    this.endBreakBookkeeping(a, 'COMPLETED');
    this.sendToBench(a);
  }

  // -------------------------------------------------------------------------
  // Arbeitstag
  // -------------------------------------------------------------------------

  private leaveWork(a: Agent): void {
    const c = this.c;
    this.switchHold(a, null);
    const lobby = elevatorLobbyId(GROUND_FLOOR);
    this.setState(a, 'MOVING', 'GO_TO_ELEVATOR', null);
    this.startRoute(a, { floorId: GROUND_FLOOR, zoneId: lobby, anchorId: lobby }, 'GO_TO_ELEVATOR', 'GO_OFFLINE', 'MOVING');
    c.note(a, 'AGENT_LEAVING', `${a.name} geht in den Feierabend`);
  }

  goOffline(a: Agent): void {
    const c = this.c;
    this.interrupt(a);
    this.vacateOccupied(a);
    c.desks.release(a);
    a.taskId = null;
    a.location = { floorId: GROUND_FLOOR, zoneId: elevatorLobbyId(GROUND_FLOOR), anchorId: null };
    this.setState(a, 'OFFLINE', 'IDLE', null);
    if (c.state.operations === 'WORKDAY') this.scheduleArrival(a, true);
    c.note(a, 'AGENT_OFFLINE', `${a.name} ist offline`);
  }

  /** Plant die Ankunft am (nächsten) Arbeitstag mit zufälligem Versatz. */
  scheduleArrival(a: Agent, nextDay: boolean): void {
    const c = this.c;
    const wd = c.state.config.workday;
    const now = c.now();
    const dayStart = localDayStartMs(now, c.state.config.timeZone);
    let start = dayStart + wd.startMinute * 60_000;
    if (nextDay && start <= now) start += DAY_MS;
    const at = Math.max(now, start) + c.rng.int(0, wd.arrivalWindowMs);
    a.wake = { atMs: at, kind: 'ARRIVE_AT_WORK' };
  }

  private arriveAtWork(a: Agent): void {
    const lobby = elevatorLobbyId(GROUND_FLOOR);
    a.location = { floorId: GROUND_FLOOR, zoneId: lobby, anchorId: lobby };
    this.setState(a, 'AVAILABLE', 'IDLE', null);
    this.c.note(a, 'AGENT_ARRIVED_AT_WORK', `${a.name} ist zur Arbeit erschienen`);
    this.sendToBench(a);
  }

  /** Fehlerzustand: der Agent bleibt stehen, seine Aufgabe wird neu verteilt (Mock) oder scheitert (extern). */
  setError(a: Agent, reason: string): void {
    const c = this.c;
    const task = a.taskId ? c.state.tasks[a.taskId] : undefined;
    const meetingId = a.meetingId;
    this.interrupt(a);
    if (meetingId) c.systems.meetings.removeParticipant(meetingId, a);
    if (task) {
      a.taskId = null;
      c.desks.release(a);
      if (task.origin === 'EXTERNAL') c.systems.tasks.failTask(task, reason);
      else c.systems.tasks.requeue(task, reason);
    }
    this.setState(a, 'ERROR', 'IDLE', null);
    c.note(a, 'AGENT_ERROR', `${a.name} hat einen Fehler: ${reason}`);
  }

  recover(a: Agent): void {
    if (a.status !== 'ERROR') return;
    this.vacateOccupied(a);
    this.sendToBench(a);
  }

  // -------------------------------------------------------------------------
  // Tick
  // -------------------------------------------------------------------------

  tick(now: number): void {
    const c = this.c;
    const autoMs = c.state.config.mockAutoApproveAfterMs;
    const list = c.agentList;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const w = a.wake;
      if (w && w.atMs <= now) {
        a.wake = null;
        this.onWake(a, w.kind);
      }
      if (autoMs !== null && a.status === 'WAITING') c.systems.tasks.checkAutoApprove(a, now, autoMs);
    }
  }

  private onWake(a: Agent, kind: WakeKind): void {
    const c = this.c;
    switch (kind) {
      case 'ROUTE_STAGE':
        this.completeStage(a);
        break;
      case 'WORK_DONE':
        c.systems.tasks.onWorkDone(a);
        break;
      case 'IDLE_DECISION':
        this.idleDecision(a);
        break;
      case 'IDLE_TRANSITION':
        if (a.status === 'AVAILABLE') this.sendToBench(a);
        break;
      case 'COMPLETED_LINGER': {
        if (a.status !== 'COMPLETED') break;
        this.setState(a, 'AVAILABLE', 'IDLE', null);
        const t = c.state.config.timings;
        a.wake = { atMs: c.now() + c.rng.int(t.idleTransitionMinMs, t.idleTransitionMaxMs), kind: 'IDLE_TRANSITION' };
        break;
      }
      case 'BREAK_STEP_END':
        this.endBreakStep(a);
        break;
      case 'ARRIVE_AT_WORK':
        if (a.status === 'OFFLINE') this.arriveAtWork(a);
        break;
      case 'AUTO_APPROVE':
        break;
    }
  }
}

