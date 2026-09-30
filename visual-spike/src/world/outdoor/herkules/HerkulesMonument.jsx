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
  return { octagon: M.octagonH, tiers: tiersH, pedestal: M.pedestalH, figure: M.figureH, total: M.octagonH + 0.5 + tiersH + M.pedestalH + M.figureH }
}

const hsh = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }
const shade = (hex, k) => { const c = new THREE.Color(hex); return `#${c.multiplyScalar(k).getHexString()}` }

// Schichten aus Mauerwerk: übereinander liegende Achtecke in leicht wechselnden Tönen mit dunklen Fugenringen
function courses(parts, rBottom, rTop, y0, h, base, courseH = 1.1) {
  const n = Math.max(1, Math.round(h / courseH))
  for (let i = 0; i < n; i++) {
    const t0 = i / n; const t1 = (i + 1) / n
    const r0 = rBottom + (rTop - rBottom) * t0; const r1 = rBottom + (rTop - rBottom) * t1
    const ch = h / n
    parts.push(bake(octGeometry(r1, r0, ch - 0.05), { p: [0, y0 + i * ch + ch / 2, 0], color: shade(base, 0.92 + hsh(i * 7 + h) * 0.14) }))
    parts.push(bake(octGeometry(r1 - 0.03, r0 - 0.03, 0.06), { p: [0, y0 + (i + 1) * ch - 0.03, 0], color: shade(base, 0.62) }))
  }
}

function buildGeometries() {
  const M = MONUMENT
  const stone = []
  const trim = []
  const arches = []
  const dark = []
  const R = M.octagonR
  // Terrassenplatte mit flachem Treppenring (bündig zur Navigationsfläche)
  stone.push(bake(new THREE.CylinderGeometry(36, 38, 0.3, 8), { p: [0, 0.05, 0], r: [0, Math.PI / 8, 0], color: '#bdb5a3' }))
  for (let k = 0; k < 4; k++) stone.push(bake(new THREE.CylinderGeometry(33 - k * 1.2, 33.6 - k * 1.2, 0.12, 8), { p: [0, 0.2 + k * 0.09, 0], r: [0, Math.PI / 8, 0], color: shade('#c9c0ac', 1 - k * 0.04) }))
  // Oktogon: Sockel, Mauerwerk, Gesimse
  stone.push(bake(octGeometry(R + 0.5, R + 0.5, 1.2), { p: [0, 0.6, 0], color: '#a29885' }))
  courses(stone, R, R, 1.2, M.octagonH - 1.2, '#c2b8a2')
  stone.push(bake(octGeometry(R + 0.7, R + 0.7, 0.5), { p: [0, M.octagonH - 0.5, 0], color: '#d6cdb9' }))
  stone.push(bake(octGeometry(R + 1.0, R + 1.0, 0.25), { p: [0, M.octagonH - 0.05, 0], color: '#bdb39d' }))
  // Eckpilaster
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * Math.PI) / 4
    stone.push(bake(new THREE.BoxGeometry(1.5, M.octagonH - 1.4, 1.5), { p: [Math.sin(a) * (R + 0.15), (M.octagonH + 1.2) / 2, Math.cos(a) * (R + 0.15)], r: [0, a, 0], color: '#d0c7b2' }))
    stone.push(bake(new THREE.BoxGeometry(2.0, 0.5, 2.0), { p: [Math.sin(a) * (R + 0.15), M.octagonH - 0.6, Math.cos(a) * (R + 0.15)], r: [0, a, 0], color: '#dbd2be' }))
  }
  // Dachfläche mit Kupferrand und Balustrade
  stone.push(bake(octGeometry(R + 0.2, R + 0.2, 0.5), { p: [0, M.octagonH + 0.25, 0], color: '#69717d' }))
  trim.push(bake(new THREE.TorusGeometry(R + 0.35, 0.32, 5, 8), { p: [0, M.octagonH + 0.55, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  trim.push(bake(new THREE.TorusGeometry(R + 0.75, 0.16, 4, 8), { p: [0, M.octagonH - 0.15, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  const apo = R * Math.cos(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const phi = (k * Math.PI) / 4
    for (let i = -3; i <= 3; i++) {
      const off = i * 2.2
      stone.push(bake(new THREE.BoxGeometry(0.28, 0.9, 0.28), { p: [Math.sin(phi) * (apo - 0.5) + Math.cos(phi) * off, M.octagonH + 1.0, Math.cos(phi) * (apo - 0.5) - Math.sin(phi) * off], color: '#cfc6b1' }))
    }
    stone.push(bake(new THREE.BoxGeometry(15.4, 0.14, 0.24), { p: [Math.sin(phi) * (apo - 0.5), M.octagonH + 1.5, Math.cos(phi) * (apo - 0.5)], r: [0, phi, 0], color: '#d9d0bb' }))
  }
  // Arkaden am Oktogon: helle Rahmen, dunkle Öffnungen, Rundfenster darüber
  const face = R * APOTHEM
  const archD = archShape(3.4, 8.2)
  const archF = archShape(4.0, 8.8)
  const oculus = new THREE.CircleGeometry(0.8, 14)
  for (let k = 0; k < 8; k++) {
    const phi = (k * Math.PI) / 4
    const tx = Math.cos(phi); const tz = -Math.sin(phi)
    for (const off of [-5.4, 0, 5.4]) {
      const px = Math.sin(phi) * (face + 0.05) + tx * off; const pz = Math.cos(phi) * (face + 0.05) + tz * off
      stone.push(bake(archF, { p: [px, 2.5, pz], r: [0, phi, 0], color: '#e0d8c5' }))
      arches.push(bake(archD, { p: [Math.sin(phi) * (face + 0.09) + tx * off, 2.6, Math.cos(phi) * (face + 0.09) + tz * off], r: [0, phi, 0], color: '#2a2622' }))
      dark.push(bake(oculus, { p: [Math.sin(phi) * (face + 0.09) + tx * off, 14.6, Math.cos(phi) * (face + 0.09) + tz * off], r: [0, phi, 0], color: '#2a2622' }))
    }
  }
  // gestufter Pyramidenturm mit Mauerwerk, Bögen und Kupferkappen
  let y = M.octagonH + 0.5
  const smallArch = archShape(1.8, 4.2)
  const smallFrame = archShape(2.2, 4.6)
  M.tiers.forEach((t, i) => {
    courses(stone, t.rBottom, t.rTop, y, t.h, i % 2 ? '#d3cab6' : '#c2b8a2', 1.2)
    trim.push(bake(new THREE.TorusGeometry(t.rTop + 0.15, 0.14, 4, 8), { p: [0, y + t.h, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
    if (i < 3) {
      const rm = (t.rBottom + t.rTop) / 2
      const f = rm * APOTHEM
      for (let k = 0; k < 8; k++) {
        const phi = (k * Math.PI) / 4
        stone.push(bake(smallFrame, { p: [Math.sin(phi) * (f + 0.04), y + 1.5, Math.cos(phi) * (f + 0.04)], r: [0, phi, 0], color: '#e0d8c5' }))
        arches.push(bake(smallArch, { p: [Math.sin(phi) * (f + 0.08), y + 1.6, Math.cos(phi) * (f + 0.08)], r: [0, phi, 0], color: '#2a2622' }))
      }
    }
    y += t.h
  })
  // Sockel
  stone.push(bake(octGeometry(3.0, 3.4, M.pedestalH), { p: [0, y + M.pedestalH / 2, 0], color: '#a99f8a' }))
  trim.push(bake(new THREE.TorusGeometry(3.05, 0.16, 4, 8), { p: [0, y + M.pedestalH, 0], r: [Math.PI / 2, 0, Math.PI / 8], color: '#4fbfa5' }))
  const baseY = y + M.pedestalH
  return { stone: mergeParts(stone), trim: mergeParts(trim), arches: mergeParts([...arches, ...dark]), figureBaseY: baseY }
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
