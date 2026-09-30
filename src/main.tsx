import { createRoot } from 'react-dom/client'
import { bootstrap } from './agents/agent.service'
import { App } from './app/App'
import './index.css'

// Kein StrictMode: Die 3D Laufzeit (Figuren, Plätze) legt beim Rendern Zustand an und soll nicht doppelt initialisiert werden.
bootstrap()
createRoot(document.getElementById('root') as HTMLElement).render(<App />)

// Nur im Dev Modus: lesender Zugriff auf Laufzeitdaten für automatisierte Prüfungen.
if (import.meta.env.DEV) {
  void Promise.all([import('./world/runtime'), import('./agents/agent.store'), import('./agents/agent.service'), import('./walk/playerRuntime')]).then(([rt, st, sv, pl]) => {
    ;(window as unknown as { __hq: unknown }).__hq = { registry: rt.characterRegistry, occupancy: rt.deskOccupancy, agents: () => st.useAgentStore.getState().agents, desks: () => st.useAgentStore.getState().desks, setStatus: sv.setStatus, player: pl.player, walkCamera: pl.walkCamera }
  })
}
