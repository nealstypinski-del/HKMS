import { COLORS } from '../lib/constants.js'
import { fmt } from '../lib/calc.js'
import { Btn } from './ui.jsx'

/** Manuelle Mahlzeit-Erfassung (KI-Scan/-Plan folgen später). */
export function MealForm({ actions, daily }) {
  const submit = (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const n = (k) => Math.max(0, parseFloat(String(f.get(k)).replace(',', '.')) || 0)
    const m = { name: String(f.get('name') || 'Mahlzeit'), kcal: n('kcal'), protein: n('protein'), carbs: n('carbs'), fat: n('fat') }
    if (m.kcal > 0) { actions.logMeal(m); e.currentTarget.reset() }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
      <input name="name" placeholder="Mahlzeit (z. B. Skyr + Whey)" className="min-w-0 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-cyan" />
      <div className="flex gap-2">
        {[['kcal', 'kcal'], ['protein', 'P g'], ['carbs', 'C g'], ['fat', 'F g']].map(([k, ph]) => (
          <input key={k} name={k} type="number" step="any" min="0" placeholder={ph} className="mono w-full min-w-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-cyan" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" color={COLORS.emerald} active className="!py-1.5 !text-xs">Mahlzeit loggen</Btn>
        <Btn onClick={actions.undoMeal} className="!py-1.5 !text-xs">Letzte zurück</Btn>
        <Btn disabled className="!py-1.5 !text-xs opacity-50" title="Foto-Analyse folgt mit der KI-Anbindung">Nährwert-Scan · bald</Btn>
        <Btn disabled className="!py-1.5 !text-xs opacity-50" title="KI-Tagesplan folgt mit der KI-Anbindung">Tagesplan (KI) · bald</Btn>
      </div>
      {daily.meals.length > 0 && <p className="mono truncate text-[10px] text-white/55">Zuletzt: {daily.meals.at(-1).name} · {fmt(daily.meals.at(-1).kcal)} kcal</p>}
    </form>
  )
}
