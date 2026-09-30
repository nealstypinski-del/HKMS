import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { FOOTPRINT } from '../world/generate'
import { DOOR_W, WALL_H } from '../world/constants'
import type { DeskDef, FurniturePlacement, WallSeg, WorkstationVariant, ZoneGen } from '../world/types'
import type { GeneratedFloor } from '../world/generate'

export type Shape = 'box' | 'cyl' | 'sphere' | 'cone'
export type MatKey = 'matte' | 'metal' | 'screen' | 'glass' | 'parquet' | 'carpet' | 'tile' | 'marble'

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

/** Kleiner deterministischer Hash für Variationen (Schreibtischkleinkram, Bildmotive) */
export function hash01(str: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}
const MUGS = ['#c9564a', '#2f7f86', '#e8e2d6', '#d9a640', '#4a5670']

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
      // Kleinkram, je Platz deterministisch verschieden
      const r1 = hash01(p.id, 1), r2 = hash01(p.id, 2), r3 = hash01(p.id, 3), r4 = hash01(p.id, 4)
      if (r1 < 0.62) { parts.push(cyl(0.42, 0.825, 0.1, 0.085, 0.1, MUGS[Math.floor(r1 * 100) % MUGS.length])); parts.push(box(0.475, 0.83, 0.1, 0.02, 0.05, 0.02, '#d8d4cc')) }
      if (r2 < 0.55) { parts.push({ ...box(-0.46, 0.79, 0.2, 0.22, 0.018, 0.3, '#f4f2ec'), rotY: (r2 - 0.27) * 0.6 }); parts.push({ ...box(-0.44, 0.805, 0.22, 0.2, 0.014, 0.28, '#e6e2d8'), rotY: (r2 - 0.2) * 0.8 }) }
      if (r3 < 0.35) { parts.push(cyl(-0.72, 0.82, 0.22, 0.1, 0.09, PAL.pot)); parts.push(sph(-0.72, 0.9, 0.22, 0.14, 0.14, 0.14, PAL.plant)) }
      if (r4 < 0.3) parts.push(box(0.62, 0.795, 0.18, 0.16, 0.018, 0.1, accent)) // Notizblock
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
    case 'cabinet': {
      const parts: Part[] = [box(0, 0.7, 0, 1.0, 1.4, 0.5, '#8f97a5', 'metal')]
      for (let i = 0; i < 4; i++) { parts.push(box(0, 0.2 + i * 0.33, 0.255, 0.92, 0.3, 0.012, '#6a7282')); parts.push(box(0, 0.28 + i * 0.33, 0.27, 0.22, 0.03, 0.03, '#d0d4dc', 'metal')) }
      return parts
    }
    case 'printer':
      return [
        box(0, 0.37, 0, 0.7, 0.74, 0.5, PAL.dark2),
        box(0, 0.9, 0, 0.56, 0.32, 0.44, '#eceae4'),
        box(0, 0.78, 0.26, 0.4, 0.02, 0.16, '#cfd3da'),
        { shape: 'box', mat: 'screen', pos: [0.18, 1.0, 0.225], size: [0.1, 0.05, 0.01], color: '#38d6b4' },
      ]
    case 'waterCooler':
      return [box(0, 0.45, 0, 0.36, 0.9, 0.36, '#eceae4'), cyl(0, 1.18, 0, 0.28, 0.5, '#8ccfee'), box(0, 0.75, 0.19, 0.12, 0.05, 0.05, '#3a7fbf'), box(0, 0.62, 0.19, 0.12, 0.05, 0.05, '#c9564a')]
    case 'vending':
      return [
        box(0, 0.95, 0, 0.9, 1.9, 0.8, '#2f5d8a'),
        { shape: 'box', mat: 'screen', pos: [-0.08, 1.15, 0.405], size: [0.62, 1.15, 0.01], color: '#bfe6ff' },
        box(0.33, 1.15, 0.41, 0.16, 0.9, 0.02, '#1c3a5a'),
        box(0, 0.22, 0.405, 0.7, 0.2, 0.02, '#152a40'),
      ]
    case 'coatRack':
      return [cyl(0, 0.9, 0, 0.05, 1.8, PAL.woodDark), cyl(0, 0.02, 0, 0.4, 0.04, PAL.dark), box(0.14, 1.4, 0.05, 0.16, 0.7, 0.12, '#4a5670'), box(-0.13, 1.45, -0.04, 0.16, 0.6, 0.12, '#c9564a'), box(0, 1.78, 0, 0.3, 0.03, 0.03, PAL.woodDark)]
    case 'wallClock':
      return [cyl(0, 2.7, 0, 0.55, 0.05, '#f4f2ec', 'matte'), { ...box(0, 2.7, 0.03, 0.03, 0.2, 0.01, PAL.dark), rotZ: 0.4 }, { ...box(0, 2.7, 0.03, 0.02, 0.15, 0.01, PAL.dark), rotZ: -1.2 }]
    case 'painting': {
      const a = hash01(p.id, 1), b = hash01(p.id, 2), c = hash01(p.id, 3)
      const pal = ['#c9564a', '#2f7f86', '#d9a640', '#4a5670', '#6a9a66', '#e8e2d6', '#7c5fa8']
      const w = p.w ?? 1.1, h = p.h ?? 0.75
      return [
        box(0, 1.9, 0, w + 0.1, h + 0.1, 0.05, '#2a2e38'),
        box(0, 1.9, 0.03, w, h, 0.02, pal[Math.floor(a * 100) % pal.length]),
        box(-w * 0.2, 1.85, 0.045, w * 0.45, h * 0.5, 0.01, pal[Math.floor(b * 100) % pal.length]),
        box(w * 0.22, 2.0, 0.045, w * 0.3, h * 0.35, 0.01, pal[Math.floor(c * 100) % pal.length]),
      ]
    }
    case 'rug': {
      const w = p.w ?? 3, d = p.d ?? 2
      const base = p.color && p.color.startsWith('#') ? p.color : '#8a4f4a'
      return [box(0, 0.034, 0, w, 0.014, d, base), box(0, 0.042, 0, w - 0.3, 0.012, d - 0.3, '#e4d9c3'), box(0, 0.05, 0, w - 0.6, 0.012, d - 0.6, base)]
    }
    case 'pendant': {
      const col = p.color && p.color.startsWith('#') ? p.color : '#e8a33d'
      return [cyl(0, 4.2, 0, 0.02, 1.2, PAL.dark), cyl(0, 3.55, 0, 0.5, 0.22, col), { shape: 'cyl', mat: 'screen', pos: [0, 3.43, 0], size: [0.42, 0.02, 0.42], color: '#fff1cf' }]
    }
    case 'floorLamp':
      return [cyl(0, 0.02, 0, 0.3, 0.04, PAL.dark), cyl(0, 0.8, 0, 0.03, 1.6, PAL.dark), cyl(0, 1.62, 0, 0.36, 0.3, '#f2e6c9'), { shape: 'cyl', mat: 'screen', pos: [0, 1.46, 0], size: [0.3, 0.02, 0.3], color: '#fff1cf' }]
    case 'noticeBoard': {
      const parts: Part[] = [box(0, 1.6, 0, 1.4, 0.9, 0.04, '#5a4636'), box(0, 1.6, 0.025, 1.3, 0.8, 0.02, '#b98a5a')]
      const cols = ['#f4f2ec', '#f2d96a', '#9fd6ff', '#f4b6c2']
      for (let i = 0; i < 6; i++) parts.push({ ...box(-0.5 + (i % 3) * 0.5, 1.75 - Math.floor(i / 3) * 0.35, 0.04, 0.3, 0.24, 0.006, cols[(i + Math.floor(hash01(p.id) * 10)) % 4]), rotY: 0, rotZ: (hash01(p.id, i) - 0.5) * 0.2 })
      return parts
    }
    case 'planterTall':
      return [cyl(0, 0.3, 0, 0.5, 0.6, '#5a4a3c'), cyl(0, 0.62, 0, 0.44, 0.04, '#3a2f26'), cyl(0, 1.1, 0, 0.06, 1.0, PAL.woodDark), sph(0, 1.75, 0, 0.9, 0.8, 0.9, PAL.plant2), sph(0.22, 2.1, 0.1, 0.6, 0.5, 0.6, PAL.plant), sph(-0.2, 1.55, -0.1, 0.55, 0.5, 0.55, PAL.plant)]
    case 'monitor': case 'monitor2': case 'keyboard': case 'lamp': return []
  }
}

export type WallMode = 'high' | 'half' | 'none'
const KNEE = 0.95

/**
 * Trennwand im Sims Stil: massive tapezierte Brüstung mit Sockelleiste und Holzabdeckung, darüber Glas bis zur Decke.
 * Wandmodus: hoch = mit Glas, halb = nur Brüstung, weg = nur eine Bodenmarkierung.
 */
export function wallParts(w: WallSeg, mode: WallMode = 'high'): { part: Part; cx: number; cz: number; yaw: number }[] {
  const dx = w.x1 - w.x0, dz = w.z1 - w.z0
  const L = Math.hypot(dx, dz)
  if (L < 0.05) return []
  const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2
  const yaw = Math.abs(dx) >= Math.abs(dz) ? 0 : Math.PI / 2
  const out: { part: Part; cx: number; cz: number; yaw: number }[] = []
  const add = (part: Part) => out.push({ part, cx, cz, yaw })
  if (mode === 'none') { add(box(0, 0.015, 0, L, 0.03, 0.16, '#6b5a48')); return out }
  add(box(0, KNEE / 2, 0, L, KNEE, 0.14, '#d9cdb8')) // Tapete
  add(box(0, 0.07, 0, L, 0.14, 0.17, '#4b3a2c')) // Sockelleiste
  add(box(0, KNEE + 0.025, 0, L, 0.05, 0.19, PAL.woodDark)) // Abdeckleiste
  if (mode === 'half') return out
  add({ shape: 'box', mat: 'glass', pos: [0, KNEE + 0.05 + (WALL_H - KNEE - 0.15) / 2, 0], size: [L, WALL_H - KNEE - 0.15, 0.04], color: '#c8e8f2' })
  add(box(0, WALL_H, 0, L, 0.1, 0.12, PAL.dark)) // Kopfschiene
  const n = Math.max(1, Math.round(L / 2.6))
  for (let i = 0; i <= n; i++) add(box(-L / 2 + (L * i) / n, (KNEE + WALL_H) / 2, 0, 0.07, WALL_H - KNEE, 0.1, PAL.dark))
  return out
}

/** Zonenbeläge als flache Boxen. */
export const ZONE_FLOOR: Record<string, string> = {
  workstations: '#7d8aa3', creative: '#9a7aa0', meeting: '#8a857c', lounge: '#a08a6c', kitchen: '#ffffff', bench: '#9aa3ad',
  lobby: '#ffffff', booths: '#7f93a8', ceo: '#8a6a5a', strategy: '#7a8296', servers: '#5a6068', display: '#6a7088',
  core: '#22252c', elevatorLobby: '#ffffff',
}
/** Belagsmaterial je Zonentyp */
export const ZONE_MAT: Record<string, MatKey> = {
  workstations: 'carpet', creative: 'carpet', meeting: 'carpet', lounge: 'parquet', kitchen: 'tile', bench: 'tile',
  lobby: 'marble', booths: 'carpet', ceo: 'parquet', strategy: 'carpet', servers: 'tile', display: 'carpet', core: 'matte', elevatorLobby: 'marble',
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
  // Grundbelag im ganzen Geschoss (Korridore), Zonenbeläge liegen darüber
  const base: Part = { shape: 'box', mat: 'parquet', pos: [0, 0.011, 0], size: [43.9, 0.02, 29.9], color: '#ffffff' }
  sources.push({ part: base, matrix: partMatrix(base, 0, 0, 0, 0), structure: true })
  // Zonenbeläge
  for (const z of f.zones) {
    const r = z.config.rect
    if (z.config.type === 'core') continue
    const color = new Color(ZONE_FLOOR[z.config.type] ?? '#444')
    color.lerp(new Color(z.accent), z.config.type === 'workstations' || z.config.type === 'creative' ? 0.22 : 0.06)
    const part: Part = { shape: 'box', mat: ZONE_MAT[z.config.type] ?? 'matte', pos: [0, 0.025, 0], size: [r.x1 - r.x0 - 0.1, 0.03, r.z1 - r.z0 - 0.1], color: '#' + color.getHexString() }
    sources.push({ part, matrix: partMatrix(part, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2, 0), structure: true })
  }
  // Akzentstreifen am Zonenrand vor der Tür, ein Hinweis, wohin es geht
  return { sources, deskByComputer }
}

export { FOOTPRINT, DOOR_W }
export type { ZoneGen }

/** Wandquellen je Wandmodus (getrennt, damit der Modus ohne Neuaufbau der Möbel wechseln kann). */
export function collectWallSources(f: GeneratedFloor, mode: WallMode): BatchSource[] {
  const out: BatchSource[] = []
  for (const w of f.walls) for (const { part, cx, cz, yaw } of wallParts(w, mode)) out.push({ part, matrix: partMatrix(part, cx, 0, cz, yaw), structure: true })
  return out
}
