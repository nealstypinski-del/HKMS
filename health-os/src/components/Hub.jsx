import { COLORS } from '../lib/constants.js'
import { fmt, clamp } from '../lib/calc.js'
import { ATLAS, ART_RATIO, HUB_ART, ROOMS } from '../lib/hubConfig.js'

/** Live-Status je Raum: { pct 0..1, metric, tone } */
export function roomStatus(os) {
  const { steps, plan, daily, bio, weight, mission, dose } = os
  const tone = (p, warn = 0.5) => (p >= 0.999 ? COLORS.emerald : p >= warn ? COLORS.cyan : COLORS.amber)
  const sleepP = os.sleepH / 7.5
  return {
    training: { pct: steps / plan.target, metric: `${fmt(steps)} Schritte`, tone: daily.missed.some(Boolean) ? COLORS.amber : tone(steps / plan.target, 0.2) },
    koerper: { pct: mission.pct, metric: `${fmt(weight, 1)} kg`, tone: os.forecast.check.key === 'ok' ? COLORS.emerald : os.forecast.check.key === 'warn' ? COLORS.amber : COLORS.crimson },
    pharma: { pct: 1, metric: `${dose} UI`, tone: COLORS.magenta },
    pool: { pct: daily.swimDone ? 1 : daily.joker ? 0.5 : 0, metric: daily.joker ? (daily.swimDone ? 'Swim ✓' : 'JOKER AN') : 'bereit', tone: daily.joker ? COLORS.royal : COLORS.dim },
    ernaehrung: { pct: daily.kcal / 1400, metric: `${fmt(daily.kcal)} kcal`, tone: daily.kcal > 1400 ? COLORS.crimson : daily.kcal > 1200 ? COLORS.amber : COLORS.emerald },
    regeneration: { pct: bio.score / 100, metric: `${Math.round(bio.score)} %`, tone: os.alarm ? COLORS.crimson : bio.score >= 67 ? COLORS.emerald : COLORS.amber },
  }
}

const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return `${(cx + r * Math.cos(a) * 1).toFixed(1)},${(cy + r * Math.sin(a) * 0.62).toFixed(1)}` }).join(' ')

function Placeholder({ light }) {
  const W = 1000, H = 620, c = { x: (ATLAS.x / 100) * W, y: 0.55 * H }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Herkules HQ">
      <defs>
        <radialGradient id="sphere"><stop offset="0" stopColor="#FFF3B0" /><stop offset=".45" stopColor="#FFB800" /><stop offset="1" stopColor="#7A4A00" stopOpacity=".6" /></radialGradient>
        <radialGradient id="floor"><stop offset="0" stopColor="rgba(0,240,255,.18)" /><stop offset="1" stopColor="transparent" /></radialGradient>
        <linearGradient id="roomG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14223a" /><stop offset="1" stopColor="#0a1120" /></linearGradient>
      </defs>
      <ellipse cx={c.x} cy={c.y} rx="470" ry="270" fill="url(#floor)" />
      {light < 0.35 && Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 389) % W} cy={(i * 137) % 130} r={(i % 3) + 0.8} fill="#fff" opacity={0.7 - light} />)}
      <ellipse cx={c.x} cy={c.y + 40} rx="130" ry="46" fill="none" stroke="rgba(255,184,0,.5)" strokeWidth="2" />
      <ellipse cx={c.x} cy={c.y + 40} rx="90" ry="30" fill="none" stroke="rgba(255,184,0,.35)" strokeWidth="1.5" />
      <rect x={c.x - 150} y={c.y + 120} width="300" height="46" rx="12" fill="rgba(3,5,8,.85)" stroke="rgba(0,240,255,.4)" />
      <text x={c.x} y={c.y + 150} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily="JetBrains Mono" letterSpacing="3">HERKULES HQ</text>
    </svg>
  )
}

function RoomTiles({ os }) {
  const st = roomStatus(os), m = os.mission
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <div className="mono rounded-2xl border border-amber/40 bg-black/50 px-4 py-3 text-center" style={{ boxShadow: '0 0 30px rgba(255,184,0,.25)' }}>
        <div className="text-[10px] font-bold tracking-[.2em] text-amber">ZIEL</div>
        <div className="text-2xl font-black text-white">−{fmt(m.total)} KG</div>
        <div className="text-xs text-white/65">noch {fmt(m.remaining, 1)} kg · {m.daysLeft} Tage</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ROOMS.map((r) => {
          const s = st[r.id]
          return (
            <button key={r.id} type="button" onClick={() => os.actions.setRoom(r.id)} className="flex cursor-pointer flex-col gap-1.5 rounded-2xl border bg-slate-900/60 p-3 text-left" style={{ borderColor: s.tone, boxShadow: `0 0 16px ${s.tone}40` }}>
              <span className="mono text-[11px] font-bold tracking-[.14em]" style={{ color: r.color }}>{r.label}</span>
              <span className="mono text-sm font-semibold text-white">{s.metric}</span>
              <span className="h-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full" style={{ width: `${clamp(s.pct, 0, 1) * 100}%`, background: s.tone }} /></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Hub({ os }) {
  return (
    <>
      <RoomTiles os={os} />
      <HubCanvas os={os} />
    </>
  )
}

function HubCanvas({ os }) {
  const st = roomStatus(os)
  const m = os.mission
  const art = HUB_ART
  const night = 1 - os.light
  return (
    <div className="relative hidden w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 md:block" style={{ aspectRatio: ART_RATIO }}>
      {art ? <img src={art} alt="Herkules HQ" className="absolute inset-0 h-full w-full object-cover" /> : <Placeholder light={os.light} />}
      {/* Energiefluss Zentrum → Räume */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        {ROOMS.map((r) => (
          <path key={r.id} d={`M${ATLAS.x} ${ATLAS.y + 12} Q ${(ATLAS.x + r.x) / 2} ${(ATLAS.y + r.y) / 2 + 8} ${r.x} ${r.y}`} fill="none" stroke={st[r.id].tone} strokeWidth="0.35" vectorEffect="non-scaling-stroke" className="anim-flow" opacity=".7" />
        ))}
      </svg>
      {/* Atlas-Kugel: Live-Zahl */}
      <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${ATLAS.x}%`, top: `${ATLAS.y}%` }}>
        <div className="anim-glow mx-auto grid aspect-square w-[18vmin] max-w-[190px] place-items-center rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #FFB800 45%, #7A4A00 100%)', boxShadow: '0 0 60px rgba(255,184,0,.6)' }}>
          <div className="leading-tight text-black">
            <div className="mono text-[10px] font-bold tracking-widest">ZIEL</div>
            <div className="mono text-2xl font-black">−{fmt(m.total)} KG</div>
            <div className="mono text-[10px] font-semibold">noch {fmt(m.remaining, 1)} kg</div>
          </div>
        </div>
      </div>
      {/* Raum-Hotspots */}
      {ROOMS.map((r) => {
        const s = st[r.id]
        return (
          <button key={r.id} type="button" onClick={() => os.actions.setRoom(r.id)} aria-label={`${r.label} öffnen`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
            {!HUB_ART && (
              <svg viewBox="-100 -70 200 140" className="w-[19vmin] min-w-[120px] max-w-[230px] transition-transform group-hover:scale-105 group-focus-visible:scale-105">
                <polygon points={hex(0, 0, 92)} fill="url(#roomG)" stroke={s.tone} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 10px ${s.tone})` }} />
                <polygon points={hex(0, 0, 78)} fill="none" stroke={r.color} strokeOpacity=".35" />
              </svg>
            )}
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex flex-col items-center gap-0.5 rounded-lg bg-black/65 px-2.5 py-1 backdrop-blur-sm" style={{ boxShadow: `0 0 18px ${s.tone}66` }}>
                <span className="mono text-[10px] font-bold tracking-[.14em]" style={{ color: r.color }}>{r.label}</span>
                <span className="mono text-xs font-semibold text-white">{s.metric}</span>
                <span className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full" style={{ width: `${clamp(s.pct, 0, 1) * 100}%`, background: s.tone }} /></span>
              </span>
            </span>
            <span className="anim-pulse pointer-events-none absolute -right-1 -top-1 size-3 rounded-full" style={{ background: s.tone, boxShadow: `0 0 10px ${s.tone}` }} />
          </button>
        )
      })}
      {/* Tag/Nacht-Stimmung */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(4,10,40,${night * 0.55}), rgba(2,6,20,${night * 0.3}))`, mixBlendMode: 'multiply' }} />
      <div className="mono pointer-events-none absolute bottom-2 left-3 text-[10px] tracking-[.14em] text-white/55">{HUB_ART ? 'ARTWORK' : 'PLATZHALTER · ARTWORK: lib/hubConfig.js'}</div>
      <div className="mono pointer-events-none absolute right-3 top-2 rounded-md border border-emerald/50 bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald">MISSION AKTIV</div>
    </div>
  )
}
