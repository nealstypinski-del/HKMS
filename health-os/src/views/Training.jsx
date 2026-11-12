import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS } from '../lib/constants.js'
import { fmt } from '../lib/calc.js'
import { average, lastNDays } from '../lib/history.js'
import { workoutXp } from '../mcp/whoopClient.js'
import { Glass } from '../components/ui.jsx'
import { axis, dm, Empty, Kpi, tip, ViewMain } from './shared.jsx'

const KIND = { crossfit: COLORS.amber, walk: COLORS.cyan, swim: COLORS.royal, other: COLORS.magenta }

export function TrainingView({ os }) {
  const wos = useMemo(() => [...(os.workoutHistory ?? [])].filter((w) => w.start).sort((a, b) => new Date(b.start) - new Date(a.start)), [os.workoutHistory])
  const manualCf = Object.values(os.days).filter((d) => d.crossfit).length
  const cf = wos.filter((w) => workoutXp(w).kind === 'crossfit')
  const weekAgo = Date.now() - 7 * 864e5
  const cfWeek = cf.filter((w) => new Date(w.start) >= weekAgo).length
  const loadData = useMemo(() => lastNDays(os.days, 30, os.now).map((r) => ({ label: dm(r.d), tons: r.steps != null ? +((r.steps * 0.35) / 1000).toFixed(1) : null })), [os.days, os.now])
  const strainData = wos.slice(0, 20).reverse().map((w) => ({ label: dm(new Date(w.start)), strain: w.strain ?? 0, sport: w.sport, kind: workoutXp(w).kind }))

  return (
    <ViewMain className="grid-cols-1">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="WORKOUTS 30 T" value={String(wos.length)} color={COLORS.cyan} sub={os.sourceLabel} />
        <Kpi label="CROSSFIT / 7 T" value={String(cfWeek)} color={COLORS.amber} sub={`Manuell markiert: ${manualCf} Tage`} />
        <Kpi label="Ø STRAIN" value={fmt(average(wos.map((w) => w.strain)) ?? 0, 1)} color={COLORS.crimson} />
        <Kpi label="VERBRAUCH (WORKOUTS)" value={`${fmt(wos.reduce((a, w) => a + (w.kcal || 0), 0))} kcal`} color={COLORS.emerald} />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Glass title="Strain pro Workout" source={os.sourceLabel} aside="letzte 20" accent={COLORS.crimson}>
          {strainData.length === 0 ? <Empty>Keine Whoop-Workouts geladen. MCP verbinden (Bridge/Doctor) – oder CrossFit in HQ/Analyse manuell markieren.</Empty> : (
            <div className="h-52"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={strainData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} domain={[0, 21]} />
                <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v, n, p) => [fmt(v, 1), p.payload.sport]} />
                <Bar dataKey="strain" isAnimationActive={false}>{strainData.map((d, i) => <Cell key={i} fill={KIND[d.kind]} />)}</Bar>
              </BarChart></ResponsiveContainer></div>
          )}
        </Glass>
        <Glass title="Gelenk-Tonnage (aus Schritten)" source="MODELL" aside="Tonnen / Tag" accent={COLORS.yellow}>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...axis} interval={4} /><YAxis {...axis} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} formatter={(v) => [`${fmt(v, 1)} t`, 'Tonnage']} />
              <Bar dataKey="tons" fill={COLORS.yellow} isAnimationActive={false} />
            </BarChart></ResponsiveContainer></div>
          <p className="text-[10px] text-white/45">Schätzung: Schritte × 0,35 kg·t je Schritt – nur als Trend für die Gelenkbelastung, keine Messung.</p>
        </Glass>
      </div>
      <Glass title="Workouts" source={os.sourceLabel} aside="Whoop · 30 Tage" accent={COLORS.cyan}>
        {wos.length === 0 ? <Empty>Noch keine Workouts.</Empty> : (
          <div className="overflow-x-auto"><table className="mono w-full min-w-[560px] text-xs">
            <thead><tr className="text-left text-white/55"><th className="pb-1.5 font-medium">Datum</th><th className="font-medium">Sport</th><th className="font-medium">Dauer</th><th className="font-medium">Strain</th><th className="font-medium">Ø Puls</th><th className="font-medium">kcal</th><th className="font-medium">XP</th></tr></thead>
            <tbody>{wos.slice(0, 30).map((w) => (
              <tr key={w.id} className="border-t border-white/10"><td className="py-1.5">{new Date(w.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</td><td style={{ color: KIND[workoutXp(w).kind] }}>{w.sport}</td><td>{w.minutes} Min</td><td>{w.strain != null ? fmt(w.strain, 1) : '–'}</td><td>{w.avgHr ? Math.round(w.avgHr) : '–'}</td><td>{w.kcal ? fmt(w.kcal) : '–'}</td><td className="text-emerald">+{workoutXp(w).xp}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Glass>
    </ViewMain>
  )
}
