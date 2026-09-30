// Semantisches Routensystem: Routen als Polylinien mit Oberfläche, Abtastung nach Bogenlänge, Wegegraph mit Dijkstra.
// Die Treppen sind eine NAVIGATIONSFLÄCHE (glatte Neigung), keine einzelnen Stufen.
import { CASCADE } from '../config/bergpark.config.js'
import { heightAt } from '../terrain/heightField.js'
import { NODES } from './routeNodes.js'
import { ROUTES, INTENT_ROUTES } from './routeDefs.js'

export const SURFACE_WIDTH = { plaza: 5, path: 2.6, forest: 1.8, stairs: CASCADE.stairOuter - CASCADE.stairInner, lawn: 3 }
export const SURFACE_SPEED = { plaza: 1, path: 1, forest: 0.9, stairs: 0.72, lawn: 0.9 }

const surfaceBetween = (a, b) => {
  if (a.kind === 'stair' && b.kind === 'stair') return 'stairs'
  if (a.kind === 'forest' || b.kind === 'forest') return 'forest'
  if (a.kind === 'lawn' || b.kind === 'lawn') return 'lawn'
  if (a.kind === 'plaza' && b.kind === 'plaza') return 'plaza'
  return 'path'
}

// Polylinie aus Punkten {id, x, z, kind}
export function polylineFromPts(pts) {
  const segs = []
  let len = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const l = Math.hypot(b.x - a.x, b.z - a.z)
    segs.push({ a, b, len: l, s0: len, surface: surfaceBetween(a, b) })
    len += l
  }
  return { pts, segs, length: len }
}

const buildPolyline = (nodeIds) => polylineFromPts(nodeIds.map((id) => ({ id, ...NODES[id] })))

// Zwei Polylinien verbinden (Ende von a = Anfang von b)
export function concatPolylines(a, b) {
  return polylineFromPts([...a.pts, ...b.pts.slice(1)])
}

export const routes = Object.fromEntries(
  Object.values(ROUTES).map((r) => [r.id, { ...r, ...buildPolyline(r.nodes) }]),
)

export const getRoute = (id) => routes[id]
export const routeForIntent = (intent) => routes[INTENT_ROUTES[intent]]

// Position auf einer Polylinie bei Bogenlänge s. lane in [-1, 1] verschiebt seitlich (Überholen auf breiten Wegen und Treppen).
export function samplePolyline(poly, s, lane = 0, out = {}) {
  const segs = poly.segs
  const sc = Math.min(Math.max(s, 0), poly.length)
  let seg = segs[segs.length - 1]
  for (const sg of segs) {
    if (sc <= sg.s0 + sg.len) { seg = sg; break }
  }
  const t = seg.len > 0 ? (sc - seg.s0) / seg.len : 0
  const dx = (seg.b.x - seg.a.x) / (seg.len || 1)
  const dz = (seg.b.z - seg.a.z) / (seg.len || 1)
  const half = SURFACE_WIDTH[seg.surface] / 2 - 0.4
  const off = lane * Math.max(0.2, half)
  out.x = seg.a.x + (seg.b.x - seg.a.x) * t - dz * off
  out.z = seg.a.z + (seg.b.z - seg.a.z) * t + dx * off
  out.y = heightAt(out.x, out.z) + (seg.surface === 'stairs' ? 0.09 : 0.03)
  out.yaw = Math.atan2(dx, dz)
  out.surface = seg.surface
  return out
}

// Wegegraph (ungerichtet) aus allen Routenkanten
const adj = new Map()
function link(a, b) {
  const l = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].z - NODES[b].z)
  if (!adj.has(a)) adj.set(a, new Map())
  if (!adj.has(b)) adj.set(b, new Map())
  adj.get(a).set(b, l)
  adj.get(b).set(a, l)
}
for (const r of Object.values(ROUTES)) for (let i = 0; i < r.nodes.length - 1; i++) link(r.nodes[i], r.nodes[i + 1])
// zusätzliche Querverbindung Waldkante zum Parkweg
link('forest-edge-e', 'pool-east-3')
link('pool-east-3', 'pool-east-2')

export function nearestNode(x, z) {
  let best = null
  let bd = Infinity
  for (const [id, n] of Object.entries(NODES)) {
    const d = Math.hypot(n.x - x, n.z - z)
    if (d < bd) { bd = d; best = id }
  }
  return best
}

// Kürzester Weg von einer freien Position zu einem Knoten. Ergebnis: Polylinie wie bei Routen.
export function findPathTo(fromX, fromZ, goalNodeId) {
  const start = nearestNode(fromX, fromZ)
  const dist = new Map([[start, 0]])
  const prev = new Map()
  const open = new Set([start])
  while (open.size) {
    let cur = null
    let cd = Infinity
    for (const id of open) if (dist.get(id) < cd) { cd = dist.get(id); cur = id }
    if (cur === goalNodeId) break
    open.delete(cur)
    for (const [nb, l] of adj.get(cur) || []) {
      const nd = cd + l
      if (nd < (dist.get(nb) ?? Infinity)) { dist.set(nb, nd); prev.set(nb, cur); open.add(nb) }
    }
  }
  const ids = []
  for (let cur = goalNodeId; cur; cur = prev.get(cur)) { ids.unshift(cur); if (cur === start) break }
  if (ids[0] !== start) ids.unshift(start)
  const poly = buildPolyline(ids)
  // freier Startpunkt vor dem ersten Knoten
  const l0 = Math.hypot(poly.pts[0].x - fromX, poly.pts[0].z - fromZ)
  if (l0 > 0.5) return polylineFromPts([{ id: 'start', x: fromX, z: fromZ, kind: 'lawn' }, ...poly.pts])
  return poly
}

// Abstand eines Punktes zu allen Wegen ohne Treppen (für Baumausschluss)
const pathSegs = []
for (const r of Object.values(routes)) for (const sg of r.segs) if (sg.surface !== 'stairs') pathSegs.push(sg)
export function distanceToPaths(x, z) {
  let best = Infinity
  for (const sg of pathSegs) {
    const ax = sg.a.x
    const az = sg.a.z
    const bx = sg.b.x - ax
    const bz = sg.b.z - az
    const l2 = bx * bx + bz * bz || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / l2))
    const d = Math.hypot(x - (ax + bx * t), z - (az + bz * t))
    if (d < best) best = d
  }
  return best
}
export const uniquePathSegments = pathSegs
