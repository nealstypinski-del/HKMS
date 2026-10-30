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
  const P = (g, o) => bake(g, o)
  const parts = []
  const CU = COPPER; const CD = COPPER_DARK; const SK = SKIN
  // Standplatte (Fels)
  parts.push(P(new THREE.IcosahedronGeometry(2.6, 1), { p: [0.6, 0.15, 0.4], s: [1.5, 0.25, 1.3], color: '#7a8f86' }))
  // Beine: Oberschenkel, Knie, Wade, Fuß (leichter Ausfallschritt)
  for (const [sx, fwd] of [[-1, 0.15], [1, -0.12]]) {
    const x = sx * 0.62
    parts.push(P(cyl(0.5, 0.42, 1.75, 8), { p: [x, 2.7, fwd * 0.5], r: [fwd * 0.4, 0, 0], color: CU }))
    parts.push(P(sph(0.44, 8, 6), { p: [x, 1.85, fwd * 0.9], color: CU }))
    parts.push(P(cyl(0.4, 0.3, 1.7, 8), { p: [x, 0.95, fwd * 0.9], color: CU }))
    parts.push(P(new THREE.BoxGeometry(0.55, 0.3, 1.0), { p: [x, 0.2, fwd * 0.9 + 0.2], color: CD }))
  }
  // Hüfte und Lendenschurz
  parts.push(P(cyl(1.05, 1.25, 0.9, 10), { p: [0, 3.75, 0], color: CD }))
  parts.push(P(new THREE.BoxGeometry(1.3, 0.9, 0.12), { p: [0, 3.0, 0.72], color: CD }))
  // Oberkörper: breite Schultern, verjüngte Taille
  parts.push(P(cyl(1.45, 0.95, 2.5, 10), { p: [0, 5.2, 0], s: [1, 1, 0.68], color: SK }))
  parts.push(P(new THREE.BoxGeometry(1.7, 0.7, 0.35), { p: [0, 5.75, 0.62], color: CU })) // Brustplatte
  // Schultern und Arme
  parts.push(P(sph(0.72, 9, 7), { p: [-1.6, 6.15, 0], color: CU }))
  parts.push(P(sph(0.72, 9, 7), { p: [1.6, 6.15, 0], color: CU }))
  parts.push(P(cyl(0.42, 0.36, 1.5, 8), { p: [-1.75, 5.2, 0.3], r: [0.5, 0, 0.1], color: CU }))
  parts.push(P(cyl(0.36, 0.3, 1.4, 8), { p: [-1.85, 4.15, 0.95], r: [1.2, 0, 0.1], color: CU }))
  parts.push(P(cyl(0.44, 0.38, 1.5, 8), { p: [1.8, 5.2, 0.2], r: [0.35, 0, -0.15], color: CU }))
  parts.push(P(cyl(0.38, 0.32, 1.4, 8), { p: [2.05, 4.2, 0.6], r: [0.5, 0, -0.1], color: CU }))
  parts.push(P(sph(0.36, 7, 6), { p: [2.15, 3.55, 0.85], color: SK }))
  // Löwenfell über der linken Schulter
  parts.push(P(new THREE.ConeGeometry(1.25, 3.4, 8), { p: [-1.9, 4.6, -0.55], r: [0.15, 0, 0.35], s: [1, 1, 0.55], color: CD }))
  parts.push(P(sph(0.55, 7, 6), { p: [-2.3, 6.4, -0.1], s: [1, 0.8, 1], color: '#6aa896' })) // Mähne
  for (let i = 0; i < 5; i++) parts.push(P(new THREE.ConeGeometry(0.3, 0.9, 5), { p: [-2.4 + i * 0.05, 3.5 - i * 0.55, -0.4], r: [0.2, 0, 0.3], color: CD }))
  // Hals, Kopf, Bart, Haarlocken
  parts.push(P(cyl(0.34, 0.4, 0.5, 8), { p: [0, 6.75, 0], color: SK }))
  parts.push(P(sph(0.62, 10, 8), { p: [0, 7.6, 0.05], s: [0.95, 1.1, 1], color: SK }))
  parts.push(P(sph(0.42, 8, 6), { p: [0, 7.15, 0.38], s: [1, 0.85, 0.7], color: '#6aa896' })) // Bart
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    parts.push(P(sph(0.26, 6, 5), { p: [Math.cos(a) * 0.5, 8.0 + Math.sin(i * 2.1) * 0.05, Math.sin(a) * 0.45 - 0.05], color: '#6aa896' }))
  }
  parts.push(P(sph(0.5, 7, 6), { p: [0, 8.05, -0.05], s: [1, 0.55, 1], color: '#6aa896' }))
  // Keule (4,7 m): Griff, Verdickung, Noppen, in der rechten Hand
  parts.push(P(cyl(0.22, 0.2, 2.2, 7), { p: [2.3, 0.2 + 1.1, 1.0], r: [-0.05, 0, -0.08], color: CD }))
  parts.push(P(cyl(0.58, 0.32, REF.clubLength - 2.0, 8), { p: [2.55, 0.2 + 2.2 + (REF.clubLength - 2.0) / 2, 1.0], r: [-0.05, 0, -0.08], color: CD }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2; const yy = 3.0 + (i % 4) * 0.55
    parts.push(P(new THREE.ConeGeometry(0.11, 0.3, 5), { p: [2.55 + Math.cos(a) * 0.5, yy, 1.0 + Math.sin(a) * 0.5], r: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2], color: CU }))
  }
  return mergeParts(parts)
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
