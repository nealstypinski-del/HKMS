import type { Ctx } from '../context';
import { DEPARTMENT_SLUG } from '../layout';
import { effectiveRank } from '../routing';
import {
  PRIORITY_RANK,
  fail,
  ok,
  type Agent,
  type DepartmentId,
  type Result,
  type Task,
  type TaskId,
  type TaskSpec,
} from '../types';

const PREFIX: Record<string, string> = { HERKULESJOBS: 'HJ', KASSELMEMES: 'KM', SHARED: 'DEV', ANY: 'GEN' };
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

/** Aufgaben: Warteschlangen, Zuweisung, Lebenszyklus, Freigabe. */
export class TaskSystem {
  constructor(private c: Ctx) {}

  nextId(prefix: string): string {
    const k = `task:${prefix}`;
    const n = (this.c.state.counters[k] = (this.c.state.counters[k] ?? 100) + 1);
    return `${prefix}-${n}`;
  }

  create(spec: TaskSpec): Result<Task> {
    const c = this.c;
    if (!spec || typeof spec.title !== 'string' || !spec.title.trim()) return fail('INVALID', 'Aufgabe braucht einen Titel');
    if (!(spec.departmentId in c.state.queues)) return fail('INVALID', `Unbekannte Abteilung: ${String(spec.departmentId)}`);
    if (!Array.isArray(spec.requiredCapabilities) || spec.requiredCapabilities.some((x) => typeof x !== 'string' || !x)) return fail('INVALID', 'requiredCapabilities muss eine Liste von Texten sein');
    if (spec.priority !== undefined && !(spec.priority in PRIORITY_RANK)) return fail('INVALID', `Unbekannte Priorität: ${String(spec.priority)}`);
    for (const [name, v] of [['workDurationMs', spec.workDurationMs], ['postApprovalWorkMs', spec.postApprovalWorkMs]] as const) {
      if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 86_400_000)) return fail('INVALID', `${name} muss zwischen 0 und 24 Stunden liegen`);
    }
    let queued = 0;
    for (const q of Object.values(c.state.queues)) queued += q.length;
    if (queued >= c.state.config.maxQueuedTasks) return fail('NO_CAPACITY', `Warteschlange voll (${c.state.config.maxQueuedTasks})`);
    if (spec.pinnedAgentId && !c.state.agents[spec.pinnedAgentId]) return fail('NOT_FOUND', `Agent ${spec.pinnedAgentId} unbekannt`);
    const origin = spec.origin ?? 'MOCK';
    const seq = (c.state.counters['taskSeq'] = (c.state.counters['taskSeq'] ?? 0) + 1);
    const task: Task = {
      id: this.nextId(PREFIX[spec.departmentId] ?? 'GEN'),
      seq,
      title: spec.title,
      departmentId: spec.departmentId,
      requiredCapabilities: [...spec.requiredCapabilities],
      priority: spec.priority ?? 'NORMAL',
      status: 'QUEUED',
      origin,
      primaryAgentId: null,
      collaboratorAgentIds: [...(spec.collaboratorAgentIds ?? [])],
      pinnedAgentId: spec.pinnedAgentId ?? null,
      createdAtMs: c.now(),
      assignedAtMs: null,
      startedAtMs: null,
      finishedAtMs: null,
      workDurationMs: spec.workDurationMs ?? 30_000,
      remainingWorkMs: spec.workDurationMs ?? 30_000,
      workEndsAtMs: null,
      requiresApproval: spec.requiresApproval ?? false,
      postApprovalWorkMs: spec.postApprovalWorkMs ?? 0,
      approval: 'NONE',
      approvalRequestedAtMs: null,
      parentTaskId: spec.parentTaskId ?? null,
      workflowRunId: spec.workflowRunId ?? null,
      workflowStepIndex: spec.workflowStepIndex ?? null,
      externalRef: spec.externalRef ?? null,
      failReason: null,
    };
    c.state.tasks[task.id] = task;
    c.state.queues[task.departmentId].push(task.id);
    c.flags.dispatchDirty = true;
    c.emit('TASK_CREATED', {
      taskId: task.id,
      title: task.title,
      departmentId: task.departmentId,
      priority: task.priority,
      origin: task.origin,
      requiredCapabilities: [...task.requiredCapabilities],
    });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} erstellt: ${task.title}`, { taskId: task.id });
    return ok(task);
  }

  private dequeue(task: Task): void {
    const q = this.c.state.queues[task.departmentId];
    const i = q.indexOf(task.id);
    if (i >= 0) q.splice(i, 1);
  }

  // -------------------------------------------------------------------------
  // Zuweisung
  // -------------------------------------------------------------------------

  /** Verteilt wartende Aufgaben an verfügbare Agenten. Läuft nur, wenn sich etwas geändert hat. */
  dispatch(): void {
    const c = this.c;
    if (!c.flags.dispatchDirty) return;
    c.flags.dispatchDirty = false;

    let candidates: Agent[] = [];
    for (const a of c.agentList) {
      if ((a.status === 'AVAILABLE' || a.status === 'BREAK') && a.taskId === null && a.meetingId === null) candidates.push(a);
    }
    if (candidates.length === 0) return;

    const queued: Task[] = [];
    for (const dept of ['HERKULESJOBS', 'KASSELMEMES', 'SHARED', 'ANY'] as const) {
      for (const id of c.state.queues[dept]) {
        const t = c.state.tasks[id];
        if (t && t.status === 'QUEUED') queued.push(t);
      }
    }
    if (queued.length === 0) return;
    const now = c.now();
    const aging = c.state.config.agingMs;
    queued.sort((x, y) => effectiveRank(y, now, aging) - effectiveRank(x, now, aging) || x.seq - y.seq);

    for (const task of queued) {
      if (candidates.length === 0) break;
      const agent = c.router.pick(task, candidates);
      if (!agent) continue;
      const desk = c.desks.findDesk(agent, task);
      if (!desk) {
        c.log.add(now, 'TASK', `Kein Schreibtisch frei für ${task.id}`, { taskId: task.id });
        continue;
      }
      this.assign(task, agent, desk);
      candidates = candidates.filter((x) => x !== agent);
    }
  }

  private assign(task: Task, agent: Agent, deskId: string): void {
    const c = this.c;
    this.dequeue(task);
    task.status = 'ASSIGNED';
    task.primaryAgentId = agent.id;
    task.assignedAtMs = c.now();
    c.emit('TASK_ASSIGNED', { taskId: task.id, agentId: agent.id, deskAnchorId: deskId });
    c.emit('AGENT_ASSIGNED', { agentId: agent.id, taskId: task.id, deskAnchorId: deskId });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} zugewiesen an ${agent.name}`, { taskId: task.id, agentId: agent.id });
    c.note(agent, 'AGENT_ASSIGNED', `${agent.name} geht zu ${deskId}`);
    c.systems.agents.beginAssignment(agent, task, deskId);
  }

  // -------------------------------------------------------------------------
  // Arbeit
  // -------------------------------------------------------------------------

  onAgentAtDesk(a: Agent): void {
    const c = this.c;
    const task = a.taskId ? c.state.tasks[a.taskId] : undefined;
    if (!task) {
      c.systems.agents.sendToBench(a);
      return;
    }
    if (task.status === 'ASSIGNED') {
      task.status = 'IN_PROGRESS';
      task.startedAtMs = c.now();
      c.emit('TASK_STARTED', { taskId: task.id, agentId: a.id });
      c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} gestartet`, { taskId: task.id, agentId: a.id });
    }
    c.systems.agents.setState(a, 'WORKING', 'USE_WORKSTATION', 'WORK');
    if (task.origin === 'MOCK') {
      task.workEndsAtMs = c.now() + task.remainingWorkMs;
      a.wake = { atMs: task.workEndsAtMs, kind: 'WORK_DONE' };
    } else {
      task.workEndsAtMs = null;
      a.wake = null;
    }
  }

  /** Meeting oder Unterbrechung: Restarbeit merken, Frist entfernen. */
  suspend(task: Task | undefined): void {
    if (!task || task.workEndsAtMs === null) return;
    task.remainingWorkMs = Math.max(0, task.workEndsAtMs - this.c.now());
    task.workEndsAtMs = null;
  }

  onWorkDone(a: Agent): void {
    const task = a.taskId ? this.c.state.tasks[a.taskId] : undefined;
    if (!task || a.status !== 'WORKING') return;
    task.remainingWorkMs = 0;
    task.workEndsAtMs = null;
    if (task.requiresApproval && task.approval === 'NONE') this.requestApproval(task);
    else this.complete(task);
  }

  // -------------------------------------------------------------------------
  // Freigabe
  // -------------------------------------------------------------------------

  requestApproval(task: Task): Result<Task> {
    const c = this.c;
    if (task.status !== 'IN_PROGRESS' && task.status !== 'ASSIGNED') return fail('WRONG_STATE', `Aufgabe ${task.id} ist ${task.status}`);
    const agent = task.primaryAgentId ? c.state.agents[task.primaryAgentId] : undefined;
    this.suspend(task);
    task.status = 'WAITING_FOR_HUMAN';
    task.approval = 'PENDING';
    task.approvalRequestedAtMs = c.now();
    c.emit('APPROVAL_REQUIRED', { taskId: task.id, agentId: agent?.id ?? null, departmentId: task.departmentId, title: task.title });
    c.log.add(c.now(), 'APPROVAL', `Freigabe nötig für ${task.id}: ${task.title}`, { taskId: task.id, ...(agent ? { agentId: agent.id } : {}) });
    if (agent) {
      c.note(agent, 'APPROVAL_REQUIRED', `${agent.name} wartet auf menschliche Freigabe für ${task.id}`);
      c.systems.agents.waitForApproval(agent);
    }
    return ok(task);
  }

  grantApproval(taskId: TaskId, by: 'HUMAN' | 'MOCK_AUTO' = 'HUMAN'): Result<Task> {
    const c = this.c;
    const task = c.state.tasks[taskId];
    if (!task) return fail('NOT_FOUND', `Aufgabe ${taskId} unbekannt`);
    if (task.status !== 'WAITING_FOR_HUMAN') return fail('WRONG_STATE', `Aufgabe ${taskId} wartet nicht auf Freigabe`);
    const agent = task.primaryAgentId ? c.state.agents[task.primaryAgentId] : undefined;
    task.approval = 'GRANTED';
    c.emit('APPROVAL_GRANTED', { taskId, agentId: agent?.id ?? null, by });
    c.log.add(c.now(), 'APPROVAL', `Freigabe erteilt für ${taskId}${by === 'MOCK_AUTO' ? ' (Demo automatisch)' : ''}`, { taskId });
    c.hooks.onApprovalDecision?.({ taskId, externalRef: task.externalRef, granted: true });
    if (task.origin === 'EXTERNAL' || task.postApprovalWorkMs > 0) {
      task.status = 'IN_PROGRESS';
      if (task.origin === 'MOCK') task.remainingWorkMs = task.postApprovalWorkMs;
      if (agent) c.systems.agents.resumeWork(agent);
    } else {
      this.complete(task);
    }
    return ok(task);
  }

  denyApproval(taskId: TaskId): Result<Task> {
    const c = this.c;
    const task = c.state.tasks[taskId];
    if (!task) return fail('NOT_FOUND', `Aufgabe ${taskId} unbekannt`);
    if (task.status !== 'WAITING_FOR_HUMAN') return fail('WRONG_STATE', `Aufgabe ${taskId} wartet nicht auf Freigabe`);
    task.approval = 'DENIED';
    c.emit('APPROVAL_DENIED', { taskId, agentId: task.primaryAgentId });
    c.hooks.onApprovalDecision?.({ taskId, externalRef: task.externalRef, granted: false });
    this.failTask(task, 'APPROVAL_DENIED');
    return ok(task);
  }

  /** Nur für MOCK Aufgaben. Echte Aufgaben werden nie automatisch freigegeben. */
  checkAutoApprove(a: Agent, now: number, afterMs: number): void {
    const task = a.taskId ? this.c.state.tasks[a.taskId] : undefined;
    if (!task || task.origin !== 'MOCK' || task.status !== 'WAITING_FOR_HUMAN' || task.approvalRequestedAtMs === null) return;
    if (now - task.approvalRequestedAtMs >= afterMs) this.grantApproval(task.id, 'MOCK_AUTO');
  }

  // -------------------------------------------------------------------------
  // Abschluss
  // -------------------------------------------------------------------------

  complete(task: Task): void {
    const c = this.c;
    if (TERMINAL.has(task.status)) return;
    task.status = 'COMPLETED';
    task.finishedAtMs = c.now();
    const agent = task.primaryAgentId ? c.state.agents[task.primaryAgentId] : undefined;
    c.emit('TASK_COMPLETED', { taskId: task.id, agentId: agent?.id ?? null, durationMs: c.now() - (task.startedAtMs ?? task.createdAtMs) });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} abgeschlossen`, { taskId: task.id, ...(agent ? { agentId: agent.id } : {}) });
    if (agent) {
      agent.tasksCompleted += 1;
      c.systems.agents.onTaskFinished(agent);
    }
    this.finish(task);
  }

  failTask(task: Task, reason: string): void {
    const c = this.c;
    if (TERMINAL.has(task.status)) return;
    const wasQueued = task.status === 'QUEUED';
    task.status = 'FAILED';
    task.failReason = reason;
    task.finishedAtMs = c.now();
    if (wasQueued) this.dequeue(task);
    const agent = task.primaryAgentId ? c.state.agents[task.primaryAgentId] : undefined;
    c.emit('TASK_FAILED', { taskId: task.id, agentId: agent?.id ?? null, reason });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} fehlgeschlagen: ${reason}`, { taskId: task.id });
    if (agent && agent.taskId === task.id) c.systems.agents.onTaskFinished(agent);
    this.finish(task);
  }

  cancel(task: Task): void {
    const c = this.c;
    if (TERMINAL.has(task.status)) return;
    const wasQueued = task.status === 'QUEUED';
    task.status = 'CANCELLED';
    task.finishedAtMs = c.now();
    if (wasQueued) this.dequeue(task);
    const agent = task.primaryAgentId ? c.state.agents[task.primaryAgentId] : undefined;
    c.emit('TASK_CANCELLED', { taskId: task.id, agentId: agent?.id ?? null });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} abgebrochen`, { taskId: task.id });
    if (agent && agent.taskId === task.id) c.systems.agents.onTaskFinished(agent);
    this.finish(task);
  }

  /** Aufgabe wieder einreihen (z. B. Agent fiel aus). */
  requeue(task: Task, reason: string): void {
    const c = this.c;
    this.suspend(task);
    task.status = 'QUEUED';
    task.primaryAgentId = null;
    task.assignedAtMs = null;
    task.approval = task.approval === 'PENDING' ? 'NONE' : task.approval;
    c.state.queues[task.departmentId].push(task.id);
    c.flags.dispatchDirty = true;
    c.emit('TASK_REQUEUED', { taskId: task.id, reason });
    c.log.add(c.now(), 'TASK', `Aufgabe ${task.id} zurück in die Warteschlange: ${reason}`, { taskId: task.id });
  }

  private finish(task: Task): void {
    const c = this.c;
    c.systems.workflows.onTaskTerminal(task);
    const hist = c.state.taskHistory;
    hist.push({
      id: task.id,
      title: task.title,
      departmentId: task.departmentId,
      status: task.status,
      origin: task.origin,
      primaryAgentId: task.primaryAgentId,
      createdAtMs: task.createdAtMs,
      finishedAtMs: task.finishedAtMs,
      failReason: task.failReason,
    });
    if (hist.length > c.state.config.historyCapacity) hist.splice(0, hist.length - c.state.config.historyCapacity);
    delete c.state.tasks[task.id];
    c.flags.dispatchDirty = true;
  }

  findExternal(providerId: string, sessionId: string): Task | undefined {
    for (const t of Object.values(this.c.state.tasks)) {
      if (t.externalRef && t.externalRef.providerId === providerId && t.externalRef.sessionId === sessionId) return t;
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Queue Ansicht
  // -------------------------------------------------------------------------

  queueStats(): Record<DepartmentId | 'ANY', { active: number; queued: number; waitingApproval: number }> {
    const out = {
      HERKULESJOBS: { active: 0, queued: 0, waitingApproval: 0 },
      KASSELMEMES: { active: 0, queued: 0, waitingApproval: 0 },
      SHARED: { active: 0, queued: 0, waitingApproval: 0 },
      ANY: { active: 0, queued: 0, waitingApproval: 0 },
    };
    for (const t of Object.values(this.c.state.tasks)) {
      const s = out[t.departmentId];
      if (t.status === 'QUEUED') s.queued += 1;
      else if (t.status === 'WAITING_FOR_HUMAN') s.waitingApproval += 1;
      else s.active += 1;
    }
    return out;
  }
}

export { DEPARTMENT_SLUG };
