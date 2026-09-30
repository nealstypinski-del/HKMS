import { Component, useMemo } from 'react'

// Eine Aufgabe: verhindert den weißen Bildschirm. Prüft WebGL 2 und fängt Renderfehler ab.
const box = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0b1020', color: '#fff7e6', font: '15px system-ui, sans-serif', padding: 24, textAlign: 'center' }

function hasWebGL2() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

function Message({ title, text, action }) {
  return (
    <div style={box}>
      <div style={{ maxWidth: 460 }}>
        <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.5 }}>{text}</p>
        {action}
      </div>
    </div>
  )
}

class Boundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <Message
        title="Die Simulation ist abgestürzt"
        text="Beim Zeichnen ist ein Fehler aufgetreten. Ein Neuladen behebt das in den meisten Fällen. Hilft es nicht, wähle in der Etagenansicht eine niedrigere Grafikstufe."
        action={<button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Neu laden</button>}
      />
    )
  }
}

export default function WebGLGuard({ children, onBack }) {
  const ok = useMemo(hasWebGL2, [])
  if (!ok) {
    return (
      <Message
        title="3D wird nicht unterstützt"
        text="Dein Browser oder Grafiktreiber stellt kein WebGL 2 bereit. Aktiviere die Hardwarebeschleunigung in den Browsereinstellungen oder öffne die Seite in einem aktuellen Chrome, Edge oder Firefox."
        action={onBack ? <button onClick={onBack} style={{ padding: '8px 16px', cursor: 'pointer' }}>Zurück zur Etagenansicht</button> : null}
      />
    )
  }
  return <Boundary>{children}</Boundary>
}
