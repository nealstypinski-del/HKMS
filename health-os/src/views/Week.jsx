import { COLORS } from '../lib/constants.js'
import { dayKey, fmt } from '../lib/calc.js'
import { BADGES, STREAK_BADGES, average, badgesOf, lastNDays, weekAdvice } from '../lib/history.js'
import { Bar, Btn, Glass, Tile } from '../components/ui.jsx'
import { Kpi, ViewMain } from './shared.jsx'

const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function WeekView({ os }) {
  const week = lastNDays(os.days, 7, os.now)
  const ck = { ok: COLORS.emerald, warn: COLORS.amber, bad: COLORS.crimson }[os.forecast.check.key]
  const withSteps = week.filter((d) => d.steps != null)
  const best = withSteps.length ? withSteps.reduce((a, b) => (b.steps > a.steps ? b : a)) : null
  const worst = withSteps.length > 1 ? withSteps.reduce((a, b) => (b.steps < a.steps ? b : a)) : null
  const kw = (() => { const d = new Date(Date.UTC(os.now.getFullYear(), os.now.getMonth(), os.now.getDate())); const n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7) })()
  const xp = week.reduce((a, d) => a + (os.xpDay[d.date] ?? 0), 0)

  return (
    <ViewMain className="grid-cols-1">
      <div className="print-only mono text-lg font-bold">NEAL HEALTH OS 2076 – Wochenbericht KW {kw} · {os.now.toLocaleDateString('de-DE')}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="STREAK" value={`${os.streakN} Tage`} color={COLORS.amber} sub="≥ 80 % Schritte + ≤ 1.400 kcal" />
        <Kpi label="Ø SCHRITTE" value={fmt(average(week.map((d) => d.steps)) ?? 0)} color={COLORS.cyan} />
        <Kpi label="Ø SCHLAF" value={`${fmt(average(week.map((d) => d.sleepH)) ?? 0, 1)} Std`} color={COLORS.royal} />
        <Kpi label="Ø HRV" value={`${fmt(average(week.map((d) => d.hrv)) ?? 0)} ms`} color={COLORS.emerald} />
        <Kpi label="GEWICHT" value={`${fmt(os.weight, 1)} kg`} sub={os.trend.delta == null ? 'zu wenig Daten' : `${os.trend.delta <= 0 ? '▼ −' : '▲ +'}${fmt(Math.abs(os.trend.delta), 1)} kg Woche`} color={COLORS.magenta} />
        <Kpi label="XP DIESE WOCHE" value={`+${fmt(xp)}`} color={COLORS.emerald} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[2.2fr_1fr]">
        <Glass title="Die letzten 7 Tage" accent={COLORS.cyan} aside={<Btn onClick={() => window.print()} className="no-print !px-2 !py-1 !text-[11px]">Als PDF / Drucken</Btn>}>
          <div className="overflow-x-auto"><table className="mono w-full min-w-[640px] text-xs">
            <thead><tr className="text-left text-white/55"><th className="pb-1.5 font-medium">Tag</th><th className="font-medium">Schritte</th><th className="font-medium">kcal</th><th className="font-medium">Protein</th><th className="font-medium">Wasser</th><th className="font-medium">Schlaf</th><th className="font-medium">Blöcke</th><th className="font-medium">XP</th><th className="font-medium">Badges</th></tr></thead>
            <tbody>
              {week.map((d) => {
                const isBest = best && d.date === best.date, isWorst = worst && d.date === worst.date
                return (
                  <tr key={d.date} className="border-t border-white/10" style={{ background: isBest ? 'rgba(0,255,102,.06)' : isWorst ? 'rgba(255,149,0,.06)' : undefined }}>
                    <td className="py-2 font-bold text-white">{DOW[d.d.getDay()]} {d.d.getDate()}.{d.d.getMonth() + 1}.{d.date === dayKey(os.now) && <span className="ml-1 text-cyan">·heute</span>}</td>
                    <td className="min-w-28"><div className="flex items-center gap-2"><span className="w-14">{d.steps != null ? fmt(d.steps) : '–'}</span><span className="w-16"><Bar pct={((d.steps ?? 0) / 30000) * 100} color={(d.steps ?? 0) >= 24000 ? COLORS.emerald : COLORS.cyan} h={4} /></span></div></td>
                    <td style={{ color: d.kcal > 1400 ? COLORS.crimson : undefined }}>{d.kcal ? fmt(d.kcal) : '–'}</td>
                    <td style={{ color: d.protein >= 170 ? COLORS.emerald : undefined }}>{d.protein ? `${d.protein} g` : '–'}</td>
                    <td>{d.water ? `${fmt(d.water, 1)} L` : '–'}</td>
                    <td>{d.sleepH ? `${fmt(d.sleepH, 1)} h` : '–'}</td>
                    <td>{d.blocksDone != null ? `${d.blocksDone}/3` : '–'}</td>
                    <td className="text-emerald">{os.xpDay[d.date] ? `+${fmt(os.xpDay[d.date])}` : '–'}</td>
                    <td><span className="flex flex-wrap gap-1">{badgesOf(d).map((id) => <span key={id} className="rounded border border-white/20 px-1 text-[9px] text-white/75">{BADGES.find((b) => b.id === id).label}</span>)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
          <p className="text-[11px] text-white/60">{best ? `Bester Tag: ${DOW[best.d.getDay()]} ${best.d.getDate()}.${best.d.getMonth() + 1}. (${fmt(best.steps)} Schritte)` : 'Noch keine Tageswerte.'}{worst ? ` · Schwächster Tag: ${DOW[worst.d.getDay()]} ${worst.d.getDate()}.${worst.d.getMonth() + 1}. (${fmt(worst.steps)})` : ''}</p>
        </Glass>
        <div className="flex flex-col gap-3">
          <Glass title="Wochen-Check-in" source="MODELL" accent={ck}>
            <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: ck, color: ck }}><b>{os.forecast.check.text}</b><div className="text-xs text-white/80">{os.forecast.check.sub}</div></div>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs text-white/85">{weekAdvice(week).map((t) => <li key={t}>{t}</li>)}</ul>
          </Glass>
          <Glass title="Badges" accent={COLORS.amber} aside={`Streak ${os.streakN} Tage`}>
            <div className="grid grid-cols-2 gap-2">
              {BADGES.map((b) => <Tile key={b.id} label={b.label} value={`${os.badges[b.id]}×`} color={os.badges[b.id] ? COLORS.amber : COLORS.dim} />)}
            </div>
            <div className="mono flex flex-wrap gap-2 text-[10px]">{STREAK_BADGES.map((n) => <span key={n} className="rounded-md border px-2 py-1" style={{ borderColor: os.streakN >= n ? COLORS.amber : 'rgba(255,255,255,.15)', color: os.streakN >= n ? COLORS.amber : COLORS.dim }}>{n}-Tage-Streak</span>)}</div>
            <p className="text-[10px] text-white/45">Streak = Tage in Folge mit ≥ 80 % der Schritte (24.000) und geloggtem Intake ≤ 1.400 kcal. Der laufende Tag bricht ihn nicht.</p>
          </Glass>
        </div>
      </div>
    </ViewMain>
  )
}
