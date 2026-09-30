// Statische Geometrie der Innenwelt. Alles wird in wenige Geometrien pro Material verschmolzen (Drawcalls sparen).
// Koordinaten sind Weltkoordinaten, HQ Mitte im Ursprung.
import * as THREE from 'three'
import { bake, mergeParts } from '../../outdoor/common/geometryUtils.js'
import { HQ, VOIDS, STAIRS, ESC, ESCALATORS, WALLS, ROOMS, wallSegments, subtractRects, buildFurniture } from '../config/hq.layout.js'

const Y = HQ.levels
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const B = (w, h, d, x, y, z, color, ry = 0, rx = 0) => bake(box(w, h, d), { p: [x, y, z], r: [rx, ry, 0], color })
const hash = (i) => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s) }
const rot = (lx, lz, ry) => [lx * Math.cos(ry) + lz * Math.sin(ry), -lx * Math.sin(ry) + lz * Math.cos(ry)]

// Bodenfläche aus Rechtecken mit weltbezogenen UVs (eine Textur Kachel = tile Meter)
function floorQuads(rects, y, tile) {
  const pos = []; const uv = []; const nor = []; const idx = []
  rects.forEach(([x0, z0, x1, z1], i) => {
    const b = i * 4
    pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1)
    uv.push(x0 / tile, z0 / tile, x1 / tile, z0 / tile, x1 / tile, z1 / tile, x0 / tile, z1 / tile)
    for (let k = 0; k < 4; k++) nor.push(0, 1, 0)
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

// Deckenplatte mit Öffnungen (Shape mit Löchern, Y der Shape = -Welt Z)
function slabGeometry(yBottom, thickness) {
  const s = new THREE.Shape()
  const W = HQ.halfW + 0.3; const D = HQ.halfD + 0.3
  s.moveTo(-W, D); s.lineTo(W, D); s.lineTo(W, -D); s.lineTo(-W, -D); s.lineTo(-W, D)
  for (const v of VOIDS) {
    const h = new THREE.Path()
    h.moveTo(v.x0, -v.z0); h.lineTo(v.x0, -v.z1); h.lineTo(v.x1, -v.z1); h.lineTo(v.x1, -v.z0); h.lineTo(v.x0, -v.z0)
    s.holes.push(h)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, yBottom, 0)
  return g
}

function roomFloors() {
  const groups = { parquet: [], carpet: [], concrete: [] }
  for (const r of ROOMS) {
    const rects = r.level === 1 ? subtractRects(r.rect, VOIDS) : [r.rect]
    groups[r.floor].push(...rects.map((q) => ({ level: r.level, q })))
  }
  const out = {}
  for (const k of Object.keys(groups)) {
    const parts = [0, 1].map((lv) => floorQuads(groups[k].filter((e) => e.level === lv).map((e) => e.q), Y[lv] + 0.012, 2)).filter((g) => g.attributes.position.count)
    out[k] = parts.length ? mergeGeoms(parts) : null
  }
  return out
}

// Geometrien mit uv/normal/index zusammenführen (ohne bake)
function mergeGeoms(list) {
  const pos = []; const nor = []; const uv = []; const idx = []
  let base = 0
  for (const g of list) {
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array)
    idx.push(...g.index.array.map((i) => i + base))
    base += g.attributes.position.count
  }
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  m.setIndex(idx)
  return m
}

const PLASTER = '#f2ede3'
const ALU = '#2d3340'

function walls() {
  const solid = []; const frames = []; const glass = []
  for (const w of WALLS) {
    const yb = Y[w.level]
    const H = HQ.ceilH
    const segs = wallSegments(w)
    const put = (a, b, y, h, color, arr, t = HQ.wallT) => {
      const len = b - a
      if (w.ax === 'z') arr.push(B(t, h, len, w.c, y, (a + b) / 2, color))
      else arr.push(B(len, h, t, (a + b) / 2, y, w.c, color))
      void len
    }
    for (const [a, b] of segs) {
      if (w.kind === 'solid') {
        put(a, b, yb + H / 2, H, PLASTER, solid)
        put(a, b, yb + 0.05, 0.1, '#3a4256', solid, HQ.wallT + 0.04) // Sockelleiste
      } else {
        // Glastrennwand: Rahmen unten, oben, Milchglasband und Pfosten
        put(a, b, yb + 0.05, 0.1, ALU, frames, 0.08)
        put(a, b, yb + H - 0.05, 0.1, ALU, frames, 0.08)
        put(a, b, yb + 1.05, 0.05, ALU, frames, 0.08)
        put(a, b, yb + 1.4, 0.05, ALU, frames, 0.08)
        const n = Math.max(1, Math.round((b - a) / 1.8))
        for (let i = 0; i <= n; i++) {
          const p = a + ((b - a) * i) / n
          put(p - 0.03, p + 0.03, yb + H / 2, H, ALU, frames, 0.08)
        }
        put(a, b, yb + 1.225, 0.35, '#dfeaf2', solid, 0.05) // Sichtschutzfolie
        put(a, b, yb + (0.1 + 1.05) / 2 + 0.05, 0.95, '#bfe3f7', glass, 0.03)
        put(a, b, yb + (1.4 + H - 0.1) / 2 + 0.03, H - 1.5, '#bfe3f7', glass, 0.03)
      }
    }
    // Türöffnungen: Rahmen und Oberlicht
    for (const d of w.doors) {
      const half = w.doorW / 2
      const dh = 2.3
      const post = (p) => (w.ax === 'z' ? frames.push(B(0.1, dh, 0.07, w.c, yb + dh / 2, p, ALU)) : frames.push(B(0.07, dh, 0.1, p, yb + dh / 2, w.c, ALU)))
      post(d - half); post(d + half)
      put(d - half, d + half, yb + dh + 0.04, 0.08, ALU, frames, 0.1)
      if (w.kind === 'glass') put(d - half, d + half, yb + (dh + H) / 2 + 0.04, H - dh - 0.1, '#bfe3f7', glass, 0.03)
      else put(d - half, d + half, yb + (dh + H) / 2 + 0.04, H - dh - 0.1, PLASTER, solid)
    }
  }
  return { solid: mergeParts(solid), frames: mergeParts(frames), glass: mergeParts(glass) }
}

// Fassade Etage 0 und 1: Pfosten, Glas, Türportal in der Nordseite
function curtainWall() {
  const mull = []; const glass = []; const spandrel = []
  const W = HQ.halfW; const D = HQ.halfD; const doorHalf = 2.5
  for (const lv of [0, 1]) {
    const yb = Y[lv]
    const H = HQ.ceilH
    // Nord (mit Tür), Süd, West, Ost
    const sides = [
      { ax: 'x', c: -D, a: -W, b: W, door: true }, { ax: 'x', c: D, a: -W, b: W },
      { ax: 'z', c: -W, a: -D, b: D }, { ax: 'z', c: W, a: -D, b: D },
    ]
    for (const s of sides) {
      const put = (a, b, y, h, color, arr, t) => (s.ax === 'z' ? arr.push(B(t, h, b - a, s.c, y, (a + b) / 2, color)) : arr.push(B(b - a, h, t, (a + b) / 2, y, s.c, color)))
      const runs = s.door ? [[s.a, -doorHalf], [doorHalf, s.b]] : [[s.a, s.b]]
      for (const [a, b] of runs) {
        put(a, b, yb + H / 2 + 0.2, H - 0.4, '#a9dcf5', glass, 0.04)
        put(a, b, yb + 0.1, 0.2, '#e9e4d8', spandrel, 0.2)
        const n = Math.max(1, Math.round((b - a) / 2.2))
        for (let i = 0; i <= n; i++) {
          const p = a + ((b - a) * i) / n
          put(p - 0.06, p + 0.06, yb + H / 2, H, ALU, mull, 0.16)
        }
      }
      if (s.door) {
        // Portal: Türsturz, Schiebetüren (Rahmen) und Oberlicht
        put(-doorHalf, doorHalf, yb + 2.6, 0.12, ALU, mull, 0.2)
        put(-doorHalf, doorHalf, yb + (2.6 + H) / 2 + 0.05, H - 2.7, '#a9dcf5', glass, 0.04)
        for (const p of [-doorHalf, doorHalf]) put(p - 0.05, p + 0.05, yb + 1.3, 2.6, ALU, mull, 0.14)
      }
    }
    // Deckenrand (Etagenband) außen
    for (const [w, d, x, z] of [[2 * W + 0.6, 0.3, 0, -D], [2 * W + 0.6, 0.3, 0, D], [0.3, 2 * D + 0.6, -W, 0], [0.3, 2 * D + 0.6, W, 0]]) {
      spandrel.push(B(w, 0.4, d, x, yb + HQ.ceilH + 0.15, z, '#f6f1e7'))
    }
  }
  return { mull: mergeParts(mull), glass: mergeParts(glass), spandrel: mergeParts(spandrel) }
}

// Deckenleuchten (leuchtende Paneele), keine Lichtquellen
function ceilingLights() {
  const parts = []
  for (const lv of [0, 1]) {
    const y = Y[lv] + HQ.ceilH - 0.04
    for (let x = -19.5; x <= 19.6; x += 3) {
      for (let z = -12; z <= 12.1; z += 3) {
        if (lv === 0 && VOIDS.some((v) => x > v.x0 - 0.6 && x < v.x1 + 0.6 && z > v.z0 - 0.6 && z < v.z1 + 0.6)) continue
        parts.push(B(1.2, 0.05, 0.5, x, y, z, '#fff6e6'))
      }
    }
  }
  return mergeParts(parts)
}

// --------------------------------------------------------------- Möbel
const WOOD = '#c99b6b'; const WOOD_D = '#8a5d38'; const DARK = '#3a4256'; const BLACK = '#20232b'
const SCREEN_COLORS = ['#2fd6c0', '#7ab6ff', '#ffd27d', '#c79bff', '#7ff2df']

function chairParts(x, y, z, ry, color) {
  const at = (lx, lz) => { const [ox, oz] = rot(lx, lz, ry); return [x + ox, z + oz] }
  const [bx, bz] = at(0, 0.24)
  return [
    bake(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 10), { p: [x, y + 0.05, z], color: BLACK }),
    bake(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 6), { p: [x, y + 0.24, z], color: '#777d8c' }),
    B(0.5, 0.08, 0.5, x, y + 0.46, z, color, ry),
    B(0.46, 0.5, 0.06, bx, y + 0.78, bz, color, ry),
  ]
}

function deskParts(d) {
  const { x, z, ry, y } = d
  const at = (lx, lz) => { const [ox, oz] = rot(lx, lz, ry); return [x + ox, z + oz] }
  const parts = []
  const P = (w, h, dd, lx, ly, lz, color) => { const [wx, wz] = at(lx, lz); parts.push(B(w, h, dd, wx, y + ly, wz, color, ry)) }
  P(1.6, 0.04, 0.8, 0, 0.74, 0, WOOD)
  P(1.6, 0.05, 0.02, 0, 0.72, 0.4, d.accent || '#2fd6c0')
  P(0.05, 0.72, 0.7, -0.75, 0.36, 0, DARK)
  P(0.05, 0.72, 0.7, 0.75, 0.36, 0, DARK)
  P(1.45, 0.4, 0.03, 0, 0.5, -0.33, DARK)
  const mx = d.monitors === 2 ? [-0.34, 0.34] : [0]
  for (const m of mx) {
    P(0.18, 0.02, 0.14, m, 0.77, -0.18, BLACK)
    P(0.04, 0.22, 0.03, m, 0.88, -0.2, BLACK)
    P(0.62, 0.38, 0.03, m, 1.08, -0.2, BLACK)
  }
  P(0.42, 0.015, 0.14, 0, 0.77, 0.14, BLACK)
  P(0.06, 0.03, 0.09, 0.3, 0.77, 0.16, BLACK)
  P(0.07, 0.09, 0.07, -0.65, 0.81, 0.1, hash(x * 3 + z) > 0.5 ? '#e15b7a' : '#f6f1e7') // Tasse
  const [cx, cz] = at(0, 0.85)
  parts.push(...chairParts(cx, y, cz, ry, hash(x + z * 7) > 0.5 ? '#3a4256' : '#5b6ee1'))
  return parts
}

function screenQuads(d) {
  const { x, z, ry, y } = d
  const mx = d.monitors === 2 ? [-0.34, 0.34] : [0]
  return mx.map((m, i) => {
    const [ox, oz] = rot(m, -0.183, ry)
    return bake(new THREE.PlaneGeometry(0.56, 0.32), { p: [x + ox, y + 1.08, z + oz], r: [-0.05, ry, 0], color: SCREEN_COLORS[Math.floor(hash(x * 5 + z * 3 + i) * SCREEN_COLORS.length)] })
  })
}

function tableParts(t) {
  const y = Y[t.level]
  const p = []
  if (t.round) {
    p.push(bake(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16), { p: [t.x, y + 0.74, t.z], color: WOOD }))
    p.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6), { p: [t.x, y + 0.36, t.z], color: DARK }))
    p.push(bake(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), { p: [t.x, y + 0.02, t.z], color: DARK }))
    return p
  }
  p.push(B(t.w, 0.06, t.d, t.x, y + 0.74, t.z, WOOD_D))
  p.push(B(t.w * 0.7, 0.02, 0.18, t.x, y + 0.78, t.z, '#20232b')) // Medienstreifen
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(B(0.08, 0.72, 0.08, t.x + sx * (t.w / 2 - 0.25), y + 0.36, t.z + sz * (t.d / 2 - 0.2), DARK))
  return p
}

function sofaParts(s) {
  const y = Y[s.level]
  const at = (lx, lz) => { const [ox, oz] = rot(lx, lz, s.ry); return [s.x + ox, s.z + oz] }
  const parts = []
  const P = (w, h, d, lx, ly, lz, c) => { const [wx, wz] = at(lx, lz); parts.push(B(w, h, d, wx, y + ly, wz, c, s.ry)) }
  P(s.w, 0.34, 0.9, 0, 0.3, 0, s.color)
  P(s.w, 0.5, 0.2, 0, 0.7, -0.38, s.color)
  P(0.18, 0.5, 0.9, -s.w / 2 + 0.09, 0.5, 0, s.color)
  P(0.18, 0.5, 0.9, s.w / 2 - 0.09, 0.5, 0, s.color)
  P(s.w - 0.2, 0.2, 0.7, 0, 0.55, 0.05, '#ffffff')
  for (const sx of [-1, 1]) P(0.06, 0.13, 0.06, sx * (s.w / 2 - 0.1), 0.065, 0.35, DARK)
  return parts
}

function plantParts(p) {
  const y = Y[p.level]
  const s = p.s || 1
  return [
    bake(new THREE.CylinderGeometry(0.25 * s, 0.2 * s, 0.45 * s, 8), { p: [p.x, y + 0.22 * s, p.z], color: '#efe9db' }),
    bake(new THREE.CylinderGeometry(0.03, 0.05, 0.9 * s, 5), { p: [p.x, y + 0.85 * s, p.z], color: '#6b4a32' }),
    bake(new THREE.IcosahedronGeometry(0.55 * s, 0), { p: [p.x, y + 1.5 * s, p.z], s: [1, 1.2, 1], color: '#4caf6a' }),
    bake(new THREE.IcosahedronGeometry(0.38 * s, 0), { p: [p.x + 0.25 * s, y + 1.15 * s, p.z + 0.1], color: '#3c9a5a' }),
    bake(new THREE.IcosahedronGeometry(0.34 * s, 0), { p: [p.x - 0.22 * s, y + 1.25 * s, p.z - 0.12], color: '#59bd7a' }),
  ]
}

function furniture() {
  const f = buildFurniture()
  const parts = []
  const scr = []
  for (const d of f.desks) {
    d.accent = d.room === 'km' ? '#2fd6c0' : d.room === 'ai' ? '#4da3ff' : '#ff8a3d'
    parts.push(...deskParts(d)); scr.push(...screenQuads(d))
  }
  for (const t of f.tables) parts.push(...tableParts(t))
  for (const c of f.chairs) parts.push(...chairParts(c.x, c.y, c.z, c.ry, hash(c.x * 9 + c.z) > 0.5 ? '#3a4256' : '#8a5d38'))
  for (const s of f.sofas) parts.push(...sofaParts(s))
  for (const p of f.plants) parts.push(...plantParts(p))
  for (const c of f.counters) {
    const y = Y[c.level]
    parts.push(B(c.w, c.h, c.d, c.x, y + c.h / 2, c.z, c.color), B(c.w + 0.1, 0.05, c.d + 0.1, c.x, y + c.h + 0.02, c.z, c.top))
  }
  for (const r of f.racks) {
    const y = Y[r.level]
    parts.push(B(0.9, 2.1, 0.7, r.x, y + 1.05, r.z, '#1a2030', r.ry))
    for (let i = 0; i < 12; i++) {
      const [ox, oz] = rot(-0.36, 0, r.ry)
      scr.push(bake(new THREE.PlaneGeometry(0.5, 0.05), { p: [r.x + ox, y + 0.3 + i * 0.15, r.z + oz], r: [0, r.ry - Math.PI / 2, 0], color: hash(i + r.z) > 0.5 ? '#4da3ff' : '#3ddc84' }))
    }
  }
  // Café Ausstattung: Kaffeemaschine und Vitrine auf dem Tresen
  parts.push(B(0.5, 0.45, 0.4, -18, Y[0] + 1.3, 13.2, '#20232b'), B(1.2, 0.5, 0.45, -13, Y[0] + 1.32, 13.2, '#e9e4d8'))
  // Produktinseln im Showroom
  for (const [x, z] of [[11, -12], [15, -5], [19, -11]]) parts.push(B(1.6, 0.5, 1.6, x, Y[0] + 0.25, z, '#f6f1e7'), B(1.2, 0.9, 0.06, x, Y[0] + 1.05, z, '#20232b', 0.6))
  return { furniture: mergeParts(parts), screens: mergeParts(scr) }
}

// --------------------------------------------------------------- Treppe, Geländer
function stairs() {
  const parts = []
  const { x, width, z0, count, tread, riser } = STAIRS
  for (let k = 0; k < count; k++) {
    const h = (k + 1) * riser
    parts.push(B(width, h, tread, x, h / 2, z0 + (k + 0.5) * tread, k % 2 ? '#d9d5cc' : '#e4e0d7'))
    parts.push(B(width, 0.02, 0.03, x, h + 0.005, z0 + k * tread + 0.02, '#8f8a80')) // Kantenprofil
  }
  parts.push(B(width, 0.3, 0.44, x, Y[1] - 0.15, STAIRS.z1 + 0.22, '#d9d5cc')) // Podest
  // Wangen und Handläufe
  const ang = Math.atan2(STAIRS.rise, STAIRS.z1 - z0)
  const len = Math.hypot(STAIRS.rise, STAIRS.z1 - z0)
  const midZ = (z0 + STAIRS.z1) / 2
  for (const sx of [-1, 1]) {
    const px = x + sx * (width / 2 + 0.05)
    parts.push(B(0.1, 0.35, len, px, STAIRS.rise / 2 - 0.05, midZ, '#cfcac0', 0, -ang))
    parts.push(B(0.06, 0.06, len, px, STAIRS.rise / 2 + 0.95, midZ, '#20232b', 0, -ang))
    for (let k = 0; k <= count; k += 3) {
      const h = k * riser
      parts.push(B(0.03, 0.95, 0.03, px, h + 0.48, z0 + Math.min(k, count) * tread, '#20232b'))
    }
  }
  return mergeParts(parts)
}

function stairGlass() {
  const parts = []
  const { x, width, z0, count } = STAIRS
  const ang = Math.atan2(STAIRS.rise, STAIRS.z1 - z0)
  const len = Math.hypot(STAIRS.rise, STAIRS.z1 - z0)
  const midZ = (z0 + STAIRS.z1) / 2
  for (const sx of [-1, 1]) parts.push(B(0.03, 0.8, len, x + sx * (width / 2 + 0.05), STAIRS.rise / 2 + 0.5, midZ, '#bfe3f7', 0, -ang))
  void count
  return mergeParts(parts)
}

// Geländer an den Öffnungen auf Etage 1 (Nord, West, Ost)
function voidRails() {
  const rails = []; const glass = []
  for (const v of VOIDS) {
    const y = Y[1]
    const edges = [[v.x0, v.z0, v.x1, v.z0], [v.x0, v.z0, v.x0, v.z1], [v.x1, v.z0, v.x1, v.z1]]
    for (const [ax, az, bx, bz] of edges) {
      const len = Math.hypot(bx - ax, bz - az)
      const cx = (ax + bx) / 2; const cz = (az + bz) / 2
      const alongX = Math.abs(bx - ax) > 0.01
      const dims = alongX ? [len, 0.06, 0.06] : [0.06, 0.06, len]
      rails.push(B(...dims, cx, y + 1.02, cz, '#20232b'))
      glass.push(B(alongX ? len : 0.03, 0.85, alongX ? 0.03 : len, cx, y + 0.55, cz, '#bfe3f7'))
      for (let t = 0; t <= len + 0.01; t += 1.6) {
        const px = alongX ? ax + Math.sign(bx - ax) * t : ax
        const pz = alongX ? az : az + Math.sign(bz - az) * t
        rails.push(B(0.05, 1.0, 0.05, px, y + 0.5, pz, '#20232b'))
      }
    }
  }
  return { rails: mergeParts(rails), glass: mergeParts(glass) }
}

// Rolltreppe: statische Teile (Truss, Balustraden, Handläufe, Kammplatten). Die beweglichen Stufen liegen in Escalators.jsx
// Bezugslinie ist die Stufenoberfläche S(t) = (x, t*sin, z0 + t*cos); o verschiebt senkrecht dazu (Normale n = (0, cos, -sin)).
function escalatorStatic() {
  const parts = []; const glass = []
  const sn = Math.sin(ESC.angle); const cs = Math.cos(ESC.angle)
  const L = ESC.length
  const at = (o) => [(L / 2) * sn + cs * o, ESC.z0 + (L / 2) * cs - sn * o] // [y, z] der Mitte bei Offset o
  for (const e of ESCALATORS) {
    let [y, z] = at(-0.36)
    parts.push(B(1.15, 0.6, L + 0.6, e.x, y, z, '#7d838f', 0, -ESC.angle))
    for (const sx of [-1, 1]) {
      const px = e.x + sx * 0.55;
      [y, z] = at(0.1)
      parts.push(B(0.08, 0.5, L + 0.5, px, y, z, '#9aa1ad', 0, -ESC.angle));
      [y, z] = at(0.98)
      parts.push(B(0.09, 0.06, L + 0.6, px, y, z, '#15171c', 0, -ESC.angle));
      [y, z] = at(0.6)
      glass.push(B(0.03, 0.62, L, px, y, z, '#bfe3f7', 0, -ESC.angle))
    }
    parts.push(B(1.0, 0.04, 0.5, e.x, 0.03, ESC.z0 - 0.15, '#c8cbd2'))
    parts.push(B(1.0, 0.04, 0.5, e.x, Y[1] + 0.02, ESC.z1 + 0.1, '#c8cbd2'))
  }
  return { escStatic: mergeParts(parts), escGlass: mergeParts(glass) }
}

let cache = null
export function buildInterior() {
  if (cache) return cache
  const w = walls()
  const cw = curtainWall()
  const fur = furniture()
  const vr = voidRails()
  const es = escalatorStatic()
  cache = {
    floors: roomFloors(),
    slab1: slabGeometry(Y[0] + HQ.ceilH, HQ.slab),
    slabRoof: slabGeometry(Y[1] + HQ.ceilH, HQ.slab),
    groundPlate: new THREE.BoxGeometry(2 * HQ.halfW + 0.6, 0.3, 2 * HQ.halfD + 0.6).translate(0, -0.15, 0),
    wallsSolid: w.solid, wallsFrames: w.frames, wallsGlass: w.glass,
    curtainMull: cw.mull, curtainGlass: cw.glass, curtainSpandrel: cw.spandrel,
    lights: ceilingLights(),
    furniture: fur.furniture, screens: fur.screens,
    stairs: stairs(), stairGlass: stairGlass(), voidRails: vr.rails, voidGlass: vr.glass,
    ...es,
  }
  return cache
}
