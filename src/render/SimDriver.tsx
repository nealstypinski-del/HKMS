import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { getFloor } from '../world/generate'
import { sim } from '../world/sim'
import { useWorld } from '../world/store'
import type { AgentStatus } from '../world/types'

/**
 * Treibt die visuelle Simulation. Business-Zustand (Agentenstatus) bleibt im Store, die Sim liest ihn nur.
 * Der "Visuelle Simulation" Schalter lässt simulierte Agenten zufällig Status wechseln (Pause, Warten, zurück an die Arbeit).
 * Das ist rein visuell und wird im UI klar als SIMULIERT gekennzeichnet.
 */
export function SimDriver() {
  const version = useRef(-1)
  const nextFlip = useRef(4)
  useFrame((_, dt) => {
    const st = useWorld.getState()
    if (version.current !== st.agentsVersion) { sim.sync(st.agents); version.current = st.agentsVersion }
    sim.update(dt, st.agents)

    if (st.simulateActivity) {
      nextFlip.current -= dt
      if (nextFlip.current <= 0) {
        nextFlip.current = 1.2 + Math.random() * 3.2
        const list = Object.values(st.agents).filter((a) => a.simulated && !a.id.startsWith('agent-stress-'))
        if (list.length) {
          const a = list[Math.floor(Math.random() * list.length)]
          const r = Math.random()
          const hasRoom = getFloor(a.floorId).seats.some((x) => x.kind === 'chair')
          const next: AgentStatus =
            a.status === 'working' ? (r < 0.3 ? 'break' : r < 0.5 ? 'idle' : r < 0.65 ? 'waiting' : hasRoom ? 'meeting' : 'working')
              : a.status === 'waiting' ? (r < 0.7 ? 'working' : 'idle')
                : 'working'
          st.setAgentStatus(a.id, next)
        }
      }
    }
  })
  return null
}
