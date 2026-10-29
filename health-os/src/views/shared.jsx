import { COLORS } from '../lib/constants.js'

export const tip = { contentStyle: { background: 'rgba(8,12,20,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#fff' } }
export const axis = { stroke: 'rgba(235,240,255,.55)', fontSize: 10, tickLine: false, axisLine: false }
export const dm = (d) => `${d.getDate()}.${d.getMonth() + 1}.`

/** Gemeinsamer Rahmen der neuen Tabs: scrollt intern, wenn der Platz nicht reicht (Wandmonitor ohne Seiten-Scroll). */
export function ViewMain({ children, className = '' }) {
  return <main className={`grid min-h-0 flex-1 content-start items-start gap-3 wide:overflow-y-auto wide:no-scrollbar ${className}`}>{children}</main>
}

export const Empty = ({ children }) => <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-white/55">{children}</p>

export const Kpi = ({ label, value, sub, color = COLORS.cyan }) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 backdrop-blur-2xl">
    <span className="text-[10px] tracking-[.12em] text-white/55">{label}</span>
    <span className="mono text-xl font-bold" style={{ color }}>{value}</span>
    {sub && <span className="text-[10px] text-white/50">{sub}</span>}
  </div>
)
