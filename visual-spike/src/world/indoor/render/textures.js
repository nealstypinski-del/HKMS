import * as THREE from 'three'

const cache = new Map()
const make = (key, w, h, draw, repeat = true) => {
  if (cache.has(key)) return cache.get(key)
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  draw(cv.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  cache.set(key, t)
  return t
}
const rnd = (a, b) => a + Math.random() * (b - a)

// Eichenparkett (Fischgrät angedeutet durch Dielen mit versetzten Stößen), Kachelgröße 2 m
export const parquetTexture = () => make('parquet', 512, 512, (g, w, h) => {
  const rows = 8
  for (let r = 0; r < rows; r++) {
    let x = -rnd(0, 120)
    while (x < w) {
      const len = rnd(140, 260)
      const base = 150 + Math.floor(rnd(-14, 14))
      g.fillStyle = `rgb(${base + 40},${base + 8},${base - 46})`
      g.fillRect(x, (r * h) / rows, len, h / rows - 1.5)
      g.strokeStyle = 'rgba(70,40,20,0.22)'
      for (let k = 0; k < 6; k++) { g.beginPath(); const y = (r * h) / rows + rnd(2, h / rows - 3); g.moveTo(x, y); g.lineTo(x + len, y + rnd(-1, 1)); g.stroke() }
      x += len
    }
  }
})

// Teppichfliesen 0,5 m, leicht meliert
export const carpetTexture = () => make('carpet', 512, 512, (g, w, h) => {
  g.fillStyle = '#7f8797'; g.fillRect(0, 0, w, h)
  for (let i = 0; i < 9000; i++) { const v = Math.floor(rnd(105, 150)); g.fillStyle = `rgba(${v},${v + 4},${v + 14},0.55)`; g.fillRect(rnd(0, w), rnd(0, h), 2, 2) }
  g.strokeStyle = 'rgba(40,46,60,0.5)'; g.lineWidth = 2
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke() }
})

// Polierter Beton mit Fugen im 2 m Raster
export const concreteTexture = () => make('concrete', 512, 512, (g, w, h) => {
  g.fillStyle = '#c9c7c1'; g.fillRect(0, 0, w, h)
  for (let i = 0; i < 6000; i++) { const v = Math.floor(rnd(178, 214)); g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(rnd(0, w), rnd(0, h), rnd(2, 6), rnd(2, 6)) }
  g.strokeStyle = 'rgba(90,90,86,0.55)'; g.lineWidth = 3
  g.strokeRect(1, 1, w - 2, h - 2)
})

// Beschriftete Fläche (Wandbildschirm, Tafel, Schild). Ergebnis wird pro Schlüssel gecacht.
export function panelTexture({ key, w = 1024, h = 512, bg = '#0f1a2e', accent = '#2fd6c0', title = '', lines = [], titleSize = 96, fg = '#ffffff', sub = '' }) {
  return make(`panel:${key}`, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = accent; g.fillRect(0, 0, 18, h); g.fillRect(0, h - 14, w, 14)
    g.fillStyle = fg
    g.font = `800 ${titleSize}px system-ui, sans-serif`
    g.textBaseline = 'middle'
    g.fillText(title, 56, h * (lines.length || sub ? 0.32 : 0.5))
    g.font = `600 ${Math.round(titleSize * 0.42)}px system-ui, sans-serif`
    g.fillStyle = 'rgba(255,255,255,0.82)'
    const all = sub ? [sub, ...lines] : lines
    all.forEach((l, i) => g.fillText(l, 60, h * 0.55 + i * titleSize * 0.55))
  }, false)
}
