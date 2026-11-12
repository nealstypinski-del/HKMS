import * as THREE from 'three'

// Kleine prozedurale Canvas Texturen (keine externen Dateien, alles original)
const cache = new Map()

function canvasTexture(key, size, draw, { repeat = true, srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  draw(cv.getContext('2d'), size)
  const t = new THREE.CanvasTexture(cv)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

function speckle(g, size, n, lo, hi, alpha) {
  for (let i = 0; i < n; i++) {
    const v = lo + Math.random() * (hi - lo)
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`
    const s = 1 + Math.random() * 3
    g.fillRect(Math.random() * size, Math.random() * size, s, s)
  }
}

export const grassTexture = () =>
  canvasTexture('grass', 256, (g, s) => {
    g.fillStyle = '#d6d6d6'
    g.fillRect(0, 0, s, s)
    speckle(g, s, 2600, 150, 255, 0.5)
    speckle(g, s, 1200, 120, 200, 0.5)
  })

export const stoneTexture = () =>
  canvasTexture('stone', 256, (g, s) => {
    g.fillStyle = '#e8e2d6'
    g.fillRect(0, 0, s, s)
    speckle(g, s, 1500, 170, 245, 0.35)
    g.strokeStyle = 'rgba(80,72,60,0.45)'
    g.lineWidth = 2
    const n = 4
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(0, (i * s) / n); g.lineTo(s, (i * s) / n); g.stroke()
      g.beginPath(); g.moveTo((i * s) / n + (i % 2) * (s / n / 2), 0); g.lineTo((i * s) / n + (i % 2) * (s / n / 2), s); g.stroke()
    }
  })

export const glowTexture = () =>
  canvasTexture('glow', 128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    r.addColorStop(0, 'rgba(255,255,255,1)')
    r.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, s, s)
  }, { repeat: false })

export function textTexture(text, { w = 512, h = 128, font = '700 64px system-ui, sans-serif', color = '#ffffff', bg = null } = {}) {
  const key = `text:${text}:${w}:${h}:${font}:${color}:${bg}`
  if (cache.has(key)) return cache.get(key)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h) }
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = color
  g.fillText(text, w / 2, h / 2)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t)
  return t
}
