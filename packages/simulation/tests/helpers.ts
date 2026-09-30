import { SimulationEngine, type CreateStateOptions, type SimEvent, type StartOptions } from '../src/index';

/** Engine mit Invariantenprüfung bei jedem Tick, Agenten sitzen auf der Bank, Generator aus. */
export function makeEngine(opts: CreateStateOptions = {}, start: StartOptions = {}): SimulationEngine {
  const e = new SimulationEngine({ ...opts, config: { invariantCheckEveryTicks: 1, ...(opts.config ?? {}) } });
  e.startCompany({ present: true, generator: { enabled: false }, ...start });
  return e;
}

export function recordEvents(e: SimulationEngine): SimEvent[] {
  const list: SimEvent[] = [];
  e.onAny((ev) => list.push(ev));
  return list;
}

export const types = (events: SimEvent[]): string[] => events.map((e) => e.type);

/** Zustand als String, ohne Realzeitzähler (der hängt vom Aufrufstil ab). */
export function stable(e: SimulationEngine): string {
  const s = JSON.parse(JSON.stringify(e.toState()));
  s.clock.wallMs = 0;
  return JSON.stringify(s);
}

export const S = 1000;
export const MIN = 60_000;
