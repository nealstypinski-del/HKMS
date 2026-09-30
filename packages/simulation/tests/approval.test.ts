import { describe, expect, it } from 'vitest';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

const approvalTask = (e: ReturnType<typeof makeEngine>, extra = {}) =>
  e.createTask({ title: 'Draft', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 5 * S, requiresApproval: true, ...extra });

describe('Menschliche Freigabe', () => {
  it('blockiert die Fortsetzung, egal wie viel Zeit vergeht', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const t = approvalTask(e);
    const id = t.ok ? t.value.id : '';
    e.runFor(2 * MIN);
    expect(e.getTask(id)!.status).toBe('WAITING_FOR_HUMAN');
    const a = e.getAgent('hj-lead-research')!;
    expect(a.status).toBe('WAITING');
    expect(a.intent).toBe('WAIT_FOR_APPROVAL');
    e.runFor(30 * MIN);
    expect(e.getTask(id)!.status).toBe('WAITING_FOR_HUMAN');
    expect(a.status).toBe('WAITING');
    expect(types(ev).filter((x) => x === 'APPROVAL_REQUIRED').length).toBe(1);
    expect(types(ev)).not.toContain('TASK_COMPLETED');
    expect(e.getQueues().HERKULESJOBS.waitingApproval).toBe(1);
  });

  it('Freigabe schließt die Aufgabe ab, Agent wird wieder verfügbar', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const t = approvalTask(e);
    const id = t.ok ? t.value.id : '';
    e.runFor(2 * MIN);
    expect(e.grantApproval(id).ok).toBe(true);
    e.runFor(30 * S);
    expect(types(ev)).toContain('APPROVAL_GRANTED');
    expect(types(ev)).toContain('TASK_COMPLETED');
    expect(e.getAgent('hj-lead-research')!.status).not.toBe('WAITING');
    expect(e.grantApproval(id).ok).toBe(false);
  });

  it('Ablehnung lässt die Aufgabe scheitern', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    const t = approvalTask(e);
    const id = t.ok ? t.value.id : '';
    e.runFor(2 * MIN);
    expect(e.denyApproval(id).ok).toBe(true);
    expect(types(ev)).toContain('APPROVAL_DENIED');
    expect(e.getState().taskHistory.find((h) => h.id === id)!.status).toBe('FAILED');
  });

  it('Freigabe mit Nacharbeit lässt den Agenten weiterarbeiten', () => {
    const e = makeEngine();
    const t = approvalTask(e, { postApprovalWorkMs: 10 * S });
    const id = t.ok ? t.value.id : '';
    e.runFor(2 * MIN);
    e.grantApproval(id);
    // Vom Warteplatz zurück an den Schreibtisch, dann Nacharbeit.
    let worked = false;
    for (let i = 0; i < 4 * 60; i++) { e.tick(); if (e.getAgent("hj-lead-research")!.status === "WORKING") worked = true; }
    expect(worked).toBe(true);
    e.runFor(MIN);
    expect(e.getTask(id)).toBeUndefined();
  });

  it('Standard ist der Warteplatz, konfigurierbar bleibt der Schreibtisch', () => {
    const stay = makeEngine({ config: { approvalBehavior: 'STAY_AT_DESK' } });
    approvalTask(stay);
    stay.runFor(2 * MIN);
    expect(stay.getAgent('hj-lead-research')!.status).toBe('WAITING');
    expect(stay.getAgent('hj-lead-research')!.location.anchorId).toBe(stay.getAgent('hj-lead-research')!.deskAnchorId);
    expect(makeEngine().getState().config.approvalBehavior).toBe('GO_TO_WAITING_AREA');
    const e = makeEngine();
    const t = approvalTask(e);
    const id = t.ok ? t.value.id : '';
    e.runFor(2 * MIN);
    const a = e.getAgent('hj-lead-research')!;
    expect(a.status).toBe('WAITING');
    expect(a.location.anchorId).toMatch(/^waiting-hj-/);
    expect(e.getAnchors().find((x) => x.id === 'desk-hj-01')!.reservedBy).toContain('hj-lead-research');
    e.grantApproval(id);
    e.runFor(MIN);
    expect(e.getAgent('hj-lead-research')!.taskId).toBeNull();
  });

  it('automatische Freigabe nur für Mock Aufgaben und nur wenn konfiguriert', () => {
    const off = makeEngine();
    approvalTask(off);
    off.runFor(10 * MIN);
    expect(off.getTasks().length).toBe(1);

    const on = makeEngine({ config: { mockAutoApproveAfterMs: 30 * S } });
    const ev = recordEvents(on);
    approvalTask(on);
    on.runFor(3 * MIN);
    const granted = ev.find((x) => x.type === 'APPROVAL_GRANTED');
    expect(granted && granted.type === 'APPROVAL_GRANTED' && granted.payload.by).toBe('MOCK_AUTO');
  });

  it('echte Aufgaben werden nie automatisch freigegeben', () => {
    const e = makeEngine({ config: { mockAutoApproveAfterMs: 1 * S } });
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: 's', title: 'real', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'hj-sales' });
    e.runFor(MIN);
    e.applyProviderEvent({ type: 'provider.session.waiting', providerId: 'p', sessionId: 's', waitingFor: 'HUMAN_APPROVAL' });
    e.runFor(30 * MIN);
    expect(e.getAgent('hj-sales')!.status).toBe('WAITING');
    e.grantApproval(e.getTasks()[0]!.id);
    e.runFor(MIN);
    // Freigabe setzt die Arbeit fort, ein Ende kommt nur vom Provider.
    expect(e.getAgent('hj-sales')!.status).toBe('WORKING');
  });
});
