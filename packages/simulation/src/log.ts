import { DEFAULT_TIME_ZONE, formatClock } from './clock';

export interface LogEntry {
  seq: number;
  timeMs: number;
  /** HH:MM:SS Simulationszeit in der konfigurierten Zeitzone (Standard Berlin). */
  clock: string;
  category: string;
  text: string;
  agentId?: string;
  taskId?: string;
  meetingId?: string;
}

export interface LogState {
  seq: number;
  entries: LogEntry[];
}

/** Gedeckelter Aktivitätslog (kein unbegrenztes Wachstum, wichtig für 24/7 Betrieb). */
export class ActivityLog {
  constructor(
    public readonly state: LogState,
    private capacity: number,
    private timeZone: string = DEFAULT_TIME_ZONE,
  ) {}

  add(timeMs: number, category: string, text: string, refs: { agentId?: string; taskId?: string; meetingId?: string } = {}): void {
    this.state.seq += 1;
    this.state.entries.push({ seq: this.state.seq, timeMs, clock: formatClock(timeMs, this.timeZone), category, text, ...refs });
    // Amortisiert kürzen: erst ab 25 % Überhang, damit nicht bei jedem Eintrag verschoben wird.
    if (this.state.entries.length > this.capacity + Math.ceil(this.capacity / 4)) {
      this.state.entries.splice(0, this.state.entries.length - this.capacity);
    }
  }

  recent(limit = 50): readonly LogEntry[] {
    const e = this.state.entries;
    return e.slice(Math.max(0, e.length - Math.min(limit, this.capacity)));
  }

  get size(): number {
    return Math.min(this.state.entries.length, this.capacity);
  }
}
