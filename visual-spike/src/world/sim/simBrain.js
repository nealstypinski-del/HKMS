// Verhalten der Agenten im Stil der Sims: Bedürfnisse, Tagesplan, Aufgaben, Besprechungen, Pausen und Sport.
// Terminal 4 besitzt später die echte Verhaltenslogik. Diese Datei zeigt den Vertrag: sie ruft nur assignIntent, goSpot und interrupt der Bewegungsschicht auf.
// Stamina und Bedürfnisse sind Spielzustand und begrenzen NIE echte Arbeit: eintreffende Aufgaben unterbrechen jede Pause sofort.
import { assignIntent, goSpot, interrupt, levelOfAgent } from '../outdoor/agents/outdoorAgentSim.js'
import { DESK_ANCHORS, MEETING_ANCHORS, SOFA_ANCHORS, STATION_ANCHORS } from '../indoor/nav/indoorAnchors.js'
import { triggerCompletionPulse } from '../outdoor/water/CompletionPulse.js'
import { taskTitles } from './roster.js'
import { hour, clock } from './simClock.js'

export const NEEDS = [
  ['energy', 'Energie'], ['hunger', 'Hunger'], ['social', 'Sozial'], ['comfort', 'Komfort'], ['fun', 'Spaß'],
]
const DECAY = { energy: 0.0006, hunger: 0.0011, social: 0.0009, comfort: 0.0007, fun: 0.001 } // je Simulationsminute
const CATEGORY = { hj: 'job', km: 'content', ai: 'dev', vertrieb: 'workflow' }

// Tagesplan der Besprechungen (Simulationsminuten seit Mitternacht)
export const MEETINGS = [
  { start: 10 * 60, dur: 40, room: 'herkules', name: 'Tagesplanung' },
  { start: 11 * 60 + 30, dur: 30, room: 'loewenburg', name: 'Freigaben' },
  { start: 14 * 60, dur: 40, room: 'oktogon', name: 'Kundentermin' },
  { start: 16 * 60, dur: 30, room: 'kaskade', name: 'Abstimmung' },
]

const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const seatTaken = new Map() // seatId -> agentId

export function initBrain(a, person) {
  a.needs = { energy: rnd(0.55, 1), hunger: rnd(0.45, 1), social: rnd(0.4, 1), comfort: rnd(0.6, 1), fun: rnd(0.4, 1) }
  a.person = person
  a.dept = person?.dept || 'hj'
  a.status = person?.status || 'working'
  a.baseStatus = a.status
  a.brain = { cool: rnd(10, 60), action: null, actionT: 0, meeting: -1, sporty: false }
  a.task = null
  a.taskTimer = rnd(3, 40)
  a.bubble = null
  a.completed = 0
  a.mood = 0.7
}

export const isBusy = (a) => a.mode === 'route' || a.brain.actionT > 0

function freeSeat(room) {
  return MEETING_ANCHORS.find((s) => s.room === room && !seatTaken.has(s.id))
}
const release = (a) => { for (const [k, v] of seatTaken) if (v === a.id) seatTaken.delete(k) }

function backToWork(a) {
  release(a)
  a.brain.action = null; a.brain.actionT = 0
  if (a.homeSeat) assignIntent(a, 'WORK_AT_DESK', { seat: a.homeSeat, label: 'Zurück an den Platz' })
}

function startSpot(a, spot, activity, minutes, label, bubble) {
  a.brain.action = label
  a.brain.actionDur = minutes
  goSpot(a, spot, { activity, duration: minutes, label })
  a.bubble = bubble || null
}

function updateNeeds(a, dtMin) {
  const N = a.needs
  const act = a.activity
  for (const k of Object.keys(DECAY)) N[k] = Math.max(0, N[k] - DECAY[k] * dtMin)
  if (a.mode === 'anchor') {
    const label = a.brain.action
    if (label === 'Kaffee') { N.hunger = Math.min(1, N.hunger + 0.14 * dtMin); N.energy = Math.min(1, N.energy + 0.03 * dtMin) }
    if (label === 'Wasserspender') { N.social = Math.min(1, N.social + 0.1 * dtMin); N.hunger = Math.min(1, N.hunger + 0.02 * dtMin) }
    if (label === 'Sofa') { N.energy = Math.min(1, N.energy + 0.05 * dtMin); N.comfort = Math.min(1, N.comfort + 0.08 * dtMin) }
    if (label === 'Meeting') N.social = Math.min(1, N.social + 0.02 * dtMin)
    if (act === 'SIT' || act === 'TYPE') N.comfort = Math.min(1, N.comfort + 0.0006 * dtMin)
  }
  if (a.baseActivity === 'RUN') { N.fun = Math.min(1, N.fun + 0.02 * dtMin); N.energy = Math.max(0, N.energy - 0.004 * dtMin) }
  if (a.baseActivity === 'WALK' && a.mode === 'route') N.fun = Math.min(1, N.fun + 0.004 * dtMin)
  const avg = (N.energy + N.hunger + N.social + N.comfort + N.fun) / 5
  a.mood += (avg - a.mood) * Math.min(1, dtMin * 0.05)
}

// Aufgaben: Arbeitsfortschritt am Platz, Abschluss löst einen Lichtpuls in der Kaskade aus
function updateTask(a, dtMin, events) {
  const atDesk = a.mode === 'anchor' && a.seat && a.seat.kind === 'desk' && a.activity === 'TYPE'
  if (a.baseStatus === 'error') { a.status = 'error'; return }
  if (!a.task) {
    if (a.status === 'meeting') return
    a.taskTimer -= dtMin
    if (a.taskTimer <= 0 && a.homeSeat) {
      a.task = { title: pick(taskTitles(a.dept)), progress: 0, dur: rnd(6, 16) }
      if (a.status !== 'waiting') a.status = 'working'
      a.bubble = { type: 'task', ttl: 4 }
      events.push({ type: 'task', agent: a })
      // Aufgabe trifft ein: jede Pause und jeder Sport wird sofort unterbrochen
      if (a.mode === 'route' && !a.seat) { interrupt(a); a.brain.action = null; a.brain.actionT = 0 }
      else if (a.brain.actionT > 0 && a.brain.action !== 'Meeting') backToWork(a)
    }
    return
  }
  if (a.status === 'waiting') {
    a.brain.waitT = (a.brain.waitT ?? rnd(1.5, 4)) - dtMin
    if (a.brain.waitT <= 0) { a.status = 'working'; a.brain.waitT = undefined; a.bubble = { type: 'check', ttl: 3 }; a.task.progress = Math.max(a.task.progress, 0.9) }
    return
  }
  if (atDesk) {
    a.task.progress += dtMin / a.task.dur
    if (a.task.progress >= 1) {
      a.completed++
      if (Math.random() < 0.3 && a.baseStatus !== 'error') { a.status = 'waiting'; a.task.progress = 0.95; a.bubble = { type: 'question', ttl: 5 } } // wartet auf Freigabe
      else {
        triggerCompletionPulse(`${a.id}-${a.completed}`, CATEGORY[a.dept] || 'default')
        events.push({ type: 'done', agent: a, title: a.task.title })
        a.bubble = { type: 'check', ttl: 4 }
        a.task = null
        a.taskTimer = rnd(6, 30)
        a.status = a.baseStatus === 'available' ? 'available' : 'working'
      }
    }
  }
}

function decide(a, ctx) {
  const N = a.needs
  const h = hour()
  const day = h >= 7 && h < 19
  const L = levelOfAgent(a)
  const cands = []
  if (a.homeSeat && a.homeSeat.kind === 'desk' && !(a.mode === 'anchor' && a.seat && a.seat.kind === 'desk') && a.status !== 'available') cands.push(['work', 1.6])
  if (a.status !== 'error') {
    if (N.hunger < 0.45) cands.push(['coffee', (1 - N.hunger) * 1.8])
    if (N.social < 0.4) cands.push(['cooler', (1 - N.social) * 1.5])
    if (N.energy < 0.4 || N.comfort < 0.35) cands.push(['sofa', (1 - Math.min(N.energy, N.comfort)) * 1.5])
    if (day && a.brain.sporty && N.fun < 0.6 && ctx.outdoor < 6) cands.push(['sport', (1 - N.fun) * 2])
    if (a.status === 'available') cands.push(['sofa', 0.6], ['coffee', 0.5], ['cooler', 0.5])
  }
  if (!cands.length) return
  const total = cands.reduce((s, c) => s + c[1], 0)
  let r = Math.random() * total
  let choice = cands[0][0]
  for (const [k, w] of cands) { r -= w; if (r <= 0) { choice = k; break } }
  if (choice === 'work') backToWork(a)
  else if (choice === 'coffee') startSpot(a, STATION_ANCHORS.coffee, 'DRINK', rnd(3, 5), 'Kaffee', { type: 'coffee', ttl: 30 })
  else if (choice === 'cooler') startSpot(a, STATION_ANCHORS.cooler, 'TALK', rnd(3, 6), 'Wasserspender', { type: 'chat', ttl: 30 })
  else if (choice === 'sofa') {
    const s = SOFA_ANCHORS.filter((x) => !seatTaken.has(x.id) && x.level === L).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0]
      || SOFA_ANCHORS.find((x) => !seatTaken.has(x.id))
    if (s) { seatTaken.set(s.id, a.id); startSpot(a, s, 'SIT', rnd(8, 14), 'Sofa', { type: 'zzz', ttl: 40 }) }
  } else if (choice === 'sport') {
    const intent = pick(['RUN_CASCADES', 'RUN_FOREST', 'WALK_TO_HERKULES', 'STRETCH', 'REST_OUTSIDE'])
    a.brain.action = 'Sport'; a.brain.actionT = rnd(25, 45)
    assignIntent(a, intent)
    a.brain.sportT = a.brain.actionT
  }
}

function startMeeting(a, m, idx) {
  const seat = freeSeat(m.room)
  if (!seat) return
  seatTaken.set(seat.id, a.id)
  a.brain.meeting = idx
  a.brain.action = 'Meeting'; a.brain.actionT = m.dur + 5
  assignIntent(a, 'ATTEND_MEETING', { seat, label: `Meeting · ${m.name}` })
  a.bubble = { type: 'chat', ttl: 6 }
}

// ctx: { events: [], outdoor: Anzahl draußen }
export function stepBrain(a, dtMin, ctx) {
  updateNeeds(a, dtMin)
  updateTask(a, dtMin, ctx.events)
  if (a.bubble && a.bubble.ttl < 900) { a.bubble.ttl -= dtMin; if (a.bubble.ttl <= 0) a.bubble = null }
  const t = clock.minutes % 1440
  // Besprechungen: Beginn und Ende
  MEETINGS.forEach((m, idx) => {
    const attends = a.person && (a.person.status === 'meeting' || /manager|strateg/i.test(a.person.role) || a.brain.meetingSet?.has(idx))
    if (attends && t >= m.start && t < m.start + 2 && a.brain.meeting !== idx && a.status !== 'error' && a.homeSeat) startMeeting(a, m, idx)
    if (a.brain.meeting === idx && t >= m.start + m.dur && a.brain.action === 'Meeting') { a.brain.meeting = -1; backToWork(a) }
  })
  // Sportzeit läuft ab
  if (a.brain.action === 'Sport' && a.mode !== 'route' && a.brain.actionT > 0) a.brain.actionT -= dtMin
  if (a.brain.action === 'Sport') {
    a.brain.sportT -= dtMin
    if (a.brain.sportT <= 0 && a.intent !== 'RETURN_TO_HQ' && !a.seat) { interrupt(a); a.brain.action = 'Rückweg' }
  }
  if (a.mode !== 'anchor') return
  // Pausen laufen ab
  if (a.brain.action && a.brain.action !== 'Meeting' && a.brain.action !== 'Sport' && a.brain.action !== 'Rückweg') {
    if (a.brain.actionT > 0) { a.brain.actionT -= dtMin; if (a.brain.actionT <= 0) backToWork(a) }
    return
  }
  if (a.brain.action === 'Meeting' || a.brain.action === 'Sport') return
  a.brain.cool -= dtMin
  if (a.brain.cool <= 0) { a.brain.cool = rnd(20, 55); decide(a, ctx) }
}

// Bedienung von außen (Menü, später Terminal 4)
export function command(a, cmd) {
  release(a)
  a.brain.action = null; a.brain.actionT = 0
  if (cmd === 'desk') backToWork(a)
  else if (cmd === 'coffee') startSpot(a, STATION_ANCHORS.coffee, 'DRINK', 4, 'Kaffee', { type: 'coffee', ttl: 30 })
  else if (cmd === 'cooler') startSpot(a, STATION_ANCHORS.cooler, 'TALK', 5, 'Wasserspender', { type: 'chat', ttl: 30 })
  else if (cmd === 'sofa') { const s = SOFA_ANCHORS.find((x) => !seatTaken.has(x.id)); if (s) { seatTaken.set(s.id, a.id); startSpot(a, s, 'SIT', 10, 'Sofa', { type: 'zzz', ttl: 40 }) } }
  else if (cmd === 'sport') { a.brain.action = 'Sport'; a.brain.actionT = 30; a.brain.sportT = 30; assignIntent(a, 'RUN_CASCADES') }
  else if (cmd === 'task') { a.task = null; a.taskTimer = 0; a.status = a.baseStatus === 'available' ? 'working' : a.status }
}

export function bubbleFor(a) {
  if (a.status === 'error') return 'excl'
  if (a.bubble) return a.bubble.type
  if (a.status === 'waiting') return 'question'
  if (a.activity === 'DRINK') return 'coffee'
  if (a.activity === 'TALK') return 'chat'
  return null
}
export { DESK_ANCHORS }
