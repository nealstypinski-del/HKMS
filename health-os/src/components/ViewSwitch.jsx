import { COLORS } from '../lib/constants.js'

export const VIEWS = [['hq', 'HQ'], ['analyse', 'ANALYSE'], ['history', 'VERLAUF'], ['week', 'WOCHE'], ['pharma', 'PHARMA'], ['training', 'TRAINING']]

export function ViewSwitch({ view, onChange }) {
  return (
    <div role="tablist" aria-label="Ansicht" className="mono no-print flex max-w-full overflow-x-auto rounded-xl border border-white/15 text-[11px] font-bold tracking-[.12em] no-scrollbar">
      {VIEWS.map(([id, l]) => (
        <button key={id} role="tab" aria-selected={view === id} type="button" onClick={() => onChange(id)} className="flex-none cursor-pointer px-3 py-2 transition-colors"
          style={{ background: view === id ? `${COLORS.cyan}26` : 'transparent', color: view === id ? COLORS.cyan : 'rgba(235,240,255,.7)' }}>{l}</button>
      ))}
    </div>
  )
}
