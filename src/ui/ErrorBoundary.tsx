import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Fängt Render Fehler (z. B. fehlendes WebGL) ab, damit die App nicht mit einer leeren Seite endet. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="glass max-w-md rounded-xl p-6 text-center">
          <div className="text-lg font-bold text-white">Die 3D Welt konnte nicht geladen werden</div>
          <p className="mt-2 text-sm text-slate-300">{this.state.error.message}</p>
          <button
            className="mt-4 rounded-lg bg-km px-4 py-2 text-sm font-bold text-slate-900"
            onClick={() => {
              try {
                window.localStorage.removeItem('herkules-hq:agents')
                window.localStorage.removeItem('herkules-hq:office')
              } catch {
                /* ignorieren */
              }
              window.location.reload()
            }}
          >
            Gespeicherte Daten löschen und neu laden
          </button>
        </div>
      </div>
    )
  }
}
