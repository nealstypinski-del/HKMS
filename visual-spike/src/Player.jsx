import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Model } from './Assets.jsx'
import { labelRoot } from './labelRoot.js'
import { HALF_X, HALF_Z } from './world.js'

const R = 0.32 // Körperradius
const blocked = (x, z, boxes) => boxes.some(([x0, x1, z0, z1]) => x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R)

// Steuerbare Figur (WASD oder Pfeiltasten, Umschalt = rennen) mit Verfolgerkamera.
export default function Player({ y, colliders, controlsRef, spawn, onInside }) {
  const root = useRef()
  const model = useRef()
  const keys = useRef({})
  const pos = useRef(new THREE.Vector3(spawn.x, y, spawn.z))
  const face = useRef(Math.PI)
  const inside = useRef(false)
  const colors = useMemo(() => ({ shirt: '#3aa76d', hair: '#2b2118', skin: '#f1c9a5' }), [])
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Versetzen (Aufzug): Figur und Kamera gemeinsam verschieben
  useEffect(() => {
    const c = controlsRef.current
    const cam = c?.object
    pos.current.set(spawn.x, y, spawn.z)
    if (c && cam && spawn.key > 0) {
      // Nach dem Aufzug: Kamera schräg von vorn oben, so dass man in die Etage schaut
      c.target.set(spawn.x + 3, y + 1.1, spawn.z - 4)
      cam.position.set(spawn.x + 5, y + 8, spawn.z + 13)
    }
    if (spawn.face != null) face.current = spawn.face
  }, [spawn.key])

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05)
    const c = controlsRef.current
    const k = keys.current
    const ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const prev = pos.current.clone()
    const isMoving = ix !== 0 || iz !== 0
    if (isMoving) {
      const fwd = new THREE.Vector3()
      state.camera.getWorldDirection(fwd)
      fwd.y = 0
      fwd.normalize()
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0))
      const dir = fwd.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize()
      const speed = (k.ShiftLeft || k.ShiftRight ? 7 : 4) * dt
      const nx = pos.current.x + dir.x * speed
      if (!blocked(nx, pos.current.z, colliders)) pos.current.x = nx
      const nz = pos.current.z + dir.z * speed
      if (!blocked(pos.current.x, nz, colliders)) pos.current.z = nz
      const target = Math.atan2(dir.x, dir.z)
      let d = target - face.current
      d = Math.atan2(Math.sin(d), Math.cos(d))
      face.current += d * Math.min(1, dt * 12)
    }
    if (isMoving !== moving) setMoving(isMoving)
    root.current.position.copy(pos.current)
    root.current.rotation.y = face.current
    const t = state.clock.elapsedTime
    model.current.position.y = isMoving ? Math.abs(Math.sin(t * 10)) * 0.07 : Math.sin(t * 1.6) * 0.015
    model.current.rotation.z = isMoving ? Math.sin(t * 10) * 0.07 : 0
    if (c) {
      const delta = pos.current.clone().sub(prev)
      c.object.position.add(delta)
      c.target.add(delta)
      c.target.y += (pos.current.y + 1.1 - c.target.y) * 0.1
    }
    const now = Math.abs(pos.current.x) < HALF_X - 0.05 && Math.abs(pos.current.z) < HALF_Z - 0.05
    if (now !== inside.current) { inside.current = now; onInside(now) }
  })

  return (
    <group ref={root} position={[spawn.x, y, spawn.z]}>
      <group ref={model}>
        <Model name="character" colors={colors} />
        <Html portal={labelRoot} position={[0, 1.95, 0]} center zIndexRange={[10, 0]}>
          <div style={{ background: '#3aa76d', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Du</div>
        </Html>
      </group>
    </group>
  )
}
