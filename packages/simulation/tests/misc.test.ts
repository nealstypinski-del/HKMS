import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ActivityLog, DebugController, EventBus, mountDebugPanel, createRealtimeDriver, type PanelElement } from '../src/index';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

describe('Isolation', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  it('keine Three.js, React oder DOM Abhängigkeit in der Simulation', () => {
    const src = files(join(__dirname, '..', 'src'));
    expect(src.length).toBeGreaterThan(15);
    for (const f of src) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/from ['"](three|@react-three|react|react-dom)/);
      expect(text, f).not.toMatch(/\b(document|window)\./);
    }
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.dependencies).toBeUndefined();
  });
});

describe('Aktivitätslog', () => {
  it('bleibt gedeckelt und liefert die jüngsten Einträge', () => {
    const log = new ActivityLog({ seq: 0, entries: [] }, 20);
    for (let i = 0; i < 500; i++) log.add(i * 1000, 'X', `e${i}`);
    expect(log.state.entries.length).toBeLessThanOrEqual(25);
    const r = log.recent(5);
    expect(r.map((x) => x.text)).toEqual(['e495', 'e496', 'e497', 'e498', 'e499']);
    expect(r[0]!.clock).toMatch(/^\d\d:\d\d:\d\d$/);
  });

  it('protokolliert den Lebenszyklus in lesbarer Form', () => {
    const e = makeEngine();
    e.createTask({ title: 'Lead', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S });
    e.runFor(2 * MIN);
    const text = e.getLog(100).map((l) => l.text).join('\n');
    expect(text).toMatch(/Aufgabe HJ-\d+ erstellt/);
    expect(text).toMatch(/zugewiesen an Lead Recherche Agent/);
    expect(text).toMatch(/geht zu desk-hj-/);
    expect(text).toMatch(/gestartet/);
    expect(text).toMatch(/abgeschlossen/);
    expect(text).toMatch(/ist verfügbar/);
  });
});

describe('Ereignisbus', () => {
  it('liefert erst beim flush aus, unterstützt Abmeldung und kaputte Handler', () => {
    const bus = new EventBus();
    const got: string[] = [];
    const off = bus.on('MEETING_CREATED', (e) => got.push(e.payload.meetingId));
    bus.onAny(() => { throw new Error('boom'); });
    bus.emit('MEETING_CREATED', 1, { meetingId: 'M1', title: 't', participantAgentIds: [], origin: 'MANUAL' });
    expect(got).toEqual([]);
    bus.flush();
    expect(got).toEqual(['M1']);
    expect(bus.lastHandlerError).toBeInstanceOf(Error);
    off();
    bus.emit('MEETING_CREATED', 2, { meetingId: 'M2', title: 't', participantAgentIds: [], origin: 'MANUAL' });
    bus.flush();
    expect(got).toEqual(['M1']);
  });

  it('Handler dürfen Kommandos absetzen (kein Reentrancy Fehler)', () => {
    const e = makeEngine();
    let n = 0;
    e.on('TASK_CREATED', () => { if (n++ === 0) e.createTask({ title: 'nested', departmentId: 'SHARED', requiredCapabilities: ['operations'] }); });
    e.createTask({ title: 'first', departmentId: 'SHARED', requiredCapabilities: ['operations'] });
    expect(e.getTasks().length).toBe(2);
  });
});

describe('Inspektor, Metriken, Debug', () => {
  it('Inspektor liefert alle geforderten Felder', () => {
    const e = makeEngine();
    e.createTask({ title: 'Lead', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 30 * S });
    e.runFor(3 * S);
    const i = e.inspectAgent('hj-lead-research')!;
    expect(i).toMatchObject({ role: 'Lead Recherche Agent', departmentId: 'HERKULESJOBS', status: expect.any(String), intent: expect.any(String) });
    expect(i.location.floorId).toBeDefined();
    expect(i.currentTask?.id).toMatch(/^HJ-/);
    expect(i.desk).toMatch(/^desk-hj-/);
    expect(i.route).not.toBeNull();
    expect(i.lastEvent?.text).toBeTruthy();
    expect(i.queue).toHaveProperty('departmentQueued');
    expect(e.inspectAgent('nope')).toBeNull();
  });

  it('Metriken: Zähler, Abteilungen, Aktivitätslevel', () => {
    const e = makeEngine();
    let m = e.getMetrics();
    expect(m.totalAgents).toBe(22);
    expect(m.availableAgents).toBe(22);
    expect(m.perDepartment.HERKULESJOBS).toEqual({ capacity: 8, active: 0, available: 8, queueLength: 0, waitingApproval: 0 });
    expect(m.activityLevel).toBe(0);
    for (const id of ['hj-sales', 'hj-outreach', 'km-creative']) e.setAgentWorking(id);
    e.runFor(20 * S);
    m = e.getMetrics();
    expect(m.workingAgents + m.movingAgents).toBe(3);
    expect(m.activityLevel).toBeGreaterThan(0);
  });

  it('Debug Steuerung: Task, Meeting, Freigabe, Küche, Bank, Geschwindigkeit', () => {
    const e = makeEngine();
    const d = new DebugController(e);
    expect(d.spawnTask('KASSELMEMES').ok).toBe(true);
    expect(d.createMeeting().ok).toBe(true);
    expect(d.sendAgentToKitchen('hj-job-research').ok).toBe(true);
    expect(d.sendAgentToBench('hj-job-research').ok).toBe(true);
    d.setSpeed(5);
    expect(e.getClock().speed).toBe(5);
    d.pause();
    d.resume();
    d.triggerApproval();
    e.runFor(3 * MIN);
    expect(e.getMetrics().waitingApprovalTasks).toBeGreaterThan(0);
    expect(d.grantAllApprovals()).toBeGreaterThan(0);
    d.reset();
    expect(e.getTasks().length).toBe(0);
    expect(d.controls.map((c) => c.id)).toEqual(expect.arrayContaining(['start', 'pause', 'resume', 'reset', 'spawnTask', 'createMeeting', 'triggerApproval', 'setAgentAvailable', 'setAgentWorking', 'sendAgentToKitchen', 'sendAgentToBench']));
  });

  it('Debug Panel baut Bedienelemente auf (ohne echtes DOM)', () => {
    const e = makeEngine();
    const mk = (): PanelElement & { kids: PanelElement[]; handlers: Record<string, () => void> } => {
      const el: any = { textContent: '', value: '', kids: [], handlers: {}, appendChild(c: any) { el.kids.push(c); }, addEventListener(t: string, h: () => void) { el.handlers[t] = h; }, setAttribute() {} };
      return el;
    };
    const root = mk();
    const panel = mountDebugPanel({ createElement: () => mk() }, root, e);
    const buttons = root.kids.filter((k: any) => k.handlers.click) as any[];
    expect(buttons.length).toBeGreaterThanOrEqual(13);
    const spawn = buttons.find((b) => b.textContent === 'Aufgabe erzeugen');
    spawn.handlers.click();
    expect(e.getTasks().length).toBe(1);
    expect(panel.selectedAgentId()).toBeTruthy();
  });

  it('Treiber nutzt genau einen Timer', () => {
    const e = makeEngine();
    let timers = 0;
    let handler: (() => void) | null = null;
    let now = 0;
    const d = createRealtimeDriver(e, { hz: 4, timer: { setInterval: (h) => { timers++; handler = h; return 1; }, clearInterval: () => { handler = null; }, now: () => now } });
    d.start();
    d.start();
    expect(timers).toBe(1);
    now = 1000;
    const t0 = e.getClock().nowMs;
    handler!();
    expect(e.getClock().nowMs - t0).toBe(1000);
    d.stop();
    expect(d.running).toBe(false);
  });
});

describe('Provider Grenze', () => {
  it('Session Lebenszyklus: started, waiting, completed, failed, provider events', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.applyProviderEvent({ type: 'provider.started', providerId: 'codex' });
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'codex', sessionId: 's1', title: 'Fix bug (real)', departmentId: 'SHARED', requiredCapabilities: ['coding'], agentId: 'sh-developer' });
    e.runFor(2 * MIN);
    const dev = e.getAgent('sh-developer')!;
    expect(dev.status).toBe('WORKING');
    expect(e.getTasks()[0]!.origin).toBe('EXTERNAL');
    e.applyProviderEvent({ type: 'provider.session.waiting', providerId: 'codex', sessionId: 's1', waitingFor: 'HUMAN_APPROVAL' });
    expect(dev.status).toBe('WAITING');
    e.applyProviderEvent({ type: 'provider.session.completed', providerId: 'codex', sessionId: 's1' });
    expect(e.getTasks().length).toBe(0);
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'codex', sessionId: 's2', title: 'x', departmentId: 'SHARED', requiredCapabilities: ['coding'], agentId: 'sh-developer' });
    e.runFor(2 * MIN);
    e.applyProviderEvent({ type: 'provider.session.failed', providerId: 'codex', sessionId: 's2', reason: 'crash' });
    expect(e.getState().taskHistory.at(-1)!.failReason).toBe('crash');
    e.applyProviderEvent({ type: 'provider.stopped', providerId: 'codex' });
    expect(types(ev)).toEqual(expect.arrayContaining(['PROVIDER_STARTED', 'PROVIDER_STOPPED', 'APPROVAL_REQUIRED', 'TASK_COMPLETED', 'TASK_FAILED']));
    expect(e.applyProviderEvent({ type: 'provider.session.completed', providerId: 'codex', sessionId: 'unknown' }).ok).toBe(false);
  });

  it('geschützte Agenten werden nicht in Pausen oder Debug Aktionen gezogen', () => {
    const e = makeEngine();
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: 's', title: 'real', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'hj-sales' });
    e.runFor(2 * MIN);
    for (const r of [e.sendAgentToKitchen('hj-sales'), e.setAgentAvailable('hj-sales')]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('AGENT_PROTECTED');
    }
    expect(e.getAgent('hj-sales')!.status).toBe('WORKING');
    const before = e.getAgent('hj-sales')!.breakPlan;
    e.runFor(30 * MIN);
    expect(e.getAgent('hj-sales')!.status).toBe('WORKING');
    expect(before).toBeNull();
  });

  it('Neustart Abgleich: verwaiste echte Aufgaben scheitern, lebende bleiben', () => {
    const e = makeEngine();
    for (const s of ['a', 'b']) e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: s, title: s, departmentId: 'SHARED', requiredCapabilities: [s === 'a' ? 'coding' : 'testing'] });
    e.runFor(2 * MIN);
    const lost = e.reconcileExternalTasks([{ providerId: 'p', sessionId: 'a' }]);
    expect(lost.length).toBe(1);
    expect(e.getTasks().length).toBe(1);
    expect(e.getTasks()[0]!.externalRef!.sessionId).toBe('a');
  });
});
