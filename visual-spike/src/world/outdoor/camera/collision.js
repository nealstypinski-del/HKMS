// Vereinfachte Kollisionen (keine Physik Engine): Kreise, Ellipse, Rechtecke und ein Raster für Baumstämme.
// Es gibt keine Kollision pro Blatt und keine Treppenstufen; der Boden ist die glatte Höhenfunktion.
import { CASCADE, CASCADE_STAGES, MONUMENT, POOL, TOP_POOL, WORLD, FOREST } from '../config/bergpark.config.js'
import { RAIL_GAPS_V, stageLength } from '../cascades/cascadeLayout.js'

const circles = [
  { x: MONUMENT.x, z: MONUMENT.z, r: MONUMENT.colliderR },
  { x: TOP_POOL.x, z: TOP_POOL.z, r: TOP_POOL.r + 1.2 },
]
CASCADE_STAGES.forEach((_, i) => {
  for (const sx of [-5, 5]) circles.push({ x: sx, z: CASCADE.zTop + i * stageLength, r: 0.6 })
})
const ellipses = [{ x: POOL.x, z: POOL.z, a: POOL.a + POOL.rimW + 0.2, b: POOL.b + POOL.rimW + 0.2 }]

const H = WORLD.hq
// HQ Außenhülle (Tür bleibt frei). Innenwände und Möbel liefert das Indoor Modul über setIndoorColliders().
const rects = [
  { x0: -H.halfW - 0.3, x1: -H.doorHalf, z0: -H.halfD - 0.3, z1: -H.halfD + 0.1, y0: -1, y1: 99 },
  { x0: H.doorHalf, x1: H.halfW + 0.3, z0: -H.halfD - 0.3, z1: -H.halfD + 0.1, y0: -1, y1: 99 },
  { x0: -H.halfW - 0.3, x1: -H.halfW + 0.1, z0: -H.halfD - 0.3, z1: H.halfD + 0.3, y0: -1, y1: 99 },
  { x0: H.halfW - 0.1, x1: H.halfW + 0.3, z0: -H.halfD - 0.3, z1: H.halfD + 0.3, y0: -1, y1: 99 },
  { x0: -H.halfW - 0.3, x1: H.halfW + 0.3, z0: H.halfD - 0.1, z1: H.halfD + 0.3, y0: -1, y1: 99 },
  // Wasserkanal der Kaskade (nicht begehbar)
  { x0: -6.9, x1: 6.9, z0: CASCADE.zTop, z1: CASCADE.zTop + CASCADE.length, y0: -1, y1: 999 },
]
let indoorRects = []
export function setIndoorColliders(list) { indoorRects = list }
// Geländer mit Lücken an den Zugängen
const gz = RAIL_GAPS_V.map((v) => CASCADE.zTop + v).sort((a, b) => a - b)
const railSpans = [[CASCADE.zTop, gz[0] - 4], [gz[0] + 4, gz[1] - 4], [gz[1] + 4, CASCADE.zTop + CASCADE.length]]
for (const [a, b] of railSpans) for (const sx of [-1, 1]) {
  const x = sx * CASCADE.railX
  rects.push({ x0: x - 0.15, x1: x + 0.15, z0: a, z1: b, y0: -1, y1: 999 })
}

// Baumstämme in einem Raster (nur nahe Bäume werden geprüft)
const CELL = 12
let grid = new Map()
export function setTreeColliders(trees) {
  grid = new Map()
  for (const t of trees) {
    const k = `${Math.floor(t.x / CELL)},${Math.floor(t.z / CELL)}`
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k).push(t)
  }
}

export function resolveCollisions(pos, radius = 0.4, y = 0) {
  const { minX, maxX, minZ, maxZ } = WORLD.bounds
  pos.x = Math.min(maxX - 6, Math.max(minX + 6, pos.x))
  pos.z = Math.min(maxZ - 6, Math.max(minZ + 6, pos.z))
  for (const c of circles) {
    const dx = pos.x - c.x
    const dz = pos.z - c.z
    const d = Math.hypot(dx, dz)
    const min = c.r + radius
    if (d < min) {
      const k = d > 1e-4 ? min / d : 1
      pos.x = c.x + (d > 1e-4 ? dx * k : min)
      pos.z = c.z + (d > 1e-4 ? dz * k : 0)
    }
  }
  for (const e of ellipses) {
    const qx = (pos.x - e.x) / (e.a + radius)
    const qz = (pos.z - e.z) / (e.b + radius)
    const l = Math.hypot(qx, qz)
    if (l < 1) {
      const k = l > 1e-4 ? 1 / l : 1
      pos.x = e.x + (l > 1e-4 ? qx * k : 1) * (e.a + radius)
      pos.z = e.z + (l > 1e-4 ? qz * k : 0) * (e.b + radius)
    }
  }
  const all = indoorRects.length ? rects.concat(indoorRects) : rects
  for (const r of all) {
    if (r.y0 !== undefined && (y + 1.2 < r.y0 || y > r.y1)) continue
    const x0 = r.x0 - radius
    const x1 = r.x1 + radius
    const z0 = r.z0 - radius
    const z1 = r.z1 + radius
    if (pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1) {
      const pl = pos.x - x0
      const pr = x1 - pos.x
      const pt = pos.z - z0
      const pb = z1 - pos.z
      const m = Math.min(pl, pr, pt, pb)
      if (m === pl) pos.x = x0
      else if (m === pr) pos.x = x1
      else if (m === pt) pos.z = z0
      else pos.z = z1
    }
  }
  const cx = Math.floor(pos.x / CELL)
  const cz = Math.floor(pos.z / CELL)
  const tr = FOREST.colliderRadius + radius
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
    const list = grid.get(`${i},${j}`)
    if (!list) continue
    for (const t of list) {
      const dx = pos.x - t.x
      const dz = pos.z - t.z
      const d = Math.hypot(dx, dz)
      const rr = tr * t.s
      if (d < rr && d > 1e-4) { pos.x = t.x + (dx / d) * rr; pos.z = t.z + (dz / d) * rr }
    }
  }
  return pos
}

// Alle Wandflächen (Außenhülle und Innenwände) für die Kameraführung
export const getAllRects = () => (indoorRects.length ? rects.concat(indoorRects) : rects)
