// Prozedurale Texturen im Stil von Sims 2: Parkett, Teppichfliese, Bodenfliese, Wandpaneel.
// Jede Textur bringt eine Höhenkarte (bumpMap) mit, damit Licht Fugen und Fasern sichtbar macht. Kein Download nötig.

import * as THREE from 'three'

type Painter = (ctx: CanvasRenderingContext2D, s: number) => void

function canvasTex(size: number, paint: Painter, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (ctx) paint(ctx, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

function rng(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

const noise = (ctx: CanvasRenderingContext2D, s: number, count: number, alpha: number, seed: number, dark = true) => {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = dark ? `rgba(0,0,0,${r() * alpha})` : `rgba(255,255,255,${r() * alpha})`
    ctx.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2)
  }
}

export type SurfaceKind = 'parquet' | 'carpet' | 'tile' | 'concrete'

interface SurfaceSet {
  map: THREE.CanvasTexture
  bump: THREE.CanvasTexture
  /** Kantenlänge einer Texturkachel in Metern */
  tile: number
}

const surfaceCache = new Map<string, SurfaceSet>()

/** Farbige Bodenfläche. `base` ist die Grundfarbe, der Charakter der Fläche kommt aus dem Muster. */
export function surface(kind: SurfaceKind, base: string): SurfaceSet {
  const key = `${kind}|${base}`
  const hit = surfaceCache.get(key)
  if (hit) return hit
  let set: SurfaceSet
  if (kind === 'parquet') {
    const plank = (ctx: CanvasRenderingContext2D, s: number, height: boolean) => {
      const r = rng(11)
      const rows = 8
      const h = s / rows
      for (let y = 0; y < rows; y++) {
        const off = (y % 2) * (s / 4)
        for (let x = -1; x < 3; x++) {
          const shade = r()
          if (height) ctx.fillStyle = `rgb(${150 + shade * 40},${150 + shade * 40},${150 + shade * 40})`
          else ctx.fillStyle = shade > 0.5 ? lighten(base, (shade - 0.5) * 0.18) : darken(base, (0.5 - shade) * 0.2)
          ctx.fillRect(x * (s / 2) + off, y * h, s / 2 - 3, h - 3)
        }
      }
    }
    set = { map: canvasTex(512, (c, s) => { c.fillStyle = darken(base, 0.55); c.fillRect(0, 0, s, s); plank(c, s, false); noise(c, s, 900, 0.09, 3) }), bump: canvasTex(512, (c, s) => { c.fillStyle = '#404040'; c.fillRect(0, 0, s, s); plank(c, s, true) }, false), tile: 2 }
  } else if (kind === 'carpet') {
    set = {
      map: canvasTex(256, (c, s) => {
        c.fillStyle = base
        c.fillRect(0, 0, s, s)
        noise(c, s, 5200, 0.16, 5)
        noise(c, s, 3200, 0.1, 6, false)
        c.strokeStyle = darken(base, 0.18)
        c.lineWidth = 3
        c.strokeRect(1, 1, s - 2, s - 2)
      }),
      bump: canvasTex(256, (c, s) => { c.fillStyle = '#808080'; c.fillRect(0, 0, s, s); noise(c, s, 6000, 0.9, 8); noise(c, s, 4000, 0.9, 9, false); c.strokeStyle = '#202020'; c.lineWidth = 4; c.strokeRect(0, 0, s, s) }, false),
      tile: 1,
    }
  } else if (kind === 'tile') {
    set = {
      map: canvasTex(512, (c, s) => {
        c.fillStyle = darken(base, 0.35)
        c.fillRect(0, 0, s, s)
        const r = rng(21)
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { c.fillStyle = r() > 0.5 ? lighten(base, 0.05) : base; c.fillRect(x * (s / 2) + 4, y * (s / 2) + 4, s / 2 - 8, s / 2 - 8) }
        noise(c, s, 700, 0.06, 4)
      }),
      bump: canvasTex(512, (c, s) => { c.fillStyle = '#101010'; c.fillRect(0, 0, s, s); c.fillStyle = '#d0d0d0'; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) c.fillRect(x * (s / 2) + 4, y * (s / 2) + 4, s / 2 - 8, s / 2 - 8) }, false),
      tile: 1.6,
    }
  } else {
    set = { map: canvasTex(256, (c, s) => { c.fillStyle = base; c.fillRect(0, 0, s, s); noise(c, s, 3000, 0.12, 2); noise(c, s, 2000, 0.08, 7, false) }), bump: canvasTex(256, (c, s) => { c.fillStyle = '#808080'; c.fillRect(0, 0, s, s); noise(c, s, 5000, 0.8, 12) }, false), tile: 2 }
  }
  surfaceCache.set(key, set)
  return set
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>()

/** Bodenmaterial für eine Fläche `w` x `d` Meter, Texturwiederholung passend zur Größe. */
export function floorMaterial(kind: SurfaceKind, base: string, w: number, d: number, opts: { roughness?: number; bump?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${kind}|${base}|${w.toFixed(2)}|${d.toFixed(2)}`
  const hit = materialCache.get(key)
  if (hit) return hit
  const s = surface(kind, base)
  const map = s.map.clone()
  const bump = s.bump.clone()
  for (const t of [map, bump]) {
    t.repeat.set(Math.max(0.01, w / s.tile), Math.max(0.01, d / s.tile))
    t.needsUpdate = true
  }
  const m = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: opts.bump ?? (kind === 'carpet' ? 1.2 : 2), roughness: opts.roughness ?? (kind === 'tile' ? 0.35 : kind === 'parquet' ? 0.45 : 0.95), metalness: 0 })
  materialCache.set(key, m)
  return m
}

/** Wandpaneel: Wandfarbe oben, Holzpaneel unten, Sockelleiste, Leiste in der Höhe der Handläufe. */
export function wallMaterial(wallColor: string, panelColor: string, accent: string, w: number, h: number): THREE.MeshStandardMaterial {
  const key = `wall|${wallColor}|${panelColor}|${accent}|${w.toFixed(1)}|${h.toFixed(1)}`
  const hit = materialCache.get(key)
  if (hit) return hit
  const px = 1024
  const py = Math.round((px * h) / w) || 256
  const c = document.createElement('canvas')
  c.width = px
  c.height = Math.max(64, py)
  const ctx = c.getContext('2d')
  if (ctx) {
    const H = c.height
    const m = (v: number) => H * (1 - v / h) // Meter von unten in Pixel
    ctx.fillStyle = wallColor
    ctx.fillRect(0, 0, px, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(255,255,255,0.10)')
    g.addColorStop(1, 'rgba(0,0,0,0.10)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, px, H)
    // Paneelfläche
    ctx.fillStyle = panelColor
    ctx.fillRect(0, m(1.05), px, H - m(1.05))
    const r = rng(31)
    const panels = Math.round(w / 0.9)
    for (let i = 0; i < panels; i++) {
      const x = (i * px) / panels
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.fillRect(x, m(1.05), 3, H - m(1.05))
      ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`
      ctx.fillRect(x + 3, m(1.0), px / panels - 6, m(0.12) - m(1.0))
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(0, m(1.09), px, m(1.05) - m(1.09) + 2)
    ctx.fillStyle = '#f4f0e6'
    ctx.fillRect(0, m(0.16), px, m(0) - m(0.16))
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, m(0.16), px, 2)
    ctx.fillStyle = accent
    ctx.fillRect(0, 0, px, 6)
    noise(ctx, Math.max(px, H), 1200, 0.05, 41)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0 })
  materialCache.set(key, mat)
  return mat
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(c: string, to: number, k: number): string {
  const [r, g, b] = hex(c)
  const f = (v: number) => Math.round(v + (to - v) * Math.max(0, Math.min(1, k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
export const lighten = (c: string, k: number): string => mix(c, 255, k)
export const darken = (c: string, k: number): string => mix(c, 0, k)
