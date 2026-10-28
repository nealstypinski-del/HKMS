import { useEffect } from 'react'
import { ROOMS } from '../lib/hubConfig.js'
import { BodyScanner, WeightDeck, KfaCalculator, PhaseCard } from './Column1.jsx'
import { Gauntlet, BlocksPanel } from './Column2.jsx'
import { WhoopWidget, SleepChart } from './Column3.jsx'
import { Retatrutide, Nutrition, Overrides } from './Column4.jsx'
import { Hypnogram, Macros, TodayOnTrack, WalkCalc } from './Analysis.jsx'

const MODULES = {
  training: [Gauntlet, BlocksPanel, WalkCalc],
  koerper: [BodyScanner, WeightDeck, KfaCalculator, PhaseCard],
  pharma: [Retatrutide],
  pool: [Overrides],
  ernaehrung: [Macros, Nutrition],
  regeneration: [WhoopWidget, Hypnogram, SleepChart],
}

export function RoomPanel({ os }) {
  const room = ROOMS.find((r) => r.id === os.room)
  const close = os.actions.setRoom
  useEffect(() => {
    if (!room) return
    const onKey = (e) => e.key === 'Escape' && close(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room, close])
  if (!room) return null
  const mods = MODULES[room.id]
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={() => close(null)}>
      <div role="dialog" aria-label={room.label} className="my-4 w-full max-w-[1700px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="mono text-lg font-bold tracking-[.16em]" style={{ color: room.color, textShadow: `0 0 14px ${room.color}88` }}>{room.label}</h2>
          <button type="button" onClick={() => close(null)} className="mono cursor-pointer rounded-xl border border-white/25 bg-black/50 px-3 py-1.5 text-xs font-bold tracking-wider hover:border-cyan hover:text-cyan">SCHLIESSEN · ESC</button>
        </div>
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 380px), 1fr))` }}>
          {mods.map((M, i) => <M key={i} os={os} />)}
        </div>
      </div>
    </div>
  )
}
