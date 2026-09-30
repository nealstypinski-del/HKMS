import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const frustum = new THREE.Frustum()
const pv = new THREE.Matrix4()
const sph = new THREE.Sphere()

// Instanziertes Vegetations LOD: pro Rahmen (gedrosselt) werden sichtbare Instanzen nach Distanz in LOD Stufen einsortiert.
// props:
//  items      [{x,y,z,s,ry,tint,rank}]
//  lods       [{ geometry, maxDist }]  aufsteigend sortiert, die letzte Distanz ist die Zeichendistanz
//  fraction   Anteil der Objekte (nach rank) laut Qualitätsstufe
//  radius     Bounding Radius eines Objekts bei Skalierung 1 (für Frustum Test)
//  onCount    Callback mit Anzahl gezeichneter Objekte
export default function VegetationLOD({ items, lods, material, fraction = 1, radius = 8, castShadowLod0 = false, everyNth = 3, onCount, heightCenter = 0.5 }) {
  const refs = useRef([])
  const frame = useRef(0)
  const capacity = items.length
  const meshes = useMemo(() => lods.map(() => null), [lods])
  void meshes
  const drawDist = lods[lods.length - 1].maxDist

  useEffect(() => {
    refs.current.forEach((m) => {
      if (!m) return
      // Farben einmal anlegen
      const c = new Float32Array(capacity * 3)
      m.instanceColor = new THREE.InstancedBufferAttribute(c, 3)
      m.instanceColor.setUsage(THREE.DynamicDrawUsage)
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      m.count = 0
    })
    frame.current = 999 // sofort aktualisieren
  }, [capacity])

  useFrame(({ camera }) => {
    frame.current++
    if (frame.current < everyNth) return
    frame.current = 0
    camera.updateMatrixWorld()
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(pv)
    const cx = camera.position.x
    const cy = camera.position.y
    const cz = camera.position.z
    const counts = new Array(lods.length).fill(0)
    const maxD2 = drawDist * drawDist
    let total = 0
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.rank > fraction) continue
      const dx = it.x - cx
      const dz = it.z - cz
      const dy = it.y - cy
      const d2 = dx * dx + dy * dy * 0.25 + dz * dz
      if (d2 > maxD2) continue
      sph.center.set(it.x, it.y + radius * it.s * heightCenter, it.z)
      sph.radius = radius * it.s * 1.15
      if (!frustum.intersectsSphere(sph)) continue
      const d = Math.sqrt(d2)
      let li = 0
      while (li < lods.length - 1 && d > lods[li].maxDist) li++
      const m = refs.current[li]
      if (!m) continue
      const n = counts[li]++
      const sc = it.s
      const cs = Math.cos(it.ry) * sc
      const sn = Math.sin(it.ry) * sc
      const a = m.instanceMatrix.array
      const o = n * 16
      a[o] = cs; a[o + 1] = 0; a[o + 2] = -sn; a[o + 3] = 0
      a[o + 4] = 0; a[o + 5] = sc; a[o + 6] = 0; a[o + 7] = 0
      a[o + 8] = sn; a[o + 9] = 0; a[o + 10] = cs; a[o + 11] = 0
      a[o + 12] = it.x; a[o + 13] = it.y; a[o + 14] = it.z; a[o + 15] = 1
      const ca = m.instanceColor.array
      ca[n * 3] = it.tint; ca[n * 3 + 1] = it.tint; ca[n * 3 + 2] = it.tint
      total++
    }
    for (let li = 0; li < lods.length; li++) {
      const m = refs.current[li]
      if (!m) continue
      m.count = counts[li]
      m.instanceMatrix.clearUpdateRanges()
      if (counts[li]) m.instanceMatrix.addUpdateRange(0, counts[li] * 16)
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) {
        m.instanceColor.clearUpdateRanges()
        if (counts[li]) m.instanceColor.addUpdateRange(0, counts[li] * 3)
        m.instanceColor.needsUpdate = true
      }
    }
    onCount?.(total)
  })

  return (
    <>
      {lods.map((l, i) => (
        <instancedMesh
          key={i}
          ref={(el) => { refs.current[i] = el }}
          args={[l.geometry, material, capacity]}
          frustumCulled={false}
          castShadow={castShadowLod0 && i === 0}
          receiveShadow={false}
        />
      ))}
    </>
  )
}
