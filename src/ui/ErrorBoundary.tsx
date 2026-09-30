import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Fängt Fehler beim Zeichnen der Oberfläche ab, statt ein weißes Bild zu hinterlassen. */
export function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  try { return String(e) } catch { return 'Unbekannter Fehler' }
}

interface State { error: string | null }
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(e: unknown): State { return { error: describeError(e) } }
  componentDidCatch(e: unknown, info: ErrorInfo) { console.error('[HQ] Darstellungsfehler', e, info.componentStack) }
  render() {
    if (this.state.error === null) return this.props.children
    return (
      <div className="fatal" role="alert">
        <h1>Etwas ist schiefgegangen</h1>
        <p>Die Darstellung wurde angehalten, damit nichts beschädigt wird. Deine gespeicherten Einstellungen sind unverändert.</p>
        <button onClick={() => location.reload()}>Seite neu laden</button>
        <button onClick={() => { try { localStorage.removeItem('herkules-hq-v1') } catch { /* nicht verfügbar */ } location.reload() }}>Einstellungen zurücksetzen und neu laden</button>
        <small>Technische Angabe: {this.state.error}</small>
      </div>
    )
  }
}
