// Provider Abstraktion. In Loop 1 existiert ausschließlich der MockProvider.
//
// SICHERHEITSREGELN FÜR ALLE SPÄTEREN PROVIDER (verbindlich):
//  1. Keine Zugangsdaten aus Browsern extrahieren (Cookies, Tokens, Local Storage).
//  2. Keine Sessions kopieren oder übernehmen.
//  3. Keine Abo oder Nutzungslimits umgehen.
//  4. Keine Passwörter speichern.
//  5. Nur offiziell unterstützte Authentifizierung: Nutzer meldet sich selbst bei der lokalen CLI an
//     (Claude Code, Codex), die App erkennt lediglich die verfügbare CLI. API Keys bleiben eine optionale Zukunft.

export type SessionState = 'starting' | 'working' | 'waiting' | 'completed' | 'failed'

export interface SessionOptions {
  agentId: string
  role: string
  taskId?: string
  taskTitle?: string
  /** Loop 2: Workspace Zuweisung */
  workspace?: string
}

export interface AgentSession {
  id: string
  providerId: string
  agentId: string
  startedAt: number
}

export interface TerminalLine {
  at: number
  text: string
}

export interface SessionStatus {
  sessionId: string
  state: SessionState
  updatedAt: number
  /** Ausgabe der Session, älteste zuerst */
  lines: TerminalLine[]
}

export interface SessionEvent {
  sessionId: string
  agentId: string
  state: SessionState
}

export interface AIProvider {
  id: string
  name: string
  /** true, wenn der Provider ausschließlich simuliert (keine echte KI) */
  simulated: boolean
  isAvailable(): Promise<boolean>
  startSession(options: SessionOptions): Promise<AgentSession>
  stopSession(sessionId: string): Promise<void>
  getSessionStatus(sessionId: string): Promise<SessionStatus>
  /** Optional: Statusänderungen pushen. Echte Provider können stattdessen pollen. */
  onSessionEvent?(listener: (event: SessionEvent) => void): () => void
}
