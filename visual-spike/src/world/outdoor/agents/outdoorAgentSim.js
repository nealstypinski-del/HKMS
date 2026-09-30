// Kleine Simulation der Außenagenten für Demo und Integrationsvertrag.
// WICHTIG: Terminal 4 entscheidet über Verhalten und Verfügbarkeit. Hier gibt es nur Bewegung entlang semantischer Routen.
// Stamina ist reiner Spiel und Anzeigezustand und begrenzt niemals echte Arbeit: interrupt() wirkt sofort.
import { findPathTo, concatPolylines, polylineFromPts, routeForIntent, samplePolyline, SURFACE_SPEED } from '../routes/OutdoorRouteSystem.js'
import { NODES } from '../routes/routeNodes.js'
import { ANCHORS, getAnchor, anchorsForIntent } from '../activities/OutdoorActivityAnchors.js'

export const INTENT_LABEL = {
  RUN_CASCADES: 'Kaskadenlauf', RUN_FOREST: 'Waldlauf', WALK_CASCADES: 'Spaziergang Kaskaden', WALK_TO_HERKULES: 'Weg zum Herkules',
  REST_OUTSIDE: 'Pause', STRETCH: 'Dehnen', RETURN_TO_HQ: 'Zurück ins HQ',
}
const RUN = 3.6
const WALK = 1.6
const occupancy = new Map() // anchorId -> Set(agentId)

export function createAgent(id, name, look = {}) {
  return {
    id, name, ...look, x: NODES['hq-door'].x, y: 0, z: NODES['hq-door'].z, yaw: Math.PI,
    mode: 'inside', // inside | route | anchor
    visible: false, activity: 'IDLE', speed: 0, intent: null, label: 'im HQ', lane: 0, stamina: 1,
    poly: null, s: 0, loopStart: 0, loop: false, base: WALK, anchorId: null, seatIndex: 0, spawnDelay: 0,
  }
}

function release(a) {
  if (a.anchorId && occupancy.has(a.anchorId)) occupancy.get(a.anchorId).delete(a.id)
  a.anchorId = null
}

function startPoly(a, poly, { activity, base, loop = false, loopStart = 0 }) {
  a.poly = poly; a.s = 0; a.loop = loop; a.loopStart = loopStart; a.base = base; a.activity = activity; a.mode = 'route'; a.visible = true
}

// Vertragsschnittstelle: Absicht setzen (Terminal 4 ruft dies auf)
export function assignIntent(a, intent, opts = {}) {
  release(a)
  a.intent = intent
  a.label = INTENT_LABEL[intent] || intent
  const from = { x: a.x, z: a.z }
  if (a.mode === 'inside') { from.x = NODES['hq-door'].x; from.z = NODES['hq-door'].z }
  switch (intent) {
    case 'RUN_CASCADES': case 'RUN_FOREST': case 'WALK_CASCADES': case 'WALK_TO_HERKULES': {
      const route = routeForIntent(intent)
      const run = intent.startsWith('RUN')
      const first = findPathTo(from.x, from.z, route.nodes[0])
      const poly = concatPolylines(first, route)
      startPoly(a, poly, { activity: run ? 'RUN' : 'WALK', base: run ? RUN : WALK, loop: route.loop, loopStart: first.length })
      break
    }
    case 'RETURN_TO_HQ': {
      const poly = findPathTo(from.x, from.z, 'hq-door')
      startPoly(a, poly, { activity: 'RUN', base: RUN * 1.3 })
      break
    }
    case 'REST_OUTSIDE': case 'STRETCH': {
      const list = opts.anchorId ? [getAnchor(opts.anchorId)] : anchorsForIntent(intent)
      // freien Anker in der Nähe wählen
      const cand = list
        .filter((c) => (occupancy.get(c.id)?.size || 0) < c.capacity)
        .sort((p, q) => Math.hypot(p.x - from.x, p.z - from.z) - Math.hypot(q.x - from.x, q.z - from.z))[0]
      if (!cand) { a.mode = 'anchor'; a.activity = 'IDLE'; break }
      if (!occupancy.has(cand.id)) occupancy.set(cand.id, new Set())
      occupancy.get(cand.id).add(a.id)
      a.anchorId = cand.id
      a.seatIndex = occupancy.get(cand.id).size - 1
      const nearest = findPathTo(from.x, from.z, nearestNodeFor(cand))
      const last = nearest.pts[nearest.pts.length - 1]
      const seat = seatPosition(cand, a.seatIndex)
      const poly = polylineFromPts([...nearest.pts, { id: cand.id, x: seat.x, z: seat.z, kind: 'lawn' }].filter((p, i, arr) => i === 0 || p !== last || i === arr.length - 1))
      startPoly(a, poly, { activity: 'WALK', base: WALK })
      break
    }
    default: break
  }
}

function nearestNodeFor(anchor) {
  let best = null; let bd = Infinity
  for (const [id, n] of Object.entries(NODES)) {
    const d = Math.hypot(n.x - anchor.x, n.z - anchor.z)
    if (d < bd) { bd = d; best = id }
  }
  return best
}

export function seatPosition(anchor, index) {
  // Sitzplätze nebeneinander, senkrecht zur Blickrichtung
  const off = (index - (anchor.capacity - 1) / 2) * 0.55
  const rx = -Math.cos(anchor.yaw)
  const rz = Math.sin(anchor.yaw)
  return { x: anchor.x + rx * off, z: anchor.z + rz * off }
}

// Sofort unterbrechbar: keine Ausdauerprüfung, kein Warten
export function interrupt(a) {
  release(a)
  assignIntent(a, 'RETURN_TO_HQ')
}

const tmp = {}
export function stepAgent(a, dt) {
  if (a.spawnDelay > 0) { a.spawnDelay -= dt; return }
  if (a.mode === 'route' && a.poly) {
    const cur = samplePolyline(a.poly, a.s, 0, tmp)
    const factor = SURFACE_SPEED[cur.surface] || 1
    const staminaFactor = a.activity === 'RUN' ? 0.75 + 0.25 * a.stamina : 1 // nur Darstellung
    const sp = a.base * factor * staminaFactor
    a.s += sp * dt
    a.speed = sp
    if (a.s >= a.poly.length) {
      if (a.loop) a.s = a.loopStart
      else if (a.intent === 'RETURN_TO_HQ') { a.mode = 'inside'; a.visible = false; a.activity = 'IDLE'; a.speed = 0; a.label = 'im HQ'; return }
      else { arrive(a); return }
    }
    const p = samplePolyline(a.poly, a.s, a.lane, tmp)
    a.x = p.x; a.y = p.y; a.z = p.z; a.yaw = p.yaw
    a.stamina = Math.max(0, a.stamina - (a.activity === 'RUN' ? dt * 0.012 : 0)) + (a.activity === 'RUN' ? 0 : dt * 0.03)
    a.stamina = Math.min(1, a.stamina)
  } else if (a.mode === 'anchor') {
    a.speed = 0
    a.stamina = Math.min(1, a.stamina + dt * 0.05)
  }
}

function arrive(a) {
  a.mode = 'anchor'
  a.speed = 0
  const anc = a.anchorId ? getAnchor(a.anchorId) : null
  if (a.intent === 'REST_OUTSIDE' && anc) {
    a.activity = anc.kind === 'bench' ? 'SIT' : anc.kind === 'water' ? 'DRINK' : 'IDLE'
    a.yaw = anc.yaw
    const seat = seatPosition(anc, a.seatIndex)
    a.x = seat.x; a.z = seat.z; a.y = anc.y + (a.activity === 'SIT' ? 0.02 : 0)
  } else if (a.intent === 'STRETCH' && anc) {
    a.activity = 'STRETCH'; a.yaw = anc.yaw
    const seat = seatPosition(anc, a.seatIndex)
    a.x = seat.x; a.z = seat.z
  } else if (a.intent === 'WALK_TO_HERKULES') {
    a.activity = 'IDLE'; a.yaw = Math.PI; a.label = 'Aussicht am Herkules'
  } else a.activity = 'IDLE'
}

export { ANCHORS }
