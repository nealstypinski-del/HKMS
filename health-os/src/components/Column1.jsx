import { useState } from 'react'
import { COLORS, PHASES, PROFILE } from '../lib/constants.js'
import { fmt, bmi, clamp, currentPhase, phaseProgress, modelMass } from '../lib/calc.js'
import { Glass, Bar, Field, Tile } from './ui.jsx'

export function BodyScanner({ os, compact = false }) {
  const { weight, bio, sleepH, actualDeficit, walkKcal, tons, planTons, daily, steps, tunnel } = os
  const [hot, setHot] = useState('herz')
  const legsWarn = daily.jointPain >= 4 || (!daily.joker && planTons > 9000)
  const deficit = Math.round(tunnel.deficit)
  const nodes = [
    { id: 'kopf', pins: [[100, 34]], color: COLORS.cyan, title: 'Kopf', sub: 'Schlaf & mentale Erholung', metric: `${Math.round(bio.score)} %`, tiles: [['Recovery', `${Math.round(bio.score)} %`], ['Schlaf', `${fmt(sleepH, 1)} Std`], ['Schlafschuld', `${Math.round(Math.max(0, 7 - sleepH) * 60)} Min`]] },
    { id: 'herz', pins: [[112, 98]], color: COLORS.crimson, title: 'Herz', sub: 'Live-Puls & HRV', metric: `${Math.round(bio.rhr)} bpm`, tiles: [['Puls', `${Math.round(bio.rhr)} bpm`], ['HRV', `${Math.round(bio.hrv)} ms`], ['SpO₂', `${Math.round(bio.spo2)} %`]] },
    { id: 'kern', pins: [[100, 160]], color: COLORS.magenta, title: 'Core', sub: 'Netto-Defizit & Lipolyse-Tempo', metric: `−${fmt(deficit)}`, tiles: [['Defizit', `−${fmt(deficit)} kcal`], ['Fettabbau', `${fmt(deficit / 7000, 2)} kg/Tag`], ['Aktiv Gehen', `${fmt(walkKcal)} kcal`]] },
    { id: 'beine', pins: [[118, 304], [82, 304]], color: legsWarn ? COLORS.yellow : COLORS.emerald, title: 'Gelenke', sub: 'Kumulative Tonnage-Last', metric: `${fmt(tons / 1000, 1)} t`, tiles: [['Schritte', fmt(steps)], ['Tonnage', `${fmt(tons / 1000, 1)} / ${fmt(planTons / 1000, 1)} t`], ['Schmerz', `${daily.jointPain}/10`]] },
  ]
  return (
    <Glass title="Body Scanner 2076" aside={`1,89 m · ${fmt(weight, 1)} kg`}>
      <div className="flex justify-center rounded-2xl border border-cyan/20 bg-black/50 px-1 pt-2" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(0,240,255,.12), transparent 75%), rgba(3,5,8,.6)' }}>
        <svg viewBox="-70 0 340 430" className={`block h-auto w-full overflow-visible ${compact ? 'max-h-[360px]' : 'max-h-[520px]'}`} role="img" aria-label="Holografischer Körperscanner">
          <defs>
            <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B2A40" /><stop offset=".55" stopColor="#101A2A" /><stop offset="1" stopColor="#0A1120" /></linearGradient>
            <linearGradient id="scanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00F0FF" stopOpacity="0" /><stop offset="1" stopColor="#00F0FF" stopOpacity=".28" /></linearGradient>
          </defs>
          <ellipse cx="100" cy="418" rx="90" ry="8" fill="none" stroke="rgba(0,240,255,.3)" />
          <ellipse cx="100" cy="418" rx="58" ry="5" fill="none" stroke="rgba(0,240,255,.2)" />
          <g stroke="rgba(235,240,255,.4)"><line x1="186" y1="14" x2="186" y2="413" /><line x1="182" y1="14" x2="190" y2="14" /><line x1="182" y1="413" x2="190" y2="413" /></g>
          <text x="196" y="330" fill="rgba(235,240,255,.7)" fontSize="10" fontFamily="JetBrains Mono">1,89 m</text>
          <g fill="url(#body)" style={{ filter: 'drop-shadow(0 0 1px rgba(0,240,255,.95)) drop-shadow(0 0 12px rgba(0,240,255,.2))' }}>
            <ellipse cx="100" cy="34" rx="16.5" ry="20" />
            <path d="M91 52 L109 52 L109 64 C122 67 138 70 145 78 C150 84 150 96 148 112 L145 140 C146 158 143 178 138 196 L136 210 L64 210 L62 196 C57 178 54 158 55 140 L52 112 C50 96 50 84 55 78 C62 70 78 67 91 64 Z" />
            <path d="M56 78 C47 82 42 98 40 122 C38 148 36 176 33 200 C32 208 32 213 37 214 L46 214 C50 214 51 209 52 201 C54 178 51 150 52 128 C52 112 55 98 58 88 Z" />
            <path d="M144 78 C153 82 158 98 160 122 C162 148 164 176 167 200 C168 208 168 213 163 214 L154 214 C150 214 149 209 148 201 C146 178 149 150 148 128 C148 112 145 98 142 88 Z" />
            <path d="M64 206 L99 206 C99 248 97 282 95 308 C93 336 94 364 93 392 L94 408 C94 412 90 413 84 413 L72 413 C68 413 69 409 73 407 L77 392 C77 364 76 336 74 310 C70 282 65 246 64 206 Z" />
            <path d="M136 206 L101 206 C101 248 103 282 105 308 C107 336 106 364 107 392 L106 408 C106 412 110 413 116 413 L128 413 C132 413 131 409 127 407 L123 392 C123 364 124 336 126 310 C130 282 135 246 136 206 Z" />
          </g>
          <g fill="none" stroke="#00F0FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px rgba(0,240,255,.8))' }}>
            <path d="M62 84 L138 84" /><path d="M62 84 L46 150 L38 206" /><path d="M138 84 L154 150 L162 206" /><path d="M80 208 L120 208" /><path d="M80 208 L82 304 L84 395" /><path d="M120 208 L118 304 L116 395" /><path d="M100 60 L100 204" />
          </g>
          <ellipse cx="100" cy="60" rx="12" ry="3.2" fill="none" stroke="#E024E3" strokeWidth="1.8" />
          <ellipse cx="100" cy="168" rx="49" ry="9" fill="none" stroke="#FF9500" strokeWidth="1.8" strokeDasharray="5 3" />
          <foreignObject x="-70" y="38" width="68" height="36"><div className="mono text-right leading-tight"><div className="text-[10px] text-white/70">NACKEN</div><div className="text-[13px] font-bold text-magenta">{os.measure.neck} cm</div></div></foreignObject>
          <foreignObject x="-70" y="146" width="68" height="36"><div className="mono text-right leading-tight"><div className="text-[10px] text-white/70">BAUCH</div><div className="text-[13px] font-bold text-amber">{os.measure.waist} cm</div></div></foreignObject>
          <foreignObject x="194" y="142" width="76" height="60"><div className="mono leading-tight"><div className="text-[10px] text-white/70">KFA NAVY</div><div className="text-[15px] font-bold text-cyan">{Number.isFinite(os.bf.navy) ? fmt(os.bf.navy, 1) : '–'} %</div><div className="mt-1 text-[9px] text-white/70">FETT {fmt(os.bf.fatKg, 1)} kg<br />MAGER {fmt(os.bf.leanKg, 1)} kg</div></div></foreignObject>
          <g className="anim-scan"><rect x="14" y="-26" width="172" height="26" fill="url(#scanG)" /><rect x="14" y="-1" width="172" height="2" rx="1" fill="#00F0FF" style={{ filter: 'drop-shadow(0 0 6px #00F0FF)' }} /></g>
          {nodes.flatMap((n) => n.pins.map(([x, y], k) => (
            <g key={n.id + k} onClick={() => setHot(n.id)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r="16" fill="transparent" />
              <circle cx={x} cy={y} r={hot === n.id ? 6.5 : 4.5} fill="none" stroke={n.color} strokeWidth="1.6" className="anim-ring" />
              <circle cx={x} cy={y} r={hot === n.id ? 6.5 : 4.5} fill={n.color} stroke="#fff" strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 5px ${n.color})` }} />
            </g>
          )))}
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        {nodes.filter((n) => !compact || n.id === hot).map((n) => (
          <button key={n.id} type="button" onClick={() => setHot(n.id)} className="flex cursor-pointer flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors" style={{ background: hot === n.id ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', borderColor: hot === n.id ? n.color : 'rgba(255,255,255,.08)' }}>
            <span className="flex items-center gap-2.5">
              <span className="size-2.5 flex-none rounded-full" style={{ background: n.color, boxShadow: `0 0 10px ${n.color}` }} />
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold text-white">{n.title}</span><span className="text-xs text-white/65">{n.sub}</span></span>
              <span className="mono text-[13px] font-semibold" style={{ color: n.color }}>{n.metric}</span>
            </span>
            {hot === n.id && <span className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-1.5">{n.tiles.map(([l, v]) => <Tile key={l} label={l} value={v} />)}</span>}
          </button>
        ))}
      </div>
    </Glass>
  )
}

export function WeightDeck({ os }) {
  const { weight, actions } = os
  const [txt, setTxt] = useState('')
  const val = txt === '' ? String(weight.toFixed(1)) : txt
  const send = () => {
    const v = parseFloat(val.replace(',', '.'))
    if (actions.submitWeight(v)) setTxt('')
  }
  const model = modelMass(Math.max(0, os.dayN - 1), os.tunnel.deficit)
  const diff = weight - model
  return (
    <Glass title="Gewichtseingabe" aside={`Ziel ${fmt(PROFILE.targetKg, 1)} kg`} accent={COLORS.magenta}>
      <div className="flex items-end gap-2">
        <Field label="Aktuelles Gewicht" unit="kg" value={val} onChange={setTxt} step="0.1" onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button type="button" onClick={send} className="cursor-pointer rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-black hover:brightness-110">Senden</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Aktuell" value={`${fmt(weight, 1)} kg`} color={COLORS.cyan} />
        <Tile label="Bis Phase 1" value={`${fmt(Math.max(0, weight - 120), 1)} kg`} />
        <Tile label="Bis 90 kg" value={`${fmt(Math.max(0, weight - 90), 1)} kg`} />
      </div>
      <p className="mono text-xs" style={{ color: diff <= 0.05 ? COLORS.emerald : COLORS.amber }}>
        {Math.abs(diff) < 0.05 ? 'auf Modellkurs' : `${fmt(Math.abs(diff), 1)} kg ${diff > 0 ? 'über' : 'unter'} Modell`}
      </p>
    </Glass>
  )
}

export function KfaCalculator({ os }) {
  const { weight, measure, bf, actions } = os
  const MS = [['Start', 132, 36.95], ['Phase 1', 120, 33.6], ['Phase 2', 108, 30.23], ['Phase 3', 95, 26.6], ['Final', 90, 25.2]]
  return (
    <Glass title="KFA-Rechner" source="MODELL" aside={`BMI ${fmt(bmi(weight), 2)}`} accent={COLORS.yellow}>
      <div className="flex gap-2">
        <Field label="Nacken" unit="cm" value={measure.neck} onChange={(v) => actions.setMeasure({ neck: parseFloat(v) || 0 })} />
        <Field label="Bauch (Nabel)" unit="cm" value={measure.waist} onChange={(v) => actions.setMeasure({ waist: parseFloat(v) || 0 })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Navy-Formel" value={Number.isFinite(bf.navy) ? `${fmt(bf.navy, 1)} %` : '–'} color={COLORS.cyan} />
        <Tile label="Deurenberg" value={`${fmt(bf.deu, 1)} %`} color={COLORS.magenta} />
        <Tile label="Fettmasse" value={`${fmt(bf.fatKg, 1)} kg`} color={COLORS.amber} />
        <Tile label="Magermasse" value={`${fmt(bf.leanKg, 1)} kg`} color={COLORS.emerald} />
      </div>
      <Bar pct={bf.use} color={COLORS.yellow} />
      <div className="mono grid grid-cols-[1fr_auto_auto] gap-x-3 text-[11px] text-white/65">
        {MS.map(([n, kg, k]) => <FragRow key={n} cells={[n, `${fmt(kg, 1)} kg`, `${fmt(k, 1)} %*`]} />)}
      </div>
      <p className="text-[10px] text-white/40">* Richtwert (Deurenberg) am jeweiligen Meilenstein.</p>
    </Glass>
  )
}
const FragRow = ({ cells }) => cells.map((c, i) => <span key={i} className={i ? 'text-right' : ''}>{c}</span>)

export function PhaseCard({ os }) {
  const { weight, tunnel } = os
  const idx = currentPhase(weight)
  const cur = PHASES[idx]
  const rate = tunnel.deficit / 7000
  const eta = (t) => (rate > 0 ? Math.max(0, weight - t) / rate : Infinity)
  const fmtD = (d) => (isFinite(d) && d < 600 ? new Date(Date.now() + d * 864e5).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'nicht erreichbar')
  const slack = Math.round((PROFILE.deadline - (Date.now() + eta(90) * 864e5)) / 864e5)
  return (
    <Glass title="3-Phasen-Transformation" source="MODELL" aside={`${fmt(weight, 1)} → ${fmt(PROFILE.targetKg, 1)} kg`} accent={cur.color}>
      <div className="flex gap-1">
        {PHASES.map((p, i) => {
          const pc = phaseProgress(weight, p)
          return (
            <div key={p.n} className="flex min-w-0 flex-col gap-1.5 rounded-xl border p-2" style={{ flex: p.from - p.to, background: i === idx ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)', borderColor: i === idx ? p.color : 'rgba(255,255,255,.08)' }}>
              <span className="mono text-[10px] font-bold" style={{ color: p.color }}>{p.n === 4 ? 'FINAL' : `PHASE ${p.n}`}</span>
              <Bar pct={pc * 100} color={p.color} h={6} />
              <span className="mono text-[10px] text-white/65">{p.from}→{p.to}</span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold" style={{ color: cur.color }}>Phase {cur.n} · {cur.short}</span>
        <span className="text-xs text-white/65">{cur.dates}</span>
        <p className="text-[13px] leading-snug text-white/80">{cur.focus}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="90 kg erreicht am" value={fmtD(eta(90))} />
        <Tile label="vs. Silvester" value={!isFinite(eta(90)) ? 'kein Defizit' : slack >= 0 ? `${slack} Tage früher` : `${-slack} Tage später`} color={slack >= 0 ? COLORS.emerald : COLORS.amber} />
      </div>
    </Glass>
  )
}

export default function Column1({ os }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <BodyScanner os={os} />
      <WeightDeck os={os} />
      <KfaCalculator os={os} />
      <PhaseCard os={os} />
    </div>
  )
}
