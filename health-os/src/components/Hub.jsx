import { COLORS } from '../lib/constants.js'
import { fmt, clamp } from '../lib/calc.js'
import { ATLAS, ART_RATIO, HUB_ART, ROOMS } from '../lib/hubConfig.js'
import { Bursts, HubFx, useBursts } from './HubFx.jsx'

/** Live-Status je Raum: { pct 0..1, metric, tone } */
export function roomStatus(os) {
  const { steps, plan, daily, bio, weight, mission, dose } = os
  const tone = (p, warn = 0.5) => (p >= 0.999 ? COLORS.emerald : p >= warn ? COLORS.cyan : COLORS.amber)
  return {
    training: { pct: steps / plan.target, metric: `${fmt(steps)} Schritte`, tone: daily.missed.some(Boolean) ? COLORS.amber : tone(steps / plan.target, 0.2) },
    koerper: { pct: mission.pct, metric: `${fmt(weight, 1)} kg`, tone: os.forecast.check.key === 'ok' ? COLORS.emerald : os.forecast.check.key === 'warn' ? COLORS.amber : COLORS.crimson },
    pharma: { pct: 1, metric: `${dose} UI`, tone: COLORS.magenta },
    pool: { pct: daily.swimDone ? 1 : daily.joker ? 0.5 : 0, metric: daily.joker ? (daily.swimDone ? 'Swim ✓' : 'JOKER AN') : 'bereit', tone: daily.joker ? COLORS.royal : COLORS.dim },
    ernaehrung: { pct: daily.kcal / 1400, metric: `${fmt(daily.kcal)} kcal`, tone: daily.kcal > 1400 ? COLORS.crimson : daily.kcal > 1200 ? COLORS.amber : COLORS.emerald },
    regeneration: { pct: bio.score / 100, metric: `${Math.round(bio.score)} %`, tone: os.alarm ? COLORS.crimson : bio.score >= 67 ? COLORS.emerald : COLORS.amber },
  }
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

/** Artwork-Ebene: füllt die Höhe des Eltern-Elements, Breite folgt dem Seitenverhältnis des Bildes. */
export function HubArt({ os }) {
  const st = roomStatus(os), m = os.mission
  const night = 1 - os.light
  const bursts = useBursts(os)
  return (
    <div className="relative mx-auto h-full" style={{ aspectRatio: ART_RATIO }}>
      <img src={HUB_ART} alt="Herkules HQ" className="hub-art absolute inset-0 h-full w-full select-none object-contain" draggable={false}
        style={{ filter: 'saturate(1.08) contrast(1.04) drop-shadow(0 0 28px rgba(255,184,0,.12))' }} />
      <HubFx />
      <Bursts bursts={bursts} rooms={ROOMS} color={(id) => st[id]?.tone ?? '#00F0FF'} />
      {/* Energiefluss Zentrum → Räume */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        {ROOMS.filter((r) => !r.pill).map((r) => (
          <path key={r.id} d={`M${ATLAS.x} ${ATLAS.y + 30} Q ${(ATLAS.x + r.x) / 2} ${(ATLAS.y + r.y) / 2 + 12} ${r.x} ${r.y}`} fill="none" stroke={st[r.id].tone} strokeWidth="1.4" vectorEffect="non-scaling-stroke" className="anim-flow" opacity=".55" />
        ))}
      </svg>
      {/* Atlas-Kugel: eingebrannten „-40 KG“-Text überdecken, Live-Zahl darüber */}
      <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${ATLAS.x}%`, top: `${ATLAS.y}%` }}>
        <div className="anim-glow mx-auto grid place-items-center rounded-full" style={{ width: '13.5vh', height: '13.5vh', background: 'radial-gradient(circle at 50% 45%, rgba(46,30,0,.96) 0%, rgba(46,30,0,.9) 55%, rgba(46,30,0,0) 100%)' }}>
          <div className="mono leading-tight" style={{ textShadow: '0 0 12px rgba(255,184,0,.7)' }}>
            <div className="text-[1.1vh] font-bold tracking-[.2em] text-amber-200">ZIEL</div>
            <div className="text-[2.6vh] font-black text-white">−{fmt(m.total)} KG</div>
            <div className="text-[1.2vh] font-semibold text-amber-200">{m.daysLeft} Tage</div>
          </div>
        </div>
      </div>
      {/* Raum-Hotspots */}
      {ROOMS.map((r) => {
        const s = st[r.id]
        return (
          <button key={r.id} type="button" onClick={() => os.actions.setRoom(r.id)} aria-label={`${r.label} öffnen`}
            className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
            <span className="relative flex flex-col items-center gap-0.5 rounded-lg border bg-black/70 px-2.5 py-1 backdrop-blur-sm transition-transform group-hover:scale-110 group-focus-visible:scale-110"
              style={{ borderColor: `${s.tone}aa`, boxShadow: `0 0 16px ${s.tone}66` }}>
              <span className="mono text-[10px] font-bold tracking-[.14em]" style={{ color: r.color }}>{r.label}</span>
              <span className="mono text-xs font-semibold text-white">{s.metric}</span>
              {!r.pill && <span className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full" style={{ width: `${clamp(s.pct, 0, 1) * 100}%`, background: s.tone }} /></span>}
              <span className="anim-pulse absolute -right-1 -top-1 size-2.5 rounded-full" style={{ background: s.tone, boxShadow: `0 0 10px ${s.tone}` }} />
            </span>
          </button>
        )
      })}
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(4,10,40,${night * 0.5}), rgba(2,6,20,${night * 0.25}))`, mixBlendMode: 'multiply' }} />
    </div>
  )
}

/** Mobil: Kacheln statt Artwork. Wide/Desktop: HubArt wird von HqView platziert. */
export function Hub({ os }) {
  return (
    <>
      <RoomTiles os={os} />
      <div className="hidden h-[min(72vh,720px)] md:block"><HubArt os={os} /></div>
    </>
  )
}
