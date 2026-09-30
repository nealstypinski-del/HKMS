import { useMemo } from 'react'
import * as THREE from 'three'
import { POOL } from '../config/bergpark.config.js'
import { sharedMaterials } from '../common/materials.js'
import InstancedBatch from '../common/InstancedBatch.jsx'
import { getPoolWaterMaterial } from '../water/WaterMaterial.js'

// Ergebnisbecken (result-pool): Metapher für abgeschlossene Ergebnisse. Der Zufluss der Kaskade mündet an der Nordkante.
export default function ResultPool({ waterQuality }) {
  const M = sharedMaterials()
  const { rim, water, lights } = useMemo(() => {
    const outer = new THREE.Shape()
    outer.absellipse(0, 0, POOL.a + POOL.rimW, POOL.b + POOL.rimW, 0, Math.PI * 2, false, 0)
    const hole = new THREE.Path()
    hole.absellipse(0, 0, POOL.a, POOL.b, 0, Math.PI * 2, true, 0)
    outer.holes.push(hole)
    const rimGeo = new THREE.ExtrudeGeometry(outer, { depth: POOL.rimTop - 1.0, bevelEnabled: false, curveSegments: 64 })
    rimGeo.rotateX(-Math.PI / 2)
    rimGeo.translate(POOL.x, 1.0, POOL.z)
    const disc = new THREE.Shape()
    disc.absellipse(0, 0, POOL.a, POOL.b, 0, Math.PI * 2, false, 0)
    const wg = new THREE.ShapeGeometry(disc, 64)
    wg.rotateX(-Math.PI / 2)
    wg.translate(POOL.x, POOL.waterY, POOL.z)
    const items = []
    const N = 28
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      // an der Nordkante (Zufluss) auslassen
      if (Math.abs(a - Math.PI * 1.5) < 0.22) continue
      items.push({ p: [POOL.x + Math.cos(a) * (POOL.a + POOL.rimW * 0.5), POOL.rimTop + 0.08, POOL.z + Math.sin(a) * (POOL.b + POOL.rimW * 0.5)], s: [0.34, 0.16, 0.34] })
    }
    return { rim: rimGeo, water: wg, lights: items }
  }, [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  return (
    <group name={'result-pool'} userData={{ entityId: 'result-pool' }}>
      <mesh geometry={rim} material={M.stone} receiveShadow castShadow />
      <mesh geometry={water} material={getPoolWaterMaterial(waterQuality)} renderOrder={2} />
      <InstancedBatch items={lights} geometry={box} material={M.copper} />
    </group>
  )
}
