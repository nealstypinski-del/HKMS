import { Pause, Play } from 'lucide-react'
import { setSimulationSpeed, startSimulation, stopSimulation, useSimulationStore, type SimulationSpeed } from '../agents/simulation'

export function SimulationControls() {
  const running = useSimulationStore((s) => s.running)
  const speed = useSimulationStore((s) => s.speed)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => (running ? stopSimulation() : startSimulation())}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition ${running ? 'bg-hj text-slate-900 hover:brightness-110' : 'bg-km text-slate-900 hover:brightness-110'}`}
        title="Simuliert einen Arbeitstag: Aufgaben, Warten auf Freigabe, Pausen, Meetings (nur Demo, keine echte KI)"
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
        {running ? 'SIMULATION STOPPEN' : 'SIMULATE WORKDAY'}
      </button>
      <div className="flex overflow-hidden rounded-lg border border-line text-xs font-semibold">
        {([1, 2, 4] as SimulationSpeed[]).map((v) => (
          <button key={v} onClick={() => setSimulationSpeed(v)} className={`px-2 py-1.5 ${speed === v ? 'bg-panel-2 text-white' : 'text-slate-400 hover:text-white'}`}>
            {v}x
          </button>
        ))}
      </div>
    </div>
  )
}
