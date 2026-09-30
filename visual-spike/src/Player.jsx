import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Rig } from './Assets.jsx'
import { labelRoot } from './labelRoot.js'
import { ESC, FLOOR_H, HALF_X, HALF_Z, escY } from './world.js'

const R = 0.32 // Körperradius
const blocked = (x, z, boxes) => boxes.some(([x0, x1, z0, z1]) => x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R)
const inBox = (x, z, [x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1
const UP_ZONE = [ESC.xUp - 0.4, ESC.xUp + 0.4, ESC.z0 - ESC.land + 0.05, ESC.z0 - 0.05]
const DOWN_ZONE = [ESC.xDown - 0.4, ESC.xDown + 0.4, ESC.z1 + 0.1, ESC.z1 + ESC.land - 0.1]

// Steuerbare Figur (WASD oder Pfeiltasten, Umschalt = rennen) mit Verfolgerkamera und Rolltreppen-Fahrt.
export default function Player({ y, floorIdx, colliders, controlsRef, spawn, onInside, onRide, onRideDone, keysRef, autoRef, posRef }) {
  const root = useRef()
  const keys = useRef({})
  const pos = useRef(new THREE.Vector3(spawn.x, y, spawn.z))
  const face = useRef(Math.PI)
  const inside = useRef(false)
  const ride = useRef(null)
  const colors = useMemo(() => ({ shirt: '#3aa76d', hair: '#2b2118', skin: '#f1c9a5' }), [])
  const [clip, setClip] = useState('Idle')
  const clipRef = useRef('Idle')
  const setC = (c) => { if (clipRef.current !== c) { clipRef.current = c; setClip(c) } }
  keysRef.current = keys.current
  posRef.current = pos.current

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Versetzen (Aufzug): Figur setzen, Kamera schräg von vorn oben
  useEffect(() => {
    const c = controlsRef.current
    const cam = c?.object
    pos.current.set(spawn.x, y, spawn.z)
    if (c && cam && spawn.key > 0) {
      c.target.set(spawn.x + 3, y + 1.1, spawn.z - 4)
      cam.position.set(spawn.x + 5, y + 8, spawn.z + 13)
    }
    if (spawn.face != null) face.current = spawn.face
  }, [spawn.key])

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05)
    const c = controlsRef.current
    const k = keys.current
    const prev = pos.current.clone()
    let next = clipRef.current

    if (ride.current) {
      // Rolltreppen-Fahrt: entlang der Steigung, ohne Eingabe
      const r = ride.current
      r.z += r.dir * 1.25 * dt
      const zz = Math.min(Math.max(r.z, ESC.z0), ESC.z1)
      pos.current.set(r.x, r.baseY + (r.dir > 0 ? escY(zz) : escY(zz) - FLOOR_H), r.z)
      face.current = r.dir > 0 ? 0 : Math.PI
      next = 'Idle'
      const done = r.dir > 0 ? r.z >= ESC.z1 + ESC.land + 0.6 : r.z <= ESC.z0 - ESC.land + 0.2
      if (done) {
        const toFloor = floorIdx + r.dir
        pos.current.y = toFloor * FLOOR_H
        ride.current = null
        onRideDone(toFloor)
      }
    } else {
      const ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
      const iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
      const auto = autoRef.current
      let isMoving = ix !== 0 || iz !== 0
      let autoDir = null
      if (auto?.target) {
        const dx = auto.target[0] - pos.current.x
        const dz = auto.target[1] - pos.current.z
        const dd = Math.hypot(dx, dz)
        if (dd < 0.2) auto.target = null
        else { autoDir = new THREE.Vector3(dx / dd, 0, dz / dd); isMoving = true }
      }
      if (isMoving) {
        let dir
        if (autoDir) dir = autoDir
        else {
          const fwd = new THREE.Vector3()
          state.camera.getWorldDirection(fwd)
          fwd.y = 0
          fwd.normalize()
          const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0))
          dir = fwd.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize()
        }
        const run = autoDir ? auto.run : k.ShiftLeft || k.ShiftRight
        const speed = (run ? 6.5 : 3.6) * dt
        const nx = pos.current.x + dir.x * speed
        if (!blocked(nx, pos.current.z, colliders)) pos.current.x = nx
        const nz = pos.current.z + dir.z * speed
        if (!blocked(pos.current.x, nz, colliders)) pos.current.z = nz
        let d = Math.atan2(dir.x, dir.z) - face.current
        d = Math.atan2(Math.sin(d), Math.cos(d))
        face.current += d * Math.min(1, dt * 12)
        next = run ? 'Run' : 'Walk'
      } else next = 'Idle'
      // Rolltreppe betreten (nur im Haus, bei Etagen mit passender Richtung)
      const { x, z } = pos.current
      if (inside.current) {
        if (floorIdx < 3 && inBox(x, z, UP_ZONE)) { ride.current = { dir: 1, x: ESC.xUp, z, baseY: floorIdx * FLOOR_H }; if (autoRef.current) autoRef.current.target = null; onRide(floorIdx, floorIdx + 1) }
        else if (floorIdx > 0 && inBox(x, z, DOWN_ZONE)) { ride.current = { dir: -1, x: ESC.xDown, z, baseY: floorIdx * FLOOR_H }; if (autoRef.current) autoRef.current.target = null; onRide(floorIdx, floorIdx - 1) }
      }
    }
    setC(next)
    root.current.position.copy(pos.current)
    root.current.rotation.y = face.current
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
      <Rig colors={colors} clip={clip} speed={clip === 'Run' ? 1.25 : 1} />
      <Html portal={labelRoot} position={[0, 2.15, 0]} center zIndexRange={[10, 0]}>
        <div style={{ background: '#3aa76d', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Du</div>
      </Html>
    </group>
  )
}
