import { describe, expect, it } from 'vitest';
import { capabilitiesMatch, effectiveRank, TaskRouter, type Agent, type Task } from '../src/index';
import { makeEngine, MIN, S } from './helpers';

const mkTask = (over: Partial<Task> = {}): Task =>
  ({
    id: 'T-1', seq: 1, title: 't', departmentId: 'HERKULESJOBS', requiredCapabilities: ['research'], priority: 'NORMAL',
    status: 'QUEUED', origin: 'MOCK', primaryAgentId: null, pinnedAgentId: null, createdAtMs: 0, ...over,
  }) as Task;

describe('Capability Matching', () => {
  it('verlangt alle geforderten Fähigkeiten', () => {
    expect(capabilitiesMatch(['research', 'sales'], ['research'])).toBe(true);
    expect(capabilitiesMatch(['research'], ['research', 'sales'])).toBe(false);
    expect(capabilitiesMatch(['research'], [])).toBe(true);
  });
});

describe('Task Routing', () => {
  it('wählt nach Capability und Abteilung, nicht nach Name', () => {
    const e = makeEngine();
    const router = new TaskRouter();
    const agents = e.getAgents() as Agent[];
    const ranked = router.rank(mkTask({ requiredCapabilities: ['research'] }), agents);
    const ids = ranked.map((r) => r.agent.id);
    // Eigene Abteilung zuerst, das Shared Research Agent hilft erst danach aus.
    expect(ids[0]).toBe('hj-job-research');
    expect(ids).toContain('sh-research');
    expect(ids.indexOf('sh-research')).toBeGreaterThan(ids.indexOf('hj-employer-research'));
    expect(ids).not.toContain('km-local-research');
  });

  it('ist deterministisch (gleiche Eingabe, gleiche Wahl)', () => {
    const e = makeEngine();
    const router = new TaskRouter();
    const agents = e.getAgents() as Agent[];
    const a = router.pick(mkTask(), agents)!.id;
    for (let i = 0; i < 5; i++) expect(router.pick(mkTask(), agents)!.id).toBe(a);
  });

  it('bevorzugt weniger belastete Agenten', () => {
    const e = makeEngine();
    const agents = e.getAgents() as Agent[];
    const emp = agents.find((x) => x.id === 'hj-employer-research')!;
    const lead = agents.find((x) => x.id === 'hj-lead-research')!;
    lead.tasksCompleted = 5;
    emp.tasksCompleted = 0;
    const pick = new TaskRouter().pick(mkTask({ requiredCapabilities: ['lead_enrichment'] }), agents)!;
    expect(pick.id).toBe('hj-employer-research');
  });

  it('lehnt Agenten anderer Abteilungen ab, Shared darf aushelfen', () => {
    const e = makeEngine();
    const router = new TaskRouter();
    const agents = e.getAgents() as Agent[];
    expect(router.pick(mkTask({ requiredCapabilities: ['trend_detection'] }), agents)).toBeNull();
    expect(router.pick(mkTask({ departmentId: 'KASSELMEMES', requiredCapabilities: ['trend_detection'] }), agents)!.id).toBe('km-trend-scout');
  });

  it('holt pausierende Agenten nur bei hoher Priorität aus der Pause', () => {
    const e = makeEngine();
    e.sendAgentToKitchen('hj-lead-research');
    const router = new TaskRouter();
    const agents = e.getAgents() as Agent[];
    const t = { requiredCapabilities: ['lead_research'] };
    expect(router.pick(mkTask({ ...t, priority: 'NORMAL' }), agents)).toBeNull();
    expect(router.pick(mkTask({ ...t, priority: 'HIGH' }), agents)!.id).toBe('hj-lead-research');
  });

  it('Priorität und Aging bestimmen die Reihenfolge', () => {
    expect(effectiveRank({ priority: 'LOW', createdAtMs: 0 }, 0, 100_000)).toBe(0);
    expect(effectiveRank({ priority: 'LOW', createdAtMs: 0 }, 250_000, 100_000)).toBe(2);
    // Aging hebt nie auf URGENT.
    expect(effectiveRank({ priority: 'NORMAL', createdAtMs: 0 }, 10_000_000, 100_000)).toBe(2);
    expect(effectiveRank({ priority: 'URGENT', createdAtMs: 0 }, 0, 100_000)).toBe(3);
  });

  it('URGENT Aufgabe wird vor älteren NORMAL Aufgaben zugewiesen', () => {
    const e = makeEngine();
    // Einziger Agent mit "lead_research": zwei Aufgaben, die dringende gewinnt.
    const first = e.createTask({ title: 'normal', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S });
    e.setAgentAvailable('hj-lead-research');
    e.cancelTask(first.ok ? first.value.id : '');
    const n = e.createTask({ title: 'normal', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S });
    const u = e.createTask({ title: 'urgent', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], priority: 'URGENT', workDurationMs: 5 * S });
    e.runFor(1 * S);
    expect(e.getTask(u.ok ? u.value.id : '')!.status).toBe('ASSIGNED');
    expect(e.getTask(n.ok ? n.value.id : '')!.status).toBe('QUEUED');
    e.runFor(MIN);
  });
});
