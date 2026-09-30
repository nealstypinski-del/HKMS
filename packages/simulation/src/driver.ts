import type { SimulationEngine } from './engine';

export interface TimerApi {
  setInterval(handler: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  now(): number;
}

export interface RealtimeDriver {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/**
 * Ein einziger Timer für die gesamte Simulation (nicht ein Timer je Agent).
 * Standard 4 Hz. Die Uhr der Engine rechnet Realzeit in Simulationszeit um (Pause, 1x bis 10x).
 */
export function createRealtimeDriver(engine: SimulationEngine, opts: { hz?: number; timer?: TimerApi } = {}): RealtimeDriver {
  const g = globalThis as unknown as { setInterval(h: () => void, ms: number): unknown; clearInterval(h: unknown): void };
  const timer: TimerApi = opts.timer ?? { setInterval: (h, ms) => g.setInterval(h, ms), clearInterval: (h) => g.clearInterval(h), now: () => Date.now() };
  const hz = Math.min(10, Math.max(2, opts.hz ?? 4));
  let handle: unknown = null;
  let last = 0;
  return {
    start() {
      if (handle !== null) return;
      last = timer.now();
      handle = timer.setInterval(() => {
        const now = timer.now();
        const delta = now - last;
        last = now;
        engine.advance(delta);
      }, Math.round(1000 / hz));
    },
    stop() {
      if (handle === null) return;
      timer.clearInterval(handle);
      handle = null;
    },
    get running() {
      return handle !== null;
    },
  };
}
