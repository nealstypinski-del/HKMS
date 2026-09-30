import { useMemo } from 'react'
import * as THREE from 'three'
import { Detailed } from '@react-three/drei'
import { REF } from '../config/bergpark.config.js'
import { bake, mergeParts } from '../common/geometryUtils.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'

// Vereinfachte, originale Herkulesfigur (8,30 m, Keule 4,70 m) mit drei Detailstufen.
// Höhen: Füße bei y = 0, Kopfoberkante bei y = figureHeight. Blickrichtung +Z.
const COPPER = '#7fbba3'
const COPPER_DARK = '#5b9782'
const SKIN = '#8fc6ae'

const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg)
const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h)

function figureLOD0() {
  const H = REF.figureHeight
  const s = H / 8.3
  const P = (g, o) => bake(g, o)
  const parts = [
    P(cyl(0.42, 0.5, 3.4, 7), { p: [-0.6, 1.7, 0], color: COPPER }),
    P(cyl(0.42, 0.5, 3.4, 7), { p: [0.6, 1.7, 0.1], r: [0, 0, 0], color: COPPER }),
    P(new THREE.BoxGeometry(2.3, 1.0, 1.3), { p: [0, 3.7, 0], color: COPPER_DARK }),
    P(cyl(1.15, 0.9, 2.7, 8), { p: [0, 5.2, 0], s: [1, 1, 0.72], color: SKIN }),
    P(sph(0.7, 8, 6), { p: [-1.3, 6.3, 0], color: COPPER }),
    P(sph(0.7, 8, 6), { p: [1.3, 6.3, 0], color: COPPER }),
    P(cyl(0.3, 0.35, 0.5, 6), { p: [0, 6.75, 0], color: SKIN }),
    P(sph(0.66, 9, 7), { p: [0, 7.64, 0.05], color: SKIN }),
    P(sph(0.7, 8, 5), { p: [0, 7.9, -0.1], s: [1, 0.7, 1], color: COPPER_DARK }),
    // Löwenfell über der linken Schulter
    P(new THREE.ConeGeometry(1.05, 2.8, 6), { p: [-1.55, 4.9, -0.2], r: [0, 0, 0.12], color: COPPER_DARK }),
    // linker Arm (angewinkelt)
    P(cyl(0.3, 0.36, 2.2, 6), { p: [-1.65, 5.2, 0.35], r: [0.5, 0, 0.12], color: COPPER }),
    // rechter Arm greift die Keule
    P(cyl(0.3, 0.36, 2.4, 6), { p: [1.75, 5.0, 0.3], r: [0.4, 0, -0.1], color: COPPER }),
    // Keule (4,7 m): Kopf oben, Griff unten, leicht geneigt an der rechten Seite
    P(cyl(0.55, 0.22, REF.clubLength, 7), { p: [2.25, 0.2 + REF.clubLength / 2, 0.85], r: [-0.05, 0, -0.08], color: COPPER_DARK }),
  ]
  return mergeParts(parts.map((g) => (s === 1 ? g : g)))
}

function figureLOD1() {
  const parts = [
    bake(cyl(0.9, 0.55, 3.5, 5), { p: [0, 1.75, 0], color: COPPER }),
    bake(cyl(1.15, 0.9, 3.4, 5), { p: [0, 5.1, 0], s: [1, 1, 0.72], color: SKIN }),
    bake(sph(0.68, 5, 4), { p: [0, 7.62, 0], color: SKIN }),
    bake(cyl(0.5, 0.22, REF.clubLength, 5), { p: [2.25, 0.2 + REF.clubLength / 2, 0.8], color: COPPER_DARK }),
  ]
  return mergeParts(parts)
}

function figureLOD2() {
  const parts = [
    bake(new THREE.ConeGeometry(1.6, 6.6, 4), { p: [0, 3.3, 0], color: COPPER }),
    bake(new THREE.OctahedronGeometry(0.7, 0), { p: [0, 7.6, 0], color: SKIN }),
    bake(cyl(0.35, 0.2, REF.clubLength, 3), { p: [2.2, 0.2 + REF.clubLength / 2, 0.8], color: COPPER_DARK }),
  ]
  return mergeParts(parts)
}

export default function HerkulesFigure({ position = [0, 0, 0] }) {
  const { g0, g1, g2, mat } = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.55, metalness: 0.25, flatShading: true, emissive: '#2fd6c0', emissiveIntensity: 0.05 })
    registerNightMaterial(m, { base: 0.5, min: 0.1 })
    return { g0: figureLOD0(), g1: figureLOD1(), g2: figureLOD2(), mat: m }
  }, [])
  return (
    <group position={position} name="landmark-herkules-figure" userData={{ entityId: 'landmark-herkules' }}>
      <Detailed distances={[0, 110, 300]}>
        <mesh geometry={g0} material={mat} castShadow />
        <mesh geometry={g1} material={mat} castShadow />
        <mesh geometry={g2} material={mat} />
      </Detailed>
    </group>
  )
}
