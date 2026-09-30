import { Footprints, RotateCcw, Trash2 } from 'lucide-react'
import { useAgentStats } from '../agents/agent.hooks'
import { STATUS_META, type AgentStatus } from '../agents/agent.types'
import { BRAND } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { resetWorld } from '../world/worldReset'
import { SimulationControls } from './SimulationControls'
import { exitWalkMode } from './WalkHud'

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="h-2 w-2 self-center rounded-full" style={{ background: color }} />
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-base font-bold tabular-nums text-white">{value}</span>
    </div>
  )
}

export function TopBar() {
  const stats = useAgentStats()
  const resetView = useOfficeStore((s) => s.resetView)
  const mode = useOfficeStore((s) => s.mode)
  const color = (s: AgentStatus) => STATUS_META[s].color
  return (
    <header className="glass pointer-events-auto absolute inset-x-3 top-3 z-20 flex items-center gap-6 rounded-xl px-4 py-2.5">
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-[0.18em] text-white">{BRAND.displayTitle}</div>
        <div className="text-[11px] text-slate-400">
          <span className="text-hj">HerkulesJobs</span> · <span className="text-km">KasselMemes</span>
        </div>
      </div>
      <div className="hidden flex-1 items-center gap-5 lg:flex">
        <Counter label="Agents" value={stats.online} color="#e8ecf8" />
        <Counter label="Working" value={stats.working} color={color('working')} />
        <Counter label="Idle" value={stats.idle} color={color('idle')} />
        <Counter label="Waiting" value={stats.waiting} color={color('waiting')} />
        <Counter label="Pause" value={stats.break} color={color('break')} />
        <Counter label="Meeting" value={stats.meeting} color={color('meeting')} />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="rounded border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[11px] font-bold tracking-wider text-amber-300" title="Alle Agenten sind simuliert. Keine echte KI, keine Zugangsdaten.">
          {BRAND.providerBadge.toUpperCase()}
        </span>
        <button
          onClick={() => (mode === 'walk' ? exitWalkMode() : useOfficeStore.getState().enterWalk())}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold tracking-wide ${mode === 'walk' ? 'border-km bg-km/20 text-km' : 'border-line text-slate-200 hover:bg-panel-2'}`}
          title="Third Person Rundgang durch das Gebäude"
        >
          <Footprints size={14} /> {mode === 'walk' ? 'RUNDGANG BEENDEN' : 'RUNDGANG STARTEN'}
        </button>
        <SimulationControls />
        <button onClick={resetView} className="rounded-lg border border-line p-2 text-slate-300 hover:bg-panel-2 hover:text-white" title="Ansicht zurücksetzen">
          <RotateCcw size={15} />
        </button>
        <button
          onClick={() => {
            if (window.confirm('Demo Daten zurücksetzen? Agenten, Plätze und Kamera gehen auf den Ausgangszustand.')) resetWorld()
          }}
          className="rounded-lg border border-line p-2 text-slate-300 hover:bg-panel-2 hover:text-white"
          title="Demo Daten zurücksetzen"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </header>
  )
}
