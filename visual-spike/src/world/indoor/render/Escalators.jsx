import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { bake, mergeParts } from '../../outdoor/common/geometryUtils.js'
import { ESC, ESCALATORS, HQ } from '../config/hq.layout.js'

// Laufzeitzustand (auch für Prüfungen im Browser lesbar): Verschiebung der Stufen in Metern entlang der Schräge
export const escalatorState = { up: 0, down: 0, time: 0 }

const PITCH = 0.4
const N = Math.ceil(ESC.length / PITCH) + 2
const sn = Math.sin(ESC.angle)
const cs = Math.cos(ESC.angle)
const _o = new THREE.Object3D()
const _c1 = new THREE.Color('#15171c')
const _c2 = new THREE.Color('#3a3d46')

// Eine Stufe: Trittfläche horizontal, Setzstufe vorn, gelbe Markierung an der Kante
function stepGeometry() {
  const d = PITCH * cs
  const ribs = []
  for (let i = 0; i < 6; i++) ribs.push(bake(new THREE.BoxGeometry(0.9, 0.012, d / 12), { p: [0, 0.004, -d / 2 + (i + 0.5) * (d / 6) + d / 24], color: '#5d626d' }))
  return mergeParts([
    ...ribs,
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
  const beltRef = useRef()
  const beltGeo = useMemo(() => new THREE.BoxGeometry(0.1, 0.05, 0.22), [])
  const beltMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), [])
  const BELT_N = 36
  const BELT_PITCH = (ESC.length + 1.0) / BELT_N
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    escalatorState.time = clock.elapsedTime
    escalatorState.up = ESCALATORS[0].dir * clock.elapsedTime * ESC.speed
    escalatorState.down = ESCALATORS[1].dir * clock.elapsedTime * ESC.speed
    // Handlauf: Glieder wandern synchron mit den Stufen
    const belt = beltRef.current
    if (belt) {
      let j = 0
      const tot = BELT_N * BELT_PITCH
      for (const e of ESCALATORS) {
        for (const sx of [-1, 1]) {
          for (let k = 0; k < BELT_N; k++) {
            let t = (k * BELT_PITCH + e.dir * clock.elapsedTime * ESC.speed) % tot
            if (t < 0) t += tot
            t -= 0.5
            _o.position.set(e.x + sx * 0.55, t * sn + 1.0 * cs + 0.05, ESC.z0 + t * cs - 1.0 * sn)
            _o.rotation.set(-ESC.angle, 0, 0)
            _o.scale.setScalar(t > ESC.length + 0.3 || t < -0.3 ? 0.0001 : 1)
            _o.updateMatrix()
            belt.setMatrixAt(j, _o.matrix)
            belt.setColorAt(j, k % 2 ? _c1 : _c2)
            j++
          }
        }
      }
      belt.instanceMatrix.needsUpdate = true
      if (belt.instanceColor) belt.instanceColor.needsUpdate = true
    }
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
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, N * ESCALATORS.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={beltRef} args={[beltGeo, beltMat, 36 * 4]} frustumCulled={false} />
    </>
  )
}
