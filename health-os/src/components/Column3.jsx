import { Area, Bar as RBar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, PROFILE } from '../lib/constants.js'
import { fmt, clamp } from '../lib/calc.js'
import { Glass, Ring, Tile } from './ui.jsx'

const tip = { contentStyle: { background: 'rgba(8,12,20,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#fff' } }
const axis = { stroke: 'rgba(235,240,255,.55)', fontSize: 11, tickLine: false, axisLine: false }

export function WhoopWidget({ os, compact = false }) {
  const { bio, sleepH, steps, plan, whoop, demo, live } = os
  const rd = bio.score
  const rdColor = rd >= 67 ? COLORS.emerald : rd >= 34 ? COLORS.amber : COLORS.crimson
  const hrv = bio.hrvSeries.map((v, i) => ({ i, v }))
  return (
    <Glass title="Whoop Biometrie" source={os.sourceLabel} accent={COLORS.emerald}>
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <Ring size={compact ? 118 : 150} stroke={compact ? 9 : 11} segments={[{ frac: 1, fill: rd / 100, color: rdColor }]}>
            <div className="leading-none"><div className="mono text-3xl font-bold" style={{ color: rdColor }}>{Math.round(rd)}%</div><div className="mt-1 text-[10px] tracking-widest text-white/65">ERHOLUNG</div></div>
          </Ring>
        </div>
        <div className="flex min-w-[150px] flex-1 flex-col gap-2 text-xs">
          <Mini label="Erholung" pct={rd} color={rdColor} />
          <Mini label={`Schlaf ${fmt(sleepH, 1)} Std`} pct={(sleepH / 8) * 100} color={COLORS.royal} />
          <Mini label="Bewegung" pct={(steps / plan.target) * 100} color={COLORS.cyan} />
        </div>
      </div>
      <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Tile label="HRV" value={`${Math.round(bio.hrv)} ms`} color={COLORS.emerald} />
        <Tile label="Ruhepuls" value={`${Math.round(bio.rhr)} bpm`} color={COLORS.crimson} />
        <Tile label="SpO₂" value={`${Math.round(bio.spo2)} %`} color={COLORS.cyan} />
        <Tile label="Atemfrequenz" value={`${fmt(bio.resp, 1)} A/min`} color={COLORS.magenta} />
      </div>
      <div className={compact ? 'h-9' : 'h-14'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hrv} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
            <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
            <Line type="monotone" dataKey="v" stroke={COLORS.emerald} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Tooltip {...tip} formatter={(v) => [`${Math.round(v)} ms`, 'HRV']} labelFormatter={() => 'HRV-Verlauf'} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {whoop.status !== 'connected' && <p className="text-[11px] text-amber">Whoop-MCP offline – es werden {demo ? 'Demo-Werte' : 'zuletzt gespeicherte Werte'} angezeigt.</p>}
    </Glass>
  )
}

const Mini = ({ label, pct, color }) => (
  <div className="flex flex-col gap-1">
    <span className="text-white/75">{label}</span>
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${clamp(pct, 0, 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }} /></div>
  </div>
)

export function SleepChart({ os, compact = false }) {
  const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const data = os.nights.map((n, i, a) => ({
    label: i === a.length - 1 ? 'Heute' : DOW[new Date(n.date).getDay()],
    Tief: +n.deep.toFixed(2), REM: +n.rem.toFixed(2), Leicht: +n.light.toFixed(2),
  }))
  const debt = Math.round(os.nights.reduce((a, n) => a + Math.max(0, 7 - n.total), 0) * 60)
  return (
    <Glass title="Schlaf-Architektur" source={os.sourceLabel} aside={`Schlafschuld ${debt} Min`} accent={COLORS.royal}>
      <div className={compact ? 'h-32' : 'h-44'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} unit="h" />
            <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v) => `${fmt(v, 1)} Std`} />
            <RBar isAnimationActive={false} dataKey="Tief" stackId="s" fill={COLORS.royal} />
            <RBar isAnimationActive={false} dataKey="REM" stackId="s" fill={COLORS.magenta} />
            <RBar isAnimationActive={false} dataKey="Leicht" stackId="s" fill="rgba(0,240,255,.55)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[['Tief', COLORS.royal], ['REM', COLORS.magenta], ['Leicht', 'rgba(0,240,255,.7)']]} />
    </Glass>
  )
}

const Legend = ({ items }) => (
  <div className="flex flex-wrap gap-4 text-[11px] text-white/75">
    {items.map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
  </div>
)

export function NetTunnel({ os, compact = false }) {
  const { tunnel, activeKcal, actions, dayN } = os
  const data = tunnel.rows.map((r) => ({ ...r, floor: r.intake, net: r.tdee - r.intake }))
  const todayLabel = data[clamp(dayN - 1, 0, 84)].label
  return (
    <Glass title="Kalorien-Netto-Tunnel" source="MODELL" aside={`Netto −${fmt(tunnel.deficit)} kcal/Tag`} accent={COLORS.cyan}>
      <div className={compact ? 'h-36' : 'h-64'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="rgba(0,255,102,.10)" /><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,255,102,.55)" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={20} />
            <YAxis yAxisId="k" {...axis} domain={[0, 5000]} tickFormatter={(v) => fmt(v)} />
            <YAxis yAxisId="m" orientation="right" {...axis} domain={[90, 134]} ticks={[90, 95, 108, 120, 132]} unit="" />
            <Tooltip {...tip} formatter={(v, n) => (n === 'Masse' ? [`${fmt(v, 1)} kg`, n] : n === 'Netto-Defizit' ? [`−${fmt(v)} kcal`, n] : [`${fmt(v)} kcal`, n])} />
            <Area yAxisId="k" dataKey="floor" stackId="t" stroke="none" fill="transparent" name="Basis" legendType="none" activeDot={false} isAnimationActive={false} />
            <Area yAxisId="k" dataKey="net" stackId="t" stroke="none" fill="url(#hatch)" name="Netto-Defizit" isAnimationActive={false} />
            <Line yAxisId="k" dataKey="tdee" stroke={COLORS.crimson} strokeWidth={2} dot={false} name="TDEE" type="stepAfter" isAnimationActive={false} />
            <Line yAxisId="k" dataKey="intake" stroke={COLORS.cyan} strokeWidth={2} dot={false} name="Intake-Limit" isAnimationActive={false} />
            <Line yAxisId="m" dataKey="mass" stroke="#fff" strokeWidth={2.5} dot={false} name="Masse" isAnimationActive={false} />
            <ReferenceLine yAxisId="m" y={PROFILE.targetKg} stroke="#fff" strokeDasharray="4 4" label={{ value: '90,0 kg · Silvester', fill: '#fff', fontSize: 10, position: 'insideBottomRight' }} />
            <ReferenceLine yAxisId="k" x={todayLabel} stroke={COLORS.amber} strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[['TDEE (~4.200)', COLORS.crimson], ['Intake 1.400', COLORS.cyan], ['Netto-Defizit', COLORS.emerald], ['Massekurve → 90 kg', '#fff']]} />
      <label className="flex flex-col gap-1 text-xs text-white/75">
        Aktivverbrauch: {fmt(activeKcal)} kcal → TDEE {fmt(tunnel.tdee)} kcal
        <input type="range" min={1000} max={3200} step={50} value={activeKcal} onChange={(e) => actions.setActiveKcal(+e.target.value)} />
      </label>
    </Glass>
  )
}

export default function Column3({ os }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <WhoopWidget os={os} />
      <SleepChart os={os} />
      <NetTunnel os={os} />
    </div>
  )
}
