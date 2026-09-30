import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, ConeGeometry, DoubleSide, MeshBasicMaterial, MeshLambertMaterial,
  MeshStandardMaterial, RepeatWrapping, SphereGeometry, SRGBColorSpace, type Texture,
} from 'three'
import type { MatKey, Shape } from './kit'

/** Geteilte Geometrien: es gibt genau eine pro Grundform, alle Möbel sind skalierte Instanzen davon. */
export const GEO: Record<Shape, BoxGeometry | CylinderGeometry | SphereGeometry | ConeGeometry> = {
  box: new BoxGeometry(1, 1, 1),
  cyl: new CylinderGeometry(0.5, 0.5, 1, 14),
  sphere: new SphereGeometry(0.5, 12, 10),
  cone: new ConeGeometry(0.5, 1, 10),
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

// Terminal-Muster für Bildschirme (Graustufen, wird mit der Instanzfarbe multipliziert)
let terminalTex: CanvasTexture | null = null
function getTerminalTexture() {
  if (terminalTex) return terminalTex
  const c = canvas(64, 64)
  const g = c.getContext('2d')!
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#ffffff'
  for (let y = 5; y < 60; y += 6) {
    const w = 14 + ((y * 37) % 34)
    g.fillRect(6 + ((y * 11) % 8), y, w, 2.2)
  }
  terminalTex = new CanvasTexture(c)
  terminalTex.colorSpace = SRGBColorSpace
  return terminalTex
}

// --- Bodenbeläge: prozedurale Texturen, im Weltraum abgebildet (unabhängig von der Größe der Fläche) -------

function noise(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function finish(c: HTMLCanvasElement) {
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}
function parquetTexture() {
  const c = canvas(256, 256), g = c.getContext('2d')!, r = noise(3)
  g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, 256, 256)
  const rowH = 32, len = 128
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * (len / 2) + (row * 37) % 20
    for (let x = -len; x < 256 + len; x += len) {
      const px = x + off
      const v = 0.86 + r() * 0.24
      g.fillStyle = `rgb(${Math.round(184 * v)},${Math.round(139 * v)},${Math.round(92 * v)})`
      g.fillRect(px + 1, row * rowH + 1, len - 2, rowH - 2)
      g.strokeStyle = 'rgba(70,45,25,0.22)'; g.lineWidth = 1
      for (let k = 0; k < 4; k++) { const y = row * rowH + 4 + r() * (rowH - 8); g.beginPath(); g.moveTo(px + 2, y); g.lineTo(px + len - 2, y + (r() - 0.5) * 3); g.stroke() }
    }
  }
  return finish(c)
}
function carpetTexture() {
  const c = canvas(128, 128), g = c.getContext('2d')!, r = noise(5)
  g.fillStyle = '#b9b9b9'; g.fillRect(0, 0, 128, 128)
  const img = g.getImageData(0, 0, 128, 128)
  for (let i = 0; i < img.data.length; i += 4) { const n = 200 + Math.floor(r() * 55) - 12; img.data[i] = img.data[i + 1] = img.data[i + 2] = n }
  g.putImageData(img, 0, 0)
  return finish(c)
}
function tileTexture() {
  const c = canvas(256, 256), g = c.getContext('2d')!, r = noise(9)
  g.fillStyle = '#8a8f96'; g.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 226 + Math.floor(r() * 24)
    g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60)
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 2)
  }
  return finish(c)
}
function marbleTexture() {
  const c = canvas(256, 256), g = c.getContext('2d')!, r = noise(13)
  g.fillStyle = '#ecebe8'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(120,120,128,${0.10 + r() * 0.2})`; g.lineWidth = 0.7 + r() * 1.6
    g.beginPath(); let x = r() * 256, y = 0; g.moveTo(x, y)
    while (y < 256) { x += (r() - 0.5) * 40; y += 12 + r() * 20; g.lineTo(((x % 256) + 256) % 256, y) }
    g.stroke()
  }
  // Platten mit feinen Fugen
  g.strokeStyle = 'rgba(90,90,95,0.55)'; g.lineWidth = 1.5
  g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke()
  return finish(c)
}
function worldMapped(tex: CanvasTexture, scale: number, roughness = 0.9) {
  const m = new MeshLambertMaterial({ color: '#ffffff', map: tex })
  void roughness
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uScale = { value: scale }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uScale;')
      .replace('#include <map_fragment>', 'diffuseColor *= texture2D( map, vWPos.xz * uScale );')
  }
  m.customProgramCacheKey = () => `world-${scale}`
  return m
}
let floorMats: Record<'parquet' | 'carpet' | 'tile' | 'marble', MeshLambertMaterial> | null = null
function getFloorMats() {
  if (!floorMats) floorMats = { parquet: worldMapped(parquetTexture(), 0.5), carpet: worldMapped(carpetTexture(), 1.0), tile: worldMapped(tileTexture(), 0.5), marble: worldMapped(marbleTexture(), 0.25) }
  return floorMats
}

export const MATS: Record<MatKey, MeshLambertMaterial | MeshStandardMaterial | MeshBasicMaterial> = {
  parquet: getFloorMats().parquet,
  carpet: getFloorMats().carpet,
  tile: getFloorMats().tile,
  marble: getFloorMats().marble,
  matte: new MeshLambertMaterial({ color: '#ffffff' }),
  metal: new MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.42 }),
  screen: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  glass: new MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.08, metalness: 0.05, depthWrite: false }),
}
export function initScreenMaterial() {
  const m = MATS.screen as MeshBasicMaterial
  if (!m.map) { m.map = getTerminalTexture(); m.needsUpdate = true }
}

/**
 * Reflexionen: Die Umgebungskarte wird direkt den spiegelnden Materialien zugewiesen. Nur dann wirkt envMapIntensity
 * (bei scene.environment gilt in neueren three Versionen allein scene.environmentIntensity). Glas spiegelt bewusst schwach,
 * sonst wird die Glaswand über der Brüstung dunkel wie eine Wand.
 */
export function setReflections(on: boolean, tex?: Texture | null) {
  const cfg: Record<'metal' | 'glass', number> = { metal: 0.9, glass: 0.12 }
  for (const k of ['metal', 'glass'] as const) {
    const m = MATS[k] as MeshStandardMaterial
    m.envMap = on && tex ? tex : null
    m.envMapIntensity = cfg[k]
    m.needsUpdate = true
  }
}

// --- Beschriftungstexturen -------------------------------------------------------------------

const labelCache = new Map<string, CanvasTexture>()
export function labelTexture(text: string, accent = '#e8a33d', opts: { w?: number; h?: number; panel?: boolean; sub?: string } = {}) {
  const key = `${text}|${accent}|${opts.w}|${opts.h}|${opts.panel}|${opts.sub}`
  const hit = labelCache.get(key)
  if (hit) return hit
  const w = opts.w ?? 512, h = opts.h ?? 256
  const c = canvas(w, h)
  const g = c.getContext('2d')!
  if (opts.panel !== false) {
    const grd = g.createLinearGradient(0, 0, w, h)
    grd.addColorStop(0, '#0d1420'); grd.addColorStop(1, '#16202f')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    g.fillStyle = accent; g.fillRect(0, 0, w, Math.max(6, h * 0.035))
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
  }
  g.fillStyle = '#f4f1ea'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  let size = Math.floor(h * 0.34)
  g.font = `700 ${size}px system-ui, "Segoe UI", sans-serif`
  while (g.measureText(text).width > w * 0.88 && size > 12) { size -= 2; g.font = `700 ${size}px system-ui, "Segoe UI", sans-serif` }
  g.fillText(text, w / 2, h * (opts.sub ? 0.42 : 0.52))
  if (opts.sub) {
    g.fillStyle = accent
    g.font = `600 ${Math.floor(h * 0.14)}px system-ui, sans-serif`
    g.fillText(opts.sub, w / 2, h * 0.74)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  labelCache.set(key, t)
  return t
}

export const labelMaterialCache = new Map<string, MeshBasicMaterial>()
export function labelMaterial(text: string, accent: string, opts: Parameters<typeof labelTexture>[2] = {}) {
  const key = `${text}|${accent}|${JSON.stringify(opts)}`
  let m = labelMaterialCache.get(key)
  if (!m) { m = new MeshBasicMaterial({ map: labelTexture(text, accent, opts), toneMapped: false, side: DoubleSide }); labelMaterialCache.set(key, m) }
  return m
}

// --- Fassaden-Fenstertextur ------------------------------------------------------------------

let windowTex: CanvasTexture | null = null
export function getWindowTexture() {
  if (windowTex) return windowTex
  const c = canvas(256, 64)
  const g = c.getContext('2d')!
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 64)
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 16; i++) {
    const lit = rnd() > 0.18
    g.fillStyle = lit ? (rnd() > 0.5 ? '#ffd9a0' : '#ffe9c8') : '#26303f'
    g.fillRect(i * 16 + 2, 8, 12, 46)
  }
  windowTex = new CanvasTexture(c)
  windowTex.wrapS = windowTex.wrapT = RepeatWrapping
  windowTex.colorSpace = SRGBColorSpace
  return windowTex
}

// --- Farb-Cache für Figuren ------------------------------------------------------------------

const lambertCache = new Map<string, MeshLambertMaterial>()
export function lambert(hex: string) {
  let m = lambertCache.get(hex)
  if (!m) { m = new MeshLambertMaterial({ color: new Color(hex) }); lambertCache.set(hex, m) }
  return m
}
const basicCache = new Map<string, MeshBasicMaterial>()
export function basic(hex: string, opacity = 1) {
  const k = hex + opacity
  let m = basicCache.get(k)
  if (!m) { m = new MeshBasicMaterial({ color: new Color(hex), transparent: opacity < 1, opacity, toneMapped: false, depthWrite: opacity >= 1 }); basicCache.set(k, m) }
  return m
}

// --- Glasfassade: Scheibenraster als Diffusfarbe, beleuchtete Fenster nur als Emission ---------

let glassTex: CanvasTexture | null = null
export function getGlassFacadeTexture() {
  if (glassTex) return glassTex
  const c = canvas(256, 128)
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 0, 128)
  grd.addColorStop(0, '#6f9fc4'); grd.addColorStop(0.55, '#4c7ea6'); grd.addColorStop(1, '#3a678c')
  g.fillStyle = grd; g.fillRect(0, 0, 256, 128)
  // Spiegelung: sanfte Lichtbänder
  g.fillStyle = 'rgba(255,255,255,0.10)'
  g.beginPath(); g.moveTo(20, 0); g.lineTo(70, 0); g.lineTo(30, 128); g.lineTo(-20, 128); g.fill()
  g.beginPath(); g.moveTo(150, 0); g.lineTo(185, 0); g.lineTo(145, 128); g.lineTo(110, 128); g.fill()
  // Sprossen
  g.fillStyle = '#1c2633'
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2.5, 128)
  g.fillRect(0, 0, 256, 3.5); g.fillRect(0, 62, 256, 2.5); g.fillRect(0, 124, 256, 4)
  glassTex = new CanvasTexture(c)
  glassTex.wrapS = glassTex.wrapT = RepeatWrapping
  glassTex.colorSpace = SRGBColorSpace
  glassTex.anisotropy = 8
  return glassTex
}
