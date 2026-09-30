import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { registerNightMaterial } from '../../outdoor/environment/outdoorEnvironment.js'

export const modelUrl = (n) => `${import.meta.env.BASE_URL}models/${n}.glb`

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

// Zerlegt ein Blender GLB in Geometrien je Material (Knotentransformationen eingebacken). So braucht jedes Modell nur so viele Drawcalls wie Materialien,
// egal wie oft es platziert wird (Instancing). tint: Materialname, dessen Farbe pro Instanz gesetzt wird.
function useFlat(url, tint) {
  const gltf = useGLTF(url)
  return useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const by = {}
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry.clone()
      g.applyMatrix4(o.matrixWorld)
      const g2 = g.index ? g.toNonIndexed() : g
      for (const k of Object.keys(g2.attributes)) if (!['position', 'normal'].includes(k)) g2.deleteAttribute(k)
      const name = o.material.name
      ;(by[name] ||= { material: o.material, geos: [] }).geos.push(g2)
    })
    return Object.entries(by).map(([name, v]) => {
      const material = v.material.clone()
      if (name === tint) material.color.set('#ffffff')
      if (name === 'lampshade') { material.emissive = new THREE.Color('#ffd58a'); material.emissiveIntensity = 0.1; registerNightMaterial(material, { base: 2.2, min: 0.05 }) }
      if (name.startsWith('screen') && name !== 'screen') { material.emissive = material.color.clone(); material.emissiveIntensity = 0.6 }
      material.roughness = Math.max(0.3, material.roughness ?? 0.7)
      return { name, geometry: v.geos.length > 1 ? mergeGeometries(v.geos) : v.geos[0], material, tinted: name === tint }
    })
  }, [gltf, tint])
}

function Part({ part, items, shadows }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      _p.set(it.x, it.y ?? 0, it.z)
      _e.set(0, it.ry || 0, 0)
      _q.setFromEuler(_e)
      const s = it.s ?? 1
      _s.set((it.sx ?? 1) * s, s * (it.sy ?? 1), s)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
      if (part.tinted) mesh.setColorAt(i, _c.set(it.c || '#ffffff'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, part])
  return <instancedMesh ref={ref} args={[part.geometry, part.material, items.length]} castShadow={shadows} receiveShadow={shadows} />
}

export default function GlbInstanced({ name, items, tint, shadows = false }) {
  const parts = useFlat(modelUrl(name), tint)
  if (!items.length) return null
  return <group name={`glb-${name}`}>{parts.map((p) => <Part key={p.name} part={p} items={items} shadows={shadows} />)}</group>
}

export function preloadModels(list) { list.forEach((n) => useGLTF.preload(modelUrl(n))) }
