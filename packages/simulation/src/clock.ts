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

/** Montag, 5. Januar 2026, 08:00 Berliner Zeit (07:00 UTC): fester Startpunkt für reproduzierbare Läufe. */
export const DEFAULT_START_MS = Date.UTC(2026, 0, 5, 7, 0, 0);
export const DAY_MS = 86_400_000;
export const DEFAULT_TIME_ZONE = 'Europe/Berlin';

const formatters = new Map<string, Intl.DateTimeFormat>();
const offsets = new Map<string, number>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(tz, f);
  }
  return f;
}

/** Versatz der Zeitzone zu UTC in ms (inkl. Sommerzeit), je Stunde zwischengespeichert. */
export function tzOffsetMs(utcMs: number, tz: string = DEFAULT_TIME_ZONE): number {
  const bucket = Math.floor(utcMs / 3_600_000);
  const key = `${tz}|${bucket}`;
  const hit = offsets.get(key);
  if (hit !== undefined) return hit;
  const p: Record<string, number> = {};
  for (const part of formatterFor(tz).formatToParts(new Date(bucket * 3_600_000))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  const off = Date.UTC(p['year']!, p['month']! - 1, p['day']!, p['hour']!, p['minute']!, p['second']!) - bucket * 3_600_000;
  if (offsets.size > 2048) offsets.clear();
  offsets.set(key, off);
  return off;
}

/** Minute des lokalen Tages (0 bis 1439) in der Zeitzone. */
export function localMinuteOfDay(utcMs: number, tz: string = DEFAULT_TIME_ZONE): number {
  const local = utcMs + tzOffsetMs(utcMs, tz);
  return Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / 60_000);
}

/** Beginn des lokalen Tages (00:00 in der Zeitzone) als UTC Zeitstempel. */
export function localDayStartMs(utcMs: number, tz: string = DEFAULT_TIME_ZONE): number {
  const off = tzOffsetMs(utcMs, tz);
  return Math.floor((utcMs + off) / DAY_MS) * DAY_MS - off;
}

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

  /** Lokale Minute des Tages (Standard Berlin). */
  localMinute(tz: string = DEFAULT_TIME_ZONE): number {
    return localMinuteOfDay(this.state.nowMs, tz);
  }
}

/** HH:MM:SS in der Zeitzone (Standard Berlin). */
export function formatClock(ms: number, tz: string = DEFAULT_TIME_ZONE): string {
  const local = ms + tzOffsetMs(ms, tz);
  const s = Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
