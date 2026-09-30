// MockProvider: simuliert Sessions ohne echte KI. Alle Ausgaben sind Platzhalter und kommen aus Skripten,
// nicht aus der UI. Ein echter Provider (Loop 2) ersetzt nur diese Datei, nicht das Terminal Panel.

import { roleKind, type RoleKind } from '../data/taskTemplates'
import type { AgentSession, AIProvider, SessionEvent, SessionOptions, SessionState, SessionStatus, TerminalLine } from './provider.types'

const SCRIPTS: Record<RoleKind, readonly string[]> = {
  dev: ['Analysiere Workspace...', 'Lese Dateien...', 'Plane Änderungen...', 'Schreibe Code...', 'Führe Tests aus...', 'Prüfe Ergebnis...'],
  research: ['Sammle Quellen...', 'Lese Ergebnisse...', 'Vergleiche Angaben...', 'Verdichte Erkenntnisse...', 'Erstelle Zusammenfassung...'],
  sales: ['Lade Kontaktliste...', 'Bewerte Leads...', 'Entwerfe Ansprache...', 'Prüfe Duplikate...', 'Bereite Übergabe vor...'],
  content: ['Lese Themenliste...', 'Entwerfe Texte...', 'Prüfe Tonalität...', 'Kürze Varianten...', 'Sortiere Redaktionsplan...'],
  creative: ['Sichte Referenzen...', 'Skizziere Konzept...', 'Ordne Moodboard...', 'Plane Varianten...'],
  support: ['Lese Anfragen...', 'Ordne nach Dringlichkeit...', 'Bereite Antworten vor...', 'Fasse Verlauf zusammen...'],
}

interface InternalSession {
  session: AgentSession
  kind: RoleKind
  state: SessionState
  updatedAt: number
  lines: TerminalLine[]
  cursor: number
  timer?: ReturnType<typeof setTimeout>
  stopped: boolean
}

export interface MockProviderOptions {
  startDelayMs?: number
  lineIntervalMs?: number
}

export class MockProvider implements AIProvider {
  readonly id = 'mock'
  readonly name = 'Mock Provider (simuliert)'
  readonly simulated = true

  private readonly sessions = new Map<string, InternalSession>()
  private readonly listeners = new Set<(e: SessionEvent) => void>()
  private counter = 126
  private readonly startDelayMs: number
  private readonly lineIntervalMs: number

  constructor(options: MockProviderOptions = {}) {
    this.startDelayMs = options.startDelayMs ?? 1500
    this.lineIntervalMs = options.lineIntervalMs ?? 2200
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  async startSession(options: SessionOptions): Promise<AgentSession> {
    this.counter += 1
    const session: AgentSession = { id: `mock-session-${this.counter}`, providerId: this.id, agentId: options.agentId, startedAt: Date.now() }
    const internal: InternalSession = { session, kind: roleKind(options.role), state: 'starting', updatedAt: Date.now(), lines: [], cursor: 0, stopped: false }
    this.sessions.set(session.id, internal)
    this.push(internal, `[mock] Session ${session.id} gestartet (simuliert, keine echte KI)`)
    if (options.taskTitle) this.push(internal, `Aufgabe: ${options.taskTitle}`)
    this.emit(internal)
    internal.timer = setTimeout(() => this.transition(internal, 'working'), this.startDelayMs)
    return session
  }

  async stopSession(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId)
    if (!s || s.stopped) return
    s.stopped = true
    if (s.timer) clearTimeout(s.timer)
    if (s.state !== 'failed' && s.state !== 'completed') s.state = 'completed'
    this.push(s, 'Session beendet.')
    s.updatedAt = Date.now()
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const s = this.sessions.get(sessionId)
    if (!s) throw new Error(`Unbekannte Session: ${sessionId}`)
    return { sessionId, state: s.state, updatedAt: s.updatedAt, lines: [...s.lines] }
  }

  onSessionEvent(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Nur Mock: erzwingt einen Zustand, damit Demo Aktionen und Simulation die Session steuern können. */
  simulateState(sessionId: string, state: SessionState): void {
    const s = this.sessions.get(sessionId)
    if (!s || s.stopped) return
    this.transition(s, state)
  }

  /** Aufräumen, z. B. bei Tests oder beim Zurücksetzen. */
  dispose(): void {
    for (const s of this.sessions.values()) if (s.timer) clearTimeout(s.timer)
    this.sessions.clear()
    this.listeners.clear()
  }

  private transition(s: InternalSession, state: SessionState): void {
    if (s.stopped) return
    if (s.timer) clearTimeout(s.timer)
    const previous = s.state
    s.state = state
    if (state === 'waiting') this.push(s, 'Warte auf Freigabe (simuliert)...')
    else if (state === 'completed') this.push(s, 'Aufgabe abgeschlossen.')
    else if (state === 'failed') this.push(s, 'Fehler: simulierter Abbruch.')
    else if (state === 'working' && previous === 'waiting') this.push(s, 'Freigabe erteilt, arbeite weiter...')
    this.emit(s)
    if (state === 'working') this.scheduleLine(s)
  }

  private scheduleLine(s: InternalSession): void {
    s.timer = setTimeout(() => {
      if (s.stopped || s.state !== 'working') return
      const script = SCRIPTS[s.kind]
      this.push(s, script[s.cursor % script.length] as string)
      s.cursor += 1
      this.scheduleLine(s)
    }, this.lineIntervalMs)
  }

  private push(s: InternalSession, text: string): void {
    s.lines.push({ at: Date.now(), text })
    if (s.lines.length > 200) s.lines.splice(0, s.lines.length - 200)
    s.updatedAt = Date.now()
  }

  private emit(s: InternalSession): void {
    const event: SessionEvent = { sessionId: s.session.id, agentId: s.session.agentId, state: s.state }
    for (const l of this.listeners) l(event)
  }
}
