// Bausteine der Analyse-Ansicht (Layout nach Entwurf Bild 4).
import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, PHASES, PROFILE } from '../lib/constants.js'
import { fmt, pad } from '../lib/calc.js'
import { Glass, Bar, Btn, Field, SourceBadge, Tile } from './ui.jsx'
import { KfaGauge } from './Hud.jsx'

const tip = { contentStyle: { background: 'rgba(8,12,20,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#fff' } }
const axis = { stroke: 'rgba(235,240,255,.55)', fontSize: 10, tickLine: false, axisLine: false }

/* ── Icons ── */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  head: <><path {...P} d="M9 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 3 4h1V5H9zM15 5a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-3 4h-1V5h1z" /></>,
  heart: <path {...P} d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" />,
  core: <><circle {...P} cx="12" cy="12" r="7" /><circle {...P} cx="12" cy="12" r="3" /></>,
  joint: <path {...P} d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  dumbbell: <path {...P} d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  walk: <><circle {...P} cx="13" cy="4.5" r="1.8" /><path {...P} d="M9 21l3-7-2-3 3-3 3 3h3M11 8l-3 3M12 14l4 3v4" /></>,
}
export const Icon = ({ name, size = 22 }) => <svg viewBox="0 0 24 24" width={size} height={size}>{ICONS[name]}</svg>

/* ── Topbar ── */
export function TopBar({ os, children }) {
  const { now, command, curfew, alarm, whoop, dayN } = os
  const w = whoop.status === 'connected' ? [whoop.test ? 'CONNECTED (TEST)' : 'CONNECTED', whoop.test ? COLORS.yellow : COLORS.emerald] : [whoop.status === 'connecting' ? 'CONNECTING …' : 'OFFLINE', whoop.status === 'connecting' ? COLORS.amber : COLORS.crimson]
  const start = new Date(now); start.setHours(5, 30, 0, 0)
  const lock = new Date(now); lock.setHours(22, 0, 0, 0)
  const dayPct = Math.max(0, Math.min(100, ((now - start) / (lock - start)) * 100))
  const Dot = ({ c, t }) => <span className="mono flex items-center gap-1.5 text-[11px] font-medium" style={{ color: c }}><i className="size-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />{t}</span>
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border bg-black/80 px-5 py-3 backdrop-blur-2xl" style={{ borderColor: `${command.color}55`, boxShadow: `0 0 30px ${command.color}26` }}>
      <p className="mono text-lg font-bold tracking-[.05em]" style={{ color: command.color, textShadow: `0 0 12px ${command.color}77` }}>{command.time} – {command.text}</p>
      <span className="mono hidden text-[11px] tracking-[.1em] text-white/55 xl:inline">DISZIPLIN HEUTE. FREIHEIT MORGEN.</span>
      <span className="flex-1" />
      <span className="text-[11px] text-white/65">{now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <Dot c={alarm ? COLORS.amber : COLORS.emerald} t={`LIVE SYSTEM STATUS: ${alarm ? 'CORTISOL-ALARM' : 'OPTIMAL'}`} />
      <Dot c={w[1]} t={`WHOOP MCP: ${w[0]}`} />
      <span className="mono text-[11px] text-white/65">TAG {dayN} / 85</span>
      {os.syncMode === 'local' && <SourceBadge source="LOKAL" />}
      <span className="flex items-center gap-2">
        <span className="mono text-[10px] tracking-[.12em] text-white/65">ZEIT BIS 22:00</span>
        <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${dayPct}%`, background: curfew.color, boxShadow: `0 0 8px ${curfew.color}` }} /></span>
        <span className="mono text-xl font-bold" style={{ color: curfew.color, textShadow: `0 0 12px ${curfew.color}88` }}>{curfew.label}</span>
      </span>
      {children}
    </section>
  )
}

/* ── Linke Spalte ── */
function Figure({ nodes }) {
  return (
    <svg viewBox="20 0 160 430" className="h-full max-h-[300px] w-full" role="img" aria-label="Körper-Hologramm">
      <defs><linearGradient id="fig2d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f6f9f" stopOpacity=".95" /><stop offset=".6" stopColor="#0f3d66" stopOpacity=".9" /><stop offset="1" stopColor="#0a2342" stopOpacity=".9" /></linearGradient></defs>
      <ellipse cx="100" cy="418" rx="60" ry="6" fill="none" stroke="rgba(0,240,255,.4)" />
      <g fill="url(#fig2d)" style={{ filter: 'drop-shadow(0 0 3px rgba(0,240,255,.9)) drop-shadow(0 0 14px rgba(0,180,255,.35))' }}>
        <ellipse cx="100" cy="34" rx="16.5" ry="20" />
        <path d="M91 52 L109 52 L109 64 C122 67 138 70 145 78 C150 84 150 96 148 112 L145 140 C146 158 143 178 138 196 L136 210 L64 210 L62 196 C57 178 54 158 55 140 L52 112 C50 96 50 84 55 78 C62 70 78 67 91 64 Z" />
        <path d="M56 78 C47 82 42 98 40 122 C38 148 36 176 33 200 C32 208 32 213 37 214 L46 214 C50 214 51 209 52 201 C54 178 51 150 52 128 C52 112 55 98 58 88 Z" />
        <path d="M144 78 C153 82 158 98 160 122 C162 148 164 176 167 200 C168 208 168 213 163 214 L154 214 C150 214 149 209 148 201 C146 178 149 150 148 128 C148 112 145 98 142 88 Z" />
        <path d="M64 206 L99 206 C99 248 97 282 95 308 C93 336 94 364 93 392 L94 408 C94 412 90 413 84 413 L72 413 C68 413 69 409 73 407 L77 392 C77 364 76 336 74 310 C70 282 65 246 64 206 Z" />
        <path d="M136 206 L101 206 C101 248 103 282 105 308 C107 336 106 364 107 392 L106 408 C106 412 110 413 116 413 L128 413 C132 413 131 409 127 407 L123 392 C123 364 124 336 126 310 C130 282 135 246 136 206 Z" />
      </g>
      <g fill="none" stroke="rgba(120,230,255,.55)" strokeWidth="1"><path d="M72 100 Q100 112 128 100" /><path d="M70 124 Q100 136 130 124" /><path d="M100 60 L100 204" /></g>
      {nodes.flatMap((n) => n.pins.map(([x, y], k) => (
        <g key={n.id + k}>
          <circle cx={x} cy={y} r="5" fill="none" stroke={n.color} strokeWidth="1.6" className="anim-ring" />
          <circle cx={x} cy={y} r="5" fill={n.color} stroke="#fff" strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 5px ${n.color})` }} />
        </g>
      )))}
    </svg>
  )
}

export function BodyScanner2D({ os }) {
  const { bio, sleepH, tunnel, daily, tons, planTons, weight } = os
  const warn = daily.jointPain >= 4 || (!daily.joker && planTons > 9000)
  const nodes = [
    { id: 'kopf', icon: 'head', color: COLORS.cyan, title: 'KOPF', sub: 'Schlaf & mentale Erholung', metric: `${Math.round(bio.score)} %`, pins: [[100, 34]] },
    { id: 'herz', icon: 'heart', color: COLORS.crimson, title: 'HERZ', sub: 'HRV · Puls', metric: `${Math.round(bio.rhr)} bpm`, pins: [[112, 98]] },
    { id: 'core', icon: 'core', color: COLORS.magenta, title: 'CORE', sub: 'Defizit & Lipid-Tempo', metric: `−${fmt(tunnel.deficit)}`, pins: [[100, 160]] },
    { id: 'gelenke', icon: 'joint', color: warn ? COLORS.amber : COLORS.yellow, title: 'GELENKE', sub: 'Belastung & Regeneration', metric: `${fmt(tons / 1000, 1)} t`, pins: [[82, 304], [118, 304]] },
  ]
  return (
    <Glass title="Body Scanner 2D" aside={`${fmt(weight, 1)} kg`}>
      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {nodes.map((n) => (
            <div key={n.id} className="flex items-center gap-2.5">
              <span className="grid size-11 flex-none place-items-center rounded-full border-2" style={{ color: n.color, borderColor: n.color, background: `${n.color}1a`, boxShadow: `0 0 14px ${n.color}55` }}><Icon name={n.icon} /></span>
              <span className="flex min-w-0 flex-col leading-tight"><b className="mono text-[11px] tracking-[.12em] text-white">{n.title}</b><span className="text-[10px] text-white/60">{n.sub}</span><span className="mono text-[11px] font-semibold" style={{ color: n.color }}>{n.metric}</span></span>
            </div>
          ))}
        </div>
        <div className="w-[42%] flex-none"><Figure nodes={nodes} /></div>
      </div>
    </Glass>
  )
}

export function BodyComposition({ os }) {
  const { weight, target, mission, bf, measure } = os
  return (
    <Glass title="Gewicht & Körperzusammensetzung" accent={COLORS.cyan}>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Aktuell" value={`${fmt(weight, 1)} kg`} color={COLORS.cyan} />
        <Tile label="Ziel" value={`${fmt(target, 1)} kg`} />
        <Tile label="Differenz" value={`−${fmt(mission.remaining, 1)} kg`} color={COLORS.emerald} />
      </div>
      <div className="flex flex-col gap-1"><Bar pct={mission.pct * 100} color={COLORS.cyan} h={6} /><div className="mono flex justify-between text-[10px] text-white/55"><span>{fmt(mission.pct * 100, 0)} %</span><span>100 %</span></div></div>
      <div className="grid grid-cols-4 gap-2">
        <Tile label="Taille" value={`${measure.waist} cm`} />
        <Tile label="KFA (geschätzt)" value={`${fmt(bf.use, 1)} %`} color={COLORS.yellow} />
        <Tile label="Fettmasse" value={`${fmt(bf.fatKg, 1)} kg`} color={COLORS.amber} />
        <Tile label="Magermasse" value={`${fmt(bf.leanKg, 1)} kg`} color={COLORS.emerald} />
      </div>
    </Glass>
  )
}

export function KfaTabs({ os }) {
  const { bf, measure, actions } = os
  const [tab, setTab] = useState('waist')
  const tabs = [['waist', 'Bauch (Nabel)'], ['bf', 'Körperfett (geschätzt)'], ['fat', 'Fettmasse']]
  return (
    <Glass title="KFA-Rechner" source="MODELL" accent={COLORS.yellow}>
      <div className="grid grid-cols-3 gap-1.5">{tabs.map(([k, l]) => <Btn key={k} active={tab === k} color={COLORS.cyan} onClick={() => setTab(k)} className="!px-1 !py-1 !text-[10px]">{l}</Btn>)}</div>
      {tab === 'waist' && <div className="flex gap-2"><Field label="Bauchumfang" unit="cm" value={measure.waist} onChange={(v) => actions.setMeasure({ waist: parseFloat(v) || 0 })} /><Field label="Nacken" unit="cm" value={measure.neck} onChange={(v) => actions.setMeasure({ neck: parseFloat(v) || 0 })} /></div>}
      {tab === 'bf' && <div className="grid grid-cols-2 gap-2"><Tile label="Navy-Formel" value={Number.isFinite(bf.navy) ? `${fmt(bf.navy, 1)} %` : '–'} color={COLORS.cyan} /><Tile label="Deurenberg" value={`${fmt(bf.deu, 1)} %`} color={COLORS.magenta} /></div>}
      {tab === 'fat' && <div className="grid grid-cols-2 gap-2"><Tile label="Fettmasse" value={`${fmt(bf.fatKg, 1)} kg`} color={COLORS.amber} /><Tile label="Magermasse" value={`${fmt(bf.leanKg, 1)} kg`} color={COLORS.emerald} /></div>}
      <div className="mono flex items-end justify-between text-white"><b className="text-lg">{measure.waist} cm</b><b className="text-lg text-yellow">{fmt(bf.use, 1)} %</b><b className="text-lg text-amber">{fmt(bf.fatKg, 1)} kg</b></div>
      <KfaGauge kfa={bf.use} />
    </Glass>
  )
}

export function PhasePlan({ os }) {
  const kg = (p) => p.from - p.to
  return (
    <Glass title={`Ziel-Phasenplan (−${Math.round(os.mission.total)} kg)`} accent={COLORS.emerald}>
      <div className="flex flex-col gap-2">
        {PHASES.map((p) => (
          <div key={p.n} className="flex items-center gap-2.5 text-xs">
            <i className="size-3 flex-none rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
            <span className="flex-1 truncate text-white/85">Phase {p.n} – {p.short}</span>
            <span className="mono text-white/70">−{kg(p)} kg</span>
            <span className="mono w-24 text-right text-[10px] text-white/50">{p.dates}</span>
          </div>
        ))}
      </div>
    </Glass>
  )
}

/* ── Mitte oben ── */
export function TodayCards({ os }) {
  const { daily, todaysWorkouts, blocks, now, whoopCrossfit, whoop } = os
  const wk = now.getDay() >= 1 && now.getDay() <= 5
  const cfDone = daily.crossfit || whoopCrossfit
  const next = blocks.find((b) => !b.done && !b.missed && !b.swim) ?? null
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Glass accent={COLORS.amber} className="!gap-1">
        <div className="flex items-center gap-3">
          <span className="text-amber"><Icon name="dumbbell" size={30} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="mono text-[11px] font-bold tracking-[.1em] text-white">HEUTE: CROSSFIT IRON RAID</div>
            <div className="text-[11px] text-white/65">12:00 – 13:00 {todaysWorkouts.length > 0 && whoopCrossfit && <span className="text-emerald">· ERKANNT{whoop.test ? ' (TEST-MCP)' : ''}</span>}</div>
          </div>
          <Btn color={COLORS.emerald} active={cfDone} onClick={os.actions.toggleCrossfit} disabled={whoopCrossfit} className="!px-2 !py-1 !text-[11px]">{!wk && !cfDone ? 'Frei' : cfDone ? '✓ Erledigt' : 'Erledigt?'}</Btn>
        </div>
      </Glass>
      <Glass accent={COLORS.cyan} className="!gap-1">
        <div className="flex items-center gap-3">
          <span className="text-cyan"><Icon name="walk" size={30} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[10px] text-white/55">Nächster Block</div>
            <div className="text-sm font-semibold text-white">{next ? next.name : 'Alle Blöcke erledigt'}</div>
            {next && <div className="mono text-[11px] text-white/65">{next.time}</div>}
          </div>
          {next && <span className="mono rounded-md border border-amber/60 bg-amber/10 px-2 py-0.5 text-[10px] font-bold text-amber">OFFEN</span>}
        </div>
      </Glass>
    </div>
  )
}

export function MissionPanel({ os }) {
  const { model, weight, target, actions, mission } = os
  const [edit, setEdit] = useState(false)
  const [txt, setTxt] = useState('')
  const save = () => { actions.setTarget(parseFloat(txt.replace(',', '.'))); setEdit(false) }
  return (
    <Glass accent={COLORS.cyan}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mono text-2xl font-bold tracking-[.06em] text-cyan" style={{ textShadow: '0 0 14px rgba(0,240,255,.55)' }}>MISSION {Math.round(target)} — DER TÄGLICHE WEG VON {fmt(weight, 1)} AUF {fmt(target, 1)} KG</h2>
          <p className="text-sm text-white/75">{fmt(mission.remaining, 1)} kg weniger bis Silvester ({model.days} Tage). Klarer Plan. Tägliche Umsetzung. Messbarer Fortschritt.</p>
        </div>
        {edit
          ? <span className="flex items-end gap-2"><Field label="Zielgewicht" unit="kg" value={txt} onChange={setTxt} step="0.5" onKeyDown={(e) => e.key === 'Enter' && save()} /><Btn color={COLORS.emerald} active onClick={save}>OK</Btn></span>
          : <Btn onClick={() => { setTxt(String(target)); setEdit(true) }} className="mono !text-[11px] tracking-wider">ZIEL ANPASSEN</Btn>}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="mono mb-1 text-[11px] font-bold tracking-[.12em] text-cyan">RECHENMODELL (STATIONÄR, VEREINFACHT)</div>
          <p className="mono text-xs leading-relaxed text-white/85">{fmt(model.kg, 1)} kg × 7.000 kcal/kg = {fmt(model.kcal)} kcal<br />{fmt(model.kcal)} kcal / {model.days} Tage ≈ <b className="text-cyan">{fmt(model.perDay)} kcal/Tag</b><br />≈ {fmt(model.perWeek, 2)} kg pro Woche (theoretisch)</p>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-snug text-white/70">
          <span className="mono grid size-5 flex-none place-items-center rounded-full border border-cyan/60 text-[11px] text-cyan">i</span>
          Statisches Rechenmodell · realer Verlauf durch Stoffwechselanpassung, Ernährung und Aktivitätsmessung variabel · Kein Garant für Fettverlust · 7-Tage-Trend prüfen.
        </div>
      </div>
    </Glass>
  )
}

/* ── Prognose + 7-Tage-Trend ── */
export function ForecastPanel({ os }) {
  const { forecast, weight, target } = os
  const data = forecast.rows.map((r) => ({ ...r, band: [r.lo, r.hi] }))
  const diff = weight - target
  return (
    <Glass title="Prognose: Gewichtsverlauf" source="MODELL" aside={`Ziel ${fmt(target, 1)} kg · 31.12.`} accent={COLORS.cyan}>
      <div className="flex gap-3">
        <div className="h-36 min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} domain={[Math.floor(target - 2), 'dataMax + 2']} />
              <Tooltip {...tip} formatter={(v, n) => (Array.isArray(v) ? [`${fmt(v[0], 1)}–${fmt(v[1], 1)} kg`, 'Korridor'] : [`${fmt(v, 1)} kg`, n])} />
              <Area dataKey="band" stroke="none" fill="rgba(255,255,255,.1)" name="Korridor" isAnimationActive={false} />
              <Line dataKey="soll" stroke={COLORS.magenta} strokeDasharray="5 4" strokeWidth={2} dot={false} name="SOLL-Pfad" isAnimationActive={false} />
              <Line dataKey="ist" stroke={COLORS.cyan} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.cyan }} name="IST-Projektion" isAnimationActive={false} />
              <ReferenceLine y={target} stroke="#fff" strokeDasharray="3 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="grid w-60 flex-none grid-cols-2 content-start gap-1.5">
          <Tile label="Aktuell" value={`${fmt(weight, 1)} kg`} color={COLORS.cyan} />
          <Tile label="Ziel" value={`${fmt(target, 1)} kg`} />
          <Tile label="Differenz" value={`−${fmt(Math.max(0, diff), 1)} kg`} color={COLORS.emerald} />
          <Tile label="Prognose 31.12." value={`${fmt(forecast.endIst, 1)} kg`} color={COLORS.yellow} />
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 text-[11px] text-white/70"><span><i className="mr-1.5 inline-block h-0.5 w-5 align-middle" style={{ background: COLORS.cyan }} />IST (Projektion)</span><span><i className="mr-1.5 inline-block w-5 border-t-2 border-dashed align-middle" style={{ borderColor: COLORS.magenta }} />SOLL-Pfad (Modell)</span><span><i className="mr-1.5 inline-block size-2.5 rounded-sm bg-white/20 align-middle" />Unsicherheitskorridor</span></p>
    </Glass>
  )
}

export function WeekTrend({ os }) {
  const { trend, forecast, weight } = os
  const ck = { ok: COLORS.emerald, warn: COLORS.amber, bad: COLORS.crimson }[forecast.check.key]
  const d = trend.delta
  return (
    <Glass title="7-Tage-Trend" source={trend.points > 1 ? 'MANUELL' : 'DEMO'} accent={COLORS.magenta}>
      <div className="flex items-end justify-between gap-2">
        <div><div className="mono text-3xl font-bold text-white">{fmt(weight, 1)} kg</div><div className="text-[10px] text-white/55">Ø 7 Tage {fmt(trend.avg, 1)} kg</div></div>
        <div className="mono text-right text-sm font-bold" style={{ color: d == null ? COLORS.dim : d <= 0 ? COLORS.emerald : COLORS.amber }}>{d == null ? 'zu wenig Daten' : `${d <= 0 ? '▼ −' : '▲ +'}${fmt(Math.abs(d), 1)} kg`}<div className="text-[10px] font-normal text-white/55">vs. Wochenanfang</div></div>
      </div>
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.series} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
            <XAxis dataKey="day" {...axis} interval={0} /><YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
            <Line dataKey="kg" stroke={COLORS.magenta} strokeWidth={2} dot={{ r: 2.5, fill: COLORS.magenta }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: ck, color: ck }}><b className="mono tracking-wider">WOCHEN-CHECK-IN</b><div className="text-white/80"><b style={{ color: ck }}>{forecast.check.text}</b> · {forecast.check.sub}</div></div>
    </Glass>
  )
}

/* ── Bewegungs-Blöcke als Tabelle ── */
export function BlocksTable({ os }) {
  const { blocks, activeKcal, actions } = os
  const kcal = (steps) => Math.round((steps * activeKcal) / PROFILE.stepTarget)
  return (
    <Glass title="Bewegungs-Blöcke (Tagesplan)" aside={`Σ ${fmt(os.plan.target)} Schritte`} accent={COLORS.cyan}>
      <div className="flex flex-col divide-y divide-white/10">
        {blocks.map((b) => {
          const st = b.swim ? (b.done ? ['SWIM ✓', COLORS.royal] : ['SWIM', COLORS.royal]) : b.missed ? ['VERPASST', COLORS.crimson] : b.done ? ['ERLEDIGT', COLORS.emerald] : b.added > 0 ? ['KOMPENSATION', COLORS.amber] : ['OFFEN', COLORS.amber]
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs">
              <span style={{ color: b.added > 0 && !b.done ? COLORS.amber : COLORS.cyan }}><Icon name="walk" size={20} /></span>
              <b className="w-56 text-white">{b.label} – {b.name}</b>
              <span className="mono w-40 text-white/65">{b.time}</span>
              <span className="mono min-w-[260px] flex-1 text-white/85">{b.swim ? '45 Min Pool · 0 Stoßbelastung' : b.missed ? '0 Schritte' : `${fmt(b.taken)} / ${fmt(b.eff)} Schritte`} | ~{fmt(kcal(b.swim ? 0 : b.eff))} kcal (Ziel){b.added > 0 && !b.missed && <span className="ml-2 font-bold text-amber">[ +{fmt(b.added)} EXTRA-SCHRITTE ANPASSUNG ]</span>}</span>
              <span className="mono w-28 rounded-md border px-2 py-1 text-center text-[11px] font-bold" style={{ color: st[1], borderColor: `${st[1]}77`, background: `${st[1]}14` }}>{st[0]}</span>
              <span className="flex gap-1.5">
                {b.swim ? <Btn color={COLORS.royal} active={b.done} onClick={actions.toggleSwim} className="!px-2 !py-1 !text-[11px]">Swim</Btn> : <Btn color={COLORS.emerald} active={b.done} onClick={() => actions.toggleDone(b.i)} className="!px-2 !py-1 !text-[11px]">Erledigt</Btn>}
                {!b.swim && <Btn color={COLORS.crimson} active={b.missed} onClick={() => actions.toggleMissed(b.i)} className="!px-2 !py-1 !text-[11px]">{b.missed ? 'Wiederherstellen' : 'Verpasst'}</Btn>}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-white/45">+ 10.000 Alltagsschritte (nicht umverteilbar). S_neu = S_basis + ΔS / N_offen.</p>
    </Glass>
  )
}
