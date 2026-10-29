import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, PROFILE } from '../lib/constants.js'
import { dayKey, fmt } from '../lib/calc.js'
import { GOALS, average, lastNDays } from '../lib/history.js'
import { Glass } from '../components/ui.jsx'
import { axis, dm, Empty, Kpi, tip, ViewMain } from './shared.jsx'

const N = 90

export function HistoryView({ os }) {
  const data = useMemo(() => {
    const soll = Object.fromEntries(os.tunnel.rows.map((r) => [dayKey(new Date(PROFILE.startDate.getTime() + r.d * 864e5)), r.mass]))
    return lastNDays(os.days, N, os.now).map((r) => ({ ...r, label: dm(r.d), soll: soll[r.date] ?? null, weight: r.weight ?? null, steps: r.steps ?? null, hrv: r.hrv ?? null, recovery: r.recovery ?? null, sleepH: r.sleepH ?? null, kcal: r.kcal || null }))
  }, [os.days, os.tunnel, os.now])
  const last7 = data.slice(-7)
  const w30 = data.slice(-30).map((d) => d.weight).filter((v) => v != null)
  const dW = w30.length > 1 ? w30.at(-1) - w30[0] : null
  const filled = data.filter((d) => d.steps != null || d.hrv != null || d.weight != null).length
  const sourceOf = (k) => (k === 'steps' ? os.stepSource : os.sourceLabel)
  const xt = { ...axis, interval: 13 }

  return (
    <ViewMain className="grid-cols-1">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Ø SCHRITTE 7 T" value={fmt(average(last7.map((d) => d.steps)) ?? 0)} color={COLORS.cyan} />
        <Kpi label="Ø SCHLAF 7 T" value={`${fmt(average(last7.map((d) => d.sleepH)) ?? 0, 1)} Std`} color={COLORS.royal} />
        <Kpi label="Ø HRV 7 T" value={`${fmt(average(last7.map((d) => d.hrv)) ?? 0)} ms`} color={COLORS.emerald} />
        <Kpi label="GEWICHT 30 T" value={dW == null ? '–' : `${dW <= 0 ? '−' : '+'}${fmt(Math.abs(dW), 1)} kg`} color={dW != null && dW <= 0 ? COLORS.emerald : COLORS.amber} />
        <Kpi label="STREAK" value={`${os.streakN} Tage`} color={COLORS.amber} sub="≥ 80 % Schritte + ≤ 1.400 kcal" />
        <Kpi label="TAGE ERFASST" value={`${filled} / ${N}`} color={COLORS.magenta} />
      </div>
      {filled < 2 && <Empty>Noch wenig Verlauf: Mit jedem Tag füllt sich diese Ansicht. Whoop-Verlauf (Erholung, HRV, Schlaf) wird beim Verbinden rückwirkend geladen.</Empty>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Glass title="Gewicht vs. SOLL-Pfad" source="MANUELL" aside="kg" accent={COLORS.cyan}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} /><YAxis {...axis} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip {...tip} formatter={(v, n) => [`${fmt(v, 1)} kg`, n]} />
              <Line dataKey="soll" name="SOLL" stroke={COLORS.magenta} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              <Line dataKey="weight" name="Gewicht" stroke={COLORS.cyan} strokeWidth={2.5} dot={{ r: 2.5, fill: COLORS.cyan }} connectNulls isAnimationActive={false} />
              <ReferenceLine y={os.target} stroke="#fff" strokeDasharray="3 4" />
            </ComposedChart></ResponsiveContainer></div>
        </Glass>
        <Glass title="Schritte pro Tag" source={sourceOf('steps')} aside="Ziel 30.000" accent={COLORS.emerald}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} /><YAxis {...axis} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v) => [fmt(v), 'Schritte']} />
              <ReferenceLine y={GOALS.steps} stroke="#fff" strokeDasharray="3 4" />
              <Bar dataKey="steps" isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={(d.steps ?? 0) >= GOALS.stepsStreak ? COLORS.emerald : COLORS.cyan} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
        </Glass>
        <Glass title="HRV & Erholung" source={os.sourceLabel} aside="Whoop" accent={COLORS.emerald}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} />
              <YAxis yAxisId="h" {...axis} /><YAxis yAxisId="r" orientation="right" {...axis} domain={[0, 100]} />
              <Tooltip {...tip} />
              <Line yAxisId="h" dataKey="hrv" name="HRV (ms)" stroke={COLORS.emerald} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              <Line yAxisId="r" dataKey="recovery" name="Erholung (%)" stroke={COLORS.amber} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </ComposedChart></ResponsiveContainer></div>
        </Glass>
        <Glass title="Schlaf" source={os.sourceLabel} aside="Ziel 7 Std" accent={COLORS.royal}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} /><YAxis {...axis} domain={[0, 10]} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v) => [`${fmt(v, 1)} Std`, 'Schlaf']} />
              <ReferenceLine y={GOALS.sleepH} stroke="#fff" strokeDasharray="3 4" />
              <Bar dataKey="sleepH" isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={(d.sleepH ?? 0) >= GOALS.sleepH ? COLORS.royal : COLORS.amber} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
        </Glass>
        <Glass title="Intake & Protein" source="MANUELL" aside="Limit 1.400 kcal" accent={COLORS.magenta}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} />
              <YAxis yAxisId="k" {...axis} /><YAxis yAxisId="p" orientation="right" {...axis} />
              <Tooltip {...tip} />
              <ReferenceLine yAxisId="k" y={GOALS.kcal} stroke={COLORS.crimson} strokeDasharray="3 4" />
              <Bar yAxisId="k" dataKey="kcal" name="kcal" isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={(d.kcal ?? 0) > GOALS.kcal ? COLORS.crimson : COLORS.magenta} />)}</Bar>
              <Line yAxisId="p" dataKey="protein" name="Protein (g)" stroke={COLORS.cyan} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </ComposedChart></ResponsiveContainer></div>
        </Glass>
        <Glass title="Wasser pro Tag" source="MANUELL" aside="Ziel 5 L" accent={COLORS.royal}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...xt} /><YAxis {...axis} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v) => [`${fmt(v, 1)} L`, 'Wasser']} />
              <ReferenceLine y={GOALS.water} stroke="#fff" strokeDasharray="3 4" />
              <Bar dataKey="water" isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={(d.water ?? 0) >= GOALS.water ? COLORS.emerald : COLORS.royal} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
        </Glass>
      </div>
    </ViewMain>
  )
}
