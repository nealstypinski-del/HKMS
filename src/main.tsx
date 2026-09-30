import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { GraphicsUnavailable } from './ui/GraphicsUnavailable'
import { detectWebGL } from './ui/webgl'
import './styles.css'
import { useWorld } from './world/store'
import { sim } from './world/sim'
import { player } from './world/player'
import { perf } from './ui/perf'
import { animStats } from './render/gait'

const root = document.getElementById('root')
if (!root) throw new Error('Wurzelelement #root fehlt')
const gl = detectWebGL()
createRoot(root).render(
  <ErrorBoundary>
    {gl.ok ? <App /> : <GraphicsUnavailable check={gl} />}
  </ErrorBoundary>,
)

// Debug- und Testzugriff (auch für Headless Prüfungen)
;(window as unknown as { __hq: unknown }).__hq = { store: useWorld, sim, player, perf, animStats }
