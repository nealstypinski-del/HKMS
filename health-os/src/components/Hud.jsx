// Kompakte HUD-Karten für die HQ-Ansicht (Layout nach Entwurf Bild 3).
import { useState } from 'react'
import { COLORS, PROFILE } from '../lib/constants.js'
import { fmt } from '../lib/calc.js'
import { Glass, Bar, Btn, Field, Ring, Tile } from './ui.jsx'
import { MealForm } from './MealForm.jsx'

export function WeightCompact({ os }) {
  const { weight, actions, trend } = os
  const [txt, setTxt] = useState('')
  const val = txt === '' ? weight.toFixed(1) : txt
  const send = () => { if (actions.submitWeight(parseFloat(val.replace(',', '.')))) setTxt('') }
  const sinceStart = weight - PROFILE.startKg
  return (
    <Glass title="Gewichtseingabe" aside={`Ziel ${fmt(os.target, 1)} kg · ${Math.abs(sinceStart) < 0.05 ? '±0,0' : (sinceStart < 0 ? '−' : '+') + fmt(Math.abs(sinceStart), 1)} kg seit Start`} accent={COLORS.magenta}>
      <div className="flex items-end gap-2">
        <Field label="Aktuelles Gewicht" unit="kg" value={val} onChange={setTxt} step="0.1" onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button type="button" onClick={send} className="cursor-pointer rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-black hover:brightness-110">Senden</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Aktuell" value={`${fmt(weight, 1)} kg`} color={COLORS.cyan} />
        <Tile label="Ø 7 Tage" value={`${fmt(trend.avg, 1)} kg`} />
        <Tile label="Start" value={`${fmt(PROFILE.startKg, 1)} kg`} />
      </div>
    </Glass>
  )
}

export function KfaGauge({ kfa }) {
  const pos = Math.max(0, Math.min(1, (kfa - 10) / 40)) * 100
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#00FF66 0%,#00FF66 25%,#FFD60A 50%,#FF9500 70%,#FF2D55 100%)' }}>
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black" style={{ left: `${pos}%`, boxShadow: '0 0 8px #fff' }} />
      </div>
      <div className="mono flex justify-between text-[10px] text-white/55"><span>10</span><span>20</span><span>30</span><span>40</span><span>50 %</span></div>
    </div>
  )
}

export function KfaCompact({ os }) {
  const { weight, measure, bf, actions } = os
  return (
    <Glass title="KFA-Rechner" source="MODELL" aside={`Magermasse ${fmt(bf.leanKg, 1)} kg`} accent={COLORS.yellow}>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Bauch (Nabel)" unit="cm" value={measure.waist} onChange={(v) => actions.setMeasure({ waist: parseFloat(v) || 0 })} />
        <Tile label="Gewicht" value={`${fmt(weight, 1)} kg`} />
        <Tile label="Körperfett" value={`${fmt(bf.use, 1)} %`} color={COLORS.yellow} />
        <Tile label="Fettmasse" value={`${fmt(bf.fatKg, 1)} kg`} color={COLORS.amber} />
      </div>
      <KfaGauge kfa={bf.use} />
    </Glass>
  )
}

export function NutritionHud({ os }) {
  const { daily, macros } = os
  const [open, setOpen] = useState(false)
  const kc = daily.kcal, over = kc > PROFILE.kcalCeiling
  const col = over ? COLORS.crimson : kc > 1200 ? COLORS.amber : COLORS.emerald
  const rows = [['Protein', macros.now.protein, macros.goals.protein, COLORS.cyan, '≥'], ['Kohlenhydrate', macros.now.carbs, macros.goals.carbs, COLORS.amber, '≤'], ['Fett', macros.now.fat, macros.goals.fat, COLORS.magenta, '≤']]
  return (
    <Glass title="Nutrition" source="MANUELL" aside={`Ziel ${fmt(PROFILE.kcalCeiling)} kcal · Protein ≥ ${PROFILE.proteinMinG} g`} accent={COLORS.amber}>
      <div className="flex items-center gap-4">
        <Ring size={104} stroke={9} segments={[{ frac: 1, fill: Math.min(1, kc / PROFILE.kcalCeiling), color: col }]}>
          <div className="leading-tight"><div className="mono text-xl font-bold">{fmt(kc)}</div><div className="mono text-[9px] text-white/60">/ {fmt(PROFILE.kcalCeiling)} kcal</div></div>
        </Ring>
        <div className="flex flex-1 flex-col gap-1.5">
          {rows.map(([l, v, g, c, op]) => (
            <div key={l} className="flex flex-col gap-0.5"><div className="mono flex justify-between text-[11px]"><span style={{ color: c }}>{l}</span><span className="text-white/75">{fmt(v)} / {op === '≤' ? '≤ ' : ''}{g} g</span></div><Bar pct={(v / g) * 100} color={op === '≤' && v > g ? COLORS.crimson : c} h={5} /></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Btn disabled className="!px-1 !py-1.5 !text-[11px] opacity-50" title="Foto-Analyse folgt mit der KI-Anbindung">Nährwert-Scan</Btn>
        <Btn color={COLORS.emerald} active={open} onClick={() => setOpen((o) => !o)} className="!px-1 !py-1.5 !text-[11px]">Mahlzeit loggen</Btn>
        <Btn disabled className="!px-1 !py-1.5 !text-[11px] opacity-50" title="KI-Tagesplan folgt mit der KI-Anbindung">Tagesplan (KI)</Btn>
      </div>
      {open && <MealForm actions={os.actions} daily={daily} />}
      <div className="flex items-center gap-2 text-xs text-white/75">
        <span className="mono">{fmt(daily.water, 1)} / {fmt(PROFILE.waterTargetL, 1)} L</span>
        <Btn onClick={() => os.actions.setWater(daily.water + 0.25)} className="!px-2 !py-0.5 !text-[11px]">+0,25</Btn>
        <Btn onClick={() => os.actions.setWater(daily.water + 0.5)} className="!px-2 !py-0.5 !text-[11px]">+0,5 L</Btn>
      </div>
    </Glass>
  )
}
