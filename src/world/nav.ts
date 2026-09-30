import { AGENT_RADIUS, HALF_D, HALF_W, NAV_CELL } from './constants'
import { blockedRects } from './connectors'
import { FOOTPRINT, GeneratedFloor, getFloor } from './generate'
import type { Vec2 } from './types'

/**
 * Navigationsgitter pro Geschoss. Hindernisse sind bereits um den Agentenradius
 * aufgeblasen: eine freie Zelle bedeutet, dass ein Agent dort vollständig steht.
 * Damit reicht ein einfaches A* plus Sichtlinienglättung, und Agenten können nicht
 * an Türrahmen oder Möbelkanten hängen bleiben.
 */
export class NavGrid {
  readonly cols: number
  readonly rows: number
  readonly cell = NAV_CELL
  readonly blocked: Uint8Array
  readonly ox = -HALF_W
  readonly oz = -HALF_D

  constructor(floor: GeneratedFloor) {
    this.cols = Math.ceil((HALF_W * 2) / this.cell)
    this.rows = Math.ceil((HALF_D * 2) / this.cell)
    this.blocked = new Uint8Array(this.cols * this.rows)
    this.build(floor)
  }

  toCell(x: number, z: number): [number, number] {
    return [Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell)]
  }
  center(cx: number, cz: number): Vec2 {
    return { x: this.ox + (cx + 0.5) * this.cell, z: this.oz + (cz + 0.5) * this.cell }
  }
  inBounds(cx: number, cz: number) { return cx >= 0 && cz >= 0 && cx < this.cols && cz < this.rows }
  isBlockedCell(cx: number, cz: number) { return !this.inBounds(cx, cz) || this.blocked[cz * this.cols + cx] === 1 }
  isBlocked(x: number, z: number) { const [cx, cz] = this.toCell(x, z); return this.isBlockedCell(cx, cz) }

  private fillRect(x0: number, z0: number, x1: number, z1: number) {
    const [a, b] = this.toCell(x0, z0)
    const [c, d] = this.toCell(x1, z1)
    for (let cz = Math.max(0, b); cz <= Math.min(this.rows - 1, d); cz++)
      for (let cx = Math.max(0, a); cx <= Math.min(this.cols - 1, c); cx++) {
        const p = this.center(cx, cz)
        if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) this.blocked[cz * this.cols + cx] = 1
      }
  }

  private fillOriented(px: number, pz: number, w: number, d: number, yaw: number) {
    const r = AGENT_RADIUS
    const ext = Math.hypot(w, d) / 2 + r + this.cell
    const [a, b] = this.toCell(px - ext, pz - ext)
    const [c, e] = this.toCell(px + ext, pz + ext)
    const cs = Math.cos(yaw), sn = Math.sin(yaw)
    for (let cz = Math.max(0, b); cz <= Math.min(this.rows - 1, e); cz++)
      for (let cx = Math.max(0, a); cx <= Math.min(this.cols - 1, c); cx++) {
        const p = this.center(cx, cz)
        const dx = p.x - px, dz = p.z - pz
        // Weltvektor in lokale Achsen des Möbelstücks
        const lx = dx * cs - dz * sn
        const lz = dx * sn + dz * cs
        if (Math.abs(lx) <= w / 2 + r && Math.abs(lz) <= d / 2 + r) this.blocked[cz * this.cols + cx] = 1
      }
  }

  private build(f: GeneratedFloor) {
    const r = AGENT_RADIUS
    // Außenrand
    this.fillRect(-HALF_W - 1, -HALF_D - 1, -HALF_W + r + 0.05, HALF_D + 1)
    this.fillRect(HALF_W - r - 0.05, -HALF_D - 1, HALF_W + 1, HALF_D + 1)
    this.fillRect(-HALF_W - 1, -HALF_D - 1, HALF_W + 1, -HALF_D + r + 0.05)
    this.fillRect(-HALF_W - 1, HALF_D - r - 0.05, HALF_W + 1, HALF_D + 1)
    // Wände (dünne Rechtecke plus Radius)
    for (const w of f.walls) {
      const t = 0.1 + r
      this.fillRect(Math.min(w.x0, w.x1) - t, Math.min(w.z0, w.z1) - t, Math.max(w.x0, w.x1) + t, Math.max(w.z0, w.z1) + t)
    }
    // Aufzugskern
    for (const z of f.zones) if (z.config.type === 'core') {
      const q = z.config.rect
      this.fillRect(q.x0, q.z0, q.x1, q.z1 + r)
    }
    // Treppe und Rolltreppen (unten der Aufbau, oben die Deckenöffnung), mit Agentenradius aufgeblasen
    for (const q of blockedRects(f.config.id)) this.fillRect(q.x0 - r, q.z0 - r, q.x1 + r, q.z1 + r)
    // Möbel
    for (const p of f.placements) {
      if (!p.blocks) continue
      const fp = FOOTPRINT[p.kind]
      if (!fp) continue
      const w = p.w ?? fp[0]
      const d = p.d ?? fp[1]
      this.fillOriented(p.x, p.z, w, d, p.yaw)
    }
  }

  /** Nächste freie Zelle (Ringsuche). */
  nearestFree(x: number, z: number, maxRing = 40): Vec2 | null {
    const [cx, cz] = this.toCell(x, z)
    if (!this.isBlockedCell(cx, cz)) return this.center(cx, cz)
    for (let ring = 1; ring <= maxRing; ring++) {
      let best: Vec2 | null = null
      let bd = Infinity
      for (let dz = -ring; dz <= ring; dz++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue
          if (this.isBlockedCell(cx + dx, cz + dz)) continue
          const c = this.center(cx + dx, cz + dz)
          const dd = (c.x - x) ** 2 + (c.z - z) ** 2
          if (dd < bd) { bd = dd; best = c }
        }
      if (best) return best
    }
    return null
  }

  lineFree(a: Vec2, b: Vec2): boolean {
    const dist = Math.hypot(b.x - a.x, b.z - a.z)
    const n = Math.max(1, Math.ceil(dist / (this.cell * 0.4)))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      if (this.isBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false
    }
    return true
  }

  /** Pfad ohne Startpunkt, endet exakt auf dem (ggf. eingerasteten) Ziel. null = unerreichbar. */
  findPath(from: Vec2, to: Vec2): Vec2[] | null {
    const s = this.nearestFree(from.x, from.z)
    const g = this.nearestFree(to.x, to.z)
    if (!s || !g) return null
    const [sx, sz] = this.toCell(s.x, s.z)
    const [gx, gz] = this.toCell(g.x, g.z)
    const cols = this.cols
    const N = cols * this.rows
    const gScore = new Float32Array(N).fill(Infinity)
    const parent = new Int32Array(N).fill(-1)
    const closed = new Uint8Array(N)
    const heap = new MinHeap()
    const idx = (x: number, z: number) => z * cols + x
    const h = (x: number, z: number) => {
      const dx = Math.abs(x - gx), dz = Math.abs(z - gz)
      return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz)
    }
    const start = idx(sx, sz)
    gScore[start] = 0
    heap.push(start, h(sx, sz))
    const goal = idx(gx, gz)
    let found = false
    while (heap.size) {
      const cur = heap.pop()
      if (closed[cur]) continue
      closed[cur] = 1
      if (cur === goal) { found = true; break }
      const cx = cur % cols, cz = (cur / cols) | 0
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue
          const nx = cx + dx, nz = cz + dz
          if (this.isBlockedCell(nx, nz)) continue
          if (dx && dz && (this.isBlockedCell(cx + dx, cz) || this.isBlockedCell(cx, cz + dz))) continue // kein Ecken schneiden
          const ni = idx(nx, nz)
          if (closed[ni]) continue
          const ng = gScore[cur] + (dx && dz ? Math.SQRT2 : 1)
          if (ng < gScore[ni]) { gScore[ni] = ng; parent[ni] = cur; heap.push(ni, ng + h(nx, nz)) }
        }
    }
    if (!found) return null
    const cells: Vec2[] = []
    for (let c = goal; c !== -1; c = parent[c]) cells.push(this.center(c % cols, (c / cols) | 0))
    cells.reverse()
    // Sichtlinienglättung
    const out: Vec2[] = []
    let anchor = cells[0]
    let i = 1
    while (i < cells.length) {
      let j = cells.length - 1
      while (j > i && !this.lineFree(anchor, cells[j])) j--
      out.push(cells[j])
      anchor = cells[j]
      i = j + 1
    }
    // Exaktes Ziel anhängen, wenn es frei und direkt erreichbar ist
    const last = out[out.length - 1] ?? cells[0]
    if (!this.isBlocked(to.x, to.z) && this.lineFree(last, to)) out.push({ x: to.x, z: to.z })
    return out
  }
}

class MinHeap {
  private a: number[] = []
  private k: number[] = []
  get size() { return this.a.length }
  push(v: number, key: number) {
    const a = this.a, k = this.k
    let i = a.length
    a.push(v); k.push(key)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= k[i]) break
      ;[a[p], a[i]] = [a[i], a[p]]; [k[p], k[i]] = [k[i], k[p]]
      i = p
    }
  }
  pop(): number {
    const a = this.a, k = this.k
    const top = a[0]
    const la = a.pop()!, lk = k.pop()!
    if (a.length) {
      a[0] = la; k[0] = lk
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < a.length && k[l] < k[m]) m = l
        if (r < a.length && k[r] < k[m]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]; [k[m], k[i]] = [k[i], k[m]]
        i = m
      }
    }
    return top
  }
}

const navCache = new Map<string, NavGrid>()
export function getNav(floorId: string): NavGrid {
  let n = navCache.get(floorId)
  if (!n) { n = new NavGrid(getFloor(floorId)); navCache.set(floorId, n) }
  return n
}
