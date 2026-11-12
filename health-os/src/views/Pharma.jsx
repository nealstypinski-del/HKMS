import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, DOSES } from '../lib/constants.js'
import { dayKey, doseMg, fmt, levelFromLog, nextDue } from '../lib/calc.js'
import { Btn, Field, Glass, Tile } from '../components/ui.jsx'
import { axis, Empty, tip, ViewMain } from './shared.jsx'

export function PharmaView({ os }) {
  const { pharmaLog, actions, now } = os
  const [date, setDate] = useState(dayKey(now))
  const [ui, setUi] = useState(os.dose)
  const [note, setNote] = useState('')
  const due = nextDue(pharmaLog, now)
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 35)
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)
  const curve = useMemo(() => levelFromLog(pharmaLog, from, to), [pharmaLog, now.getDate()]) // eslint-disable-line react-hooks/exhaustive-deps
  const today = curve.find((p) => p.date === dayKey(now))
  const dueColor = !due ? COLORS.dim : due.inDays < 0 ? COLORS.amber : due.inDays === 0 ? COLORS.cyan : COLORS.emerald

  const add = (e) => { e.preventDefault(); if (date && Number(ui) > 0) { actions.addInjection({ date, ui, note }); setNote('') } }

  return (
    <ViewMain className="grid-cols-1 xl:grid-cols-[1fr_1.6fr]">
      <div className="flex flex-col gap-3">
        <Glass title="Gabe eintragen" source="MANUELL" accent={COLORS.magenta}>
          <form onSubmit={add} className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-white/65">Datum
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mono rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-cyan" />
              </label>
              <Field label="Dosis" unit="UI" value={ui} onChange={setUi} step="1" />
            </div>
            <div className="flex gap-2">{DOSES.map((u) => <Btn key={u} color={COLORS.magenta} active={Number(ui) === u} onClick={() => setUi(u)} className="!px-2.5 !py-1 !text-xs">{u} UI</Btn>)}</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional, z. B. Stelle, Befinden)" maxLength={120} className="rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-cyan" />
            <Btn type="submit" color={COLORS.emerald} active>Gabe speichern</Btn>
          </form>
          <p className="text-[10px] text-white/45">Reine Erfassung deiner eigenen Einträge. Keine Dosierungsanweisung, kein medizinischer Rat – Fragen zu Dosis und Verträglichkeit gehören zu deiner Ärztin / deinem Arzt.</p>
        </Glass>
        <Glass title="Nächster Termin" source="MODELL" accent={dueColor}>
          {due ? (
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Letzte Gabe" value={`${due.last.date.split('-').reverse().join('.')} · ${due.last.ui} UI`} />
              <Tile label="Fällig (7-Tage-Rhythmus)" value={`${due.dueKey.split('-').reverse().join('.')} · ${due.inDays < 0 ? `${-due.inDays} Tg überfällig` : due.inDays === 0 ? 'heute' : `in ${due.inDays} Tg`}`} color={dueColor} />
              <Tile label="Spiegel heute (Modell)" value={`≈ ${fmt(today?.c ?? 0, 2)} mg`} color={COLORS.magenta} />
              <Tile label="Einträge gesamt" value={String(pharmaLog.length)} />
            </div>
          ) : <Empty>Noch keine Gabe eingetragen.</Empty>}
        </Glass>
      </div>
      <div className="flex flex-col gap-3">
        <Glass title="Spiegel aus deinen Gaben" source="MODELL" aside="Halbwertszeit ≈ 6 Tage" accent={COLORS.magenta}>
          <div className="h-60"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <defs><linearGradient id="phg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={COLORS.magenta} stopOpacity=".5" /><stop offset="1" stopColor={COLORS.magenta} stopOpacity="0" /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" {...axis} interval={6} /><YAxis {...axis} />
              <Tooltip {...tip} formatter={(v) => [`${fmt(v, 2)} mg`, 'Spiegel (Modell)']} />
              {pharmaLog.filter((e) => curve.some((p) => p.date === e.date)).map((e) => <ReferenceLine key={e.id} x={curve.find((p) => p.date === e.date).label} stroke={COLORS.cyan} strokeDasharray="2 3" />)}
              <ReferenceLine x={curve.find((p) => p.date === dayKey(now))?.label} stroke={COLORS.amber} />
              <Area dataKey="c" stroke={COLORS.magenta} strokeWidth={2} fill="url(#phg)" isAnimationActive={false} />
            </AreaChart></ResponsiveContainer></div>
          <p className="text-[10px] text-white/45">Illustratives Modell (exponentieller Abbau, Überlagerung der eingetragenen Gaben) – keine Messung. Cyan = Gabe, Amber = heute.</p>
        </Glass>
        <Glass title="Protokoll" source="MANUELL" accent={COLORS.cyan}>
          {pharmaLog.length === 0 ? <Empty>Noch keine Einträge.</Empty> : (
            <table className="mono w-full text-xs">
              <thead><tr className="text-left text-white/55"><th className="pb-1 font-medium">Datum</th><th className="font-medium">Dosis</th><th className="font-medium">Menge</th><th className="font-medium">Notiz</th><th /></tr></thead>
              <tbody>{[...pharmaLog].reverse().map((e) => (
                <tr key={e.id} className="border-t border-white/10"><td className="py-1.5">{e.date.split('-').reverse().join('.')}</td><td>{e.ui} UI</td><td>{fmt(doseMg(e.ui), 2)} mg</td><td className="max-w-56 truncate text-white/70">{e.note || '–'}</td><td className="text-right"><Btn color={COLORS.crimson} onClick={() => actions.removeInjection(e.id)} className="!px-2 !py-0.5 !text-[10px]">Löschen</Btn></td></tr>
              ))}</tbody>
            </table>
          )}
        </Glass>
      </div>
    </ViewMain>
  )
}
