import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, ConeGeometry, DoubleSide, MeshBasicMaterial, MeshLambertMaterial,
  MeshStandardMaterial, RepeatWrapping, SphereGeometry, SRGBColorSpace,
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

export const MATS: Record<MatKey, MeshLambertMaterial | MeshStandardMaterial | MeshBasicMaterial> = {
  matte: new MeshLambertMaterial({ color: '#ffffff' }),
  metal: new MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.42 }),
  screen: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  glass: new MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0.06, metalness: 0.2, depthWrite: false }),
}
export function initScreenMaterial() {
  const m = MATS.screen as MeshBasicMaterial
  if (!m.map) { m.map = getTerminalTexture(); m.needsUpdate = true }
}

export function setReflections(on: boolean, envIntensity = 1) {
  for (const k of ['metal', 'glass'] as const) {
    const m = MATS[k] as MeshStandardMaterial
    m.envMapIntensity = on ? envIntensity : 0
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
