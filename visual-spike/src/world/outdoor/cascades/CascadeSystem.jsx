import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CASCADE, CASCADE_STAGES } from '../config/bergpark.config.js'
import { cascadeElevationAtV } from '../terrain/heightField.js'
import InstancedBatch from '../common/InstancedBatch.jsx'
import { sharedMaterials } from '../common/materials.js'
import { stoneTexture } from '../common/textures.js'
import { segments, zAtV, stageLength, waterStepCount, halfWidthAt, waterTreadY, OUTFALL } from './cascadeLayout.js'
import { buildSegmentData } from './CascadeSegment.js'
import { cascadeRuntime, stepCascadeRuntime } from './cascadeVisualizationState.js'
import { stepCompletionPulses, pulseState } from '../water/CompletionPulse.js'
import { getCascadeWaterMaterial, waterUniforms } from '../water/WaterMaterial.js'
import { envState } from '../environment/outdoorEnvironment.js'
import { outdoorStats } from '../runtime/stats.js'
import CascadeStage from './CascadeStage.jsx'

const box = new THREE.BoxGeometry(1, 1, 1)

// Steinplatte (Deck) neben dem Kanal, folgt der glatten Neigung
function buildDeckGeometry() {
  const h = CASCADE.deckHalf
  const yTop = cascadeElevationAtV(0) + 0.1
  const yBot = cascadeElevationAtV(CASCADE.length) + 0.1
  const zA = zAtV(0)
  const zB = zAtV(CASCADE.length)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([-h, yTop, zA, h, yTop, zA, h, yBot, zB, -h, yBot, zB], 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, (2 * h) / 3, 0, (2 * h) / 3, CASCADE.length / 3, 0, CASCADE.length / 3], 2))
  g.setIndex([0, 3, 2, 0, 2, 1])
  g.computeVertexNormals()
  return g
}

// Wasserband: pro Stufe eine Fläche (Tread) und eine Kante (Riser), nicht indiziert, damit Attribute pro Fläche gelten
export function buildWaterGeometry() {
  const pos = []
  const uv = []
  const drop = []
  const av = []
  const quad = (a, b, c, d, isDrop, uvs, vs) => {
    const idx = [0, 1, 2, 0, 2, 3]
    const P = [a, b, c, d]
    for (const i of idx) {
      pos.push(...P[i])
      uv.push(...uvs[i])
      drop.push(isDrop)
      av.push(vs[i])
    }
  }
  for (let k = 0; k < waterStepCount; k++) {
    const v0 = k * CASCADE.stepLength
    const v1 = v0 + CASCADE.stepLength
    const y0 = waterTreadY(k)
    const y1 = k + 1 < waterStepCount ? waterTreadY(k + 1) : OUTFALL.y0
    const h0 = halfWidthAt(v0 + 0.01)
    const h1 = halfWidthAt(v1 - 0.01)
    const z0 = zAtV(v0)
    const z1 = zAtV(v1)
    // Tread (flach)
    quad([-h0, y0, z0], [h0, y0, z0], [h1, y0, z1], [-h1, y0, z1], 0, [[0, 0], [1, 0], [1, 1], [0, 1]], [v0, v0, v1, v1])
    // Riser (senkrechte Kante zur nächsten Stufe)
    quad([-h1, y0, z1], [h1, y0, z1], [h1, y1, z1], [-h1, y1, z1], 1, [[0, 0], [1, 0], [1, 1], [0, 1]], [v1, v1, v1, v1])
  }
  // Überlauf ins Ergebnisbecken
  const hw = CASCADE.channelHalf
  quad([-hw, OUTFALL.y0, zAtV(OUTFALL.v0)], [hw, OUTFALL.y0, zAtV(OUTFALL.v0)], [hw, OUTFALL.y1, zAtV(OUTFALL.v1)], [-hw, OUTFALL.y1, zAtV(OUTFALL.v1)], 0,
    [[0, 0], [1, 0], [1, 1], [0, 1]], [OUTFALL.v0, OUTFALL.v0, OUTFALL.v1, OUTFALL.v1])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aDrop', new THREE.Float32BufferAttribute(drop, 1))
  g.setAttribute('aV', new THREE.Float32BufferAttribute(av, 1))
  g.computeBoundingSphere()
  return g
}

// Treibt Kaskadenzustand, Pulse und Shader Uniforms (einmal pro Frame)
function CascadeDriver({ quality }) {
  useFrame(({ clock, camera }, dt) => {
    const d = Math.min(dt, 0.1)
    stepCascadeRuntime(d)
    stepCompletionPulses(d, quality.pulses)
    const u = waterUniforms
    u.uTime.value = clock.elapsedTime
    u.uActivity.value = cascadeRuntime.activity
    u.uNight.value = envState.night
    u.uStage.value.set(cascadeRuntime.stageAct)
    u.uBlocked.value.set(cascadeRuntime.stageBlocked)
    u.uPoolGlow.value = pulseState.poolGlow
    u.uSky.value.copy(envState.skyHorizon)
    // aktive Segmente (in Sichtweite) für das Debug Overlay
    let n = 0
    const cp = camera.position
    for (const s of segments) {
      const dx = cp.x - s.center[0]
      const dz = cp.z - s.center[2]
      if (dx * dx + dz * dz < (quality.drawDistance * 0.5) ** 2) n++
    }
    outdoorStats.activeSegments = n
    outdoorStats.totalSegments = segments.length
  })
  return null
}

export default function CascadeSystem({ quality, waterQuality }) {
  const M = sharedMaterials()
  const data = useMemo(() => {
    const all = { bed: [], kerbs: [], stairs: [], railPosts: [], railBars: [] }
    for (const seg of segments) {
      const d = buildSegmentData(seg)
      for (const k of Object.keys(all)) all[k].push(...d[k])
    }
    return all
  }, [])
  const deck = useMemo(buildDeckGeometry, [])
  const water = useMemo(buildWaterGeometry, [])
  const deckMat = useMemo(() => {
    const t = stoneTexture().clone()
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: '#e2dccd', map: t, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  }, [])
  const stairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efe9db', map: stoneTexture(), roughness: 0.95 }), [])
  const railMat = M.metal
  const waterMat = getCascadeWaterMaterial(waterQuality)

  // Kaskadenkuppe: Wasserquelle unterhalb des Herkules
  return (
    <group name="cascade-system">
      <CascadeDriver quality={quality} />
      <mesh geometry={deck} material={deckMat} receiveShadow />
      <InstancedBatch items={data.bed} geometry={box} material={M.stoneDark} receiveShadow />
      <InstancedBatch items={data.kerbs} geometry={box} material={M.stone} castShadow={quality.shadows} receiveShadow />
      <InstancedBatch items={data.stairs} geometry={box} material={stairMat} receiveShadow />
      <InstancedBatch items={data.railPosts} geometry={box} material={railMat} />
      <InstancedBatch items={data.railBars} geometry={box} material={railMat} />
      <mesh geometry={water} material={waterMat} renderOrder={2} />
      {CASCADE_STAGES.map((s, i) => (
        <CascadeStage key={s.key} index={i} stage={s} y={cascadeElevationAtV(i * stageLength)} z={zAtV(i * stageLength)} />
      ))}
    </group>
  )
}
