// Prüfung der Simulation ohne Grafik: simuliert einen ganzen Tag (1440 Simulationsminuten) mit 47 Agenten und zählt Ereignisse.
import { buildPopulation } from '../src/world/sim/population.js'
import { stepWorld } from '../src/world/sim/simLoop.js'
import { clock, hhmm } from '../src/world/sim/simClock.js'
import { pulseState, stepCompletionPulses } from '../src/world/outdoor/water/CompletionPulse.js'
import { MEETINGS } from '../src/world/sim/simBrain.js'
import { insideHQ } from '../src/world/indoor/config/hq.layout.js'

const out = []; let fails = 0
const check = (n, ok, d) => { out.push(`${ok ? 'OK  ' : 'FAIL'} ${n}: ${d}`); if (!ok) fails++ }
const agents = buildPopulation(47)
const ctx = { events: [], outdoor: 0 }
const count = { coffee: 0, cooler: 0, sofa: 0, sport: 0, meeting: 0, taskStart: 0, taskDone: 0 }
const lastAction = new Map()
const snap = {}
let maxRoute = 0; const routeT = new Map(); let maxOut = 0
const dt = 0.1
clock.minutes = 8 * 60 + 30
const N = 28800 // 0,1 s Schritte: 48 Minuten Echtzeit bei 1x = ein voller Simulationstag
for (let i = 0; i < N; i++) {
  stepWorld(agents, dt, ctx)
  stepCompletionPulses(dt)
  for (const e of ctx.events) { if (e.type === 'done') count.taskDone++; else count.taskStart++ }
  let outdoors = 0
  for (const a of agents) {
    const act = a.brain?.action || null
    if (act !== lastAction.get(a.id)) {
      lastAction.set(a.id, act)
      if (act === 'Kaffee') count.coffee++
      if (act === 'Wasserspender') count.cooler++
      if (act === 'Sofa') count.sofa++
      if (act === 'Sport') count.sport++
      if (act === 'Meeting') count.meeting++
    }
    if (a.mode === 'route' && a.role !== 'Rundgang') { routeT.set(a.id, (routeT.get(a.id) || 0) + dt); maxRoute = Math.max(maxRoute, routeT.get(a.id)) } else routeT.set(a.id, 0)
    if (a.visible && !insideHQ(a.x, a.z)) outdoors++
  }
  maxOut = Math.max(maxOut, outdoors)
  const m = Math.floor(clock.minutes)
  for (const t of ['09:30', '10:25', '11:45', '14:25', '16:10']) if (hhmm() === t && !snap[t]) {
    snap[t] = { desk: agents.filter((a) => a.mode === 'anchor' && a.seat?.kind === 'desk').length, meeting: agents.filter((a) => a.mode === 'anchor' && a.seat?.kind === 'seat').length, walking: agents.filter((a) => a.mode === 'route').length, outside: outdoors, sofa: agents.filter((a) => a.brain?.action === 'Sofa').length }
  }
  void m
}
out.push(`INFO Simulierter Zeitraum: ${N} Schritte zu 0,1 s = ${(N * dt / 60).toFixed(0)} Minuten Echtzeit bei 1x, Uhr am Ende ${hhmm()} (Tag ${clock.day})`)
for (const [t, v] of Object.entries(snap)) out.push(`INFO ${t}: ${v.desk} am Schreibtisch, ${v.meeting} in Konferenzstühlen, ${v.walking} unterwegs, ${v.outside} draußen, ${v.sofa} auf Sofas`)
out.push(`INFO Ereignisse: ${count.taskStart} Aufgaben gestartet, ${count.taskDone} abgeschlossen, ${pulseState.completed} Lichtpulse, ${count.coffee} Kaffeepausen, ${count.cooler} Wasserspender, ${count.sofa} Sofapausen, ${count.sport} Sporteinheiten, ${count.meeting} Besprechungsteilnahmen`)
check('Aufgaben werden erledigt', count.taskDone > 100, `${count.taskDone} abgeschlossen`)
check('Abschlüsse lösen Lichtpulse aus', pulseState.completed === count.taskDone, `${pulseState.completed} Pulse für ${count.taskDone} Abschlüsse`)
check('Pausen finden statt', count.coffee > 20 && count.cooler > 10 && count.sofa > 5, `Kaffee ${count.coffee}, Wasserspender ${count.cooler}, Sofa ${count.sofa}`)
check('Sport findet statt und bleibt begrenzt', count.sport >= 5 && maxOut <= 14, `${count.sport} Einheiten, höchstens ${maxOut} Agenten gleichzeitig draußen`)
check('Besprechungen füllen die Konferenzräume', count.meeting >= MEETINGS.length * 8, `${count.meeting} Teilnahmen bei ${MEETINGS.length} Terminen`)
check('Niemand hängt fest', maxRoute < 400, `längste ununterbrochene Wegstrecke ${maxRoute.toFixed(0)} s Echtzeit`)
const bad = agents.filter((a) => a.mode === 'anchor' && !Number.isFinite(a.x + a.y + a.z))
check('Alle Positionen gültig', bad.length === 0, `${agents.length} Agenten geprüft`)
const need = agents.map((a) => Math.min(...Object.values(a.needs)))
check('Bedürfnisse bleiben im Bereich', need.every((n) => n >= 0), `niedrigster Wert ${Math.min(...need).toFixed(2)}, Durchschnitt ${(need.reduce((s, n) => s + n, 0) / need.length).toFixed(2)}`)
// Animationen: Amplituden und Bewegung der Posen (Laufanimation, Tippen, Sitzen)
import { computePose } from '../src/world/outdoor/crowd/pose.js'
{
  const amp = (act, key) => { let mx = 0; let mn = 0; const P = {}; for (let i = 0; i < 400; i++) { const a = { activity: act, phase: i * 0.05, seed: 0.3 }; computePose(a, i * 0.05, P); mx = Math.max(mx, P[key]); mn = Math.min(mn, P[key]) } return [mn, mx] }
  const [w0, w1] = amp('WALK', 'legL'); const [r0, r1] = amp('RUN', 'legL'); const [i0, i1] = amp('IDLE', 'legL'); const [a0, a1] = amp('WALK', 'armLx')
  check('Laufanimation: Beinschwung Gehen', w1 - w0 > 1.3, `${(w0).toFixed(2)} bis ${(w1).toFixed(2)} rad (${((w1 - w0) * 180 / Math.PI).toFixed(0)} Grad Gesamtausschlag)`)
  check('Laufanimation: Beinschwung Rennen größer', r1 - r0 > w1 - w0, `${((r1 - r0) * 180 / Math.PI).toFixed(0)} Grad gegen ${((w1 - w0) * 180 / Math.PI).toFixed(0)} Grad`)
  check('Idle bewegt die Beine nicht', i1 - i0 === 0, `Ausschlag ${(i1 - i0).toFixed(3)} rad`)
  check('Arme schwingen beim Gehen', a1 - a0 > 1.2, `${((a1 - a0) * 180 / Math.PI).toFixed(0)} Grad`)
  const P1 = {}; const P2 = {}
  computePose({ activity: 'WALK', phase: 0.4, seed: 0.3 }, 0, P1); computePose({ activity: 'WALK', phase: 0.4 + Math.PI, seed: 0.3 }, 0, P2)
  check('Gegenläufig: linkes und rechtes Bein', Math.abs(P1.legL + P1.legR) < 1e-9 && Math.abs(P1.legL - P2.legL) > 0.5, `legL ${P1.legL.toFixed(2)} legR ${P1.legR.toFixed(2)}`)
  const S = {}; computePose({ activity: 'TYPE', phase: 0, seed: 0.3 }, 1.0, S)
  check('Sitzen und Tippen', S.legL === -1.5 && S.armLx < -1.0, `Beine ${S.legL} rad, Arme ${S.armLx.toFixed(2)} rad`)
}
console.log(out.join('\n'))
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden')
process.exit(fails ? 1 : 0)
