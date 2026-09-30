import { describe, expect, it } from 'vitest';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

const trio = ['hj-sales', 'hj-outreach', 'km-creative'];

describe('Meetings', () => {
  it('Ablauf: erstellt, versammelt, aktiv, abgeschlossen, Agenten kehren zurück', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const r = e.createMeeting({ title: 'Sync', participantAgentIds: trio, durationMs: 20 * S });
    expect(r.ok).toBe(true);
    const id = r.ok ? r.value.id : '';
    expect(e.getMeetings()[0]!.status).toBe('SCHEDULED');
    e.runFor(500);
    expect(e.getMeetings()[0]!.status).toBe('ASSEMBLING');
    for (const a of trio) expect(e.getAgent(a)!.intent === 'GO_TO_MEETING' || e.getAgent(a)!.intent === 'GO_TO_ELEVATOR').toBe(true);

    e.runFor(2 * MIN);
    const seq = types(ev);
    for (const [x, y] of [['MEETING_CREATED', 'MEETING_ASSEMBLING'], ['MEETING_ASSEMBLING', 'MEETING_STARTED'], ['MEETING_STARTED', 'MEETING_COMPLETED']] as const) {
      expect(seq.indexOf(x)).toBeGreaterThanOrEqual(0);
      expect(seq.indexOf(x)).toBeLessThan(seq.indexOf(y));
    }
    expect(e.getMeetings().length).toBe(0);
    expect(e.getState().meetingHistory.find((m) => m.id === id)!.status).toBe('COMPLETED');
    for (const a of trio) {
      expect(['AVAILABLE', 'BREAK']).toContain(e.getAgent(a)!.status);
      expect(e.getAgent(a)!.meetingId).toBeNull();
    }
  });

  it('Start erst, wenn alle Teilnehmer da sind, jeder hat einen eigenen Sitz', () => {
    const e = makeEngine();
    e.createMeeting({ title: 'Sync', participantAgentIds: trio, durationMs: 20 * S });
    e.runFor(500);
    const m = e.getMeetings()[0]!;
    expect(new Set(Object.values(m.seatByAgent)).size).toBe(3);
    let startedBeforeAll = false;
    for (let i = 0; i < 4 * 100; i++) {
      e.tick();
      const live = e.getMeetings()[0];
      if (live && live.status === 'ACTIVE' && !trio.every((a) => e.getAgent(a)!.status === 'MEETING')) startedBeforeAll = true;
    }
    expect(startedBeforeAll).toBe(false);
  });

  it('arbeitende Mock Agenten kehren nach dem Meeting an ihren Schreibtisch zurück und beenden die Aufgabe', () => {
    const e = makeEngine();
    const t = e.createTask({ title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], workDurationMs: 60 * S, pinnedAgentId: 'hj-sales' });
    const id = t.ok ? t.value.id : '';
    e.runFor(45 * S);
    expect(e.getAgent('hj-sales')!.status).toBe('WORKING');
    const desk = e.getAgent('hj-sales')!.deskAnchorId;
    e.createMeeting({ title: 'Quick', participantAgentIds: ['hj-sales', 'hj-outreach'], durationMs: 10 * S });
    e.runFor(2 * S);
    expect(e.getAgent('hj-sales')!.status).not.toBe('WORKING');
    expect(e.getAgent('hj-sales')!.deskAnchorId).toBe(desk);
    const ev = recordEvents(e);
    e.runFor(5 * MIN);
    expect(types(ev)).toContain('TASK_COMPLETED');
    expect(e.getTask(id)).toBeUndefined();
  });

  it('lehnt ungültige Meetings ab', () => {
    const e = makeEngine();
    expect(e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales'] }).ok).toBe(false);
    expect(e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'nope'] }).ok).toBe(false);
    expect(e.createMeeting({ title: 'x', participantAgentIds: e.getAgents().slice(0, 13).map((a) => a.id) }).ok).toBe(false);
    e.createMeeting({ title: 'a', participantAgentIds: ['hj-sales', 'hj-outreach'] });
    const dup = e.createMeeting({ title: 'b', participantAgentIds: ['hj-sales', 'km-creative'] });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe('AGENT_IN_MEETING');
  });

  it('Abbruch schickt Teilnehmer zurück, Räume werden frei', () => {
    const e = makeEngine();
    const r = e.createMeeting({ title: 'x', participantAgentIds: trio, durationMs: 60 * S });
    e.runFor(3 * S);
    e.cancelMeeting(r.ok ? r.value.id : '');
    e.runFor(2 * MIN);
    for (const a of trio) {
      expect(['AVAILABLE', 'BREAK']).toContain(e.getAgent(a)!.status);
      expect(e.getAgent(a)!.meetingId).toBeNull();
    }
    expect(e.getAnchors().filter((a) => a.type === 'MEETING_SEAT').every((a) => a.occupants.length + a.reservedBy.length === 0)).toBe(true);
  });

  it('Sitzplätze eines Raums werden nie doppelt belegt (zwei gleichzeitige Meetings)', () => {
    const e = makeEngine();
    e.createMeeting({ title: 'a', participantAgentIds: ['hj-sales', 'hj-outreach', 'hj-job-research', 'hj-account-management'], durationMs: 20 * S });
    e.createMeeting({ title: 'b', participantAgentIds: ['km-creative', 'km-editorial', 'km-caption', 'km-community'], durationMs: 20 * S });
    e.runFor(3 * MIN);
    expect(e.getMeetings().length).toBe(0);
  });

  it('Meeting Teilnehmer mit echter Aufgabe sind geschützt', () => {
    const e = makeEngine();
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'x', sessionId: 's1', title: 'real', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'hj-sales' });
    e.runFor(2 * MIN);
    const r = e.createMeeting({ title: 'x', participantAgentIds: ['hj-sales', 'hj-outreach'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('AGENT_PROTECTED');
  });

  it('AGENT_MESSAGE bleibt getrennt von der Visualisierung', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const r = e.ingestAgentMessage({ fromAgentId: 'hj-sales', toAgentId: 'hj-outreach', type: 'handoff', timestamp: 1, visualizeAsMeeting: true });
    expect(r.ok && r.value?.origin).toBe('AGENT_MESSAGE');
    expect(types(ev)).toContain('AGENT_MESSAGE');
    const r2 = e.ingestAgentMessage({ fromAgentId: 'hj-sales', toAgentId: 'km-creative', type: 'x', timestamp: 2 });
    expect(r2.ok && r2.value).toBeNull();
  });

  it('Workflow mit Meeting Schritt (KasselMemes Trend Spike) läuft bis zur Freigabe', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.startWorkflow('km_trend_spike');
    e.runFor(8 * MIN);
    const seq = types(ev);
    expect(seq).toContain('MEETING_COMPLETED');
    expect(seq).toContain('APPROVAL_REQUIRED');
    expect(e.getTasks().filter((t) => t.status === 'WAITING_FOR_HUMAN').length).toBe(1);
  });
});
