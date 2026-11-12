import { useMemo } from 'react'
import * as THREE from 'three'
import { CASCADE } from '../config/bergpark.config.js'
import { benchAnchors, getAnchor } from '../activities/OutdoorActivityAnchors.js'
import { uniquePathSegments } from '../routes/OutdoorRouteSystem.js'
import { cascadeElevationAtV } from '../terrain/heightField.js'
import { heightAt } from '../terrain/heightField.js'
import { bake, mergeParts } from '../common/geometryUtils.js'
import { sharedMaterials } from '../common/materials.js'
import { glowTexture, textTexture } from '../common/textures.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'
import InstancedBatch from '../common/InstancedBatch.jsx'
import { Suspense } from 'react'
import GlbInstanced from '../../indoor/render/GlbInstanced.jsx'
import { zAtV } from '../cascades/cascadeLayout.js'

// Bank: Sitzfläche nach +Z, Rückenlehne dahinter. Yaw = Blickrichtung der sitzenden Person.
function benchGeometry() {
  const wood = '#b98552'
  const dark = '#3a4256'
  return mergeParts([
    bake(new THREE.BoxGeometry(1.7, 0.07, 0.5), { p: [0, 0.46, 0.05], color: wood }),
    bake(new THREE.BoxGeometry(1.7, 0.5, 0.06), { p: [0, 0.78, -0.22], r: [-0.12, 0, 0], color: wood }),
    bake(new THREE.BoxGeometry(0.08, 0.46, 0.5), { p: [-0.75, 0.23, 0.05], color: dark }),
    bake(new THREE.BoxGeometry(0.08, 0.46, 0.5), { p: [0.75, 0.23, 0.05], color: dark }),
  ])
}

const lampPole = new THREE.CylinderGeometry(0.06, 0.09, 3.6, 6)
const lampHead = new THREE.SphereGeometry(0.2, 8, 6)
const glowPlane = new THREE.PlaneGeometry(6.4, 6.4).rotateX(-Math.PI / 2)
const box = new THREE.BoxGeometry(1, 1, 1)

// Bänke (Aktivitätsanker), Laternen, Kiosk und Wegweiser. Alles instanziert, jedes Objekt mit semantischer ID.
export default function OutdoorProps({ quality }) {
  const M = sharedMaterials()
  const bench = useMemo(benchGeometry, [])
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.9, flatShading: true }), [])
  const benches = useMemo(() => benchAnchors().map((a) => ({ p: [a.x, a.y, a.z], r: [0, a.yaw, 0] })), [])
  const pads = useMemo(() => benchAnchors().map((a) => ({ p: [a.x, a.y - 0.25, a.z], r: [0, a.yaw, 0], s: [2.5, 0.6, 1.5] })), [])

  const lamps = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const sg of uniquePathSegments) {
      if (sg.surface !== 'path' && sg.surface !== 'plaza') continue
      const key = [sg.a.id, sg.b.id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const n = Math.max(1, Math.floor(sg.len / 30))
      const dx = (sg.b.x - sg.a.x) / sg.len
      const dz = (sg.b.z - sg.a.z) / sg.len
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        const off = (i % 2 ? 1 : -1) * (sg.surface === 'plaza' ? 3.2 : 2)
        const x = sg.a.x + (sg.b.x - sg.a.x) * t - dz * off
        const z = sg.a.z + (sg.b.z - sg.a.z) * t + dx * off
        out.push({ x, z, y: heightAt(x, z), glow: true })
      }
    }
    // entlang der Kaskade (nur Lampenköpfe, außen an den Geländern)
    for (let v = 10; v < CASCADE.length; v += 21) {
      for (const s of [-1, 1]) out.push({ x: s * (CASCADE.railX + 0.9), z: zAtV(v), y: cascadeElevationAtV(v), glow: false })
    }
    return out
  }, [])
  const poles = useMemo(() => lamps.map((l) => ({ p: [l.x, l.y + 1.8, l.z] })), [lamps])
  const heads = useMemo(() => lamps.map((l) => ({ p: [l.x, l.y + 3.7, l.z] })), [lamps])
  const glows = useMemo(() => lamps.filter((l) => l.glow).map((l) => ({ p: [l.x, l.y + 0.14, l.z] })), [lamps])
  const glowMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffc98a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })
    registerNightMaterial(m, { base: 0.55, min: 0, kind: 'opacity' })
    return m
  }, [])

  // Poller (Blender Asset) entlang der Plaza und Topfbäume am Eingang
  const bollards = useMemo(() => {
    const out = []
    for (let x = -26; x <= 26.1; x += 4) out.push({ x, z: -58, y: 0 })
    for (let z = -54; z <= -18; z += 4) out.push({ x: -26, z, y: 0 }, { x: 26, z, y: 0 })
    return out
  }, [])
  const pots = useMemo(() => [[-7, -16.6], [7, -16.6], [-24, -18], [24, -18], [-24, -56], [24, -56], [-14, -22], [14, -22]].map(([x, z]) => ({ x, z, y: 0, s: 1.1, ry: x })), [])
  const coffee = getAnchor('anchor-coffee-outdoor-01')
  const sign = useMemo(() => textTexture('Kaskaden  ↑   Herkules  ↑', { w: 1024, h: 160, font: '700 78px system-ui, sans-serif', color: '#20304a', bg: '#f6f1e7' }), [])
  const sign2 = useMemo(() => textTexture('Waldlauf  →', { w: 512, h: 160, font: '700 78px system-ui, sans-serif', color: '#20304a', bg: '#f6f1e7' }), [])

  return (
    <group name="outdoor-props">
      <InstancedBatch items={pads} geometry={box} material={M.stoneDark} receiveShadow />
      <InstancedBatch items={benches} geometry={bench} material={benchMat} castShadow={quality.shadows} name="benches" />
      <InstancedBatch items={poles} geometry={lampPole} material={M.metal} />
      <InstancedBatch items={heads} geometry={lampHead} material={M.lampHead} />
      {quality.lampGlow && <InstancedBatch items={glows} geometry={glowPlane} material={glowMat} />}
      <Suspense fallback={null}>
        <GlbInstanced name="bollard" items={bollards} />
        <GlbInstanced name="tree" items={pots} shadows={quality.shadows} />
      </Suspense>

      {/* Kiosk am Vorplatz (anchor-coffee-outdoor-01) */}
      <group position={[coffee.x + 3.5, coffee.y, coffee.z - 2]} rotation={[0, Math.PI, 0]} name="kiosk-coffee" userData={{ entityId: 'anchor-coffee-outdoor-01' }}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 2.2, 1.8]} />
          <meshStandardMaterial color="#f2e8d5" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.35, 0.3]} castShadow>
          <boxGeometry args={[3.4, 0.14, 2.6]} />
          <meshStandardMaterial color="#ff8a3d" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.4, 0.92]}>
          <boxGeometry args={[1.8, 0.7, 0.06]} />
          <meshStandardMaterial color="#2c3350" />
        </mesh>
      </group>

      {/* Wegweiser an der Plaza */}
      <group position={[8, heightAt(8, -28), -28]} rotation={[0, 0.2, 0]} name="signpost-plaza">
        <mesh position={[0, 1.6, 0]} material={M.metal}>
          <boxGeometry args={[0.12, 3.2, 0.12]} />
        </mesh>
        <mesh position={[0, 2.9, 0.09]}>
          <planeGeometry args={[2.6, 0.42]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.35, 0.09]}>
          <planeGeometry args={[1.5, 0.42]} />
          <meshBasicMaterial map={sign2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
