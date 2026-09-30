import { useMemo } from 'react'
import * as THREE from 'three'
import { MONUMENT } from '../config/bergpark.config.js'
import { heightAt } from '../terrain/heightField.js'
import { bake, mergeParts, octGeometry } from '../common/geometryUtils.js'
import { sharedMaterials } from '../common/materials.js'
import { glowTexture } from '../common/textures.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'
import { useLayoutEffect } from 'react'
import HerkulesFigure from './HerkulesFigure.jsx'

// Originale, stilisierte Interpretation des Herkulesmonuments: Oktogon mit Arkaden, gestufter Pyramidenturm, Sockel, Figur.
// Gesamthöhe = Summe der Konfigurationsmaße = 71 m. Kein Scan, kein Fremdmodell.
const STONE = '#c2b8a2'
const STONE_LIGHT = '#d3cab6'
const SLATE = '#69717d'
const APOTHEM = Math.cos(Math.PI / 8)

function archShape(w, h) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  s.absarc(0, h - r, r, Math.PI, 0, true)
  s.lineTo(r, 0)
  s.lineTo(-r, 0)
  return new THREE.ShapeGeometry(s, 10)
}

export function monumentHeights() {
  const M = MONUMENT
  const tiersH = M.tiers.reduce((a, t) => a + t.h, 0)
  return { octagon: M.octagonH, tiers: tiersH, pedestal: M.pedestalH, figure: M.figureH, total: M.octagonH + tiersH + M.pedestalH + M.figureH }
}

function buildGeometries() {
  const M = MONUMENT
  const stone = []
  const trim = []
  const arches = []
  // Terrassenplatte (bündig, damit die Navigationsfläche stimmt)
  stone.push(bake(new THREE.CylinderGeometry(36, 38, 0.3, 8), { p: [0, 0.05, 0], r: [0, Math.PI / 8, 0], color: '#bdb5a3' }))
  // Oktogon
  stone.push(bake(octGeometry(M.octagonR, M.octagonR, M.octagonH), { p: [0, M.octagonH / 2, 0], color: STONE }))
  stone.push(bake(octGeometry(M.octagonR + 0.4, M.octagonR + 0.4, 0.9), { p: [0, 0.45, 0], color: '#a99f8a' }))
  stone.push(bake(octGeometry(M.octagonR + 0.6, M.octagonR + 0.6, 0.6), { p: [0, M.octagonH - 0.3, 0], color: STONE_LIGHT }))
  // Dachfläche mit Kupferrand
  stone.push(bake(octGeometry(M.octagonR + 0.2, M.octagonR + 0.2, 0.5), { p: [0, M.octagonH + 0.25, 0], color: SLATE }))
  trim.push(bake(new THREE.TorusGeometry(M.octagonR + 0.35, 0.32, 5, 8), { p: [0, M.octagonH + 0.55, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  trim.push(bake(new THREE.TorusGeometry(M.octagonR + 0.75, 0.16, 4, 8), { p: [0, M.octagonH - 0.15, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  // Arkaden am Oktogon: drei Bögen je Seite
  const face = M.octagonR * APOTHEM
  const arch = archShape(3.4, 8.2)
  for (let k = 0; k < 8; k++) {
    const phi = (k * Math.PI) / 4
    const tx = Math.cos(phi)
    const tz = -Math.sin(phi)
    for (const off of [-5.4, 0, 5.4]) {
      arches.push(bake(arch, {
        p: [Math.sin(phi) * (face + 0.06) + tx * off, 2.6, Math.cos(phi) * (face + 0.06) + tz * off],
        r: [0, phi, 0], color: '#2a2622',
      }))
    }
  }
  // gestufter Turm
  let y = M.octagonH + 0.5
  const smallArch = archShape(1.8, 4.2)
  M.tiers.forEach((t, i) => {
    stone.push(bake(octGeometry(t.rTop, t.rBottom, t.h), { p: [0, y + t.h / 2, 0], color: i % 2 ? STONE_LIGHT : STONE }))
    trim.push(bake(new THREE.TorusGeometry(t.rTop + 0.15, 0.14, 4, 8), { p: [0, y + t.h, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
    if (i < 2) {
      const rm = (t.rBottom + t.rTop) / 2
      const f = rm * APOTHEM
      for (let k = 0; k < 8; k++) {
        const phi = (k * Math.PI) / 4
        arches.push(bake(smallArch, { p: [Math.sin(phi) * (f + 0.05), y + 1.6, Math.cos(phi) * (f + 0.05)], r: [0, phi, 0], color: '#2a2622' }))
      }
    }
    y += t.h
  })
  // Sockel
  stone.push(bake(octGeometry(3.0, 3.4, M.pedestalH), { p: [0, y + M.pedestalH / 2, 0], color: '#a99f8a' }))
  trim.push(bake(new THREE.TorusGeometry(3.05, 0.16, 4, 8), { p: [0, y + M.pedestalH, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  const baseY = y + M.pedestalH
  return { stone: mergeParts(stone), trim: mergeParts(trim), arches: mergeParts(arches), figureBaseY: baseY }
}

export default function HerkulesMonument() {
  const M = sharedMaterials()
  const g = useMemo(buildGeometries, [])
  const baseY = useMemo(() => heightAt(MONUMENT.x, MONUMENT.z), [])
  const archMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#ffb45a', emissiveIntensity: 0.05, roughness: 1, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    registerNightMaterial(m, { base: 0.9, min: 0.05 })
    return m
  }, [])
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.95, flatShading: true }), [])
  const glow = useMemo(() => {
    const m = new THREE.SpriteMaterial({ map: glowTexture(), color: '#7fffe0', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    registerNightMaterial(m, { base: 0.42, min: 0, kind: 'opacity' })
    return m
  }, [])
  useLayoutEffect(() => { g.stone.computeBoundingSphere() }, [g])
  return (
    <group position={[MONUMENT.x, baseY, MONUMENT.z]} name="landmark-herkules" userData={{ entityId: 'landmark-herkules' }}>
      <mesh geometry={g.stone} material={stoneMat} castShadow receiveShadow />
      <mesh geometry={g.trim} material={M.copper} castShadow />
      <mesh geometry={g.arches} material={archMat} />
      <HerkulesFigure position={[0, g.figureBaseY, 0]} />
      <sprite material={glow} position={[0, g.figureBaseY + 4, 4]} scale={[46, 46, 1]} />
    </group>
  )
}
