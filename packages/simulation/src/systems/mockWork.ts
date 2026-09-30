import type { Ctx } from '../context';
import { DAY_MS } from '../clock';
import { TASK_TEMPLATES } from '../workflows';
import type { GeneratorState, ScheduledAction, ScheduledCommand, WorkProfile } from '../state';
import type { DepartmentId } from '../types';

const PROFILE_WEIGHTS: Record<WorkProfile, ReadonlyArray<readonly [DepartmentId, number]>> = {
  BALANCED: [['HERKULESJOBS', 4], ['KASSELMEMES', 3], ['SHARED', 3]],
  HJ_SALES: [['HERKULESJOBS', 8], ['KASSELMEMES', 1], ['SHARED', 1]],
  KM_TREND: [['HERKULESJOBS', 1], ['KASSELMEMES', 8], ['SHARED', 1]],
  DEV: [['HERKULESJOBS', 1], ['KASSELMEMES', 1], ['SHARED', 8]],
};
const WORKFLOW_BY_DEPARTMENT: Record<DepartmentId, string> = { HERKULESJOBS: 'hj_sales', KASSELMEMES: 'km_trend_spike', SHARED: 'dev_feature' };
const MEAN_WORK_MS = 35_000;

/** Erzeugt glaubhafte Mock Aktivität: Zeitplan (Szenarien) und stochastische Aufgabenankunft (seeded). */
export class MockWorkSystem {
  constructor(private c: Ctx) {}

  isWorkHours(now: number): boolean {
    const wd = this.c.state.config.workday;
    const minute = Math.floor((((now % DAY_MS) + DAY_MS) % DAY_MS) / 60_000);
    return minute >= wd.startMinute && minute < wd.endMinute;
  }

  schedule(afterMs: number, action: ScheduledAction): ScheduledCommand {
    const c = this.c;
    const id = (c.state.counters['sched'] = (c.state.counters['sched'] ?? 0) + 1);
    const cmd = { id, atMs: c.now() + afterMs, action };
    const list = c.state.schedule;
    let i = list.length;
    while (i > 0 && list[i - 1]!.atMs > cmd.atMs) i--;
    list.splice(i, 0, cmd);
    return cmd;
  }

  setGenerator(patch: Partial<GeneratorState>): void {
    const c = this.c;
    Object.assign(c.state.generator, patch);
    if (c.state.generator.enabled && c.state.generator.nextAtMs === null) c.state.generator.nextAtMs = c.now();
  }

  private online(): number {
    const s = this.c.statusCounts;
    return this.c.agentList.length - s.OFFLINE - s.ERROR;
  }

  runAction(action: ScheduledAction): void {
    const c = this.c;
    switch (action.type) {
      case 'START_WORKFLOW':
        c.systems.workflows.start(action.workflowId, action.priority ?? 'NORMAL');
        break;
      case 'CREATE_TASK':
        c.systems.tasks.create(action.spec);
        break;
      case 'CREATE_MEETING':
        c.systems.meetings.create(action.spec);
        break;
      case 'SET_GENERATOR':
        this.setGenerator(action.patch);
        break;
      case 'GRANT_ALL_APPROVALS':
        for (const t of Object.values(c.state.tasks)) if (t.origin === 'MOCK' && t.status === 'WAITING_FOR_HUMAN') c.systems.tasks.grantApproval(t.id);
        break;
    }
  }

  tick(now: number): void {
    const c = this.c;
    const list = c.state.schedule;
    while (list.length > 0 && list[0]!.atMs <= now) this.runAction(list.shift()!.action);

    const g = c.state.generator;
    if (!g.enabled || g.nextAtMs === null || now < g.nextAtMs) return;
    const online = this.online();
    const gated = c.state.operations === 'WORKDAY' && !this.isWorkHours(now);
    let queued = 0;
    for (const q of Object.values(c.state.queues)) queued += q.length;
    if (!gated && online > 0 && queued <= online * 1.5) this.generate(g);
    const mean = MEAN_WORK_MS / (Math.max(0.05, g.targetUtilization) * Math.max(1, online));
    g.nextAtMs = now + Math.max(250, Math.round(c.rng.exponential(mean)));
  }

  private generate(g: GeneratorState): void {
    const c = this.c;
    const dept = c.rng.weighted(PROFILE_WEIGHTS[g.profile]);
    if (c.rng.chance(g.workflowShare)) {
      c.systems.workflows.start(WORKFLOW_BY_DEPARTMENT[dept]);
      return;
    }
    const tpl = this.pickTemplate(dept);
    if (!tpl) return;
    const priority = c.rng.weighted<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>([['LOW', 2], ['NORMAL', 8], ['HIGH', 2], ['URGENT', 0.5]]);
    c.systems.tasks.create({
      title: tpl.title,
      departmentId: dept,
      requiredCapabilities: tpl.capabilities,
      priority,
      workDurationMs: c.rng.int(tpl.minMs, tpl.maxMs),
      requiresApproval: c.rng.chance(Math.min(1, tpl.approvalChance * g.approvalScale)),
    });
  }

  /**
   * Wählt eine Vorlage, für die Kapazität da ist: Es gibt fähige Agenten und die Warteschlange für
   * dieselben Fähigkeiten ist nicht länger als zwei Aufgaben je fähigem Agenten. Verhindert, dass
   * sich Aufgaben für Spezialisten stauen, während der Rest des Büros untätig ist.
   */
  private pickTemplate(dept: 'HERKULESJOBS' | 'KASSELMEMES' | 'SHARED') {
    const c = this.c;
    const list = TASK_TEMPLATES[dept];
    let first = null as (typeof list)[number] | null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const tpl = c.rng.pick(list);
      first ??= tpl;
      let capable = 0;
      for (const a of c.agentList) {
        if (a.status === 'OFFLINE' || a.status === 'ERROR') continue;
        if (a.departmentId !== dept && a.departmentId !== 'SHARED') continue;
        if (tpl.capabilities.every((cap) => a.capabilities.includes(cap))) capable += 1;
      }
      if (capable === 0) continue;
      let queuedSame = 0;
      for (const id of c.state.queues[dept]) {
        const t = c.state.tasks[id];
        if (t && t.requiredCapabilities.length === tpl.capabilities.length && t.requiredCapabilities.every((x) => tpl.capabilities.includes(x))) queuedSame += 1;
      }
      if (queuedSame < capable * 2) return tpl;
    }
    return null;
  }
}
