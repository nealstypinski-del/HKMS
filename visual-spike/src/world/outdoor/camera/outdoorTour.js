// Entwicklerkommando RUN OUTDOOR TOUR: eine Begehung durch die Welt (HQ Lobby bis zurück ins HQ) für die visuelle Qualitätssicherung.
// Die Wege kommen aus dem semantischen Wegegraph, die Kamera läuft am Boden (Augenhöhe), sie fliegt nicht.
import { MONUMENT } from '../config/bergpark.config.js'
import { NODES } from '../routes/routeNodes.js'
import { findPathTo, nearestNode, polylineFromPts, concatPolylines } from '../routes/OutdoorRouteSystem.js'
import { heightAt } from '../terrain/heightField.js'

const herkulesEye = () => ({ x: MONUMENT.x, z: MONUMENT.z + 20, y: heightAt(MONUMENT.x, MONUMENT.z) + 62 })

export const TOUR_STOPS = [
  { id: 'hq-lobby', label: 'HQ Lobby', at: { x: 0, z: -1.5 }, look: { x: 0, z: -40, y: 1.7 }, dwell: 2.5 },
  { id: 'hq-exterior', label: 'HQ Außenbereich', node: 'plaza-center', look: () => herkulesEye(), dwell: 3.5 },
  { id: 'result-pool', label: 'Ergebnisbecken', node: 'pool-west', look: { x: 0, z: -112, y: 3 }, dwell: 3.5 },
  { id: 'cascade-bottom', label: 'Kaskade unten', node: 'stair-L-bottom', look: { x: 0, z: -250, y: 38 }, dwell: 3.5 },
  { id: 'cascade-middle', label: 'Kaskade Mitte', node: 'stair-L-mid', look: { x: 0, z: -150, y: 12 }, dwell: 3.5 },
  { id: 'cascade-top', label: 'Kaskade oben', node: 'stair-L-top', look: () => herkulesEye(), dwell: 3.5 },
  { id: 'herkules', label: 'Herkules', node: 'herkules-viewpoint', look: () => herkulesEye(), dwell: 4 },
  { id: 'forest', label: 'Wald', node: 'f4', look: { x: 60, z: -150, y: 40 }, dwell: 3.5 },
  { id: 'hq', label: 'Zurück ins HQ', at: { x: 0, z: -1.5 }, look: { x: 0, z: 12, y: 1.7 }, dwell: 2.5 },
]

export function stopPosition(stop) {
  if (stop.at) return { x: stop.at.x, z: stop.at.z }
  const n = NODES[stop.node]
  return { x: n.x, z: n.z }
}

// Polylinie vom aktuellen Stopp zum nächsten (über den Wegegraph)
export function legBetween(from, stop) {
  const target = stopPosition(stop)
  const nodeId = stop.node || nearestNode(target.x, target.z)
  let poly = findPathTo(from.x, from.z, nodeId)
  if (stop.at) {
    const last = poly.pts[poly.pts.length - 1]
    if (Math.hypot(last.x - target.x, last.z - target.z) > 0.5) {
      poly = concatPolylines(poly, polylineFromPts([last, { id: stop.id, x: target.x, z: target.z, kind: 'plaza' }]))
    }
  }
  return poly
}

export const lookTarget = (stop) => (typeof stop.look === 'function' ? stop.look() : stop.look)
