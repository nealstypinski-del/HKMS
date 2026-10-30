// Besetzung der Simulation (rein, ohne Rendering): Agenten aus den Etagendaten, Gäste, Rundgänger. Wird von der Szene und von den Prüfskripten genutzt.
import { createAgent, placeAtSeat } from '../outdoor/agents/outdoorAgentSim.js'
import { buildRoster } from './roster.js'
import { initBrain, MEETINGS } from './simBrain.js'
import { SOFA_ANCHORS } from '../indoor/nav/indoorAnchors.js'

const SHIRTS = ['#ff8a3d', '#2fd6c0', '#5b6ee1', '#e15b7a', '#f2c94c', '#8e6bd8', '#3aa76d', '#e8e8e8']
const HAIR = ['#2b2118', '#6b4423', '#c9a24a', '#1c1c1c', '#a33b2a', '#5a5a5a']
const SKINS = ['#f1c9a5', '#e0a97f', '#c68863', '#8d5a3b', '#f7d9bf']
const PANTS = ['#2c3350', '#3a3f4d', '#4a3b2b', '#20232b', '#5b4d3a', '#39506b']
const EXTRA_NAMES = ['Gast Alex', 'Gast Bea', 'Gast Cem', 'Gast Dana', 'Gast Eli', 'Gast Fay', 'Gast Gio', 'Gast Hal']
export const DEMO = [['RUN_CASCADES', 2], ['RUN_FOREST', 6], ['REST_OUTSIDE', 10], ['WALK_TO_HERKULES', 14], ['STRETCH', 18]]
const rnd = Math.random

export const makeLook = (i) => ({ shirt: SHIRTS[i % SHIRTS.length], pants: PANTS[(i * 3) % PANTS.length], hair: HAIR[(i * 7) % HAIR.length], skin: SKINS[(i * 5 + 1) % SKINS.length] })

export function buildPopulation(total = 47) {
  const agents = []
  const roster = buildRoster()
  const list = roster.slice(0, Math.min(total, roster.length))
  let demoIdx = 0
  list.forEach((p, i) => {
    const a = createAgent(`agent-${i + 1}`, p.name, { role: p.role })
    a.look = makeLook(i); a.seed = (i * 0.137) % 1; a.height = 0.94 + ((i * 37) % 13) / 100
    initBrain(a, p)
    a.homeSeat = p.desk || SOFA_ANCHORS[i % SOFA_ANCHORS.length]
    if (!p.desk) { a.status = 'available'; a.baseStatus = 'available' } // ohne Schreibtisch: frei verfügbar
    placeAtSeat(a, a.homeSeat, a.homeSeat.kind === 'desk' ? `arbeitet · ${a.homeSeat.team}` : 'Pause')
    if (a.homeSeat.kind !== 'desk') a.activity = 'SIT'
    a.brain.meetingSet = p.status === 'meeting' ? new Set(MEETINGS.map((_, k) => k)) : new Set(MEETINGS.map((_, k) => k).filter(() => rnd() < 0.18))
    if (p.status === 'available' && demoIdx < DEMO.length) {
      a.brain.sporty = true
      a.spawnDelay = DEMO[demoIdx][1]
      a.nextIntent = DEMO[demoIdx][0]
      a.brain.action = 'Sport'; a.brain.sportT = 30 + demoIdx * 6
      demoIdx++
    } else a.brain.sporty = p.status === 'available' || rnd() < 0.08
    agents.push(a)
  })
  for (let k = roster.length; k < total; k++) {
    const a = createAgent(`agent-${k + 1}`, EXTRA_NAMES[k % EXTRA_NAMES.length], { role: 'Gast' })
    a.look = makeLook(k); a.seed = (k * 0.137) % 1; a.height = 1
    initBrain(a, { role: 'Gast', status: 'available', dept: 'hj' })
    a.homeSeat = SOFA_ANCHORS[k % SOFA_ANCHORS.length]
    a.brain.sporty = true
    placeAtSeat(a, a.homeSeat, 'Gast'); a.activity = 'SIT'
    a.spawnDelay = 3 + (k - roster.length) * 1.3
    a.nextIntent = ['RUN_CASCADES', 'RUN_FOREST', 'WALK_CASCADES', 'REST_OUTSIDE', 'STRETCH', 'WALK_TO_HERKULES'][k % 6]
    a.brain.action = 'Sport'; a.brain.sportT = 30
    agents.push(a)
  }
  for (let k = 0; k < 3; k++) {
    const id = agents.length
    const a = createAgent(`agent-${id + 1}`, ['Rio', 'Tessa', 'Lars'][k], { role: 'Rundgang' })
    a.look = makeLook(id + 3); a.seed = (id * 0.211) % 1; a.height = 1
    initBrain(a, { role: 'Rundgang', status: 'working', dept: 'hj' })
    a.x = 0; a.z = -9; a.y = 0; a.mode = 'inside'; a.visible = false
    a.spawnDelay = 1 + k * 7; a.nextIntent = 'PATROL_INDOOR'; a.routeId = k % 2 ? 'indoor-loop-b' : 'indoor-loop-a'
    a.brain.cool = 1e9
    agents.push(a)
  }
  return agents
}
