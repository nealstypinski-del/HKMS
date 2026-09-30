import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Matrix4, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HAIR_COLORS, SHIRTS, SHOES, SKIN, TROUSERS } from '../world/avatar'
import type { Avatar } from '../world/types'

/**
 * Figurengeometrie pro Aussehen, zu wenigen Meshes mit Vertexfarben verschmolzen.
 * Alle Figuren teilen sich ein einziges Material, dadurch braucht eine ferne Figur nur einen Draw Call.
 */
export const figureMaterial = new MeshLambertMaterial({ vertexColors: true })

type Shape = 'box' | 'sphere' | 'cyl' | 'cone'
interface Piece { shape: Shape; pos: [number, number, number]; scale: [number, number, number]; color: string; rot?: [number, number, number] }

const BASE: Record<Shape, BufferGeometry> = {
  box: new BoxGeometry(1, 1, 1),
  sphere: new SphereGeometry(0.5, 10, 8),
  cyl: new CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new ConeGeometry(0.5, 1, 8),
}
const _q = new Quaternion(), _e = new Euler(), _p = new Vector3(), _s = new Vector3()

function bake(pieces: Piece[], parent?: Matrix4): BufferGeometry {
  const geos = pieces.map((pc) => {
    const g = BASE[pc.shape].clone()
    const m = new Matrix4().compose(_p.set(...pc.pos), _q.setFromEuler(_e.set(...(pc.rot ?? [0, 0, 0]))), _s.set(...pc.scale))
    if (parent) m.premultiply(parent)
    g.applyMatrix4(m)
    const n = g.attributes.position.count
    const col = new Color(pc.color)
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b }
    g.setAttribute('color', new BufferAttribute(arr, 3))
    return g
  })
  return mergeGeometries(geos, false)!
}

const B = (pos: [number, number, number], scale: [number, number, number], color: string, rot?: [number, number, number]): Piece => ({ shape: 'box', pos, scale, color, rot })
const S = (pos: [number, number, number], scale: [number, number, number], color: string): Piece => ({ shape: 'sphere', pos, scale, color })

const GOLD = '#f2c14e'

function hairPieces(style: Avatar['hairStyle'], c: string): Piece[] {
  switch (style) {
    case 'bald': return []
    case 'short': return [S([0, 0.1, -0.02], [0.54, 0.34, 0.54], c)]
    case 'long': return [S([0, 0.1, -0.02], [0.55, 0.34, 0.55], c), B([0, -0.12, -0.2], [0.5, 0.5, 0.12], c)]
    case 'bun': return [S([0, 0.1, -0.02], [0.54, 0.34, 0.54], c), S([0, 0.34, -0.05], [0.2, 0.2, 0.2], c)]
    case 'mohawk': return [B([0, 0.27, 0], [0.08, 0.2, 0.42], c)]
    case 'spiky': return [S([0, 0.1, -0.02], [0.52, 0.28, 0.52], c), ...[[-0.14, 0], [0.14, 0], [0, 0.12], [0, -0.12]].map(([x, z]): Piece => ({ shape: 'cone', pos: [x, 0.3, z], scale: [0.12, 0.2, 0.12], color: c }))]
    case 'ponytail': return [S([0, 0.1, -0.02], [0.54, 0.34, 0.54], c), B([0, -0.02, -0.28], [0.1, 0.34, 0.1], c, [0.4, 0, 0])]
    case 'curly': return [[-0.16, 0.14, 0.02], [0.16, 0.14, 0.02], [0, 0.22, 0.02], [-0.1, 0.12, -0.16], [0.1, 0.12, -0.16]].map(([x, y, z]) => S([x, y, z], [0.24, 0.24, 0.24], c))
  }
}
function headwearPieces(kind: Avatar['headwear'], shirt: string): Piece[] {
  switch (kind) {
    case 'none': return []
    case 'cap': return [{ shape: 'cyl', pos: [0, 0.2, -0.01], scale: [0.56, 0.16, 0.56], color: shirt }, B([0, 0.14, 0.26], [0.4, 0.03, 0.26], shirt)]
    case 'beanie': return [S([0, 0.16, -0.01], [0.58, 0.4, 0.58], '#c9564a')]
    case 'crown': return [
      { shape: 'cyl', pos: [0, 0.27, 0], scale: [0.38, 0.09, 0.38], color: GOLD },
      ...[0, 1, 2, 3, 4].map((i): Piece => { const a = (i / 5) * Math.PI * 2; return { shape: 'cone', pos: [Math.cos(a) * 0.15, 0.39, Math.sin(a) * 0.15], scale: [0.09, 0.16, 0.09], color: GOLD } }),
    ]
  }
}
function accessoryPieces(kind: Avatar['accessory']): Piece[] {
  if (kind === 'glasses') return [B([-0.1, 0.02, 0.245], [0.14, 0.1, 0.02], '#15171d'), B([0.1, 0.02, 0.245], [0.14, 0.1, 0.02], '#15171d'), B([0, 0.03, 0.245], [0.08, 0.02, 0.02], '#15171d')]
  if (kind === 'headphones') return [
    { shape: 'cyl', pos: [-0.27, 0, 0], scale: [0.16, 0.09, 0.16], color: '#2b2f3a', rot: [0, 0, Math.PI / 2] },
    { shape: 'cyl', pos: [0.27, 0, 0], scale: [0.16, 0.09, 0.16], color: '#2b2f3a', rot: [0, 0, Math.PI / 2] },
    B([0, 0.27, 0], [0.56, 0.04, 0.06], '#2b2f3a'),
  ]
  return []
}

export interface FigureGeos {
  /** Oberkörper mit Kopf, Haaren, Kopfbedeckung, Accessoire (in Hüftkoordinaten) */
  upper: BufferGeometry
  arm: BufferGeometry // gemeinsame Geometrie für beide Arme (Ursprung an der Schulter, Ärmel plus Unterarm)
  thigh: BufferGeometry
  shin: BufferGeometry
  /** verschmolzene Varianten für die mittlere Detailstufe */
  midStand: BufferGeometry
  midSit: BufferGeometry
  far: BufferGeometry
}

const cache = new Map<string, FigureGeos>()
export const avatarKey = (a: Avatar) => `${a.skinVariant}|${a.hairStyle}|${a.hairVariant}|${a.shirtVariant}|${a.trousersVariant}|${a.shoesVariant}|${a.headwear}|${a.accessory}`

export function getFigureGeos(a: Avatar): FigureGeos {
  const key = avatarKey(a)
  const hit = cache.get(key)
  if (hit) return hit
  const skin = SKIN[a.skinVariant % SKIN.length]
  const hair = HAIR_COLORS[a.hairVariant % HAIR_COLORS.length]
  const shirt = SHIRTS[a.shirtVariant % SHIRTS.length]
  const trousers = TROUSERS[a.trousersVariant % TROUSERS.length]
  const shoe = SHOES[a.shoesVariant % SHOES.length]

  const head: Piece[] = [
    S([0, 0, 0], [0.5, 0.5, 0.5], skin),
    S([-0.1, 0, 0.215], [0.06, 0.07, 0.04], '#15171d'), S([0.1, 0, 0.215], [0.06, 0.07, 0.04], '#15171d'),
    ...hairPieces(a.hairStyle, hair), ...headwearPieces(a.headwear, shirt), ...accessoryPieces(a.accessory),
  ]
  const headM = new Matrix4().makeTranslation(0, 0.74, 0)
  const torso = [B([0, 0.27, 0], [0.38, 0.5, 0.22], shirt)]
  const upperArm = [B([0, -0.13, 0], [0.11, 0.28, 0.11], shirt)]
  const fore = [B([0, -0.12, 0], [0.09, 0.26, 0.09], skin)]
  const thigh = [B([0, -0.15, 0], [0.15, 0.3, 0.16], trousers)]
  const shinP = [B([0, -0.15, 0], [0.14, 0.3, 0.15], trousers), B([0, -0.32, 0.04], [0.15, 0.07, 0.24], shoe)]

  const upper = mergeGeometries([bake(torso), bake(head, headM)], false)!
  // Arm: Oberarm und leicht gebeugter Unterarm, Ursprung an der Schulter
  const elbow = new Matrix4().makeTranslation(0, -0.27, 0).multiply(new Matrix4().makeRotationX(-0.45))
  const arm = mergeGeometries([bake(upperArm), bake(fore, elbow)], false)!
  const thighG = bake(thigh)
  const shinG = bake(shinP)

  // Mittlere Stufe: alles in einer Geometrie, stehend oder sitzend
  const build = (seated: boolean) => {
    const parts: BufferGeometry[] = [bake(torso), bake(head, headM)]
    for (const sx of [-1, 1]) {
      const sh = new Matrix4().makeTranslation(sx * 0.26, 0.44, 0)
      const armRot = new Matrix4().makeRotationX(seated ? -0.85 : 0)
      parts.push(bake(upperArm, sh.clone().multiply(armRot)))
      parts.push(bake(fore, sh.clone().multiply(armRot).multiply(elbow)))
      const hip = new Matrix4().makeTranslation(sx * 0.1, 0, 0)
      const thRot = new Matrix4().makeRotationX(seated ? -Math.PI / 2 : 0)
      parts.push(bake(thigh, hip.clone().multiply(thRot)))
      const knee = new Matrix4().makeTranslation(0, -0.3, 0).multiply(new Matrix4().makeRotationX(seated ? Math.PI / 2 : 0))
      parts.push(bake(shinP, hip.clone().multiply(thRot).multiply(knee)))
    }
    return mergeGeometries(parts, false)!
  }
  const far = bake([B([0, 0.05, 0], [0.36, 1.0, 0.26], shirt), S([0, 0.72, 0], [0.5, 0.5, 0.5], skin)])
  const g: FigureGeos = { upper, arm, thigh: thighG, shin: shinG, midStand: build(false), midSit: build(true), far }
  cache.set(key, g)
  return g
}
