import type { SimSpeed } from './clock';
import { SIM_SPEEDS } from './clock';
import type { SimulationEngine } from './engine';
import type { AgentInspectorData } from './inspector';
import { TASK_TEMPLATES } from './workflows';
import type { AgentId, DepartmentId, Result } from './types';

export interface DebugControl {
  id: string;
  label: string;
  /** "agent": braucht einen ausgewählten Agenten. "department": braucht eine Abteilung. */
  needs?: 'agent' | 'department' | 'speed';
}

/** Entwicklungssteuerung der Simulation. Framework unabhängig, nutzbar aus Tests, CLI oder UI. */
export class DebugController {
  constructor(private engine: SimulationEngine) {}

  readonly controls: readonly DebugControl[] = [
    { id: 'start', label: 'Start' },
    { id: 'pause', label: 'Pause' },
    { id: 'resume', label: 'Resume' },
    { id: 'reset', label: 'Reset' },
    { id: 'speed', label: 'Speed', needs: 'speed' },
    { id: 'spawnTask', label: 'Spawn Task', needs: 'department' },
    { id: 'createMeeting', label: 'Create Meeting' },
    { id: 'triggerApproval', label: 'Trigger Approval' },
    { id: 'grantAllApprovals', label: 'Grant All Approvals' },
    { id: 'setAgentAvailable', label: 'Set Agent Available', needs: 'agent' },
    { id: 'setAgentWorking', label: 'Set Agent Working', needs: 'agent' },
    { id: 'sendAgentToKitchen', label: 'Send Agent to Kitchen', needs: 'agent' },
    { id: 'sendAgentToBench', label: 'Send Agent to Bench', needs: 'agent' },
  ];
  readonly speeds = SIM_SPEEDS;

  start(): void {
    this.engine.startCompany();
  }
  pause(): void {
    this.engine.pause();
  }
  resume(): void {
    this.engine.resume();
  }
  reset(): void {
    this.engine.reset();
  }
  setSpeed(speed: SimSpeed): void {
    this.engine.setSpeed(speed);
  }

  spawnTask(departmentId: DepartmentId = 'HERKULESJOBS') {
    const tpl = this.engine.ctx.rng.pick(TASK_TEMPLATES[departmentId]);
    return this.engine.createTask({
      title: tpl.title,
      departmentId,
      requiredCapabilities: tpl.capabilities,
      workDurationMs: this.engine.ctx.rng.int(tpl.minMs, tpl.maxMs),
    });
  }

  /** Meeting mit den angegebenen (oder den ersten drei verfügbaren) Agenten. */
  createMeeting(agentIds?: AgentId[]) {
    const ids = agentIds ?? this.engine.getAgents().filter((a) => a.status === 'AVAILABLE' && a.meetingId === null).slice(0, 3).map((a) => a.id);
    return this.engine.createMeeting({ title: 'Debug meeting (DEMO)', participantAgentIds: ids, origin: 'MANUAL' });
  }

  /** Lässt die erste laufende Mock Aufgabe um Freigabe bitten, sonst wird eine kurze Freigabeaufgabe erzeugt. */
  triggerApproval(): Result<unknown> {
    const working = this.engine.getTasks().find((t) => t.origin === 'MOCK' && t.status === 'IN_PROGRESS');
    if (working) return this.engine.requestApproval(working.id);
    return this.engine.createTask({
      title: 'Approval demo (DEMO)',
      departmentId: 'HERKULESJOBS',
      requiredCapabilities: ['follow_up'],
      workDurationMs: 3_000,
      requiresApproval: true,
      priority: 'HIGH',
    });
  }

  grantAllApprovals(): number {
    let n = 0;
    for (const t of this.engine.getTasks()) if (t.status === 'WAITING_FOR_HUMAN' && this.engine.grantApproval(t.id).ok) n += 1;
    return n;
  }

  setAgentAvailable(id: AgentId) {
    return this.engine.setAgentAvailable(id);
  }
  setAgentWorking(id: AgentId) {
    return this.engine.setAgentWorking(id);
  }
  sendAgentToKitchen(id: AgentId) {
    return this.engine.sendAgentToKitchen(id);
  }
  sendAgentToBench(id: AgentId) {
    return this.engine.sendAgentToBench(id);
  }

  inspect(id: AgentId): AgentInspectorData | null {
    return this.engine.inspectAgent(id);
  }
}
