import type { SimSpeed } from './clock';
import { SimulationEngine } from './engine';
import type { GeneratorState, ScheduledAction, DeepPartial } from './state';
import { TASK_TEMPLATES } from './workflows';
import type { OperationsMode, SimConfig } from './types';

/**
 * Demo Szenarien. Reine Simulation, keine echte KI, keine echten Nachrichten.
 * Jedes Szenario besteht nur aus Daten (Konfiguration, Generator, Zeitplan) und ist damit speicherbar.
 */

export type ScenarioId =
  | 'A_MORNING_START'
  | 'B_BUSY_SALES_DAY'
  | 'C_KASSELMEMES_TREND_SPIKE'
  | 'D_DEVELOPMENT_SPRINT'
  | 'E_WAITING_FOR_APPROVAL'
  | 'F_FULL_HQ';

export interface ScenarioDef {
  id: ScenarioId;
  title: string;
  description: string;
  operations: OperationsMode;
  rosterCopies: number;
  /** Alternative zu rosterCopies: genau n Agenten. */
  rosterSize?: number;
  /** Simulationsstart (UTC Zeitstempel). Standard ist Montag 08:00 Berliner Zeit. */
  startMs?: number;
  present: boolean;
  speed?: SimSpeed;
  config?: DeepPartial<SimConfig>;
  generator: Partial<GeneratorState>;
  script: Array<{ afterMs: number; action: ScheduledAction }>;
}

const wf = (afterMs: number, workflowId: string, priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL') => ({
  afterMs,
  action: { type: 'START_WORKFLOW', workflowId, priority } as ScheduledAction,
});

function approvalBatch(): ScenarioDef['script'] {
  const out: ScenarioDef['script'] = [];
  (['HERKULESJOBS', 'KASSELMEMES', 'SHARED'] as const).forEach((dept, d) => {
    TASK_TEMPLATES[dept].slice(0, 3).forEach((tpl, i) => {
      out.push({
        afterMs: (d * 3 + i) * 1500,
        action: {
          type: 'CREATE_TASK',
          spec: { title: tpl.title, departmentId: dept, requiredCapabilities: tpl.capabilities, workDurationMs: 8_000, requiresApproval: true },
        },
      });
    });
  });
  return out;
}

function fullHqBurst(): ScenarioDef['script'] {
  const out: ScenarioDef['script'] = [];
  const depts = ['HERKULESJOBS', 'KASSELMEMES', 'SHARED'] as const;
  for (let i = 0; i < 40; i++) {
    const dept = depts[i % 3]!;
    const list = TASK_TEMPLATES[dept];
    const tpl = list[Math.floor(i / 3) % list.length]!;
    out.push({
      afterMs: i * 400,
      action: { type: 'CREATE_TASK', spec: { title: tpl.title, departmentId: dept, requiredCapabilities: tpl.capabilities, workDurationMs: 30_000 + (i % 5) * 6_000 } },
    });
  }
  return out;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  A_MORNING_START: {
    id: 'A_MORNING_START',
    title: 'Morgenstart',
    description: 'Agenten treffen kurz vor 08:00 gestaffelt ein, setzen sich auf die Bank, erste Aufgaben laufen an.',
    operations: 'WORKDAY',
    rosterCopies: 1,
    startMs: Date.UTC(2026, 0, 5, 6, 55), // 07:55 Berliner Zeit
    present: false,
    config: { workday: { arrivalWindowMs: 4 * 60_000 } },
    generator: { profile: 'BALANCED', targetUtilization: 0.35, workflowShare: 0.15 },
    script: [wf(6 * 60_000, 'hj_sales'), wf(8 * 60_000, 'km_trend_spike'), wf(9 * 60_000, 'dev_feature'), wf(10 * 60_000, 'km_gewinnspiel')],
  },
  B_BUSY_SALES_DAY: {
    id: 'B_BUSY_SALES_DAY',
    title: 'Vertriebstag unter Volllast',
    description: 'HerkulesJobs Vertrieb unter Hochlast, viele Workflows, lange Warteschlange.',
    operations: 'CONTINUOUS_OPERATIONS',
    rosterCopies: 1,
    present: true,
    config: { mockAutoApproveAfterMs: 90_000 },
    generator: { profile: 'HJ_SALES', targetUtilization: 0.85, workflowShare: 0.35 },
    script: [wf(0, 'hj_sales'), wf(5_000, 'hj_produktberatung'), wf(10_000, 'hj_sales', 'HIGH'), wf(15_000, 'hj_produktberatung')],
  },
  C_KASSELMEMES_TREND_SPIKE: {
    id: 'C_KASSELMEMES_TREND_SPIKE',
    title: 'KasselMemes Trendwelle',
    description: 'Trend Scout erkennt ein Ereignis, Research, Editorial, Creative, Meeting, Entwurf wartet auf Freigabe.',
    operations: 'CONTINUOUS_OPERATIONS',
    rosterCopies: 1,
    present: true,
    config: { approvalBehavior: 'GO_TO_WAITING_AREA', mockAutoApproveAfterMs: null },
    generator: { profile: 'KM_TREND', targetUtilization: 0.4, workflowShare: 0.1 },
    script: [wf(2_000, 'km_trend_spike', 'HIGH'), wf(30_000, 'km_nachrichtenbeitrag'), wf(45_000, 'km_gewinnspiel'), wf(60_000, 'km_trend_spike')],
  },
  D_DEVELOPMENT_SPRINT: {
    id: 'D_DEVELOPMENT_SPRINT',
    title: 'Entwicklungs Sprint',
    description: 'Feature, Code Review, QA in mehreren parallelen Läufen.',
    operations: 'CONTINUOUS_OPERATIONS',
    rosterCopies: 1,
    present: true,
    config: { mockAutoApproveAfterMs: 60_000 },
    generator: { profile: 'DEV', targetUtilization: 0.6, workflowShare: 0.3 },
    script: [wf(0, 'dev_feature'), wf(15_000, 'dev_feature'), wf(30_000, 'dev_feature', 'HIGH')],
  },
  E_WAITING_FOR_APPROVAL: {
    id: 'E_WAITING_FOR_APPROVAL',
    title: 'Warten auf Freigabe',
    description: 'Viele Aufgaben brauchen eine menschliche Freigabe. Agenten gehen in den Warteplatz und warten.',
    operations: 'CONTINUOUS_OPERATIONS',
    rosterCopies: 1,
    present: true,
    config: { approvalBehavior: 'GO_TO_WAITING_AREA', mockAutoApproveAfterMs: null },
    generator: { profile: 'BALANCED', targetUtilization: 0.2, approvalScale: 3 },
    script: [...approvalBatch(), wf(4_000, 'hj_sales'), wf(6_000, 'km_trend_spike')],
  },
  F_FULL_HQ: {
    id: 'F_FULL_HQ',
    title: 'Volles HQ',
    description: '60 Agenten auf allen Etagen unter hoher Last, mit Meetings, Pausen und Freigaben.',
    operations: 'CONTINUOUS_OPERATIONS',
    rosterCopies: 1,
    rosterSize: 60,
    present: true,
    config: { mockAutoApproveAfterMs: 60_000 },
    generator: { profile: 'BALANCED', targetUtilization: 0.9, workflowShare: 0.2 },
    script: fullHqBurst(),
  },
};

export function listScenarios(): ScenarioDef[] {
  return Object.values(SCENARIOS);
}

/** Wendet Konfiguration, Generator und Zeitplan eines Szenarios auf eine Engine an und startet sie. */
export function applyScenario(engine: SimulationEngine, id: ScenarioId): void {
  const def = SCENARIOS[id];
  if (def.config) engine.setConfig(def.config);
  for (const s of def.script) engine.ctx.systems.mock.schedule(s.afterMs, s.action);
  if (def.speed) engine.setSpeed(def.speed);
  engine.startCompany({ operations: def.operations, scenarioId: id, present: def.present, generator: { enabled: true, ...def.generator } });
}

/** Erzeugt eine passend dimensionierte Engine (Roster, Layout, Startzeit) und startet das Szenario. */
export function createScenarioEngine(id: ScenarioId, opts: { seed?: string; config?: DeepPartial<SimConfig> } = {}): SimulationEngine {
  const def = SCENARIOS[id];
  const engine = new SimulationEngine({
    seed: opts.seed ?? 'HERKULES-001',
    rosterCopies: def.rosterCopies,
    ...(def.rosterSize !== undefined ? { rosterSize: def.rosterSize } : {}),
    ...(def.startMs !== undefined ? { startMs: def.startMs } : {}),
    config: { operations: def.operations, ...(opts.config ?? {}) },
  });
  applyScenario(engine, id);
  return engine;
}
