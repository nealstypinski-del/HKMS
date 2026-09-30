// Semantische Aktivitätsanker der Außenwelt. Terminal 4 entscheidet WANN Agenten sie nutzen, Terminal 6 liefert die ORTE.
import { CASCADE } from '../config/bergpark.config.js'
import { NODES } from '../routes/routeNodes.js'
import { heightAt } from '../terrain/heightField.js'

const A = (id, kind, x, z, yaw, capacity, intents, extra = {}) => ({ id, kind, x, z, yaw, capacity, intents, ...extra })
const n = (id) => NODES[id]
const zv = (v) => CASCADE.zTop + v
const face = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz) // Yaw von (f) nach (t)

export const ANCHORS = [
  A('hq-door-main', 'door', n('hq-door').x, n('hq-door').z, Math.PI, 12, ['RETURN_TO_HQ']),
  // Kaskadenlauf
  A('cascade-run-start', 'run', n('stair-L-bottom').x, n('stair-L-bottom').z, Math.PI, 8, ['RUN_CASCADES', 'WALK_CASCADES'], { routeId: 'cascade-training-loop' }),
  A('cascade-run-checkpoint-01', 'checkpoint', n('stair-L-cp1').x, n('stair-L-cp1').z, Math.PI, 8, ['RUN_CASCADES'], { routeId: 'cascade-training-loop' }),
  A('cascade-run-checkpoint-02', 'checkpoint', n('stair-L-cp2').x, n('stair-L-cp2').z, Math.PI, 8, ['RUN_CASCADES'], { routeId: 'cascade-training-loop' }),
  A('cascade-run-top', 'checkpoint', n('stair-L-top').x, n('stair-L-top').z, Math.PI, 8, ['RUN_CASCADES', 'WALK_TO_HERKULES'], { routeId: 'cascade-training-loop' }),
  // Waldlauf
  A('forest-run-start', 'run', n('f1').x, n('f1').z, 0, 8, ['RUN_FOREST'], { routeId: 'forest-training-loop' }),
  A('forest-run-checkpoint', 'checkpoint', n('f3').x, n('f3').z, 0, 8, ['RUN_FOREST'], { routeId: 'forest-training-loop' }),
  A('stretching-area', 'stretch', -14, -30, face(-14, -30, 0, -50), 6, ['STRETCH']),
  A('herkules-viewpoint', 'viewpoint', n('herkules-viewpoint').x, n('herkules-viewpoint').z, Math.PI, 10, ['WALK_TO_HERKULES']),
  A('water-rest-area', 'water', 26.5, -108, Math.PI / 2, 6, ['REST_OUTSIDE', 'DRINK']),
  A('anchor-coffee-outdoor-01', 'coffee', 14, -20, face(14, -20, 0, -10), 4, ['REST_OUTSIDE']),
  // Bänke: yaw = Blickrichtung der sitzenden Person
  A('bench-rest-01', 'bench', -12, -38, face(-12, -38, 0, -60), 3, ['REST_OUTSIDE']),
  A('bench-plaza-02', 'bench', 12, -38, face(12, -38, 0, -60), 3, ['REST_OUTSIDE']),
  A('bench-park-01', 'bench', -22, -92, face(-22, -92, 0, -108), 3, ['REST_OUTSIDE']),
  A('bench-park-02', 'bench', 22, -92, face(22, -92, 0, -108), 3, ['REST_OUTSIDE']),
  A('bench-water-01', 'bench', 27.5, -100, face(27.5, -100, 0, -112), 3, ['REST_OUTSIDE']),
  A('bench-water-02', 'bench', 28.5, -122, face(28.5, -122, 0, -112), 3, ['REST_OUTSIDE']),
  A('bench-cascade-01', 'bench', -16.5, zv(140), Math.PI / 2, 3, ['REST_OUTSIDE']),
  A('bench-cascade-02', 'bench', 16.5, zv(70), -Math.PI / 2, 3, ['REST_OUTSIDE']),
  A('bench-cascade-03', 'bench', -16.5, zv(200), Math.PI / 2, 3, ['REST_OUTSIDE']),
  A('bench-cascade-04', 'bench', 16.5, zv(170), -Math.PI / 2, 3, ['REST_OUTSIDE']),
  A('bench-forest-01', 'bench', 94, -137, face(94, -137, 60, -137), 3, ['REST_OUTSIDE']),
  A('bench-forest-02', 'bench', 54, -177, face(54, -177, 30, -177), 3, ['REST_OUTSIDE']),
  A('bench-herkules-01', 'bench', -14, -368, face(-14, -368, 0, -395), 3, ['REST_OUTSIDE']),
  A('bench-herkules-02', 'bench', 14, -368, face(14, -368, 0, -395), 3, ['REST_OUTSIDE']),
].map((a) => ({ ...a, y: heightAt(a.x, a.z) }))

const byId = new Map(ANCHORS.map((a) => [a.id, a]))
export const getAnchor = (id) => byId.get(id)
export const listAnchors = (kind) => (kind ? ANCHORS.filter((a) => a.kind === kind) : ANCHORS)
export const benchAnchors = () => ANCHORS.filter((a) => a.kind === 'bench')
export const anchorsForIntent = (intent) => ANCHORS.filter((a) => a.intents.includes(intent))
