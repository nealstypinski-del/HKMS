import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const SKIN = ['#f1c9a5', '#e0a97f', '#c68863', '#8d5a3b', '#f7d9bf']
const cache = {}
const mat = (color) => (cache[color] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }))

const legGeo = new THREE.BoxGeometry(0.16, 0.9, 0.18).translate(0, -0.45, 0)
const armGeo = new THREE.BoxGeometry(0.11, 0.62, 0.12).translate(0, -0.31, 0)
const torsoGeo = new THREE.CapsuleGeometry(0.2, 0.36, 3, 8)
const headGeo = new THREE.SphereGeometry(0.22, 10, 8)
const hairGeo = new THREE.SphereGeometry(0.235, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)

// Low Poly Figur (1,8 m). Steuerung über ein veränderliches Zustandsobjekt:
// { x, y, z, yaw, activity: IDLE|WALK|RUN|STRETCH|SIT|REST|DRINK, speed, visible }
// Blickrichtung +Z bei yaw = 0. Reine Darstellung, keine Logik.
export default function OutdoorAvatar({ state, shirt = '#ff8a3d', hair = '#2b2118', skin = 0, pants = '#2c3350' }) {
  const root = useRef()
  const body = useRef()
  const legL = useRef(); const legR = useRef(); const armL = useRef(); const armR = useRef()
  const phase = useRef(Math.random() * 6)
  const shirtM = useMemo(() => mat(shirt), [shirt])
  const skinM = useMemo(() => mat(SKIN[skin % SKIN.length]), [skin])
  const hairM = useMemo(() => mat(hair), [hair])
  const pantsM = useMemo(() => mat(pants), [pants])

  useFrame(({ clock }, dt) => {
    const r = root.current
    if (!r) return
    r.visible = state.visible !== false
    if (!r.visible) return
    r.position.set(state.x, state.y, state.z)
    r.rotation.y = state.yaw
    const t = clock.elapsedTime
    const a = state.activity
    const sp = state.speed || 0
    const b = body.current
    b.rotation.set(0, 0, 0); b.position.y = 0
    legL.current.rotation.set(0, 0, 0); legR.current.rotation.set(0, 0, 0)
    armL.current.rotation.set(0, 0, 0); armR.current.rotation.set(0, 0, 0)
    if (a === 'WALK' || a === 'RUN') {
      const run = a === 'RUN'
      phase.current += dt * Math.max(2.5, sp * (run ? 2.6 : 3.2))
      const sw = Math.sin(phase.current) * (run ? 1.0 : 0.6)
      legL.current.rotation.x = sw; legR.current.rotation.x = -sw
      armL.current.rotation.x = -sw * 0.9; armR.current.rotation.x = sw * 0.9
      if (run) { b.rotation.x = 0.2; armL.current.rotation.z = 0.2; armR.current.rotation.z = -0.2 }
      b.position.y = Math.abs(Math.cos(phase.current)) * (run ? 0.09 : 0.035)
    } else if (a === 'SIT') {
      legL.current.rotation.x = -1.5; legR.current.rotation.x = -1.5
      armL.current.rotation.x = -0.9; armR.current.rotation.x = -0.9
      b.position.y = -0.45
    } else if (a === 'STRETCH') {
      const s = Math.sin(t * 1.4)
      armL.current.rotation.x = -2.9; armR.current.rotation.x = -2.9
      armL.current.rotation.z = 0.2; armR.current.rotation.z = -0.2
      b.rotation.z = s * 0.35
    } else if (a === 'DRINK') {
      b.rotation.x = 0.7
      armR.current.rotation.x = -2.0
    } else {
      b.position.y = Math.sin(t * 1.6 + phase.current) * 0.012
      armL.current.rotation.x = Math.sin(t * 1.2) * 0.06
      armR.current.rotation.x = -Math.sin(t * 1.2) * 0.06
    }
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <group ref={legL} position={[-0.1, 0.92, 0]}><mesh geometry={legGeo} material={pantsM} castShadow /></group>
        <group ref={legR} position={[0.1, 0.92, 0]}><mesh geometry={legGeo} material={pantsM} castShadow /></group>
        <mesh geometry={torsoGeo} material={shirtM} position={[0, 1.24, 0]} castShadow />
        <group ref={armL} position={[-0.29, 1.5, 0]}><mesh geometry={armGeo} material={shirtM} castShadow /></group>
        <group ref={armR} position={[0.29, 1.5, 0]}><mesh geometry={armGeo} material={shirtM} castShadow /></group>
        <mesh geometry={headGeo} material={skinM} position={[0, 1.66, 0]} castShadow />
        <mesh geometry={hairGeo} material={hairM} position={[0, 1.7, -0.01]} />
      </group>
    </group>
  )
}
