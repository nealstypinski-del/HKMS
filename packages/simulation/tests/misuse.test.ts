import { describe, expect, it } from 'vitest';
import { loadSimulation, SimulationEngine, saveSimulation, type TaskSpec } from '../src/index';
import { makeEngine, MIN, S } from './helpers';

/** Missbrauchsfälle: falsche Eingaben dürfen nie werfen (außer Programmierfehler) und nie den Zustand beschädigen. */
const ok = (spec: Partial<TaskSpec> = {}): TaskSpec => ({ title: 'x (DEMO)', departmentId: 'SHARED', requiredCapabilities: ['operations'], ...spec });

describe('Unbekannte Ids', () => {
  it('liefern klare Fehler statt Ausnahmen', () => {
    const e = makeEngine();
    const results = [
      e.cancelTask('nope'), e.failTask('nope', 'x'), e.completeTask('nope'), e.requestApproval('nope'), e.grantApproval('nope'), e.denyApproval('nope'),
      e.cancelMeeting('nope'), e.setAgentAvailable('nope'), e.sendAgentToBench('nope'), e.sendAgentToKitchen('nope'), e.setAgentWorking('nope'),
      e.setAgentError('nope'), e.recoverAgent('nope'), e.confirmRouteStage('nope'), e.startWorkflow('nope'),
    ];
    for (const r of results) { expect(r.ok).toBe(false); if (!r.ok) expect(r.code).toBe('NOT_FOUND'); }
    expect(e.inspectAgent('nope')).toBeNull();
    expect(e.getAgent('nope')).toBeUndefined();
    expect(e.checkInvariants()).toEqual([]);
  });
});

describe('Freigabe', () => {
  it('doppelt erteilen oder ohne Wartezustand schlägt sauber fehl', () => {
    const e = makeEngine();
    const t = e.createTask(ok({ requiresApproval: true, workDurationMs: 2 * S }));
    const id = t.ok ? t.value.id : '';
    expect(e.grantApproval(id).ok).toBe(false); // wartet noch nicht
    e.runFor(2 * MIN);
    expect(e.grantApproval(id).ok).toBe(true);
    const again = e.grantApproval(id);
    expect(again.ok).toBe(false);
    expect(e.denyApproval(id).ok).toBe(false);
    expect(e.checkInvariants()).toEqual([]);
  });
});

describe('Ungültige Aufgaben', () => {
  it('werden abgelehnt, ohne den Zustand zu verändern', () => {
    const e = makeEngine();
    const bad: Array<Partial<TaskSpec>> = [
      { title: '' }, { title: '   ' }, { departmentId: 'NOPE' as never }, { requiredCapabilities: 'x' as never }, { requiredCapabilities: [1 as never] },
      { priority: 'ULTRA' as never }, { workDurationMs: -5 }, { workDurationMs: Number.NaN }, { workDurationMs: Infinity }, { workDurationMs: 99 * 3_600_000 }, { pinnedAgentId: 'nope' },
    ];
    for (const b of bad) { const r = e.createTask(ok(b)); expect(r.ok, JSON.stringify(b)).toBe(false); }
    expect(e.getTasks().length).toBe(0);
    expect(e.getQueues().SHARED.queued).toBe(0);
    expect(() => e.createTask(undefined as never)).not.toThrow();
  });

  it('Warteschlange ist begrenzt (kein unbegrenztes Wachstum)', () => {
    const e = makeEngine({ config: { maxQueuedTasks: 50 } });
    let rejected = 0;
    for (let i = 0; i < 80; i++) { const r = e.createTask(ok({ requiredCapabilities: ['unmatched'] })); if (!r.ok) { rejected++; expect(r.code).toBe('NO_CAPACITY'); } }
    expect(rejected).toBe(30);
    e.runFor(30 * S);
    expect(e.getTasks().length).toBe(50);
  });

  it('10000 Aufgaben auf einmal bleiben schnell und speicherbeschränkt', () => {
    const e = makeEngine();
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) e.createTask(ok({ workDurationMs: 1000 }));
    e.runFor(20 * S);
    expect(e.getTasks().length).toBeLessThanOrEqual(e.getState().config.maxQueuedTasks);
    expect(performance.now() - t0).toBeLessThan(15_000);
  });
});

describe('Ungültige Meetings', () => {
  it('Sonderfälle', () => {
    const e = makeEngine();
    expect(e.createMeeting({ title: 'x', participantAgentIds: [] }).ok).toBe(false);
    expect(e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'hj-sales'] }).ok).toBe(false);
    const e60 = makeEngine({ rosterSize: 60 });
    const big = e60.createMeeting({ title: 'x', participantAgentIds: e60.getAgents().map((a) => a.id) });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.code).toBe('NO_ROOM');
    expect(e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'hj-outreach'], roomId: 'gibt-es-nicht' }).ok).toBe(false);
    expect(e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'hj-outreach'], durationMs: -1 }).ok).toBe(false);
    e.setAgentError('hj-outreach');
    const r = e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'hj-outreach'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('AGENT_UNAVAILABLE');
    expect(e.checkInvariants()).toEqual([]);
  });
});

describe('Ungültige Konfiguration', () => {
  it('lehnt gefährliche Werte ab und behält die alte Konfiguration', () => {
    const e = makeEngine();
    const before = JSON.stringify(e.getState().config);
    for (const patch of [{ tickIntervalMs: 0 }, { tickIntervalMs: -250 }, { tickIntervalMs: 1e9 }, { walkSpeedMps: 0 }, { walkSpeedMps: Number.NaN }, { timeZone: 'Mars/Olympus' }, { workday: { startMinute: 900, endMinute: 100 } }, { maxQueuedTasks: -1 }]) {
      expect(() => e.setConfig(patch as never), JSON.stringify(patch)).toThrow(/Konfiguration/);
    }
    expect(JSON.stringify(e.getState().config)).toBe(before);
    expect(() => new SimulationEngine({ config: { timeZone: 'Nirgendwo/Stadt' } })).toThrow(/Konfiguration/);
  });

  it('ungültige Geschwindigkeit wirft, Pause und Fortsetzen sind idempotent', () => {
    const e = makeEngine();
    expect(() => e.setSpeed(3 as never)).toThrow();
    let events = 0; e.on('SIMULATION_PAUSED', () => events++); e.on('SIMULATION_RESUMED', () => events++);
    e.resume(); e.resume(); expect(events).toBe(0);
    e.pause(); e.pause(); e.resume(); e.resume(); expect(events).toBe(2);
  });

  it('advance mit unsinnigen Zeitwerten bleibt stabil', () => {
    const e = makeEngine();
    const t0 = e.getClock().nowMs;
    expect(() => { e.advance(-1000); e.advance(Number.NaN); e.advance(Infinity); }).not.toThrow();
    expect(Number.isFinite(e.getClock().nowMs)).toBe(true);
    expect(e.getClock().nowMs).toBeGreaterThanOrEqual(t0);
  });
});

describe('Zustand laden', () => {
  it('kaputte Eingaben ergeben verständliche Fehler', () => {
    for (const bad of ['', '{', 'null', '42', '"text"', '[]', '{}', JSON.stringify({ version: 1 })]) {
      expect(() => loadSimulation(bad), bad).toThrow(/Zustand|version/i);
    }
  });
  it('manipulierte Belegung wird erkannt', () => {
    const e = makeEngine();
    const s = JSON.parse(saveSimulation(e));
    s.anchors['bench-hj-01'].occupants = ['hj-sales', 'hj-outreach', 'hj-lead-research'];
    expect(() => loadSimulation(JSON.stringify(s))).toThrow(/inkonsistent/);
  });
});

describe('Provider und Fehlerzustand', () => {
  it('doppelte Session, Abschluss ohne Start, Fehleragent', () => {
    const e = makeEngine();
    const ev = { type: 'provider.session.started' as const, providerId: 'p', sessionId: 's', title: 'real', departmentId: 'HERKULESJOBS' as const, requiredCapabilities: ['sales'], agentId: 'hj-sales' };
    expect(e.applyProviderEvent(ev).ok).toBe(true);
    expect(e.applyProviderEvent(ev).ok).toBe(false);
    expect(e.applyProviderEvent({ type: 'provider.session.completed', providerId: 'p', sessionId: 'nie-gestartet' }).ok).toBe(false);
    expect(e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: 't', title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'nope' }).ok).toBe(false);
    e.setAgentError('km-creative');
    for (const r of [e.setAgentWorking('km-creative'), e.sendAgentToKitchen('km-creative'), e.setAgentAvailable('km-creative')]) expect(r.ok).toBe(false);
    e.runFor(MIN);
    expect(e.checkInvariants()).toEqual([]);
  });
});

describe('Alle Plätze belegt', () => {
  it('mehr Aufgaben als Schreibtische bleiben in der Warteschlange und werden später abgearbeitet', () => {
    const e = makeEngine({ layout: { desks: { HERKULESJOBS: 2, KASSELMEMES: 2, SHARED: 2 }, benchSeats: 30, floorBenchSeats: { HERKULESJOBS: 12, KASSELMEMES: 12, SHARED: 10 }, coffeeMachines: 1, kitchenSeats: 2, loungeSeats: 2, meetingSeats: 6, waitingPointsPerFloor: 2, lobbyPoints: 2 } });
    for (let i = 0; i < 12; i++) e.createTask(ok({ departmentId: 'HERKULESJOBS', requiredCapabilities: ['follow_up'], workDurationMs: 3 * S }));
    e.runFor(20 * S);
    expect(e.getMetrics().workingAgents + e.getMetrics().movingAgents).toBeLessThanOrEqual(2 + 2);
    e.runFor(10 * MIN);
    expect(e.getTasks().length).toBe(0);
    expect(e.checkInvariants()).toEqual([]);
  });
});
