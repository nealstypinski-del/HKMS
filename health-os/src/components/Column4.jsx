import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORS, DOSES, PROFILE } from '../lib/constants.js'
import { fmt, clamp, decayCurve, doseMg, satiety } from '../lib/calc.js'
import { Glass, Bar, Btn, Field, Ring, Tile } from './ui.jsx'

export function Retatrutide({ os, compact = false, monitoring = false }) {
  const { dose, actions } = os
  const data = decayCurve(dose)
  const peak = Math.max(...data.map((d) => d.c))
  const sat = satiety(dose)
  return (
    <Glass title={monitoring ? 'Retatrutid (Monitoring)' : 'Retatrutid'} source="MODELL" aside={monitoring ? 'Keine Dosierungsanweisung' : 'GLP-1 / GIP / Glukagon'} accent={COLORS.magenta}>
      <div className="grid grid-cols-3 gap-2">
        {DOSES.map((u) => (
          <Btn key={u} color={COLORS.magenta} active={dose === u} onClick={() => actions.setDose(u)} className="flex flex-col items-center leading-tight">
            <span className="mono text-sm">{u} UI</span>
            <span className="text-[10px] font-normal opacity-75">{fmt(doseMg(u), 2)} mg{u === 50 ? ' · 0,5 ml' : ''}</span>
          </Btn>
        ))}
      </div>
      <div className={compact ? 'h-24' : 'h-36'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
            <defs><linearGradient id="decay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={COLORS.magenta} stopOpacity=".5" /><stop offset="1" stopColor={COLORS.magenta} stopOpacity="0" /></linearGradient></defs>
            <XAxis dataKey="t" type="number" domain={[0, 35]} ticks={[0, 7, 14, 21, 28, 35]} tickFormatter={(t) => `T${t}`} stroke="rgba(235,240,255,.55)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(235,240,255,.55)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(8,12,20,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${fmt(v, 2)} mg`, 'Spiegel']} labelFormatter={(t) => `Tag ${t}`} />
            <Area type="monotone" dataKey="c" stroke={COLORS.magenta} strokeWidth={2} fill="url(#decay)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-white/65">Halbwertszeit ≈ 6 Tage · wöchentliche Gabe · Spitzenspiegel {fmt(peak, 1)} mg</p>
      <div className="flex items-center gap-3">
        <Ring size={78} stroke={8} segments={[{ frac: 1, fill: sat / 100, color: COLORS.magenta }]}><span className="mono text-sm font-bold">{sat}%</span></Ring>
        <div><div className="text-sm font-semibold">Satiety-Meter</div><div className="text-xs text-white/65">{sat} % Appetit-Suppression</div></div>
      </div>
    </Glass>
  )
}

export function Nutrition({ os }) {
  const { daily, actions } = os
  const kc = daily.kcal, over = kc > PROFILE.kcalCeiling
  const kColor = over ? COLORS.crimson : kc > 1200 ? COLORS.amber : COLORS.emerald
  const num = (v) => Math.max(0, parseFloat(String(v).replace(',', '.')) || 0)
  return (
    <Glass title="Nutrition & Hydration" aside={`Limit ${fmt(PROFILE.kcalCeiling)} kcal`} accent={COLORS.royal}>
      <div className="flex gap-2">
        <Field label="Kalorien" unit="kcal" value={daily.kcal || ''} onChange={(v) => actions.setNutrition({ kcal: num(v) })} />
        <Field label="Protein" unit="g" value={daily.protein || ''} onChange={(v) => actions.setNutrition({ protein: num(v) })} />
      </div>
      <Bar pct={(kc / PROFILE.kcalCeiling) * 100} color={kColor} />
      <p className="mono text-xs" style={{ color: kColor }}>{over ? `+${fmt(kc - PROFILE.kcalCeiling)} kcal über Limit` : `${fmt(PROFILE.kcalCeiling - kc)} kcal frei`} · Protein {fmt(daily.protein)} / {PROFILE.proteinMinG} g</p>
      <div className="flex gap-2">
        <Field label="Netto-Carbs" unit="g" value={daily.carbs || ''} onChange={(v) => actions.setNutrition({ carbs: num(v) })} />
        <Field label="Wasser" unit="L" value={daily.water || ''} step="0.25" onChange={(v) => actions.setWater(num(v))} />
      </div>
      {daily.carbs > PROFILE.carbWarnG && <p className="mono rounded-lg border border-amber/60 bg-amber/10 px-2.5 py-1.5 text-xs font-bold text-amber">⚠ NET-CARB-WARNUNG: {fmt(daily.carbs)} g &gt; {PROFILE.carbWarnG} g</p>}
      <Bar pct={(daily.water / 6) * 100} color={daily.water >= 5 ? COLORS.emerald : COLORS.royal} />
      <div className="flex items-center justify-between text-xs text-white/75">
        <span className="mono">{fmt(daily.water, 1)} L · Ziel {fmt(PROFILE.waterTargetL, 1)} L</span>
        <span className="flex gap-1.5"><Btn onClick={() => actions.setWater(daily.water + 0.25)} className="!px-2 !py-1 !text-xs">+0,25</Btn><Btn onClick={() => actions.setWater(daily.water + 0.5)} className="!px-2 !py-1 !text-xs">+0,5 L</Btn></span>
      </div>
      <div className="flex flex-wrap gap-2">
        {['Natrium', 'Kalium', 'Magnesium'].map((l, i) => (
          <Btn key={l} color={COLORS.emerald} active={daily.electrolytes[i]} onClick={() => actions.toggleElectrolyte(i)} className="!px-2.5 !py-1.5 !text-xs">{l}{daily.electrolytes[i] ? ' ✓' : ''}</Btn>
        ))}
      </div>
    </Glass>
  )
}

export function Overrides({ os }) {
  const { daily, actions, tons, planTons } = os
  const lp = planTons ? tons / planTons : 0
  const loadColor = lp >= 1 ? COLORS.crimson : lp >= 0.8 ? COLORS.amber : COLORS.cyan
  const pain = daily.jointPain
  return (
    <Glass title="Smart Overrides" accent={COLORS.royal}>
      <button type="button" role="switch" aria-checked={daily.joker} onClick={actions.toggleJoker}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
        style={{ borderColor: daily.joker ? COLORS.royal : pain >= 4 ? COLORS.amber : 'rgba(255,255,255,.14)', background: daily.joker ? 'rgba(0,122,255,.16)' : 'rgba(255,255,255,.055)' }}>
        <span><span className="block text-sm font-semibold">Wasser-Joker</span><span className="block text-xs text-white/65">Gelenkermüdung → 45 Min Pool, Schritt-Delta entfällt</span></span>
        <span className="relative h-6 w-11 flex-none rounded-full transition-colors" style={{ background: daily.joker ? COLORS.royal : 'rgba(255,255,255,.2)' }}>
          <span className="absolute top-0.5 size-5 rounded-full bg-white transition-all" style={{ left: daily.joker ? 22 : 2 }} />
        </span>
      </button>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-white/75"><span>Gelenk-Tonnage</span><span className="mono" style={{ color: loadColor }}>{fmt(tons / 1000, 1)} / {fmt(planTons / 1000, 1)} t</span></div>
        <Bar pct={lp * 100} color={loadColor} />
        <div className="flex items-center justify-between text-xs text-white/75">
          <span>Gelenkschmerz</span>
          <span className="flex items-center gap-2"><Btn onClick={() => actions.setJoint(pain - 1)} className="!px-2 !py-0.5">−</Btn><span className="mono w-10 text-center font-bold" style={{ color: pain >= 4 ? COLORS.amber : COLORS.emerald }}>{pain}/10</span><Btn onClick={() => actions.setJoint(pain + 1)} className="!px-2 !py-0.5">+</Btn></span>
        </div>
        {pain >= 4 && <p className="text-[11px] text-amber">Schmerz ≥ 4: einen Walk gegen Schwimmen tauschen (Wasser-Joker).</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Btn color={COLORS.emerald} active={daily.voice} onClick={actions.toggleVoice} className="text-left">Mobile Work · Voice {daily.voice ? 'AN' : 'AUS'}</Btn>
        <div className="mono flex flex-wrap gap-2 text-[10px] font-bold tracking-wide">
          {(daily.voice
            ? [['VOICE-TO-TEXT: ACTIVE', COLORS.emerald], ['ANC HEADSET: CONNECTED', COLORS.cyan]]
            : [['VOICE-TO-TEXT: OFF', COLORS.dim], ['ANC HEADSET: STANDBY', COLORS.dim]]
          ).map(([t, c]) => <span key={t} className="rounded-md border px-2 py-1" style={{ color: c, borderColor: `${c}66` }}>[ {t} ]</span>)}
        </div>
      </div>
    </Glass>
  )
}

export default function Column4({ os }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Retatrutide os={os} />
      <Nutrition os={os} />
      <Overrides os={os} />
    </div>
  )
}
