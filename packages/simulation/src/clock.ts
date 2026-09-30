/**
 * SimulationClock. Wirkt NUR auf die Mock Simulation. Externe (echte) Prozesse werden nie
 * beschleunigt oder angehalten (siehe docs/INTEGRATION.md, Abschnitt Pause Grenze).
 */

export const SIM_SPEEDS = [1, 2, 5, 10] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];
export type ClockMode = 'REALTIME' | 'ACCELERATED' | 'PAUSED';

export interface ClockState {
  mode: ClockMode;
  speed: SimSpeed;
  /** Aktuelle Simulationszeit (ms, Unix Epoche). */
  nowMs: number;
  startMs: number;
  /** Realzeit, die insgesamt vergangen ist (läuft auch in der Pause weiter). */
  wallMs: number;
  modeBeforePause: 'REALTIME' | 'ACCELERATED';
}

/** Montag, 5. Januar 2026, 08:00 UTC: fester Startpunkt für reproduzierbare Läufe. */
export const DEFAULT_START_MS = Date.UTC(2026, 0, 5, 8, 0, 0);
export const DAY_MS = 86_400_000;

export function createClockState(startMs = DEFAULT_START_MS): ClockState {
  return { mode: 'REALTIME', speed: 1, nowMs: startMs, startMs, wallMs: 0, modeBeforePause: 'REALTIME' };
}

export class SimulationClock {
  constructor(public readonly state: ClockState) {}

  get nowMs(): number {
    return this.state.nowMs;
  }
  get mode(): ClockMode {
    return this.state.mode;
  }
  get speed(): SimSpeed {
    return this.state.speed;
  }
  get paused(): boolean {
    return this.state.mode === 'PAUSED';
  }

  /** Faktor Simulationszeit pro Realzeit. */
  multiplier(): number {
    if (this.state.mode === 'PAUSED') return 0;
    return this.state.mode === 'REALTIME' ? 1 : this.state.speed;
  }

  /** Rechnet Realzeit in Simulationszeit um, ohne die Uhr zu bewegen. */
  scale(realDeltaMs: number): number {
    this.state.wallMs += realDeltaMs;
    return realDeltaMs * this.multiplier();
  }

  setNow(ms: number): void {
    this.state.nowMs = ms;
  }

  setSpeed(speed: SimSpeed): void {
    if (!SIM_SPEEDS.includes(speed)) throw new Error(`Ungültige Geschwindigkeit: ${speed}`);
    this.state.speed = speed;
    const next = speed === 1 ? 'REALTIME' : 'ACCELERATED';
    if (this.state.mode !== 'PAUSED') this.state.mode = next;
    this.state.modeBeforePause = next;
  }

  pause(): void {
    if (this.state.mode === 'PAUSED') return;
    this.state.modeBeforePause = this.state.mode;
    this.state.mode = 'PAUSED';
  }

  resume(): void {
    if (this.state.mode !== 'PAUSED') return;
    this.state.mode = this.state.modeBeforePause;
  }

  timeOfDayMs(): number {
    return ((this.state.nowMs % DAY_MS) + DAY_MS) % DAY_MS;
  }
}

/** HH:MM:SS in UTC (Simulationszeit). */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
