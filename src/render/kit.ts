import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { FOOTPRINT } from '../world/generate'
import { DOOR_W, WALL_H } from '../world/constants'
import type { DeskDef, FurniturePlacement, WallSeg, WorkstationVariant, ZoneGen } from '../world/types'
import type { GeneratedFloor } from '../world/generate'

export type Shape = 'box' | 'cyl' | 'sphere' | 'cone'
export type MatKey = 'matte' | 'metal' | 'screen' | 'glass'

export interface Part {
  shape: Shape
  mat: MatKey
  pos: [number, number, number]
  /** Box: Kantenlängen. Zylinder/Kegel: (Durchmesser, Höhe, Durchmesser). Kugel: Durchmesser je Achse. */
  size: [number, number, number]
  color: string
  rotY?: number
  rotX?: number
  rotZ?: number
}

/** Farbpalette, bewusst klein gehalten: warmes Holz, dunkles Metall, gedeckte Stoffe. */
export const PAL = {
  wood: '#c08d5b', woodDark: '#8a5f3d', woodLight: '#e0bb8c', dark: '#2a2e38', dark2: '#3b4150', metal: '#9aa3b2',
  white: '#ecebe6', stone: '#d9d6cf', plant: '#4f9a5a', plant2: '#3b7d49', pot: '#c9794a',
  fabrics: ['#2f7f86', '#c9564a', '#d9a640', '#4a5670', '#6a9a66', '#7c5fa8'],
  concrete: '#2b2f38',
}

export const VARIANT_ACCENT: Record<WorkstationVariant, string> = {
  sales: '#e8a33d', developer: '#3fb6c4', research: '#d98a2b', creative: '#e0508b', ops: '#8b7bd8',
}
const VARIANT_TOP: Record<WorkstationVariant, string> = {
  sales: '#c9975f', developer: '#3d4352', research: '#dcc09a', creative: '#efece6', ops: '#d7d2c8',
}

const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, mat: MatKey = 'matte', rotY = 0): Part =>
  ({ shape: 'box', mat, pos: [x, y, z], size: [w, h, d], color, rotY })
const cyl = (x: number, y: number, z: number, dia: number, h: number, color: string, mat: MatKey = 'matte'): Part =>
  ({ shape: 'cyl', mat, pos: [x, y, z], size: [dia, h, dia], color })
const sph = (x: number, y: number, z: number, dx: number, dy: number, dz: number, color: string): Part =>
  ({ shape: 'sphere', mat: 'matte', pos: [x, y, z], size: [dx, dy, dz], color })

export const isVariant = (c?: string): c is WorkstationVariant => !!c && c in VARIANT_ACCENT

export function partsFor(p: FurniturePlacement): Part[] {
  const v: WorkstationVariant = isVariant(p.color) ? p.color : 'ops'
  const fabric = PAL.fabrics[Math.abs(Math.round(p.x * 7 + p.z * 13)) % PAL.fabrics.length]
  switch (p.kind) {
    case 'desk': {
      const w = p.w ?? 1.6, d = 0.9
      return [
        box(0, 0.74, 0, w, 0.06, d, VARIANT_TOP[v]),
        box(-(w / 2 - 0.05), 0.36, 0, 0.06, 0.72, d - 0.1, PAL.dark2),
        box(w / 2 - 0.05, 0.36, 0, 0.06, 0.72, d - 0.1, PAL.dark2),
        box(0, 0.5, -(d / 2 - 0.06), w - 0.1, 0.4, 0.03, PAL.dark2),
        box(0, 0.735, d / 2 + 0.005, w, 0.012, 0.012, VARIANT_ACCENT[v]),
      ]
    }
    case 'chair': {
      const c = v === 'developer' ? PAL.dark2 : v === 'creative' ? '#c9564a' : v === 'sales' ? '#2f7f86' : '#4a5670'
      return [
        box(0, 0.4, 0, 0.5, 0.08, 0.5, c),
        box(0, 0.72, 0.23, 0.48, 0.5, 0.07, c),
        cyl(0, 0.2, 0, 0.06, 0.36, PAL.metal, 'metal'),
        cyl(0, 0.03, 0, 0.5, 0.05, PAL.dark, 'metal'),
      ]
    }
    case 'computer': {
      const accent = VARIANT_ACCENT[v]
      const dual = v === 'developer' || v === 'research'
      const parts: Part[] = []
      const mons = dual ? [-0.36, 0.36] : [0]
      for (const mx of mons) {
        parts.push(box(mx, 0.785, -0.2, 0.22, 0.02, 0.16, PAL.dark))
        parts.push(box(mx, 0.87, -0.2, 0.05, 0.16, 0.05, PAL.dark))
        parts.push(box(mx, 1.1, -0.2, 0.66, 0.4, 0.035, PAL.dark))
        parts.push({ shape: 'box', mat: 'screen', pos: [mx, 1.1, -0.18], size: [0.6, 0.34, 0.01], color: '#ffffff' })
      }
      parts.push(box(0.05, 0.79, 0.2, 0.42, 0.02, 0.14, PAL.dark))
      parts.push(box(0.5, 0.79, 0.22, 0.08, 0.015, 0.11, PAL.dark2)) // Maus
      parts.push(box(dual ? 0.72 : 0.66, 0.95, -0.15, 0.16, 0.32, 0.32, PAL.dark2)) // Rechner
      parts.push(box(dual ? 0.72 : 0.66, 0.95, 0.011, 0.14, 0.012, 0.012, accent))
      parts.push(box(-0.7, 0.77, -0.28, 0.14, 0.02, 0.14, PAL.dark)) // Lampe
      parts.push(box(-0.7, 0.96, -0.28, 0.02, 0.38, 0.02, PAL.metal, 'metal'))
      parts.push(box(-0.64, 1.14, -0.24, 0.16, 0.03, 0.09, accent))
      return parts
    }
    case 'plant': {
      const s = p.scale ?? 1
      return [
        cyl(0, 0.15 * s, 0, 0.32 * s, 0.3 * s, PAL.pot),
        sph(0, 0.62 * s, 0, 0.55 * s, 0.6 * s, 0.55 * s, PAL.plant),
        sph(0.1 * s, 0.9 * s, 0.05 * s, 0.4 * s, 0.4 * s, 0.4 * s, PAL.plant2),
      ]
    }
    case 'tree':
      return [
        cyl(0, 0.7, 0, 0.16, 1.4, PAL.woodDark),
        sph(0, 2.0, 0, 1.3, 1.2, 1.3, PAL.plant2),
        sph(0.2, 2.5, 0.1, 0.9, 0.8, 0.9, PAL.plant),
      ]
    case 'bookshelf': {
      const parts = [
        box(0, 1.0, -0.17, 1.6, 2.0, 0.04, PAL.woodDark),
        box(-0.78, 1.0, 0, 0.04, 2.0, 0.4, PAL.wood),
        box(0.78, 1.0, 0, 0.04, 2.0, 0.4, PAL.wood),
      ]
      for (let i = 0; i < 5; i++) parts.push(box(0, 0.05 + i * 0.48, 0, 1.56, 0.04, 0.4, PAL.wood))
      const cols = ['#c9564a', '#2f7f86', '#d9a640', '#4a5670', '#7c5fa8', '#6a9a66']
      for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) {
        if ((i + r) % 4 === 3) continue
        parts.push(box(-0.6 + i * 0.2, 0.3 + r * 0.48, 0, 0.12, 0.34 + ((i * 3 + r) % 3) * 0.04, 0.26, cols[(i + r * 2) % cols.length]))
      }
      return parts
    }
    case 'sofa':
      return [
        box(0, 0.22, 0, 2.2, 0.44, 0.95, fabric),
        box(0, 0.68, -0.36, 2.2, 0.5, 0.22, fabric),
        box(-1.0, 0.45, 0.02, 0.2, 0.5, 0.95, fabric),
        box(1.0, 0.45, 0.02, 0.2, 0.5, 0.95, fabric),
        box(-0.4, 0.48, 0.08, 0.78, 0.1, 0.62, '#ffffff'),
        box(0.4, 0.48, 0.08, 0.78, 0.1, 0.62, '#ffffff'),
        box(0, 0.03, 0, 2.0, 0.06, 0.8, PAL.dark),
      ]
    case 'bench': {
      const w = p.w ?? 2.4
      return [
        box(0, 0.42, 0, w, 0.07, 0.5, PAL.wood),
        box(-w / 2 + 0.1, 0.2, 0, 0.06, 0.4, 0.44, PAL.dark),
        box(w / 2 - 0.1, 0.2, 0, 0.06, 0.4, 0.44, PAL.dark),
        box(0, 0.7, -0.27, w, 0.28, 0.05, PAL.woodDark),
        box(0, 0.02, 0, w, 0.03, 0.06, PAL.dark),
      ]
    }
    case 'coffeeTable':
      return [box(0, 0.38, 0, 1.0, 0.05, 0.6, PAL.woodLight), box(-0.42, 0.18, 0, 0.05, 0.36, 0.5, PAL.dark), box(0.42, 0.18, 0, 0.05, 0.36, 0.5, PAL.dark)]
    case 'meetingTable': {
      const w = p.w ?? 3, d = p.d ?? 1.4
      return [
        box(0, 0.75, 0, w, 0.08, d, PAL.wood),
        box(-w * 0.3, 0.36, 0, 0.3, 0.72, d * 0.6, PAL.dark2),
        box(w * 0.3, 0.36, 0, 0.3, 0.72, d * 0.6, PAL.dark2),
        box(0, 0.795, 0, w * 0.6, 0.01, 0.03, '#e8a33d'),
      ]
    }
    case 'roundTable':
      return [cyl(0, 0.75, 0, 1.6, 0.06, PAL.woodLight), cyl(0, 0.36, 0, 0.16, 0.7, PAL.dark2), cyl(0, 0.02, 0, 0.7, 0.04, PAL.dark)]
    case 'kitchenCounter': {
      const w = p.w ?? 3
      return [box(0, 0.45, 0, w, 0.9, 0.7, PAL.dark2), box(0, 0.93, 0, w + 0.04, 0.05, 0.76, PAL.stone), box(0, 0.5, 0.36, w - 0.1, 0.06, 0.02, '#e8a33d')]
    }
    case 'coffeeMachine':
      return [box(0, 1.2, 0, 0.3, 0.42, 0.3, PAL.dark), box(0, 1.03, 0.16, 0.2, 0.04, 0.1, PAL.metal, 'metal'), box(0, 1.36, 0.155, 0.16, 0.05, 0.01, '#e8a33d')]
    case 'fridge':
      return [box(0, 0.95, 0, 0.8, 1.9, 0.8, '#cfd3da', 'metal'), box(0.32, 1.1, 0.41, 0.03, 0.5, 0.03, PAL.dark), box(0, 1.28, 0.401, 0.78, 0.01, 0.01, PAL.dark)]
    case 'stool':
      return [cyl(0, 0.6, 0, 0.36, 0.05, PAL.woodDark), cyl(0, 0.3, 0, 0.06, 0.6, PAL.metal, 'metal'), cyl(0, 0.02, 0, 0.3, 0.03, PAL.dark)]
    case 'whiteboard':
      return [box(0, 1.5, 0, 2.4, 1.2, 0.05, PAL.dark), box(0, 1.5, 0.03, 2.3, 1.1, 0.02, '#f4f4f0'), box(-0.4, 1.5, 0.045, 0.9, 0.02, 0.005, '#3fb6c4'), box(0.3, 1.3, 0.045, 1.1, 0.02, 0.005, '#c9564a')]
    case 'wallDisplay':
    case 'bigScreen': {
      const w = p.w ?? 3, h = p.h ?? 1.6
      return [box(0, p.y ?? 1.9 + h / 2 - 0.4, 0, w + 0.1, h + 0.1, 0.06, PAL.dark)]
    }
    case 'bin':
      return [cyl(0, 0.2, 0, 0.3, 0.4, PAL.dark2), cyl(0, 0.41, 0, 0.32, 0.02, PAL.metal, 'metal')]
    case 'serverRack': {
      const parts: Part[] = [box(0, 1.0, 0, 0.8, 2.0, 0.9, PAL.dark)]
      for (let i = 0; i < 9; i++) {
        parts.push({ shape: 'box', mat: 'screen', pos: [0.06 * ((i % 3) - 1) * 0, 0.3 + i * 0.18, 0.456], size: [0.66, 0.05, 0.01], color: (p.color === 'a' ? (i % 3 ? '#38d6b4' : '#f0b23d') : (i % 4 ? '#5f9bff' : '#38d6b4')) })
      }
      return parts
    }
    case 'reception':
      return [
        box(0, 0.55, 0, p.w ?? 4, 1.1, 1.0, PAL.woodDark),
        box(0, 1.12, 0, (p.w ?? 4) + 0.1, 0.06, 1.1, PAL.stone),
        box(0, 0.55, -0.51, (p.w ?? 4) - 0.2, 0.9, 0.02, '#e8a33d'),
      ]
    case 'booth':
      return [
        box(0, 0.03, 0, 2.2, 0.06, 2.2, '#5a6a80'),
        { shape: 'box', mat: 'glass', pos: [0, 1.05, -1.08], size: [2.2, 2.0, 0.04], color: '#bfe4f0' },
        { shape: 'box', mat: 'glass', pos: [-1.08, 1.05, 0], size: [0.04, 2.0, 2.2], color: '#bfe4f0' },
        { shape: 'box', mat: 'glass', pos: [1.08, 1.05, 0], size: [0.04, 2.0, 2.2], color: '#bfe4f0' },
        box(0, 2.1, 0, 2.24, 0.08, 2.24, PAL.dark2),
        box(-1.08, 1.05, -1.08, 0.07, 2.1, 0.07, PAL.dark), box(1.08, 1.05, -1.08, 0.07, 2.1, 0.07, PAL.dark),
        box(-1.08, 1.05, 1.08, 0.07, 2.1, 0.07, PAL.dark), box(1.08, 1.05, 1.08, 0.07, 2.1, 0.07, PAL.dark),
        box(0, 0.25, -0.65, 1.5, 0.5, 0.6, fabric),
        box(0, 0.7, -0.92, 1.5, 0.5, 0.15, fabric),
        box(0, 0.4, 0.2, 0.6, 0.05, 0.5, PAL.woodLight), box(0, 0.2, 0.2, 0.06, 0.4, 0.06, PAL.dark),
      ]
    case 'divider':
      return [{ shape: 'box', mat: 'glass', pos: [0, 0.9, 0], size: [1.6, 1.4, 0.04], color: '#bfe4f0' }, box(0, 0.1, 0, 1.6, 0.2, 0.06, PAL.dark2)]
    case 'monitor': case 'monitor2': case 'keyboard': case 'lamp': return []
  }
}

/** Glaswand aus Scheibe, Rahmen und Pfosten. Türlücken sind bereits aus den Segmenten herausgeschnitten. */
export function wallParts(w: WallSeg): { part: Part; cx: number; cz: number; yaw: number }[] {
  const dx = w.x1 - w.x0, dz = w.z1 - w.z0
  const L = Math.hypot(dx, dz)
  if (L < 0.05) return []
  const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2
  const yaw = Math.abs(dx) >= Math.abs(dz) ? 0 : Math.PI / 2
  const out: { part: Part; cx: number; cz: number; yaw: number }[] = []
  const add = (part: Part) => out.push({ part, cx, cz, yaw })
  add({ shape: 'box', mat: 'glass', pos: [0, WALL_H / 2 + 0.12, 0], size: [L, WALL_H - 0.24, 0.04], color: '#c8e8f2' })
  add(box(0, 0.1, 0, L, 0.2, 0.12, PAL.dark2)) // Sockel
  add(box(0, WALL_H, 0, L, 0.1, 0.12, PAL.dark)) // Kopfschiene
  const n = Math.max(1, Math.round(L / 2.6))
  for (let i = 0; i <= n; i++) add(box(-L / 2 + (L * i) / n, WALL_H / 2, 0, 0.07, WALL_H, 0.1, PAL.dark))
  return out
}

/** Zonenbeläge als flache Boxen. */
export const ZONE_FLOOR: Record<string, string> = {
  workstations: '#4a5468', creative: '#5a4660', meeting: '#5e5a54', lounge: '#6b5f52', kitchen: '#c9c4b8', bench: '#3f4f5a',
  lobby: '#7a6a58', booths: '#4b5a6a', ceo: '#4a4258', strategy: '#4a5060', servers: '#2c3038', display: '#3a3f4c',
  core: '#22252c', elevatorLobby: '#cbbfae',
}

// --- Instanz-Aufbau -------------------------------------------------------------------------

export interface BatchSource { part: Part; matrix: Matrix4; structure?: boolean; screenOf?: string }
const _p = new Vector3(), _q = new Quaternion(), _s = new Vector3(), _e = new Euler()

export function partMatrix(part: Part, ox: number, oy: number, oz: number, yaw: number, scale = 1): Matrix4 {
  // lokale Teilposition mit yaw drehen, dann verschieben
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const [px, py, pz] = part.pos
  _p.set(ox + (px * c + pz * s) * scale, oy + py * scale, oz + (-px * s + pz * c) * scale)
  _e.set(part.rotX ?? 0, yaw + (part.rotY ?? 0), part.rotZ ?? 0)
  _q.setFromEuler(_e)
  _s.set(part.size[0] * scale, part.size[1] * scale, part.size[2] * scale)
  return new Matrix4().compose(_p, _q, _s)
}

export interface FloorSources {
  sources: BatchSource[]
  deskByComputer: Map<string, DeskDef>
}

export function collectSources(f: GeneratedFloor): FloorSources {
  const sources: BatchSource[] = []
  const deskByComputer = new Map<string, DeskDef>()
  for (const d of f.desks) deskByComputer.set(d.computerId, d)

  for (const p of f.placements) {
    const parts = partsFor(p)
    for (const part of parts) {
      sources.push({
        part, matrix: partMatrix(part, p.x, 0, p.z, p.yaw, p.kind === 'plant' ? 1 : 1),
        screenOf: p.kind === 'computer' && part.mat === 'screen' ? p.id : undefined,
      })
    }
  }
  for (const w of f.walls) {
    for (const { part, cx, cz, yaw } of wallParts(w)) sources.push({ part, matrix: partMatrix(part, cx, 0, cz, yaw), structure: true })
  }
  // Grundbelag im ganzen Geschoss (Korridore), Zonenbeläge liegen darüber
  const base: Part = { shape: 'box', mat: 'matte', pos: [0, 0.011, 0], size: [43.9, 0.02, 29.9], color: '#8a7b68' }
  sources.push({ part: base, matrix: partMatrix(base, 0, 0, 0, 0), structure: true })
  // Zonenbeläge
  for (const z of f.zones) {
    const r = z.config.rect
    if (z.config.type === 'core') continue
    const color = new Color(ZONE_FLOOR[z.config.type] ?? '#444')
    color.lerp(new Color(z.accent), z.config.type === 'workstations' || z.config.type === 'creative' ? 0.14 : 0.06)
    const part: Part = { shape: 'box', mat: 'matte', pos: [0, 0.025, 0], size: [r.x1 - r.x0 - 0.1, 0.03, r.z1 - r.z0 - 0.1], color: '#' + color.getHexString() }
    sources.push({ part, matrix: partMatrix(part, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2, 0), structure: true })
  }
  // Akzentstreifen am Zonenrand vor der Tür, ein Hinweis, wohin es geht
  return { sources, deskByComputer }
}

export { FOOTPRINT, DOOR_W }
export type { ZoneGen }
