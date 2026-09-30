import type { Ctx } from '../context';
import type { WorkflowRun } from '../state';
import { WORKFLOWS } from '../workflows';
import { fail, ok, type Meeting, type Priority, type Result, type Task } from '../types';

/** Führt datenbasierte Workflows Schritt für Schritt aus (Aufgabe oder Meeting je Schritt). */
export class WorkflowSystem {
  constructor(private c: Ctx) {}

  start(workflowId: string, priority: Priority = 'NORMAL'): Result<WorkflowRun> {
    const c = this.c;
    const def = WORKFLOWS[workflowId];
    if (!def) return fail('NOT_FOUND', `Workflow ${workflowId} unbekannt`);
    const n = (c.state.counters['workflow'] = (c.state.counters['workflow'] ?? 0) + 1);
    const run: WorkflowRun = {
      id: `WF-${String(n).padStart(3, '0')}`,
      workflowId,
      stepIndex: 0,
      status: 'RUNNING',
      priority,
      agentByStep: {},
      currentTaskId: null,
      currentMeetingId: null,
      startedAtMs: c.now(),
    };
    c.state.workflowRuns[run.id] = run;
    c.emit('WORKFLOW_STARTED', { runId: run.id, workflowId });
    c.log.add(c.now(), 'WORKFLOW', `Workflow ${run.id} gestartet: ${def.title}`);
    this.startStep(run);
    return ok(run);
  }

  private startStep(run: WorkflowRun): void {
    const c = this.c;
    const def = WORKFLOWS[run.workflowId]!;
    const step = def.steps[run.stepIndex];
    if (!step) {
      this.end(run, 'COMPLETED');
      return;
    }
    c.emit('WORKFLOW_STEP_STARTED', { runId: run.id, workflowId: run.workflowId, stepIndex: run.stepIndex });
    if (step.kind === 'TASK') {
      const prev = run.currentTaskId;
      const res = c.systems.tasks.create({
        title: step.title,
        departmentId: step.departmentId,
        requiredCapabilities: step.requiredCapabilities,
        priority: run.priority ?? 'NORMAL',
        workDurationMs: step.workDurationMs,
        requiresApproval: step.requiresApproval ?? false,
        workflowRunId: run.id,
        workflowStepIndex: run.stepIndex,
        ...(prev ? { parentTaskId: prev } : {}),
      });
      if (res.ok) {
        run.currentTaskId = res.value.id;
        run.currentMeetingId = null;
      } else this.end(run, 'FAILED');
    } else {
      const ids = [...new Set(step.participantsFromSteps.map((i) => run.agentByStep[i]).filter((x): x is string => !!x))];
      const res = ids.length >= 2 ? c.systems.meetings.create({ title: step.title, participantAgentIds: ids, durationMs: step.durationMs, origin: 'WORKFLOW', workflowRunId: run.id }) : null;
      if (res && res.ok) {
        run.currentMeetingId = res.value.id;
        run.currentTaskId = null;
      } else {
        c.log.add(c.now(), 'WORKFLOW', `Workflow ${run.id}: Meeting Schritt übersprungen`);
        run.stepIndex += 1;
        this.startStep(run);
      }
    }
  }

  onTaskTerminal(task: Task): void {
    if (!task.workflowRunId) return;
    const run = this.c.state.workflowRuns[task.workflowRunId];
    if (!run || run.currentTaskId !== task.id) return;
    if (task.status === 'COMPLETED') {
      if (task.primaryAgentId) run.agentByStep[run.stepIndex] = task.primaryAgentId;
      run.stepIndex += 1;
      this.startStep(run);
    } else {
      this.end(run, 'FAILED');
    }
  }

  onMeetingTerminal(m: Meeting): void {
    if (!m.workflowRunId) return;
    const run = this.c.state.workflowRuns[m.workflowRunId];
    if (!run || run.currentMeetingId !== m.id) return;
    run.stepIndex += 1;
    this.startStep(run);
  }

  private end(run: WorkflowRun, outcome: 'COMPLETED' | 'FAILED'): void {
    const c = this.c;
    run.status = outcome;
    c.emit('WORKFLOW_COMPLETED', { runId: run.id, workflowId: run.workflowId, outcome });
    c.log.add(c.now(), 'WORKFLOW', `Workflow ${run.id} ${outcome === 'COMPLETED' ? 'abgeschlossen' : 'fehlgeschlagen'}`);
    delete c.state.workflowRuns[run.id];
  }
}
