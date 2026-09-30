import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../src/index';

describe('Performance', () => {
  for (const n of [10, 50, 100, 250]) {
    it(`${n} Agenten: Ticks bleiben leicht und der Zustand konsistent`, () => {
      const e = new SimulationEngine({ seed: 'PERF', rosterSize: n, config: { invariantCheckEveryTicks: 400 } });
      e.startCompany({ present: true, generator: { enabled: true, targetUtilization: 0.7 } });
      const ticks = 4 * 60 * 5;
      const t0 = performance.now();
      for (let i = 0; i < ticks; i++) e.tick();
      const perTick = (performance.now() - t0) / ticks;
      // Sehr großzügige Grenze (Budget wären 250 ms), damit der Test auf langsamen Rechnern nicht flackert.
      expect(perTick).toBeLessThan(n <= 100 ? 5 : 15);
      expect(e.checkInvariants()).toEqual([]);
      expect(e.getMetrics().totalAgents).toBe(n);
    });
  }

  it('nur der Treiber besitzt einen Timer, keine Timer je Agent', () => {
    const dir = join(__dirname, '..', 'src');
    const all = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? all(join(d, f)) : [join(d, f)]));
    const offenders = all(dir).filter((f) => /\b(setInterval|setTimeout|requestAnimationFrame)\b/.test(readFileSync(f, 'utf8')) && !f.endsWith('driver.ts'));
    expect(offenders).toEqual([]);
  });
});
