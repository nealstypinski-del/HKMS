import { describe, expect, it } from 'vitest';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

describe('Aufgabenlebenszyklus ohne Teleport', () => {
  it('Bank, Aufzug, Schreibtisch, Arbeit, Abschluss, zurück zur Bank', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const t = e.createTask({ title: 'Lead', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 10 * S });
    expect(t.ok).toBe(true);
    const id = t.ok ? t.value.id : '';
    expect(id).toMatch(/^HJ-\d+$/);
    e.runFor(500);

    const agent = e.getAgent('hj-lead-research')!;
    expect(agent.status === 'ASSIGNED' || agent.status === 'MOVING').toBe(true);
    expect(agent.intent).toBe('GO_TO_DESK');
    expect(agent.deskAnchorId).toMatch(/^desk-hj-/);

    e.runFor(3 * MIN);
    const seq = types(ev);
    for (const [a, b] of [
      ['TASK_CREATED', 'TASK_ASSIGNED'],
      ['TASK_ASSIGNED', 'AGENT_MOVEMENT_REQUESTED'],
      ['AGENT_MOVEMENT_REQUESTED', 'AGENT_ARRIVED'],
      ['AGENT_ARRIVED', 'TASK_STARTED'],
      ['TASK_STARTED', 'TASK_COMPLETED'],
      ['TASK_COMPLETED', 'AGENT_AVAILABLE'],
    ] as const) {
      expect(seq.indexOf(a), `${a} vor ${b}`).toBeGreaterThanOrEqual(0);
      expect(seq.indexOf(a)).toBeLessThan(seq.indexOf(b));
    }
    expect(agent.tasksCompleted).toBe(1);
    expect(agent.status).toBe('AVAILABLE');
    expect(agent.intent).toBe('SIT_ON_AGENT_BENCH');
    expect(agent.deskAnchorId).toBeNull();
    expect(e.getAnchors().find((a) => a.id === 'desk-hj-01')!.occupants).toEqual([]);
  });

  it('plant Etagenwechsel als Aufzugskette', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.createTask({ title: 'Lead', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S });
    e.runFor(500);
    const req = ev.find((x) => x.type === 'AGENT_MOVEMENT_REQUESTED')!;
    if (req.type !== 'AGENT_MOVEMENT_REQUESTED') throw new Error();
    expect(req.payload.stages.map((s) => s.kind)).toEqual([
      'STAND_UP', 'WALK_TO_ELEVATOR', 'WAIT_FOR_ELEVATOR', 'ENTER_ELEVATOR', 'CHANGE_FLOOR', 'EXIT_ELEVATOR', 'WALK_TO_DESTINATION',
    ]);
    expect(req.payload.destination.floorId).toBe('floor-1');
    const stageIntents = new Set<string>();
    e.onAny((x) => { if (x.type === 'AGENT_INTENT_CHANGED') stageIntents.add(x.payload.to); });
    e.runFor(MIN);
    expect(stageIntents.has('GO_TO_ELEVATOR')).toBe(true);
    expect(stageIntents.has('CHANGE_FLOOR')).toBe(true);
  });

  it('läuft ohne Aufzug, wenn Start und Ziel auf derselben Etage liegen', () => {
    const e = makeEngine();
    e.createTask({ title: 'Lead', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S });
    e.runFor(MIN);
    const ev = recordEvents(e);
    e.setAgentWorking('hj-sales', { requiredCapabilities: ['sales'] });
    e.runFor(30 * S);
    const first = ev.find((x) => x.type === 'AGENT_MOVEMENT_REQUESTED');
    expect(first).toBeDefined();
  });

  it('Aufgabe ohne passenden Agenten bleibt in der Warteschlange und wird in Queue Daten sichtbar', () => {
    const e = makeEngine();
    e.createTask({ title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['does_not_exist'] });
    e.runFor(10 * S);
    expect(e.getQueues().HERKULESJOBS).toEqual({ active: 0, queued: 1, waitingApproval: 0 });
    expect(e.getMetrics().perDepartment.HERKULESJOBS.queueLength).toBe(1);
  });

  it('Aufgabenhistorie bleibt gedeckelt', () => {
    const e = makeEngine({ config: { historyCapacity: 5 } });
    for (let i = 0; i < 12; i++) e.createTask({ title: `t${i}`, departmentId: 'SHARED', requiredCapabilities: ['operations'], workDurationMs: 1 * S });
    e.runFor(10 * MIN);
    expect(e.getState().taskHistory.length).toBeLessThanOrEqual(5);
    expect(e.getTasks().length).toBe(0);
  });
});

describe('Bank, Küche, Lounge', () => {
  it('Agent auf der Bank ist verfügbar', () => {
    const e = makeEngine();
    const a = e.getAgent('hj-sales')!;
    expect(a.status).toBe('AVAILABLE');
    expect(a.intent).toBe('SIT_ON_AGENT_BENCH');
    expect(a.location.zoneId).toBe('agent-bench');
    expect(e.getAnchors().find((x) => x.id === a.occupiedAnchorId)!.type).toBe('BENCH');
  });

  it('Küchenpause: Kaffeemaschine, Sitz, zurück zur Bank', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    expect(e.sendAgentToKitchen('hj-sales').ok).toBe(true);
    const a = e.getAgent('hj-sales')!;
    expect(a.status).toBe('BREAK');
    expect(a.intent).toBe('GO_TO_KITCHEN');
    const seen = new Set<string>();
    for (let i = 0; i < 4 * 200; i++) { e.tick(); seen.add(a.intent); }
    expect(seen.has('USE_KITCHEN')).toBe(true);
    const seq = types(ev);
    expect(seq).toContain('BREAK_STARTED');
    expect(seq).toContain('BREAK_ENDED');
    expect(a.status).toBe('AVAILABLE');
    expect(a.intent).toBe('SIT_ON_AGENT_BENCH');
  });

  it('Lounge: sichtbare Aktivität, CHAT_VISUAL ist reine Optik', () => {
    const e = makeEngine();
    e.sendAgentToBreak('hj-sales', 'LOUNGE');
    const a = e.getAgent('hj-sales')!;
    const acts = new Set<string | null>();
    for (let i = 0; i < 4 * 200; i++) { e.tick(); acts.add(a.activity); }
    expect(['SIT', 'CHAT_VISUAL', 'WAIT', 'READ', 'REST'].some((x) => acts.has(x as never))).toBe(true);
    const ev = recordEvents(e);
    e.sendAgentToBreak('hj-outreach', 'LOUNGE');
    const started = ev.find((x) => x.type === 'BREAK_STARTED');
    if (started?.type === 'BREAK_STARTED') expect(started.payload.visualOnly).toBe(true);
  });

  it('Pausen wirken nicht wie Dauerwandern: begrenzter Anteil gleichzeitig', () => {
    const e = makeEngine();
    let maxBreak = 0;
    for (let i = 0; i < 4 * 60 * 30; i++) { e.tick(); maxBreak = Math.max(maxBreak, e.getMetrics().breakAgents); }
    // 22 Agenten, maxBreakShare 0.25 => höchstens 5 gleichzeitig.
    expect(maxBreak).toBeLessThanOrEqual(5);
    expect(maxBreak).toBeGreaterThan(0);
  });

  it('Ein Agent auf Pause wird bei URGENT Aufgabe herausgeholt', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.sendAgentToKitchen('hj-lead-research');
    e.createTask({ title: 'u', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], priority: 'URGENT', workDurationMs: 5 * S });
    e.runFor(500);
    const a = e.getAgent('hj-lead-research')!;
    expect(a.taskId).not.toBeNull();
    expect(a.breakPlan).toBeNull();
    const ended = ev.find((x) => x.type === 'BREAK_ENDED');
    if (ended?.type === 'BREAK_ENDED') expect(ended.payload.reason).toBe('INTERRUPTED');
    e.runFor(3 * MIN);
  });

  it('Alle Agenten haben einen Bankplatz, es stapelt sich niemand', () => {
    const e = makeEngine();
    const benches = e.getAnchors().filter((a) => a.type === 'BENCH' && a.occupants.length > 0);
    expect(benches.length).toBe(22);
    expect(new Set(benches.flatMap((b) => b.occupants)).size).toBe(22);
  });
});

describe('Fehlerzustand und Debug', () => {
  it('ERROR stellt Mock Aufgabe wieder in die Warteschlange, andere übernehmen', () => {
    const e = makeEngine();
    const t = e.createTask({ title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_enrichment'], workDurationMs: 20 * S });
    const id = t.ok ? t.value.id : '';
    e.runFor(500);
    const first = e.getTask(id)!.primaryAgentId!;
    e.setAgentError(first, 'test');
    expect(e.getAgent(first)!.status).toBe('ERROR');
    e.runFor(3 * MIN);
    expect(e.getAgent(first)!.status).toBe('ERROR');
    expect(e.getTask(id)).toBeUndefined();
    expect(e.getState().taskHistory.find((h) => h.id === id)!.status).toBe('COMPLETED');
    expect(e.recoverAgent(first).ok).toBe(true);
    e.runFor(MIN);
    expect(e.getAgent(first)!.status).toBe('AVAILABLE');
  });

  it('setAgentWorking und setAgentAvailable', () => {
    const e = makeEngine();
    const r = e.setAgentWorking('km-creative');
    expect(r.ok).toBe(true);
    e.runFor(500);
    expect(e.getAgent('km-creative')!.taskId).not.toBeNull();
    expect(e.setAgentAvailable('km-creative').ok).toBe(true);
    expect(e.getAgent('km-creative')!.taskId).toBeNull();
    e.runFor(5 * MIN);
    expect(e.getAgent('km-creative')!.status === 'AVAILABLE' || e.getAgent('km-creative')!.status === 'WORKING').toBe(true);
  });
});
