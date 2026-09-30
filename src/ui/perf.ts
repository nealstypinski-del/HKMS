import { useWorld } from '../world/store'

/** Messwerte für das Entwickler Overlay. Frame Zeiten kommen aus requestAnimationFrame, unabhängig von R3F. */
export const perf = { fps: 0, ms: 0, p95: 0, calls: 0, tris: 0, agents: 0, desks: 0, gpu: '' }
export interface BenchRow { agents: number; fps: number; avgMs: number; p95Ms: number; calls: number; valid: boolean }
export const bench: { running: boolean; cancelRequested: boolean; rows: BenchRow[]; note: string } = { running: false, cancelRequested: false, rows: [], note: '' }
const listeners = new Set<() => void>()
export const onBench = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const emit = () => listeners.forEach((f) => f())

// Zwei getrennte Puffer: das Overlay und der Benchmark leeren ihren jeweils eigenen, sie stören sich nicht.
let overlayFrames: number[] = []
let benchFrames: number[] = []
let last = performance.now()
function loop(now: number) {
  const d = now - last
  last = now
  overlayFrames.push(d)
  if (overlayFrames.length > 900) overlayFrames = overlayFrames.slice(-600)
  if (bench.running) benchFrames.push(d)
  requestAnimationFrame(loop)
}
if (typeof window !== 'undefined') requestAnimationFrame(loop)

function stats(f: number[]): { fps: number; avg: number; p95: number } {  if (!f.length) return { fps: 0, avg: 0, p95: 0 }
  const sum = f.reduce((a, b) => a + b, 0)
  const sorted = [...f].sort((a, b) => a - b)
  return { fps: (f.length / sum) * 1000, avg: sum / f.length, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0 }
}
export function sample() { const f = overlayFrames; overlayFrames = []; return stats(f) }
function benchSample() { const f = benchFrames; benchFrames = []; return stats(f) }

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface BenchOptions {
  levels?: number[]
  settleMs?: number
  measureMs?: number
  /** Warten (in Tests ersetzbar) */
  wait?: (ms: number) => Promise<void>
  /** Liefert true, wenn der Tab im Hintergrund ist (Messung wäre ungültig) */
  hidden?: () => boolean
}
export type BenchOutcome = 'done' | 'cancelled' | 'hidden' | 'error' | 'busy'

export function cancelBenchmark() { if (bench.running) bench.cancelRequested = true }

/**
 * Stresstest: Agenten auf der aktuellen Etage, je Stufe einlaufen lassen und messen.
 * Läuft nie doppelt, lässt sich abbrechen, bricht bei Hintergrund Tab ab und räumt in jedem Fall auf (finally).
 * Während der Messung sind Agentenstarts und Löschen gesperrt, damit die Zahlen stimmen.
 */
export async function runBenchmark(getCalls: () => number, opts: BenchOptions = {}): Promise<BenchOutcome> {
  if (bench.running) return 'busy'
  const levels = opts.levels ?? [0, 10, 25, 50, 100]
  const settle = opts.settleMs ?? 7000
  const measure = opts.measureMs ?? 5000
  const sleep = opts.wait ?? wait
  const isHidden = opts.hidden ?? (() => typeof document !== 'undefined' && document.hidden)
  bench.running = true; bench.cancelRequested = false; bench.rows = []; bench.note = 'Läuft'
  emit()
  const prevMode = useWorld.getState().cameraMode
  useWorld.getState().setBenchmarkRunning(true)
  let outcome: BenchOutcome = 'done'
  const aborted = (): BenchOutcome | null => (bench.cancelRequested ? 'cancelled' : isHidden() ? 'hidden' : null)
  try {
    useWorld.getState().setMode('tycoon')
    for (const n of levels) {
      useWorld.getState().stress(n, true)
      await sleep(settle)
      let a = aborted(); if (a) { outcome = a; break }
      benchSample()
      await sleep(measure)
      a = aborted(); if (a) { outcome = a; break }
      const s = benchSample()
      bench.rows.push({ agents: n, fps: Math.round(s.fps * 10) / 10, avgMs: Math.round(s.avg * 10) / 10, p95Ms: Math.round(s.p95 * 10) / 10, calls: getCalls(), valid: s.fps > 0 })
      emit()
    }
  } catch (e) {
    outcome = 'error'
    bench.note = `Fehler: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    // Aufräumen in jedem Fall, damit der Benchmark nie gesperrt zurückbleibt
    try { useWorld.getState().stress(0, true) } catch { /* nichts zu tun */ }
    try { useWorld.getState().setMode(prevMode) } catch { /* nichts zu tun */ }
    useWorld.getState().setBenchmarkRunning(false)
    bench.running = false
    if (outcome === 'done') bench.note = 'Fertig'
    else if (outcome === 'cancelled') bench.note = 'Abgebrochen'
    else if (outcome === 'hidden') bench.note = 'Abgebrochen: der Tab war im Hintergrund, die Messung wäre ungültig'
    if (typeof window !== 'undefined') (window as unknown as { __benchmark?: unknown }).__benchmark = bench.rows
    if (outcome === 'done') console.info('[HQ Benchmark]', JSON.stringify(bench.rows))
    emit()
  }
  return outcome
}
