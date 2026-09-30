import { Layers } from 'lucide-react'
import { FLOORS } from '../config/office.config'
import { useOfficeStore, type FloorFocus } from '../store/office.store'

const LABELS: Record<number, string> = { 0: 'Lobby', 1: 'HerkulesJobs', 2: 'KasselMemes', 3: 'AI / Dev' }

export function FloorSelector() {
  const focus = useOfficeStore((s) => s.focus)
  const focusFloor = useOfficeStore((s) => s.focusFloor)
  const items: Array<{ key: FloorFocus; label: string; num: string; accent: string }> = [
    { key: 'all', label: 'Gesamtes Gebäude', num: '', accent: '#e8ecf8' },
    ...[...FLOORS].reverse().map((f) => ({ key: f.level as FloorFocus, label: LABELS[f.level] ?? f.shortName, num: String(f.level), accent: f.accent })),
  ]
  return (
    <section className="glass pointer-events-auto rounded-xl p-2">
      <div className="mb-1.5 flex items-center gap-2 px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Layers size={13} /> Etagen
      </div>
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const active = focus === it.key
          return (
            <button
              key={String(it.key)}
              onClick={() => focusFloor(it.key)}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${active ? 'bg-panel-2 text-white' : 'text-slate-300 hover:bg-white/5'}`}
              style={active ? { boxShadow: `inset 3px 0 0 ${it.accent}` } : undefined}
            >
              <span className="w-4 text-center text-xs font-bold" style={{ color: it.accent }}>
                {it.num || '∗'}
              </span>
              <span className="font-medium">{it.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
