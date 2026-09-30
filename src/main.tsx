import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { useWorld } from './world/store'
import { sim } from './world/sim'
import { player } from './world/player'
import { perf } from './ui/perf'

createRoot(document.getElementById('root')!).render(<App />)

// Debug- und Testzugriff (auch für Headless Prüfungen)
;(window as unknown as { __hq: unknown }).__hq = { store: useWorld, sim, player, perf }
