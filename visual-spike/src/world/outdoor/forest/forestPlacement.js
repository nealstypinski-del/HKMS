// Deterministische Platzierung von Bäumen, Büschen, Felsen und Grasbüscheln (einmal berechnet, danach nur gelesen).
// Bäume werden in Clustern verteilt, Wege und Sonderzonen bleiben frei. Kein Objekt pro Blatt, nur Daten.
import { WORLD, CASCADE, FOREST, MONUMENT, POOL } from '../config/bergpark.config.js'
import { heightAt, slopeAt } from '../terrain/heightField.js'
import { fbm, hash2, smoothstep } from '../common/noise.js'
import { distanceToPaths } from '../routes/OutdoorRouteSystem.js'
import { ANCHORS } from '../activities/OutdoorActivityAnchors.js'

function forestDensity(x, z) {
  const ax = Math.abs(x)
  let base
  if (z > -58) {
    base = z > 20 ? 0.75 : 0.55 * smoothstep(30, 60, ax) // Wäldchen seitlich der Plaza, Wald hinter dem HQ
    if (z > 12 && ax < 30) base = Math.max(base, 0.5 * smoothstep(12, 30, z))
  } else {
    base = smoothstep(FOREST.edgeX - 2, FOREST.edgeX + 10, ax)
  }
  // Herkulesplateau frei
  const dm = Math.hypot(x - MONUMENT.x, z - MONUMENT.z)
  base *= smoothstep(48, 78, dm)
  // Ergebnisbecken mit Rand frei
  const pr = Math.hypot((x - POOL.x) / (POOL.a + 6), (z - POOL.z) / (POOL.b + 6))
  if (pr < 1) base = 0
  return base
}

export function isReserved(x, z, margin = 0) {
  // HQ und Plaza
  if (x > -36 - margin && x < 36 + margin && z > -62 - margin && z < 22 + margin) return true
  // Anker (Bänke usw.)
  for (const a of ANCHORS) if (Math.hypot(a.x - x, a.z - z) < 3.5 + margin) return true
  return false
}

const inCascadeLawn = (x, z) => z < -55 && z > -350 && Math.abs(x) < FOREST.edgeX + 2
const treeVariant = (x, z, h1) => {
  const alt = smoothstep(80, 130, heightAt(x, z))
  const r = h1 * 0.7 + fbm(x * 0.02, z * 0.02, 2, 21) * 0.3
  if (r < 0.32 - alt * 0.15) return 0
  if (r < 0.55 - alt * 0.15) return 1
  return 2
}

export function buildForestPlacement() {
  const { minX, maxX, minZ, maxZ } = WORLD.bounds
  const trees = []
  const cell = FOREST.cell
  for (let cz = Math.ceil(minZ / cell); cz * cell < maxZ - 10; cz++) {
    for (let cx = Math.ceil((minX + 10) / cell); cx * cell < maxX - 10; cx++) {
      const h1 = hash2(cx, cz, FOREST.seed)
      const h2 = hash2(cx, cz, FOREST.seed + 1)
      const h3 = hash2(cx, cz, FOREST.seed + 2)
      const x = (cx + (h1 - 0.5) * 0.9) * cell
      const z = (cz + (h2 - 0.5) * 0.9) * cell
      if (isReserved(x, z, 2)) continue
      const d = forestDensity(x, z)
      if (d <= 0.01) continue
      const cluster = 0.35 + 0.65 * smoothstep(0.3, 0.6, fbm(x * 0.018, z * 0.018, 3, 11))
      if (hash2(cx, cz, FOREST.seed + 3) > d * cluster * 1.05) continue
      if (distanceToPaths(x, z) < 3.2) continue
      if (slopeAt(x, z) > 0.75) continue
      trees.push({
        x, z, y: heightAt(x, z) - 0.15, s: 0.85 + h3 * 0.5, ry: h1 * 6.283, variant: treeVariant(x, z, h3),
        tint: 0.85 + hash2(cx, cz, 9) * 0.25, rank: hash2(cx, cz, 5),
      })
    }
  }
  // Baumreihen (Allee) beidseits des Kaskadenrasens, Säulenform
  const al = FOREST.allee
  for (const side of [-1, 1]) {
    for (let z = al.zFrom; z >= al.zTo; z -= al.spacing) {
      const x = side * al.x
      trees.push({ x, z, y: heightAt(x, z) - 0.1, s: 0.95 + hash2(side, z, 4) * 0.2, ry: hash2(side, z, 2) * 6.28, variant: 3, tint: 1, rank: 0 })
    }
  }
  // Nach Rang sortieren, damit Qualitätsstufen einfach abschneiden können. Bei Überschreitung des Limits die letzten verwerfen.
  trees.sort((a, b) => a.rank - b.rank)
  if (trees.length > FOREST.maxTrees) trees.length = FOREST.maxTrees

  const bushes = []
  const rocks = []
  const tufts = []
  for (let cz = Math.ceil(minZ / 9); cz * 9 < maxZ - 10; cz++) {
    for (let cx = Math.ceil((minX + 10) / 9); cx * 9 < maxX - 10; cx++) {
      const x = (cx + hash2(cx, cz, 31)) * 9
      const z = (cz + hash2(cx, cz, 32)) * 9
      if (isReserved(x, z, 1) || distanceToPaths(x, z) < 2) continue
      const ax = Math.abs(x)
      const forestish = forestDensity(x, z) > 0.25
      const dm = Math.hypot(x - MONUMENT.x, z - MONUMENT.z)
      if (dm < 40) continue
      if (forestish && hash2(cx, cz, 33) < 0.5) {
        bushes.push({ x, z, y: heightAt(x, z) - 0.1, s: 0.8 + hash2(cx, cz, 34) * 0.9, ry: hash2(cx, cz, 35) * 6.28, tint: 0.85 + hash2(cx, cz, 36) * 0.3, rank: hash2(cx, cz, 37) })
      } else if (!inCascadeLawn(x, z) && hash2(cx, cz, 38) < 0.18) {
        rocks.push({ x, z, y: heightAt(x, z) - 0.2, s: 0.7 + hash2(cx, cz, 39) * 1.8, ry: hash2(cx, cz, 40) * 6.28, tint: 0.8 + hash2(cx, cz, 41) * 0.35, rank: hash2(cx, cz, 42) })
      }
      void ax
    }
  }
  // Grasbüschel nur auf Rasenflächen (nur nahe der Kamera gezeichnet)
  for (let cz = Math.ceil(-350 / 4.2); cz * 4.2 < 20; cz++) {
    for (let cx = Math.ceil(-52 / 4.2); cx * 4.2 < 52; cx++) {
      const x = (cx + hash2(cx, cz, 51)) * 4.2
      const z = (cz + hash2(cx, cz, 52)) * 4.2
      if (isReserved(x, z, 0) || distanceToPaths(x, z) < 1.6) continue
      if (Math.abs(x) < CASCADE.deckHalf + 5 && z < -120 && z > -338) continue
      const pr = Math.hypot((x - POOL.x) / (POOL.a + 2), (z - POOL.z) / (POOL.b + 2))
      if (pr < 1) continue
      tufts.push({ x, z, y: heightAt(x, z), s: 0.7 + hash2(cx, cz, 53) * 0.8, ry: hash2(cx, cz, 54) * 6.28, tint: 0.85 + hash2(cx, cz, 55) * 0.3, rank: hash2(cx, cz, 56) })
    }
  }
  return { trees, bushes, rocks, tufts }
}

let cache
export const getForestPlacement = () => (cache ||= buildForestPlacement())
