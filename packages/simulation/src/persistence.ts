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
  const raw = JSON.parse(json) as Partial<SimulationState>;
  if (raw.version !== SIMULATION_STATE_VERSION) {
    throw new Error(`Unbekannte Zustandsversion ${String(raw.version)} (erwartet ${SIMULATION_STATE_VERSION})`);
  }
  return raw as SimulationState;
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
