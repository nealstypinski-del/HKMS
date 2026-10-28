import { COLORS } from '../lib/constants.js'

export function ViewSwitch({ view, onChange }) {
  return (
    <div role="tablist" aria-label="Ansicht" className="mono flex overflow-hidden rounded-xl border border-white/15 text-[11px] font-bold tracking-[.12em]">
      {[['hq', 'HQ'], ['analyse', 'ANALYSE']].map(([id, l]) => (
        <button key={id} role="tab" aria-selected={view === id} type="button" onClick={() => onChange(id)} className="cursor-pointer px-3.5 py-2 transition-colors"
          style={{ background: view === id ? `${COLORS.cyan}26` : 'transparent', color: view === id ? COLORS.cyan : 'rgba(235,240,255,.7)' }}>{l}</button>
      ))}
    </div>
  )
}
