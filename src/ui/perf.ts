import { useWorld } from '../world/store'

/** Messwerte für das Entwickler Overlay. Frame Zeiten kommen aus requestAnimationFrame, unabhängig von R3F. */
export const perf = { fps: 0, ms: 0, p95: 0, calls: 0, tris: 0, agents: 0, desks: 0, gpu: '' }
export interface BenchRow { agents: number; fps: number; avgMs: number; p95Ms: number; calls: number }
export const bench: { running: boolean; rows: BenchRow[]; note: string } = { running: false, rows: [], note: '' }
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Stresstest: 10, 25, 50, 100 Agenten auf der aktuellen Etage, jeweils 6 s einlaufen lassen und 5 s messen. */
export async function runBenchmark(getCalls: () => number) {
  if (bench.running) return
  bench.running = true; bench.rows = []; bench.note = 'Läuft'
  emit()
  const st = useWorld.getState()
  const prevMode = st.cameraMode
  st.setMode('tycoon')
  for (const n of [0, 10, 25, 50, 100]) {
    useWorld.getState().stress(n)
    await wait(7000)
    benchSample()
    await wait(5000)
    const s = benchSample()
    bench.rows.push({ agents: n, fps: Math.round(s.fps * 10) / 10, avgMs: Math.round(s.avg * 10) / 10, p95Ms: Math.round(s.p95 * 10) / 10, calls: getCalls() })
    emit()
  }
  useWorld.getState().stress(0)
  useWorld.getState().setMode(prevMode)
  bench.running = false; bench.note = 'Fertig'
  ;(window as unknown as { __benchmark?: unknown }).__benchmark = bench.rows
  console.info('[HQ Benchmark]', JSON.stringify(bench.rows))
  emit()
}
