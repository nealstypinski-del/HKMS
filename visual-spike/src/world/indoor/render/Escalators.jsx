import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { bake, mergeParts } from '../../outdoor/common/geometryUtils.js'
import { ESC, ESCALATORS, HQ } from '../config/hq.layout.js'

const PITCH = 0.4
const N = Math.ceil(ESC.length / PITCH) + 2
const sn = Math.sin(ESC.angle)
const cs = Math.cos(ESC.angle)
const _o = new THREE.Object3D()

// Eine Stufe: Trittfläche horizontal, Setzstufe vorn, gelbe Markierung an der Kante
function stepGeometry() {
  const d = PITCH * cs
  return mergeParts([
    bake(new THREE.BoxGeometry(0.92, 0.04, d), { p: [0, -0.02, 0], color: '#b9bdc6' }),
    bake(new THREE.BoxGeometry(0.92, PITCH * sn, 0.03), { p: [0, -0.02 - (PITCH * sn) / 2, -d / 2], color: '#8b909b' }),
    bake(new THREE.BoxGeometry(0.92, 0.005, 0.03), { p: [0, 0.002, d / 2 - 0.02], color: '#f4c20d' }),
    bake(new THREE.BoxGeometry(0.92, 0.006, 0.02), { p: [0, 0.002, 0], color: '#8b909b' }),
  ])
}

// Bewegte Stufen beider Rolltreppen (eine Instanz Gruppe, ein Drawcall). Aufwärts: Stufen wandern in +t, abwärts in -t.
export default function Escalators() {
  const geo = useMemo(stepGeometry, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 }), [])
  const ref = useRef()
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const total = N * PITCH
    let i = 0
    for (const e of ESCALATORS) {
      const shift = e.dir * clock.elapsedTime * ESC.speed
      for (let k = 0; k < N; k++) {
        let t = (k * PITCH + shift) % total
        if (t < 0) t += total
        _o.position.set(e.x, t * sn, ESC.z0 + t * cs)
        _o.scale.setScalar(t > ESC.length ? 0.0001 : 1)
        _o.updateMatrix()
        mesh.setMatrixAt(i++, _o.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  void HQ
  return <instancedMesh ref={ref} args={[geo, mat, N * ESCALATORS.length]} frustumCulled={false} castShadow />
}
