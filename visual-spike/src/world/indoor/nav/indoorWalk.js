// Begehbare Flächen und Kollisionen der HQ Innenwelt. Bodenhöhe kommt aus Ebenen, Treppenrampen und Rolltreppenrampen.
// Die sichtbaren Stufen sind nur Optik, gelaufen wird auf der glatten Rampenfläche (wie an der Kaskade).
import { HQ, VOIDS, STAIRS, ESC, ESCALATORS, WALLS, wallSegments, buildFurniture, insideHQ } from '../config/hq.layout.js'
import { heightAt } from '../../outdoor/terrain/heightField.js'

const F1 = HQ.levels[1]
const inRect = (x, z, r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1
export const inVoid = (x, z) => VOIDS.some((v) => inRect(x, z, v))

// Rampe liegt eine halbe Stufenhöhe über der Linie Fuß bis Kopf, damit die Füße auf den sichtbaren Trittflächen stehen
export const stairY = (z) => Math.min(F1, Math.max(0, ((z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0)) * STAIRS.rise + STAIRS.riser / 2))
export const escY = (z) => Math.min(F1, Math.max(0, (z - ESC.z0) * Math.tan(ESC.angle)))

// Mögliche Standflächen an einer Stelle
function candidates(x, z) {
  const c = [0]
  if (!inVoid(x, z)) c.push(F1)
  if (Math.abs(x - STAIRS.x) <= STAIRS.width / 2) {
    if (z >= STAIRS.z0 && z <= STAIRS.z1) c.push(stairY(z))
    else if (z > STAIRS.z1 && z < 2.8) c.push(F1) // Podest am Treppenkopf
  }
  for (const e of ESCALATORS) {
    if (Math.abs(x - e.x) <= ESC.width / 2 + 0.1) {
      if (z >= ESC.z0 && z <= ESC.z1) c.push(escY(z))
      else if (z > ESC.z1 && z < 2.8) c.push(F1)
    }
  }
  return c
}

// Bodenhöhe an (x, z) für eine Figur, die zuletzt auf Höhe curY stand: höchste Fläche bis curY + 0,5 m
export function walkY(x, z, curY) {
  if (!insideHQ(x, z, 0.2)) return heightAt(x, z)
  const c = candidates(x, z)
  let best = null
  for (const y of c) if (y <= curY + 0.5 && (best === null || y > best)) best = y
  if (best !== null) return best
  return Math.min(...c)
}

// Rolltreppenband: Richtung und Geschwindigkeit (m/s in Z Richtung), sonst null
export function conveyorAt(x, z, y) {
  if (!insideHQ(x, z, 0)) return null
  for (const e of ESCALATORS) {
    if (Math.abs(x - e.x) <= ESC.width / 2 && z >= ESC.z0 && z <= ESC.z1 && Math.abs(y - escY(z)) < 0.3) return { dz: e.dir * ESC.speed * Math.cos(ESC.angle), id: e.id }
  }
  return null
}

// ---------------------------------------------------------------- Kollisionsflächen
const R = (x0, z0, x1, z1, y0, y1) => ({ x0, z0, x1, z1, y0, y1 })
export function buildIndoorColliders() {
  const out = []
  for (const w of WALLS) {
    const y0 = HQ.levels[w.level] - 0.1
    const y1 = HQ.levels[w.level] + HQ.ceilH
    for (const [a, b] of wallSegments(w)) {
      out.push(w.ax === 'z' ? R(w.c - 0.08, a, w.c + 0.08, b, y0, y1) : R(a, w.c - 0.08, b, w.c + 0.08, y0, y1))
    }
  }
  // Treppe: seitliche Brüstungen und Stufenkörper (nur wirksam für Figuren auf dem Boden)
  const sx = STAIRS.width / 2 + 0.1
  out.push(R(STAIRS.x - sx - 0.2, STAIRS.z0, STAIRS.x - sx + 0.05, 2.8, -1, 99), R(STAIRS.x + sx - 0.05, STAIRS.z0, STAIRS.x + sx + 0.2, 2.8, -1, 99))
  out.push(R(STAIRS.x - STAIRS.width / 2, STAIRS.z0 + 0.9, STAIRS.x + STAIRS.width / 2, STAIRS.z1, -1, 0.05))
  // Geländer an der Nordkante der Öffnungen (Etage 1). Die Südseite bleibt offen: dort liegen Treppenkopf und Rolltreppenzugänge.
  for (const v of VOIDS) out.push(R(v.x0, v.z0 - 0.05, v.x1, v.z0 + 0.05, F1 - 0.1, F1 + 1.2))
  // Rolltreppen: Balustraden und Körper
  for (const e of ESCALATORS) {
    for (const s of [-1, 1]) out.push(R(e.x + s * 0.55 - 0.08, ESC.z0, e.x + s * 0.55 + 0.08, ESC.z1 + 0.1, -1, 99))
    out.push(R(e.x - 0.55, ESC.z0 + 0.9, e.x + 0.55, ESC.z1, -1, 0.05))
  }
  // Nordkante der Öffnungen (Geländer nur an den Seiten der Rolltreppen bereits vorhanden), Zwischenstreifen bleibt frei
  // Möbel
  const f = buildFurniture()
  const yb = (l) => HQ.levels[l] - 0.1
  for (const d of f.desks) out.push(R(d.x - 0.85, d.z - 0.45, d.x + 0.85, d.z + 0.45, yb(d.level), yb(d.level) + 1.3))
  for (const t of f.tables) out.push(R(t.x - t.w / 2, t.z - t.d / 2, t.x + t.w / 2, t.z + t.d / 2, yb(t.level), yb(t.level) + 1.2))
  for (const c of f.counters) out.push(R(c.x - c.w / 2, c.z - c.d / 2, c.x + c.w / 2, c.z + c.d / 2, yb(c.level), yb(c.level) + 1.3))
  for (const s of f.sofas) {
    const q = Math.abs(Math.sin(s.ry)) > 0.7
    const hw = (q ? 0.5 : s.w / 2) + 0.05
    const hd = (q ? s.w / 2 : 0.5) + 0.05
    out.push(R(s.x - hw, s.z - hd, s.x + hw, s.z + hd, yb(s.level), yb(s.level) + 1))
  }
  for (const p of f.plants) out.push(R(p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3, yb(p.level), yb(p.level) + 2))
  for (const r of f.racks) out.push(R(r.x - 0.5, r.z - 0.5, r.x + 0.5, r.z + 0.5, yb(r.level), yb(r.level) + 2.2))
  return out
}

// Kameraarm: maximal zulässige Länge entlang einer Richtung, damit die Kamera nicht durch Wände fährt
export function boomLimit(colliders, px, pz, py, dx, dz, maxD) {
  for (let d = 0.4; d <= maxD; d += 0.3) {
    const x = px + dx * d
    const z = pz + dz * d
    for (const r of colliders) {
      if (r.y1 - r.y0 < 3 || r.y0 > py + 1.6 || r.y1 < py) continue // nur Wände
      if (x > r.x0 - 0.15 && x < r.x1 + 0.15 && z > r.z0 - 0.15 && z < r.z1 + 0.15) return Math.max(0.8, d - 0.4)
    }
  }
  return maxD
}
