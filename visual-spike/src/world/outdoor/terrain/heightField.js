// Analytisches Höhenfeld der Welt. Terrain, Wald, Wege, Spieler und Agenten lesen dieselbe Funktion.
// Das Terrain ist zugleich die NAVIGATIONSFLÄCHE: Treppenstufen sind rein visuell, gelaufen wird auf der glatten Neigung.
import { CASCADE, POOL } from '../config/bergpark.config.js'
import { fbm, smoothstep, lerp } from '../common/noise.js'

const zBottom = CASCADE.zTop + CASCADE.length
const SLOPE = CASCADE.drop / CASCADE.length

// Höhe entlang der Mittelachse (Längsprofil): Plaza, Park, Beckenplateau, Kaskade, Herkulesplateau, Rückhang
export function axisElevation(z) {
  if (z >= -60) return 0
  if (z >= -98) return 3.0 * smoothstep(-60, -98, z)
  if (z >= zBottom) return CASCADE.yBottom
  if (z >= CASCADE.zTop) return CASCADE.yBottom + (zBottom - z) * SLOPE
  const top = CASCADE.yBottom + CASCADE.drop
  if (z >= -376) return top + 3 * smoothstep(CASCADE.zTop, -376, z)
  if (z >= -425) return top + 3
  return top + 3 - 24 * smoothstep(-425, -515, z)
}

// Höhe der glatten Kaskadenebene (v gemessen von oben)
export const cascadeElevationAtV = (v) => CASCADE.yBottom + CASCADE.drop * (1 - v / CASCADE.length)

function corridorHalf(z) {
  if (z >= -60) return 70
  const narrow = 36
  const wide = 62
  if (z >= -130) return lerp(70, narrow, smoothstep(-60, -130, z))
  if (z >= -330) return narrow
  return lerp(narrow, wide, smoothstep(-330, -370, z))
}

export function heightAt(x, z) {
  const ax = Math.abs(x)
  const ch = corridorHalf(z)
  const side = smoothstep(ch, ch + 80, ax)
  let h = axisElevation(z)
  h += side * 26
  h += (fbm(x * 0.011 + 11, z * 0.011 - 3, 3, 3) - 0.5) * 12 * side
  h += (fbm(x * 0.045, z * 0.045, 2, 9) - 0.5) * 2.4 * smoothstep(ch - 4, ch + 24, ax)
  h += smoothstep(30, 100, z) * 22 // Berge hinter dem HQ
  // Ergebnisbecken: Mulde unter der Wasserlinie
  const r = Math.hypot((x - POOL.x) / POOL.a, (z - POOL.z) / POOL.b)
  if (r < 1.14) h = lerp(h, POOL.bedY, smoothstep(1.14, 0.97, r))
  return h
}

// Bodenhöhe für Figuren und Kamera. Optionaler Offset für Treppenflächen (visuelle Stufen liegen leicht darüber).
export function groundHeight(x, z) {
  return heightAt(x, z)
}

export function slopeAt(x, z, d = 1.5) {
  const dx = heightAt(x + d, z) - heightAt(x - d, z)
  const dz = heightAt(x, z + d) - heightAt(x, z - d)
  return Math.hypot(dx, dz) / (2 * d)
}
