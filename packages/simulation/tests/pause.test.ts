import { describe, expect, it } from 'vitest';
import { makeEngine, stable, types, recordEvents, MIN, S } from './helpers';

describe('Uhr, Pause, Geschwindigkeit', () => {
  it('Standard ist Echtzeit', () => {
    const e = makeEngine();
    expect(e.getClock().mode).toBe('REALTIME');
    expect(e.getClock().speed).toBe(1);
  });

  it('1x, 2x, 5x, 10x rechnen Realzeit in Simulationszeit um', () => {
    for (const speed of [1, 2, 5, 10] as const) {
      const e = makeEngine();
      e.setSpeed(speed);
      const t0 = e.getClock().nowMs;
      e.advance(1000);
      expect(e.getClock().nowMs - t0).toBe(1000 * speed);
      expect(e.getClock().mode).toBe(speed === 1 ? 'REALTIME' : 'ACCELERATED');
    }
  });

  it('Pause friert die Mock Simulation vollständig ein', () => {
    const e = makeEngine();
    e.createTask({ title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 30 * S });
    e.runFor(10 * S);
    e.pause();
    expect(e.getClock().mode).toBe('PAUSED');
    const before = stable(e);
    expect(e.advance(60_000)).toBe(0);
    expect(e.runFor(60_000)).toBe(0);
    expect(stable(e)).toBe(before);
    e.resume();
    expect(e.getClock().mode).toBe('REALTIME');
    e.advance(2000);
    expect(stable(e)).not.toBe(before);
  });

  it('Pause merkt sich die Geschwindigkeit', () => {
    const e = makeEngine();
    e.setSpeed(5);
    e.pause();
    e.resume();
    expect(e.getClock().speed).toBe(5);
    expect(e.getClock().mode).toBe('ACCELERATED');
  });

  it('Pause und Beschleunigung berühren echte (EXTERNAL) Aufgaben nicht', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: 's1', title: 'real', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'hj-sales' });
    e.runFor(2 * MIN);
    const a = e.getAgent('hj-sales')!;
    expect(a.status).toBe('WORKING');
    e.setSpeed(10);
    e.advance(10 * MIN);
    e.pause();
    e.resume();
    // Auch nach viel Zeit ohne Providerereignis endet die echte Aufgabe nicht.
    e.advance(60 * MIN);
    expect(a.status).toBe('WORKING');
    expect(types(ev)).not.toContain('TASK_COMPLETED');
  });

  it('Providerereignisse wirken auch während der Pause', () => {
    const e = makeEngine();
    e.applyProviderEvent({ type: 'provider.session.started', providerId: 'p', sessionId: 's1', title: 'real', departmentId: 'HERKULESJOBS', requiredCapabilities: ['sales'], agentId: 'hj-sales' });
    e.runFor(2 * MIN);
    e.pause();
    const r = e.applyProviderEvent({ type: 'provider.session.completed', providerId: 'p', sessionId: 's1' });
    expect(r.ok).toBe(true);
    expect(e.getTasks().length).toBe(0);
    expect(e.getAgent('hj-sales')!.status).toBe('COMPLETED');
  });
});
