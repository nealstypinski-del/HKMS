import type { WebGLCheck } from './webgl'

/** Vollbild Meldung, wenn der Browser kein WebGL bietet. Erklärt Ursache und Auswege. */
export function GraphicsUnavailable({ check }: { check: WebGLCheck }) {
  return (
    <div className="fatal" role="alert">
      <h1>3D Grafik nicht verfügbar</h1>
      <p>Dieser Browser oder Computer stellt WebGL nicht bereit, die Welt kann deshalb nicht gezeichnet werden.</p>
      <ul>
        <li>Hardwarebeschleunigung im Browser einschalten (Einstellungen, System).</li>
        <li>Browser und Grafiktreiber aktualisieren.</li>
        <li>Einen anderen aktuellen Browser versuchen (Chrome, Edge, Firefox, Safari).</li>
        <li>Andere Tabs mit 3D Inhalten schließen und die Seite neu laden.</li>
      </ul>
      <button onClick={() => location.reload()}>Erneut versuchen</button>
      {check.detail && <small>Technische Angabe: {check.detail}</small>}
    </div>
  )
}
