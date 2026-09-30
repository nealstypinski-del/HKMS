import { performance } from 'node:perf_hooks';
import { SimulationEngine } from '../src/index';

/** Misst den reinen Simulationsaufwand (ohne Rendering). Ausgabe als Tabelle. */
const SIZES = [10, 25, 50, 100, 250];
const WARMUP_MS = 3 * 60_000;
const MEASURE_MS = 30 * 60_000;

const rows: string[][] = [];
for (const n of SIZES) {
  const e = new SimulationEngine({ seed: 'HERKULES-PERF', rosterSize: n });
  let events = 0;
  e.onAny(() => { events += 1; });
  e.startCompany({ operations: 'CONTINUOUS_OPERATIONS', present: true, generator: { enabled: true, targetUtilization: 0.7, workflowShare: 0.15 } });
  e.setConfig({ mockAutoApproveAfterMs: 60_000 });
  e.runFor(WARMUP_MS);
  events = 0;
  const ticks = MEASURE_MS / 250;
  const durations = new Float64Array(ticks);
  const heap0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  for (let i = 0; i < ticks; i++) {
    const a = performance.now();
    e.tick();
    durations[i] = performance.now() - a;
  }
  const total = performance.now() - t0;
  const heap1 = process.memoryUsage().heapUsed;
  const sorted = Array.from(durations).sort((x, y) => x - y);
  const m = e.getMetrics();
  const errs = e.checkInvariants();
  rows.push([
    String(n),
    String(ticks),
    (total / ticks).toFixed(4),
    sorted[Math.floor(ticks * 0.99)]!.toFixed(3),
    sorted[ticks - 1]!.toFixed(3),
    ((MEASURE_MS / 1000) / (total / 1000)).toFixed(0),
    (events / (MEASURE_MS / 1000)).toFixed(1),
    String(m.workingAgents + m.movingAgents),
    ((heap1 - heap0) / 1e6).toFixed(1),
    String(errs.length),
  ]);
}
const head = ['Agenten', 'Ticks', 'ms/Tick Mittel', 'ms p99', 'ms max', 'Sim s pro Real s', 'Events/Sim s', 'aktiv', 'Heap MB', 'Invarianten'];
console.log(head.join(' | '));
for (const r of rows) console.log(r.join(' | '));
console.log(`\nBudget bei 4 Ticks/s: 250 ms pro Tick. Gemessen wird ${MEASURE_MS / 60_000} Simulationsminuten je Größe (nach ${WARMUP_MS / 60_000} Minuten Warmup).`);
