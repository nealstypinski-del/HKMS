import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ESC, FLOOR_H } from './world.js'

const N = 30
const SLOPE = Math.hypot(ESC.z1 - ESC.z0, FLOOR_H)
const ANGLE = Math.atan2(FLOOR_H, ESC.z1 - ESC.z0)
const TOTAL = ESC.land * 2 + SLOPE
const GAP = TOTAL / N

function treadTexture() {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const g = cv.getContext('2d')
  g.fillStyle = '#b3bac8'
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#5b6273'
  for (let i = 0; i < 64; i += 8) g.fillRect(i, 0, 3, 64)
  g.fillStyle = '#3c4152'
  g.fillRect(0, 60, 64, 4)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function railTexture() {
  const cv = document.createElement('canvas')
  cv.width = 32
  cv.height = 32
  const g = cv.getContext('2d')
  g.fillStyle = '#15171d'
  g.fillRect(0, 0, 32, 32)
  g.fillStyle = '#2b2f3a'
  g.fillRect(0, 0, 32, 6)
  g.fillRect(0, 0, 6, 32)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Punkt auf dem oberen (laufenden) Stufenstrang. p in [0, TOTAL)
function stepPos(p) {
  if (p < ESC.land) return [ESC.z0 - ESC.land + p, 0]
  if (p < ESC.land + SLOPE) {
    const k = (p - ESC.land) / SLOPE
    return [ESC.z0 + k * (ESC.z1 - ESC.z0), k * FLOOR_H]
  }
  return [ESC.z1 + (p - ESC.land - SLOPE), FLOOR_H]
}

// Fahrende Rolltreppe: Stufen wandern in `dir` (+1 aufwärts, -1 abwärts), Handläufe laufen mit.
export default function Escalator({ x, dir = 1 }) {
  const inst = useRef()
  const railTex = useMemo(railTexture, [])
  const treadTex = useMemo(treadTexture, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const t0 = useRef(Math.random() * 10)
  useEffect(() => () => { railTex.dispose(); treadTex.dispose() }, [railTex, treadTex])

  useFrame((_, dt) => {
    t0.current += dt
    const shift = dir * ESC.speed * t0.current
    for (let i = 0; i < N; i++) {
      const p = (((i * GAP + shift) % TOTAL) + TOTAL) % TOTAL
      const [z, y] = stepPos(p)
      const edge = Math.min(p, TOTAL - p)
      const f = Math.min(1, edge / 0.3)
      dummy.position.set(0, y - 0.05 * f - 0.15 * (1 - f), z)
      dummy.scale.set(1, f, 0.96)
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix)
    }
    inst.current.instanceMatrix.needsUpdate = true
    railTex.offset.y = (railTex.offset.y - dir * ESC.speed * dt * 2.2) % 1
    railTex.offset.x = (railTex.offset.x + dir * ESC.speed * dt * 2.2) % 1
  })

  const mid = [(ESC.z0 + ESC.z1) / 2, FLOOR_H / 2]
  const side = ESC.w / 2 + 0.1
  const glass = <meshPhysicalMaterial color="#bfe3ff" transparent opacity={0.28} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
  return (
    <group position={[x, 0.02, 0]}>
      <instancedMesh ref={inst} args={[null, null, N]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[ESC.w, 0.12, GAP]} />
        <meshStandardMaterial map={treadTex} roughness={0.5} metalness={0.4} />
      </instancedMesh>
      {/* Unterbau */}
      <mesh position={[0, mid[1] - 0.36, mid[0]]} rotation={[-ANGLE, 0, 0]} castShadow>
        <boxGeometry args={[ESC.w + 0.3, 0.45, SLOPE + 0.2]} />
        <meshStandardMaterial color="#5b647c" roughness={0.55} metalness={0.35} />
      </mesh>
      {[-1, 1].map((k) => (
        <group key={k} position={[k * side, 0, 0]}>
          {/* Glasbrüstung und Handlauf auf der Steigung */}
          <mesh position={[0, mid[1] + 0.5, mid[0]]} rotation={[-ANGLE, 0, 0]}>
            <boxGeometry args={[0.03, 0.9, SLOPE]} />
            {glass}
          </mesh>
          <mesh position={[0, mid[1] + 0.98, mid[0]]} rotation={[-ANGLE, 0, 0]}>
            <boxGeometry args={[0.1, 0.07, SLOPE + 0.05]} />
            <meshStandardMaterial map={(() => { railTex.repeat.set(1, SLOPE * 2); return railTex })()} roughness={0.7} />
          </mesh>
          {/* ebene Endstücke */}
          {[[ESC.z0 - ESC.land / 2, 0], [ESC.z1 + ESC.land / 2, FLOOR_H]].map(([z, y], i) => (
            <group key={i}>
              <mesh position={[0, y + 0.5, z]}><boxGeometry args={[0.03, 0.9, ESC.land]} />{glass}</mesh>
              <mesh position={[0, y + 0.98, z]}><boxGeometry args={[0.1, 0.07, ESC.land]} /><meshStandardMaterial color="#15171d" roughness={0.7} /></mesh>
            </group>
          ))}
          <mesh position={[0, 0.5, ESC.z0 - ESC.land]}><boxGeometry args={[0.12, 1.0, 0.12]} /><meshStandardMaterial color="#8b93a6" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, FLOOR_H + 0.5, ESC.z1 + ESC.land]}><boxGeometry args={[0.12, 1.0, 0.12]} /><meshStandardMaterial color="#8b93a6" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  )
}

// Zwei Spuren (hoch und runter) zwischen Etage i und i+1
export function EscalatorPair() {
  return (
    <group>
      <Escalator x={ESC.xUp} dir={1} />
      <Escalator x={ESC.xDown} dir={-1} />
    </group>
  )
}
