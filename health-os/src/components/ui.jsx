import { COLORS } from '../lib/constants.js'

export function Glass({ title, aside, source, accent = COLORS.cyan, children, className = '' }) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3.5 rounded-2xl border border-white/10 bg-slate-900/60 p-4 wide:gap-2.5 wide:p-3 shadow-[0_20px_50px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-2xl transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,.4),0_0_30px_var(--glow)] ${className}`}
      style={{ borderTop: `2px solid ${accent}80`, '--glow': `${accent}24` }}
    >
      {title && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="mono text-[13px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>{title}</h2>
          <span className="flex items-center gap-2">
            {source && <SourceBadge source={source} />}
            {aside && <span className="text-xs font-medium text-white/65">{aside}</span>}
          </span>
        </div>
      )}
      {children}
    </section>
  )
}

export function Bar({ pct, color = COLORS.cyan, h = 8 }) {
  return (
    <div className="overflow-hidden rounded-full bg-white/10" style={{ height: h }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, boxShadow: `0 0 10px ${color}99` }} />
    </div>
  )
}

export function Ring({ size = 150, stroke = 12, segments, children }) {
  // segments: [{ frac (0..1 Anteil am Umfang), fill (0..1), color, track }]
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  let cum = 0
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((s, i) => {
          const len = Math.max(0, C * s.frac - 4)
          const off = -C * cum
          cum += s.frac
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.track ?? 'rgba(255,255,255,.12)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${len} ${C}`} strokeDashoffset={off} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${len * s.fill} ${C}`} opacity={s.fill > 0.001 ? 1 : 0} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 5px ${s.color})`, transition: 'stroke-dasharray .6s' }} />
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Btn({ children, onClick, color = COLORS.cyan, active = false, className = '', ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className={`cursor-pointer rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${className}`}
      style={{ borderColor: active ? color : 'rgba(255,255,255,.2)', color: active ? color : '#EEF2FF', background: active ? `${color}24` : 'transparent' }}
    >
      {children}
    </button>
  )
}

export function Field({ label, unit, value, onChange, step = 'any', ...rest }) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-white/65">
      {label}
      <span className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 focus-within:border-cyan">
        <input
          type="number" inputMode="decimal" step={step} value={value} onChange={(e) => onChange(e.target.value)}
          className="mono w-full min-w-0 bg-transparent text-sm font-semibold text-white outline-none" {...rest}
        />
        {unit && <span className="mono text-xs text-white/50">{unit}</span>}
      </span>
    </label>
  )
}

export const Tile = ({ label, value, color = '#fff' }) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-white/[.07] px-2.5 py-2">
    <span className="text-[11px] text-white/65">{label}</span>
    <span className="mono text-[13px] font-semibold" style={{ color }}>{value}</span>
  </div>
)

const SRC = { 'LIVE · MCP': '#00FF66', 'TEST-MCP': '#FFD60A', CACHE: '#FF9500', DEMO: '#FF9500', MODELL: '#00F0FF', MANUELL: '#E024E3', 'AUTO HEALTH': '#00FF66', LOKAL: '#FF9500', GESCHÄTZT: '#FFD60A' }
export function SourceBadge({ source }) {
  const c = SRC[source] ?? '#fff'
  return <span className="mono rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}>{source}</span>
}
