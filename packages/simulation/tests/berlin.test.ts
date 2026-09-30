import { describe, expect, it } from 'vitest';
import { createScenarioEngine, formatClock, localDayStartMs, localMinuteOfDay, SimulationEngine } from '../src/index';
import { makeEngine, MIN } from './helpers';

describe('Berliner Zeit', () => {
  it('rechnet Winter und Sommerzeit korrekt', () => {
    expect(formatClock(Date.UTC(2026, 0, 5, 7, 0, 0))).toBe('08:00:00'); // CET, UTC+1
    expect(formatClock(Date.UTC(2026, 6, 1, 6, 0, 0))).toBe('08:00:00'); // CEST, UTC+2
    expect(localMinuteOfDay(Date.UTC(2026, 0, 5, 16, 59))).toBe(17 * 60 + 59);
    expect(localMinuteOfDay(Date.UTC(2026, 6, 1, 16, 0))).toBe(18 * 60);
    expect(new Date(localDayStartMs(Date.UTC(2026, 0, 5, 12, 0))).toISOString()).toBe('2026-01-04T23:00:00.000Z');
    expect(new Date(localDayStartMs(Date.UTC(2026, 6, 1, 12, 0))).toISOString()).toBe('2026-06-30T22:00:00.000Z');
  });

  it('Standardstart ist 08:00 Berliner Zeit und der Log zeigt Berliner Zeit', () => {
    const e = makeEngine();
    e.createTask({ title: 'x', departmentId: 'SHARED', requiredCapabilities: ['operations'] });
    e.runFor(4_000);
    expect(e.getLog(1)[0]!.clock).toMatch(/^08:00:0\d$/);
    expect(e.getState().config.timeZone).toBe('Europe/Berlin');
  });

  it('Arbeitstag 08:00 bis 18:00 gilt in Berliner Zeit', () => {
    const at = (h: number, m: number) => {
      const e = new SimulationEngine({ startMs: Date.UTC(2026, 0, 5, h, m) });
      return e.ctx.systems.mock.isWorkHours(e.ctx.now());
    };
    expect(at(6, 59)).toBe(false); // 07:59 Berlin
    expect(at(7, 0)).toBe(true); // 08:00 Berlin
    expect(at(16, 59)).toBe(true); // 17:59 Berlin
    expect(at(17, 0)).toBe(false); // 18:00 Berlin
  });
});

describe('Full HQ mit 60 Agenten', () => {
  it('hat 60 Agenten mit Bank und Schreibtisch für alle und läuft konsistent', () => {
    const e = createScenarioEngine('F_FULL_HQ', { config: { invariantCheckEveryTicks: 1 } });
    expect(e.getAgents().length).toBe(60);
    expect(e.getAnchors().filter((a) => a.type === 'BENCH').length).toBeGreaterThanOrEqual(60);
    e.runFor(10 * MIN);
    expect(e.getMetrics().totalAgents).toBe(60);
    expect(e.checkInvariants()).toEqual([]);
    expect(e.getMetrics().activityLevel).toBeGreaterThan(30);
  });
});

describe('Minimap Daten', () => {
  it('liefert Etagen, Zonen und Agentenzahlen je Zone und Status', () => {
    const e = makeEngine();
    const map = e.getMinimap();
    expect(map.map((f) => f.id)).toEqual(['floor-0', 'floor-1', 'floor-2', 'floor-3']);
    expect(map.reduce((s, f) => s + f.agentCount, 0)).toBe(22);
    const hjBench = map[1]!.zones.find((z) => z.id === 'agent-bench-hj')!;
    expect(hjBench).toMatchObject({ agentCount: 8, byStatus: { AVAILABLE: 8 }, kind: 'AGENT_BENCH' });
    e.createTask({ title: 'x', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 60_000 });
    e.runFor(60_000);
    const after = e.getMinimap();
    expect(after[1]!.zones.find((z) => z.id === 'hj-desks')!.agentCount).toBe(1);
    expect(after.reduce((s, f) => s + f.agentCount, 0)).toBe(22);
  });
});
