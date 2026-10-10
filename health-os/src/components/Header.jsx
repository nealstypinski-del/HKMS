import { COLORS } from '../lib/constants.js'

export function Header({ os }) {
  const { now, whoop, alarm, curfew, dayN, demo } = os
  const status = alarm ? ['CORTISOL-ALARM', COLORS.amber] : ['OPTIMAL', COLORS.emerald]
  const w = whoop.status === 'connected' ? ['CONNECTED', COLORS.emerald] : whoop.status === 'connecting' ? ['CONNECTING …', COLORS.amber] : [demo ? 'OFFLINE · DEMO-DATEN' : 'OFFLINE · CACHE', COLORS.crimson]
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-3 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <h1 className="mono text-sm font-bold tracking-[.16em] text-white">NEAL HEALTH OS 2076</h1>
        <Dot color={status[1]} label={`LIVE SYSTEM STATUS: ${status[0]}`} />
        <Dot color={w[1]} label={`WHOOP MCP: ${w[0]}`} />
        <span className="mono text-xs text-white/65">TAG {dayN} / 85</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="text-right leading-tight">
          <div className="mono text-lg font-semibold">{now.toLocaleTimeString('de-DE')}</div>
          <div className="text-[11px] text-white/65">{now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[10px] font-semibold tracking-[.14em] text-white/65">CURFEW LOCKOUT 22:00</div>
          <div className="mono text-2xl font-bold" style={{ color: curfew.color, textShadow: `0 0 14px ${curfew.color}88` }}>{curfew.label}</div>
        </div>
      </div>
    </header>
  )
}

const Dot = ({ color, label }) => (
  <span className="mono flex items-center gap-2 text-xs font-medium" style={{ color }}>
    <span className="size-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
    {label}
  </span>
)

export function CommandBanner({ command }) {
  return (
    <section className="rounded-2xl border bg-black/80 px-5 py-3.5 backdrop-blur-2xl" style={{ borderColor: `${command.color}55`, boxShadow: `0 0 30px ${command.color}2e` }}>
      <p className="mono flex flex-wrap items-baseline gap-x-3 text-[15px] font-bold tracking-[.06em] sm:text-lg" style={{ color: command.color, textShadow: `0 0 12px ${command.color}77` }}>
        <span>{command.time}</span><span className="opacity-60">→</span>
        <span>{command.text}</span>
      </p>
    </section>
  )
}

export function McpLog({ whoop }) {
  const rows = whoop.log
  return (
    <footer className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur-2xl">
      <div className="mono mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] tracking-[.14em] text-white/65">
        <span>MCP-LOG</span>
        <button type="button" onClick={whoop.sync} className="cursor-pointer rounded-lg border border-white/20 px-2.5 py-1 text-white hover:border-cyan hover:text-cyan">JETZT SYNCHRONISIEREN</button>
      </div>
      {rows.length === 0 && <p className="mono text-xs text-white/50">noch kein Abruf</p>}
      {rows.map((l, i) => (
        <p key={i} className="mono flex gap-3 text-xs" style={{ opacity: 1 - i * 0.15 }}>
          <span className="text-white/50">{l.ts}</span>
          <span style={{ color: l.ok ? COLORS.emerald : COLORS.crimson }}>{l.tag}</span>
          <span className="truncate text-white/80">{l.msg}</span>
        </p>
      ))}
      {whoop.status === 'offline' && (
        <p className="mt-2 text-xs text-amber">Bridge nicht erreichbar: <code>npm run bridge</code> starten und <code>whoop-mcp.config.json</code> anlegen (siehe README). {whoop.error && <span className="text-white/50">({whoop.error})</span>}</p>
      )}
    </footer>
  )
}
