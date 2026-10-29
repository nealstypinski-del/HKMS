import { useState } from 'react'
import { COLORS, CROSSFIT, STEP_BLOCKS, BASELINE_STEPS, SWIM } from '../lib/constants.js'
import { fmt, clamp, blockTone } from '../lib/calc.js'
import { Glass, Ring, Bar, Btn, Tile } from './ui.jsx'

export function XpHeader({ os }) {
  const { xp } = os
  return (
    <Glass title="Operator-Level" aside={`Level ${xp.level} / 80`} accent={COLORS.emerald}>
      <div className="flex items-center gap-4">
        <Ring size={104} stroke={9} segments={[{ frac: 1, fill: xp.pct, color: COLORS.emerald }]}>
          <div className="leading-none"><div className="mono text-3xl font-bold text-white">{xp.level}</div><div className="mt-1 text-[10px] tracking-widest text-white/65">LEVEL</div></div>
        </Ring>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="mono inline-block self-start rounded-lg border border-emerald/50 bg-emerald/10 px-2.5 py-1 text-xs font-bold tracking-[.1em] text-emerald">{xp.title}</span>
          <span className="mono text-lg font-semibold">{fmt(xp.total)} <span className="text-white/50">/ {fmt(xp.cap)} XP</span></span>
          <Bar pct={(xp.intoLevel / 300) * 100} color={COLORS.emerald} h={6} />
          <span className="text-[11px] text-white/65">{fmt(300 - xp.intoLevel)} XP bis Level {Math.min(80, xp.level + 1)}</span>
        </div>
      </div>
    </Glass>
  )
}

export function Gauntlet({ os, compact = false, controls = true }) {
  const { plan, steps, blocks, daily, actions, walkKcal } = os
  const [inp, setInp] = useState('1000')
  const segs = [
    ...blocks.map((b) => {
      const tone = blockTone({ missed: b.missed, done: b.done, added: b.added > 0, swim: b.swim })
      return { frac: b.eff / plan.target, fill: b.frac, color: b.done ? COLORS.emerald : tone.color, track: b.added > 0 ? 'rgba(255,149,0,.35)' : undefined }
    }),
    { frac: BASELINE_STEPS / plan.target, fill: clamp((steps - plan.blockTarget) / BASELINE_STEPS, 0, 1), color: 'rgba(0,240,255,.55)' },
  ].filter((s) => s.frac > 0)
  const pct = Math.round((steps / plan.target) * 100)
  const adds = plan.add.filter((a, i) => a > 0 && !daily.missed[i])
  const badge = adds.length ? `[ +${fmt(Math.max(...adds))} EXTRA-SCHRITTE ANPASSUNG ]` : ''
  const swim = plan.swimIdx >= 0
  return (
    <Glass title="30.000-Schritte-Gauntlet" source={os.stepSource} aside={`${pct} %`}>
      <div className={`flex items-center justify-center ${compact ? 'gap-3' : 'flex-wrap gap-5'}`}>
        <Ring size={compact ? (controls ? 120 : 104) : 190} stroke={compact ? 11 : 14} segments={segs}>
          <div className="leading-tight">
            <div className="mono text-4xl font-bold text-white">{fmt(steps)}</div>
            <div className="mono text-xs text-white/65">/ {fmt(plan.target)} Schritte</div>
          </div>
        </Ring>
        <div className={`flex flex-col gap-2 ${compact ? 'min-w-[100px]' : 'min-w-[130px]'}`}>
          <Tile label="Aktiv Gehen" value={`${fmt(walkKcal)} kcal`} color={COLORS.amber} />
          <Tile label="Distanz" value={`${fmt(steps * 0.00075, 1)} km`} color={COLORS.cyan} />
          <Tile label="Offen" value={`${fmt(Math.max(0, plan.target - steps))}`} />
        </div>
      </div>
      {(badge || swim || plan.tomorrow > 0) && (
        <p className="mono rounded-xl border px-3 py-2 text-xs font-bold tracking-wide" style={{ color: swim ? COLORS.royal : COLORS.amber, borderColor: swim ? COLORS.royal : COLORS.amber, background: swim ? 'rgba(0,122,255,.12)' : 'rgba(255,149,0,.12)' }}>
          {swim ? `WASSER-JOKER: ${SWIM.minutes} MIN POOL (${SWIM.kcal} KCAL, 0 IMPACT) · DELTA ENTFÄLLT` : badge}
          {plan.tomorrow > 0 && !swim && <span className="block font-normal opacity-90">Rest morgen früh: +{fmt(plan.tomorrow)} Schritte in Block 1</span>}
        </p>
      )}
      {controls && <div className="flex flex-wrap gap-2">
        <input type="number" value={inp} onChange={(e) => setInp(e.target.value)} className="mono w-24 rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-sm outline-none focus:border-cyan" aria-label="Schritte hinzufügen" />
        <Btn onClick={() => actions.addSteps(Math.round(Number(inp)) || 0)}>+ Schritte</Btn>
        <Btn onClick={() => actions.addSteps(-1000)}>−1.000</Btn>
        <Btn onClick={() => actions.addSteps(1000)}>+1.000</Btn>
        {compact && <Btn color={COLORS.emerald} onClick={() => { const i = blocks.findIndex((b) => !b.done && !b.missed && !b.swim); if (i >= 0) actions.toggleDone(i) }}>Als erledigt</Btn>}
      </div>}
    </Glass>
  )
}

export function BlockCard({ b, os }) {
  const { actions } = os
  const tone = blockTone({ missed: b.missed, done: b.done, added: b.added > 0, swim: b.swim })
  const status = b.swim ? (b.done ? 'SWIM ERLEDIGT' : 'SWIM-MODUL') : b.missed ? 'VERPASST' : b.done ? 'ERLEDIGT' : b.added > 0 ? 'KOMPENSATION' : 'GEPLANT'
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: tone.key === 'idle' ? 'rgba(255,255,255,.1)' : tone.color, background: tone.key === 'idle' ? 'transparent' : `${tone.color}1f` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">{b.label} · {b.name}</span>
        <span className="mono text-[10px] font-bold tracking-wider" style={{ color: tone.color }}>{status}</span>
      </div>
      <span className="mono text-[11px] text-white/65">{b.time}</span>
      <Bar pct={b.frac * 100} color={b.added > 0 ? COLORS.amber : b.done ? COLORS.emerald : COLORS.cyan} h={6} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono text-xs" style={{ color: tone.color }}>
          {b.swim ? `${SWIM.minutes} Min · 0 Stoßbelastung` : b.missed ? '0 Schritte' : `${fmt(b.taken)} / ${fmt(b.eff)} Schritte`}
          {b.added > 0 && !b.missed && <span className="ml-1.5 font-bold text-amber">(+{fmt(b.added)})</span>}
        </span>
      </div>
      {b.added > 0 && !b.missed && <span className="mono self-start rounded-md border border-amber/60 bg-amber/10 px-2 py-0.5 text-[10px] font-bold text-amber">[ +{fmt(b.added)} EXTRA-SCHRITTE ANPASSUNG ]</span>}
      {b.swim && <span className="text-[11px] text-white/75">SWIM MODULE ACTIVATED: {SWIM.minutes} MIN POOL SESSION ({SWIM.kcal} KCAL BURN / ZERO JOINT IMPACT)</span>}
      <div className="flex flex-wrap gap-2">
        {b.swim
          ? <Btn color={COLORS.royal} active={b.done} onClick={actions.toggleSwim}>{b.done ? 'Swim erledigt ✓' : 'Swim als erledigt markieren'}</Btn>
          : <Btn color={COLORS.emerald} active={b.done} onClick={() => actions.toggleDone(b.i)}>{b.done ? 'Erledigt ✓' : 'Als erledigt markieren'}</Btn>}
        {!b.swim && <Btn color={COLORS.crimson} active={b.missed} onClick={() => actions.toggleMissed(b.i)}>{b.missed ? 'Wiederherstellen' : 'Als verpasst markieren'}</Btn>}
      </div>
    </div>
  )
}

export function CrossFitCard({ os }) {
  const { daily, actions, todaysWorkouts, now } = os
  const tmin = now.getHours() * 60 + now.getMinutes()
  const wk = now.getDay() >= 1 && now.getDay() <= 5
  const whoopDone = todaysWorkouts.some((w) => /cross|functional|hiit|weight|strength|kraft/i.test(w.sport))
  const done = daily.crossfit || whoopDone
  const live = tmin >= 720 && tmin < 780
  const status = !wk ? 'WOCHENENDE' : done ? 'ERLEDIGT' : live ? 'LÄUFT' : tmin < 720 ? 'GEPLANT' : 'OFFEN'
  const color = !wk ? COLORS.cyan : done ? COLORS.emerald : live ? COLORS.amber : tmin < 720 ? COLORS.cyan : COLORS.crimson
  return (
    <Glass title="CrossFit Iron Raid" aside={CROSSFIT.time} accent={COLORS.amber}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80">{CROSSFIT.minutes} Min Session · Glykogen-Depletion</span>
        <span className="mono text-xs font-bold" style={{ color }}>{status}</span>
      </div>
      <Btn color={COLORS.emerald} active={done} onClick={actions.toggleCrossfit} disabled={whoopDone}>
        {whoopDone ? 'Via Whoop erkannt ✓ (+400 XP)' : done ? 'Erledigt ✓' : 'Als absolviert markieren'}
      </Btn>
    </Glass>
  )
}

export function BlocksPanel({ os }) {
  return (
    <Glass title="Bewegungs-Blöcke" aside={`Σ ${fmt(os.plan.target)} Schritte`}>
      {os.blocks.slice(0, 1).map((b) => <BlockCard key={b.id} b={b} os={os} />)}
      <CrossFitCard os={os} />
      {os.blocks.slice(1).map((b) => <BlockCard key={b.id} b={b} os={os} />)}
      <p className="text-[11px] text-white/50">+ {fmt(BASELINE_STEPS)} Alltagsschritte (nicht umverteilbar). S_neu = S_basis + ΔS / N_offen.</p>
    </Glass>
  )
}

export default function Column2({ os }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <XpHeader os={os} />
      <Gauntlet os={os} />
      <BlocksPanel os={os} />
    </div>
  )
}
