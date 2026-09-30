import { SimulationEngine } from './engine';
import { checkInvariants } from './invariants';
import { SIMULATION_STATE_VERSION, type SimulationState } from './state';

/**
 * Speichern und Laden. Der Zustand enthält nur JSON taugliche Daten (Agenten, Aufgaben,
 * Zuweisungen, Meetings, Reservierungen, Uhr, Seed, PRNG Zustand). Keine Three.js Objekte.
 */

export function saveSimulation(engine: SimulationEngine): string {
  return JSON.stringify(engine.toState());
}

export interface LoadOptions {
  /** Prüft die Invarianten nach dem Laden (Standard: true). */
  validate?: boolean;
  /** Startet nach dem Laden pausiert, z. B. nach einem Absturz, bis externe Prozesse abgeglichen sind. */
  paused?: boolean;
}

export function parseSimulationState(json: string): SimulationState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Gespeicherter Zustand ist kein gültiges JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Gespeicherter Zustand hat ein falsches Format (Objekt erwartet)');
  const state = raw as Partial<SimulationState>;
  if (state.version !== SIMULATION_STATE_VERSION) {
    throw new Error(`Unbekannte Zustandsversion ${String(state.version)} (erwartet ${SIMULATION_STATE_VERSION})`);
  }
  for (const key of ['agents', 'tasks', 'anchors', 'clock', 'config', 'queues', 'layout', 'agentOrder'] as const) {
    if (state[key] === undefined || state[key] === null) throw new Error(`Gespeicherter Zustand ist unvollständig: Feld ${key} fehlt`);
  }
  return state as SimulationState;
}

export function loadSimulation(json: string, opts: LoadOptions = {}): SimulationEngine {
  const state = parseSimulationState(json);
  if (opts.validate !== false) {
    const errors = checkInvariants(state);
    if (errors.length > 0) throw new Error(`Gespeicherter Zustand ist inkonsistent:\n${errors.slice(0, 10).join('\n')}`);
  }
  const engine = SimulationEngine.fromState(state);
  if (opts.paused) engine.pause();
  return engine;
}
