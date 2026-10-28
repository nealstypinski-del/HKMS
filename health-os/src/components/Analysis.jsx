import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, PROFILE } from '../lib/constants.js'
import { fmt, estimateHypnogram } from '../lib/calc.js'
import { Glass, Bar, Btn, Field, Ring, Tile } from './ui.jsx'

const tip = { contentStyle: { background: 'rgba(8,12,20,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#fff' } }
const axis = { stroke: 'rgba(235,240,255,.55)', fontSize: 11, tickLine: false, axisLine: false }

export function MissionBar({ os }) {
  const m = os.mission
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      <div className="mono flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
        <span className="whitespace-nowrap text-xs font-bold tracking-wider text-white">{fmt(m.total)} KG MISSION</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${m.pct * 100}%`, background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.emerald})`, boxShadow: `0 0 10px ${COLORS.emerald}` }} /></div>
        <span className="text-xs text-white/65">{fmt(m.pct * 100, 0)} %</span>
      </div>
      {[[`−${fmt(m.lost, 1)} kg`, 'VERLOREN', COLORS.emerald], [`${fmt(m.remaining, 1)} kg`, 'VERBLEIBEND', COLORS.cyan], [`${m.daysLeft} Tage`, 'BIS SILVESTER', COLORS.amber]].map(([v, l, c]) => (
        <div key={l} className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-center leading-tight">
          <div className="mono text-sm font-bold" style={{ color: c }}>{v}</div><div className="text-[9px] tracking-[.14em] text-white/55">{l}</div>
        </div>
      ))}
    </div>
  )
}

export function TodayOnTrack({ os }) {
  const t = os.onTrack
  const color = t.pct >= 1 ? COLORS.emerald : t.pct >= 0.6 ? COLORS.cyan : COLORS.amber
  return (
    <Glass title="Heute im Soll?" source="MODELL" aside={os.now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })} accent={COLORS.yellow}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
            <div className="h-full" style={{ width: `${Math.min(100, (t.move / t.goal) * 100)}%`, background: COLORS.emerald, boxShadow: `0 0 10px ${COLORS.emerald}` }} />
            <div className="h-full" style={{ width: `${Math.min(100 - Math.min(100, (t.move / t.goal) * 100), (t.food / t.goal) * 100)}%`, background: COLORS.royal }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Tile label="Bewegung (Walk + Training)" value={`≈ ${fmt(t.move)} kcal`} color={COLORS.emerald} />
            <Tile label="Ernährung (Grundumsatz − Intake)" value={`≈ ${fmt(t.food)} kcal`} color={COLORS.royal} />
          </div>
        </div>
        <div className="rounded-2xl border px-4 py-3 text-center" style={{ borderColor: color, boxShadow: `0 0 20px ${color}33` }}>
          <div className="text-[10px] tracking-[.14em] text-white/65">MODELLZIEL</div>
          <div className="mono text-2xl font-bold" style={{ color }}>≈ {fmt(t.goal)} kcal</div>
          <div className="text-[11px] text-white/65">Tagesdefizit · {fmt(Math.min(150, t.pct * 100), 0)} % erreicht</div>
        </div>
      </div>
    </Glass>
  )
}

export function Forecast({ os }) {
  const { forecast } = os
  const data = forecast.rows.map((r) => ({ ...r, band: [r.lo, r.hi] }))
  const ck = { ok: COLORS.emerald, warn: COLORS.amber, bad: COLORS.crimson }[forecast.check.key]
  return (
    <Glass title="Prognose Gewichtsverlauf" source="MODELL" aside={`Ziel ${fmt(PROFILE.targetKg, 1)} kg · 31.12.`} accent={COLORS.cyan}>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} domain={[88, 'dataMax + 2']} unit="" />
            <Tooltip {...tip} formatter={(v, n) => (Array.isArray(v) ? [`${fmt(v[0], 1)}–${fmt(v[1], 1)} kg`, 'Korridor'] : [`${fmt(v, 1)} kg`, n])} />
            <Area dataKey="band" stroke="none" fill="rgba(255,255,255,.1)" name="Korridor" isAnimationActive={false} />
            <Line dataKey="soll" stroke={COLORS.magenta} strokeDasharray="5 4" strokeWidth={2} dot={false} name="SOLL-Pfad" isAnimationActive={false} />
            <Line dataKey="ist" stroke={COLORS.cyan} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.cyan }} name="IST-Projektion" isAnimationActive={false} />
            <ReferenceLine y={PROFILE.targetKg} stroke="#fff" strokeDasharray="3 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-[11px] text-white/75"><i className="h-0.5 w-5" style={{ background: COLORS.cyan }} />IST (Projektion bei aktuellem Defizit)<i className="h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: COLORS.magenta }} />SOLL</span>
        <span className="rounded-xl border px-3 py-1.5 text-xs" style={{ borderColor: ck, color: ck }}><b>Wochen-Check-in: {forecast.check.text}</b> · {forecast.check.sub}</span>
      </div>
      <p className="text-[10px] text-white/40">Statisches Rechenmodell (7.000 kcal/kg); realer Verlauf variiert durch Stoffwechselanpassung, Wasser und Messung. Kein Garant.</p>
    </Glass>
  )
}

export function WalkCalc({ os }) {
  return (
    <Glass title="Spaziergang-Kalkulation" source="MODELL" accent={COLORS.emerald}>
      <table className="mono w-full text-xs">
        <thead><tr className="text-left text-white/55"><th className="pb-1 font-medium">Zeit</th><th className="pb-1 font-medium">Schritte</th><th className="pb-1 text-right font-medium">Verbrauch</th></tr></thead>
        <tbody>
          {os.walkTable.map((r) => (
            <tr key={r.min} className="border-t border-white/10"><td className="py-1.5">{r.min} Min</td><td>{fmt(r.steps)}</td><td className="text-right font-bold text-emerald">≈ {fmt(r.kcal)} kcal</td></tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-white/40">Annahme: 107 Schritte/Min, Verbrauch = Aktiv-kcal ({fmt(os.activeKcal)}) / 30.000 Schritte. Nicht gemessen, individuell variabel.</p>
    </Glass>
  )
}

const STAGE = { Tief: COLORS.royal, REM: COLORS.magenta, Leicht: 'rgba(0,240,255,.6)' }
const LEVEL = { Tief: 3, Leicht: 2, REM: 1 }
export function Hypnogram({ os }) {
  const night = os.nights.at(-1)
  const segs = estimateHypnogram(night)
  const total = segs.reduce((a, s) => a + s.h, 0)
  const end = new Date(night.date)
  const start = new Date(end.getTime() - total * 36e5)
  const hm = (d) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  let x = 0
  const share = (k) => Math.round((night[k] / (night.total || 1)) * 100)
  return (
    <Glass title="Schlaf-Hypnogramm" source="GESCHÄTZT" aside={`${fmt(total, 1)} Std · ${hm(start)} – ${hm(end)}`} accent={COLORS.royal}>
      <svg viewBox="0 0 400 90" className="h-24 w-full" role="img" aria-label="Geschätztes Hypnogramm">
        {segs.map((s, i) => {
          const w = (s.h / total) * 400, y = (LEVEL[s.stage] - 1) * 28 + 4
          const el = <rect key={i} x={x} y={y} width={Math.max(0.8, w - 0.6)} height="22" rx="3" fill={STAGE[s.stage]} />
          x += w
          return el
        })}
      </svg>
      <div className="flex flex-wrap gap-4 text-[11px] text-white/75">
        {[['Tief', 'deep'], ['REM', 'rem'], ['Leicht', 'light']].map(([l, k]) => <span key={l} className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: STAGE[l] }} />{l} ({share(k)} %)</span>)}
      </div>
      <p className="text-[10px] text-white/40">Verlauf aus den Whoop-Phasensummen modelliert (typische 5 Zyklen) – keine gemessene Zeitreihe.</p>
    </Glass>
  )
}

export function Macros({ os }) {
  const { macros, daily, actions } = os
  const { goals, now } = macros
  const kc = daily.kcal, over = kc > PROFILE.kcalCeiling
  const col = over ? COLORS.crimson : kc > 1200 ? COLORS.amber : COLORS.emerald
  const rows = [['Protein', now.protein, goals.protein, COLORS.cyan, '≥'], ['Kohlenhydrate', now.carbs, goals.carbs, COLORS.amber, '≤'], ['Fett', now.fat, goals.fat, COLORS.magenta, '≤']]
  const submit = (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget), n = (k) => Math.max(0, parseFloat(String(f.get(k)).replace(',', '.')) || 0)
    const m = { name: String(f.get('name') || 'Mahlzeit'), kcal: n('kcal'), protein: n('protein'), carbs: n('carbs'), fat: n('fat') }
    if (m.kcal > 0) { actions.logMeal(m); e.currentTarget.reset() }
  }
  return (
    <Glass title="Makros" source="MANUELL" aside={`Limit ${fmt(PROFILE.kcalCeiling)} kcal`} accent={COLORS.magenta}>
      <div className="flex items-center gap-4">
        <Ring size={118} stroke={10} segments={[{ frac: 1, fill: Math.min(1, kc / PROFILE.kcalCeiling), color: col }]}>
          <div className="leading-tight"><div className="mono text-2xl font-bold">{fmt(kc)}</div><div className="mono text-[10px] text-white/60">/ {fmt(PROFILE.kcalCeiling)} kcal</div></div>
        </Ring>
        <div className="flex flex-1 flex-col gap-2">
          {rows.map(([l, v, g, c, op]) => (
            <div key={l} className="flex flex-col gap-1"><div className="mono flex justify-between text-[11px]"><span style={{ color: c }}>{l}</span><span className="text-white/75">{fmt(v)} / {op === '≥' ? '' : '≤ '}{g} g</span></div><Bar pct={(v / g) * 100} color={op === '≤' && v > g ? COLORS.crimson : c} h={5} /></div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
        <div className="flex gap-2"><input name="name" placeholder="Mahlzeit (z. B. Skyr + Whey)" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-cyan" /></div>
        <div className="flex gap-2">
          {[['kcal', 'kcal'], ['protein', 'P g'], ['carbs', 'C g'], ['fat', 'F g']].map(([k, ph]) => <input key={k} name={k} type="number" step="any" min="0" placeholder={ph} className="mono w-full min-w-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-cyan" />)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" color={COLORS.emerald} active className="!py-1.5 !text-xs">Mahlzeit loggen</Btn>
          <Btn onClick={actions.undoMeal} className="!py-1.5 !text-xs">Letzte zurück</Btn>
          <Btn disabled className="!py-1.5 !text-xs opacity-50" title="Foto-Analyse folgt mit der KI-Anbindung">Nährwert-Scan · bald</Btn>
          <Btn disabled className="!py-1.5 !text-xs opacity-50" title="KI-Tagesplan folgt mit der KI-Anbindung">Tagesplan (KI) · bald</Btn>
        </div>
        {daily.meals.length > 0 && <p className="mono truncate text-[10px] text-white/55">Zuletzt: {daily.meals.at(-1).name} · {fmt(daily.meals.at(-1).kcal)} kcal</p>}
      </form>
    </Glass>
  )
}
