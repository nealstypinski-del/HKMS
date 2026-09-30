import { formatClock, type SimSpeed } from './clock';
import type { SimulationEngine } from './engine';
import { DebugController } from './debug';
import type { DepartmentId } from './types';
import { DEPARTMENTS } from './types';

/**
 * Optionales Debug Panel (nur Entwicklung). Nutzt bewusst nur minimale strukturelle DOM Typen,
 * damit das Paket ohne DOM Bibliothek kompiliert und nicht an einen Browser gebunden ist.
 */
export interface PanelElement {
  textContent: string | null;
  value?: string;
  style?: Record<string, string>;
  appendChild(child: PanelElement): unknown;
  addEventListener(type: string, handler: () => void): void;
  setAttribute(name: string, value: string): void;
}
export interface PanelDocument {
  createElement(tag: string): PanelElement;
}

export interface MountedPanel {
  refresh(): void;
  /** Aktuell gewählter Agent (Id). */
  selectedAgentId(): string;
}

export function mountDebugPanel(doc: PanelDocument, root: PanelElement, engine: SimulationEngine): MountedPanel {
  const dbg = new DebugController(engine);
  const el = (tag: string, text?: string): PanelElement => {
    const e = doc.createElement(tag);
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const title = el('div', 'HERKULES Simulation Debug (nur Entwicklung, alles DEMO)');
  const agentSelect = el('select');
  for (const a of engine.getAgents()) {
    const o = el('option', `${a.name} (${a.id})`);
    o.value = a.id;
    agentSelect.appendChild(o);
  }
  agentSelect.value = engine.getAgents()[0]?.id ?? '';
  const deptSelect = el('select');
  for (const d of DEPARTMENTS) {
    const o = el('option', d);
    o.value = d;
    deptSelect.appendChild(o);
  }
  deptSelect.value = 'HERKULESJOBS';
  const speedSelect = el('select');
  for (const s of dbg.speeds) {
    const o = el('option', `${s}x`);
    o.value = String(s);
    speedSelect.appendChild(o);
  }
  speedSelect.value = '1';

  const out = el('pre');
  const refresh = () => {
    const m = engine.getMetrics();
    const id = agentSelect.value ?? '';
    const insp = id ? engine.inspectAgent(id) : null;
    out.textContent = [
      `Zeit ${formatClock(engine.getClock().nowMs, engine.getState().config.timeZone)} (${engine.getState().config.timeZone})  Modus ${engine.getClock().mode}  ${engine.getClock().speed}x`,
      `Agenten ${m.totalAgents}  verfügbar ${m.availableAgents}  arbeiten ${m.workingAgents}  wartend ${m.waitingAgents}  Meeting ${m.meetingAgents}  Pause ${m.breakAgents}  offline ${m.offlineAgents}`,
      `Warteschlange ${m.queuedTasks}  Freigaben ${m.waitingApprovalTasks}  Aktivität ${m.activityLevel}`,
      '',
      insp ? JSON.stringify(insp, null, 2) : '',
      '',
      ...engine.getLog(15).map((l) => `${l.clock} ${l.text}`),
    ].join('\n');
  };

  const act: Record<string, () => unknown> = {
    start: () => dbg.start(),
    pause: () => dbg.pause(),
    resume: () => dbg.resume(),
    reset: () => dbg.reset(),
    speed: () => dbg.setSpeed(Number(speedSelect.value) as SimSpeed),
    spawnTask: () => dbg.spawnTask((deptSelect.value ?? 'HERKULESJOBS') as DepartmentId),
    createMeeting: () => dbg.createMeeting(),
    triggerApproval: () => dbg.triggerApproval(),
    grantAllApprovals: () => dbg.grantAllApprovals(),
    setAgentAvailable: () => dbg.setAgentAvailable(agentSelect.value ?? ''),
    setAgentWorking: () => dbg.setAgentWorking(agentSelect.value ?? ''),
    sendAgentToKitchen: () => dbg.sendAgentToKitchen(agentSelect.value ?? ''),
    sendAgentToBench: () => dbg.sendAgentToBench(agentSelect.value ?? ''),
  };

  root.appendChild(title);
  root.appendChild(agentSelect);
  root.appendChild(deptSelect);
  root.appendChild(speedSelect);
  for (const c of dbg.controls) {
    const b = el('button', c.label);
    b.setAttribute('type', 'button');
    b.addEventListener('click', () => {
      act[c.id]?.();
      refresh();
    });
    root.appendChild(b);
  }
  root.appendChild(out);
  refresh();
  return { refresh, selectedAgentId: () => agentSelect.value ?? '' };
}
