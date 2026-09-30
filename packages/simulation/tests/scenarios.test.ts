import { describe, expect, it } from 'vitest';
import { createScenarioEngine, listScenarios, SimulationEngine, type ScenarioId } from '../src/index';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

describe('Demo Szenarien', () => {
  for (const def of listScenarios()) {
    it(`${def.id} läuft 15 Minuten ohne Invariantenverletzung und erzeugt Aktivität`, () => {
      const e = createScenarioEngine(def.id as ScenarioId, { config: { invariantCheckEveryTicks: 1 } });
      const ev = recordEvents(e);
      e.runFor(15 * MIN);
      expect(e.checkInvariants()).toEqual([]);
      const seq = types(ev);
      expect(seq).toContain('TASK_ASSIGNED');
      expect(seq).toContain('AGENT_ARRIVED');
      const m = e.getMetrics();
      expect(m.activityLevel).toBeGreaterThanOrEqual(0);
      expect(m.activityLevel).toBeLessThanOrEqual(100);
    });
  }

  it('C: Trend Spike erzeugt Meeting und endet in WAITING_FOR_HUMAN', () => {
    const e = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
    const ev = recordEvents(e);
    e.runFor(10 * MIN);
    expect(types(ev)).toContain('MEETING_COMPLETED');
    expect(e.getMetrics().waitingAgents).toBeGreaterThan(0);
    // Agenten der KasselMemes Etage sind beteiligt.
    const km = e.getAgents().filter((a) => a.departmentId === 'KASSELMEMES' && a.deskAnchorId);
    expect(km.length).toBeGreaterThan(0);
  });

  it('E: alle Freigaben bleiben offen, Agenten stehen am Warteplatz', () => {
    const e = createScenarioEngine('E_WAITING_FOR_APPROVAL');
    e.runFor(10 * MIN);
    expect(e.getMetrics().waitingApprovalTasks).toBeGreaterThan(5);
    const waiting = e.getAgents().filter((a) => a.status === 'WAITING');
    expect(waiting.length).toBeGreaterThan(5);
    expect(waiting.some((a) => a.location.anchorId?.startsWith('waiting-'))).toBe(true);
  });

  it('HerkulesJobs Vertrieb läuft die Kette bis Customer Success', () => {
    const e = makeEngine({ config: { mockAutoApproveAfterMs: 20 * S } });
    const done: string[] = [];
    e.on('TASK_COMPLETED', (x) => done.push(x.payload.taskId));
    e.startWorkflow('hj_sales');
    e.runFor(10 * MIN);
    expect(done.length).toBe(5);
    const titles = e.getState().taskHistory.map((h) => h.title);
    expect(titles).toEqual([
      'Lead research (DEMO)', 'Employer research (DEMO)', 'Sales qualification (DEMO)', 'Outreach draft (DEMO)', 'Customer success handover (DEMO)',
    ]);
    expect(e.getState().taskHistory.map((h) => h.primaryAgentId)).toEqual([
      'hj-lead-research', 'hj-employer-research', 'hj-account-management', 'hj-outreach', 'hj-customer-success',
    ]);
  });

  it('Entwicklung läuft Feature, Review, QA', () => {
    const e = makeEngine();
    e.startWorkflow('dev_feature');
    e.runFor(10 * MIN);
    expect(e.getState().taskHistory.map((h) => h.primaryAgentId)).toEqual(['sh-developer', 'sh-code-review', 'sh-qa']);
    expect(e.getState().taskHistory.every((h) => h.status === 'COMPLETED')).toBe(true);
    expect(Object.keys(e.getState().workflowRuns)).toEqual([]);
  });

  it('Seed Daten sind als DEMO markiert', () => {
    const e = createScenarioEngine('F_FULL_HQ');
    expect(e.getAgents().every((a) => a.demo === true && a.providerId === 'mock')).toBe(true);
    e.runFor(2 * MIN);
    expect(e.getTasks().every((t) => /\(DEMO\)/.test(t.title))).toBe(true);
  });
});

describe('Betriebsmodi', () => {
  it('CONTINUOUS_OPERATIONS: 24 Stunden ohne Feierabend, keine Agenten gehen offline', () => {
    const e = new SimulationEngine({ config: { tickIntervalMs: 1000 } });
    e.startCompany({ operations: 'CONTINUOUS_OPERATIONS', present: true, generator: { enabled: true, targetUtilization: 0.5 } });
    let completed = 0;
    e.on('TASK_COMPLETED', () => (completed += 1));
    e.runFor(24 * 60 * MIN);
    expect(e.getMetrics().offlineAgents).toBe(0);
    expect(completed).toBeGreaterThan(300);
    // Speicher bleibt beschränkt.
    expect(e.getState().log.entries.length).toBeLessThanOrEqual(700);
    expect(e.getState().taskHistory.length).toBeLessThanOrEqual(200);
    expect(e.getTasks().length).toBeLessThan(100);
  });

  it('WORKDAY: Agenten kommen an, gehen nach Feierabend offline und kehren am nächsten Morgen zurück', () => {
    const e = new SimulationEngine({ startMs: Date.UTC(2026, 0, 5, 6, 55), config: { tickIntervalMs: 1000, mockAutoApproveAfterMs: 20 * S, workday: { arrivalWindowMs: 4 * MIN } } });
    e.startCompany({ operations: 'WORKDAY', present: false, generator: { enabled: true, targetUtilization: 0.4 } });
    expect(e.getMetrics().offlineAgents).toBe(22);
    e.runFor(10 * MIN);
    expect(e.getMetrics().offlineAgents).toBe(0);
    expect(e.getMetrics().availableAgents + e.getMetrics().workingAgents).toBeGreaterThan(10);
    // bis nach Feierabend (18:00) plus Auslauf
    e.runFor(10 * 60 * MIN + 40 * MIN);
    expect(e.getMetrics().offlineAgents).toBe(22);
    expect(e.getTasks().filter((t) => t.status === 'QUEUED').length).toBeLessThanOrEqual(30);
    // nächster Morgen
    e.runFor(14 * 60 * MIN);
    expect(e.getMetrics().offlineAgents).toBe(0);
  });
});
