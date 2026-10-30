import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

// Einmalig gefüllter InstancedMesh. items: [{ p, s?, r?, c? }] (c = Helligkeit oder Farbe). Ein Drawcall für beliebig viele Teile.
export default function InstancedBatch({ items, geometry, material, castShadow = false, receiveShadow = false, frustumCulled = true, name }) {
  const ref = useRef()
  const hasColor = useMemo(() => items.some((i) => i.c !== undefined), [items])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      _p.set(it.p[0], it.p[1], it.p[2])
      _e.set(...(it.r || [0, 0, 0]))
      _q.setFromEuler(_e)
      _s.set(...(it.s || [1, 1, 1]))
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
      if (hasColor) {
        if (typeof it.c === 'number') _c.setScalar(it.c)
        else _c.set(it.c ?? '#ffffff')
        mesh.setColorAt(i, _c)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
  }, [items, hasColor])
  if (!items.length) return null
  return <instancedMesh ref={ref} name={name} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={frustumCulled} />
}
