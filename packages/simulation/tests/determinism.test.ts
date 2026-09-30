import { describe, expect, it } from 'vitest';
import { createScenarioEngine, hashSeed, loadSimulation, Rng, saveSimulation, SimulationEngine } from '../src/index';
import { stable, MIN } from './helpers';

describe('Seeded Zufall', () => {
  it('gleicher Seed liefert dieselbe Folge, anderer Seed eine andere', () => {
    const a = new Rng({ rngState: hashSeed('HERKULES-001') });
    const b = new Rng({ rngState: hashSeed('HERKULES-001') });
    const c = new Rng({ rngState: hashSeed('HERKULES-002') });
    const sa = Array.from({ length: 8 }, () => a.next());
    expect(Array.from({ length: 8 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 8 }, () => c.next())).not.toEqual(sa);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('Deterministische Simulation', () => {
  const run = (seed: string, ms: number) => {
    const e = createScenarioEngine('B_BUSY_SALES_DAY', { seed });
    e.runFor(ms);
    return e;
  };

  it('gleicher Seed, gleicher Zustand', () => {
    expect(stable(run('HERKULES-001', 10 * MIN))).toBe(stable(run('HERKULES-001', 10 * MIN)));
  });

  it('anderer Seed, anderer Verlauf', () => {
    expect(stable(run('HERKULES-001', 10 * MIN))).not.toBe(stable(run('HERKULES-002', 10 * MIN)));
  });

  it('unabhängig davon, wie die Zeit in Häppchen geliefert wird', () => {
    const a = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
    a.runFor(5 * MIN);
    const b = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
    for (let i = 0; i < 3000; i++) b.advance(100);
    expect(stable(b)).toBe(stable(a));
    const c = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
    c.setSpeed(10);
    for (let i = 0; i < 300; i++) c.advance(100);
    c.setSpeed(1);
    // setSpeed erzeugt zwei CLOCK_CHANGED Ereignisse, sonst ist der Zustand identisch.
    const norm = (e: typeof a) => stable(e).replace(/"eventSeq":\d+/, '"eventSeq":0');
    expect(norm(c)).toBe(norm(a));
  });

  it('Ereignisfolge ist reproduzierbar', () => {
    const log = (seed: string) => {
      const e = createScenarioEngine('D_DEVELOPMENT_SPRINT', { seed });
      const out: string[] = [];
      e.onAny((ev) => out.push(`${ev.seq}:${ev.type}:${ev.timeMs}`));
      e.runFor(3 * MIN);
      return out;
    };
    expect(log('S1')).toEqual(log('S1'));
  });
});

describe('Speichern und Laden', () => {
  it('Roundtrip: fortgesetzt verhält sich der geladene Zustand wie das Original', () => {
    const a = createScenarioEngine('F_FULL_HQ', { config: { invariantCheckEveryTicks: 1 } });
    a.runFor(4 * MIN);
    const json = saveSimulation(a);
    const b = loadSimulation(json);
    expect(stable(b)).toBe(stable(a));
    a.runFor(6 * MIN);
    b.runFor(6 * MIN);
    expect(stable(b)).toBe(stable(a));
    expect(b.checkInvariants()).toEqual([]);
  });

  it('enthält alle Beziehungen: Agenten, Aufgaben, Zuweisungen, Meetings, Reservierungen, Uhr, Seed', () => {
    const e = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
    e.runFor(3 * MIN);
    const s = JSON.parse(saveSimulation(e));
    for (const k of ['agents', 'tasks', 'meetings', 'anchors', 'clock', 'seed', 'rngState', 'queues', 'workflowRuns', 'schedule']) expect(s).toHaveProperty(k);
    expect(JSON.stringify(s)).not.toMatch(/THREE|Object3D/);
    expect(Object.values(s.agents).some((a: any) => a.deskAnchorId)).toBe(true);
  });

  it('lehnt falsche Versionen und kaputte Zustände ab', () => {
    const e = createScenarioEngine('A_MORNING_START');
    e.runFor(2 * MIN);
    const s = JSON.parse(saveSimulation(e));
    expect(() => loadSimulation(JSON.stringify({ ...s, version: 99 }))).toThrow(/version/i);
    // Zwei Agenten auf demselben Schreibtisch wären ein unmöglicher Zustand.
    const bad = JSON.parse(JSON.stringify(s));
    bad.anchors['bench-01'].occupants = ['hj-sales', 'hj-outreach'];
    expect(() => loadSimulation(JSON.stringify(bad))).toThrow(/inkonsistent/);
  });

  it('Wiederherstellung startet auf Wunsch pausiert (Absturzerholung)', () => {
    const e = createScenarioEngine('B_BUSY_SALES_DAY');
    e.runFor(MIN);
    const r = loadSimulation(saveSimulation(e), { paused: true });
    expect(r.getClock().mode).toBe('PAUSED');
    expect(r.runFor(MIN)).toBe(0);
  });

  it('Autosave Hook liefert speicherbaren Zustand', () => {
    const e = new SimulationEngine({ config: { autosaveEveryTicks: 40 } });
    const saves: string[] = [];
    e.onAutosave = (j) => saves.push(j);
    e.startCompany({ present: true });
    e.runFor(30_000);
    expect(saves.length).toBeGreaterThan(0);
    expect(() => JSON.parse(saves[0]!)).not.toThrow();
  });
});
