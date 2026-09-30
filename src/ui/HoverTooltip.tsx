import { useEffect, useState } from 'react'
import { useAgentStore } from '../agents/agent.store'
import { STATUS_META } from '../agents/agent.types'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { useOfficeStore } from '../store/office.store'

/** Name und Rolle bei Hover, folgt dem Mauszeiger (DOM, kein 3D Aufwand). */
export function HoverTooltip() {
  const hover = useOfficeStore((s) => s.hover)
  const agent = useAgentStore((s) => (hover?.kind === 'agent' ? s.agents[hover.id] : undefined))
  const desk = useAgentStore((s) => (hover?.kind === 'desk' ? s.desks[hover.id] : undefined))
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])
  if (!agent && !desk) return null
  const title = agent ? agent.displayName : `Arbeitsplatz · ${desk!.label}`
  const sub = agent ? `${agent.role} · ${INITIAL_DEPARTMENTS.find((d) => d.id === agent.department)?.name ?? ''}` : desk!.id
  return (
    <div className="glass pointer-events-none fixed z-30 rounded-lg px-3 py-1.5" style={{ left: pos.x + 14, top: pos.y + 14 }}>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="text-xs text-slate-300">{sub}</div>
      {agent && (
        <div className="text-xs font-semibold" style={{ color: STATUS_META[agent.status].color }}>
          {STATUS_META[agent.status].label}
        </div>
      )}
    </div>
  )
}
