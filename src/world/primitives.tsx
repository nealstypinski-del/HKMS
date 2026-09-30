// Gemeinsame Geometrien und Materialien. Alle Möbel bestehen aus skalierten Einheitskörpern,
// dadurch bleibt die Zahl unterschiedlicher Geometrien klein.

import { useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

export type V3 = [number, number, number]

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  plane: new THREE.PlaneGeometry(1, 1),
  octa: new THREE.OctahedronGeometry(1),
  torus: new THREE.TorusGeometry(1, 0.12, 6, 24),
}

const cache = new Map<string, THREE.MeshStandardMaterial>()

export function mat(color: string, emissive?: string, emissiveIntensity = 1): THREE.MeshStandardMaterial {
  const key = `${color}|${emissive ?? ''}|${emissiveIntensity}`
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.04 })
    if (emissive) {
      m.emissive = new THREE.Color(emissive)
      m.emissiveIntensity = emissiveIntensity
    }
    cache.set(key, m)
  }
  return m
}

const glassCache = new Map<string, THREE.MeshStandardMaterial>()
export function glass(color = '#bfe6f5', opacity = 0.22): THREE.MeshStandardMaterial {
  const key = `${color}|${opacity}`
  let m = glassCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.1, metalness: 0.2, depthWrite: false })
    glassCache.set(key, m)
  }
  return m
}

const num = (s: V3 | number): V3 => (typeof s === 'number' ? [s, s, s] : s)

interface PrimProps {
  pos?: V3
  size?: V3 | number
  rot?: V3
  color?: string
  emissive?: string
  ei?: number
  material?: THREE.Material
  cast?: boolean
  receive?: boolean
}

type MeshExtra = Omit<ThreeElements['mesh'], 'position' | 'scale' | 'rotation' | 'geometry' | 'material' | 'castShadow' | 'receiveShadow'>

function make(geometry: THREE.BufferGeometry) {
  return function Prim({ pos = [0, 0, 0], size = 1, rot, color = '#ffffff', emissive, ei, material, cast = true, receive = true, ...rest }: PrimProps & MeshExtra) {
    const m = useMemo(() => material ?? mat(color, emissive, ei), [material, color, emissive, ei])
    return <mesh geometry={geometry} material={m} position={pos} scale={num(size)} rotation={rot} castShadow={cast} receiveShadow={receive} {...rest} />
  }
}

/** Quader mit Kantenlängen `size` */
export const Box = make(GEO.box)
/** Zylinder: size = [Radius, Höhe, Radius] */
export const Cyl = make(GEO.cyl)
export const CylLow = make(GEO.cylLow)
/** Kugel mit Radius `size` */
export const Ball = make(GEO.sphere)
export const Cone = make(GEO.cone)
export const Plane = make(GEO.plane)
