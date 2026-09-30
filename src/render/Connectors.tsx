import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, MeshLambertMaterial, MeshStandardMaterial, Object3D } from 'three'
import { connectors, laneLength, type Connector } from '../world/connectors'
import { FLOOR_H, floorBaseY } from '../world/constants'
import { BUILDING } from '../world/buildingConfig'
import { GEO } from './materials'

const stepMat = new MeshLambertMaterial({ color: '#c9c4b8' })
const treadMat = new MeshLambertMaterial({ color: '#2b2f38' })
const metalMat = new MeshStandardMaterial({ color: '#8b93a3', metalness: 0.7, roughness: 0.35 })
const darkMat = new MeshLambertMaterial({ color: '#20242d' })
const glassMat = new MeshStandardMaterial({ color: '#bfe4f0', transparent: true, opacity: 0.22, roughness: 0.06, metalness: 0.2, depthWrite: false })
const _o = new Object3D()

const levelOf = (id: string) => BUILDING.floors.find((f) => f.id === id)!.level

/** Geometrie einer Steigung in Weltkoordinaten */
function geom(c: Connector) {
  const y0 = floorBaseY(levelOf(c.lower)), y1 = floorBaseY(levelOf(c.upper))
  const L = laneLength(c)
  const H = y1 - y0
  const dir = Math.sign(c.xHigh - c.xLow)
  const angle = Math.atan2(H, L) * dir // Drehung um z, damit die lokale x Achse der Steigung folgt
  const len = Math.hypot(L, H)
  return { y0, y1, L, H, dir, angle, len, cx: (c.xLow + c.xHigh) / 2, cy: (y0 + y1) / 2, cz: (c.lane.z0 + c.lane.z1) / 2, w: c.lane.z1 - c.lane.z0 }
}

/** Massive Treppe: Stufen als volle Blöcke vom Boden bis zur Trittfläche, dazu Brüstung und Handlauf. */
function Stairs({ c }: { c: Connector }) {
  const g = geom(c)
  const N = 26
  const mesh = useMemo(() => {
    const m = new InstancedMesh(GEO.box, stepMat, N)
    const tread = g.L / N, rise = g.H / N
    for (let i = 0; i < N; i++) {
      const h = rise * (i + 1)
      _o.position.set(c.xLow + g.dir * (i + 0.5) * tread, g.y0 + h / 2, g.cz)
      _o.rotation.set(0, 0, 0)
      _o.scale.set(tread, h, g.w - 0.1)
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    }
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false
    return m
  }, [c, g.L, g.H, g.dir, g.cz, g.w, g.y0])
  return (
    <group>
      <primitive object={mesh} />
      {[-1, 1].map((s) => (
        <group key={s} position={[g.cx, g.cy, g.cz + s * (g.w / 2 - 0.04)]} rotation-z={g.angle}>
          <mesh position={[0, 1.0, 0]}><boxGeometry args={[g.len, 0.9, 0.04]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[g.len, 0.06, 0.08]} /><primitive object={metalMat} attach="material" /></mesh>
        </group>
      ))}
      <mesh position={[g.cx, g.cy + 0.02, g.cz]} rotation-z={g.angle}>
        <boxGeometry args={[g.len, 0.02, g.w - 0.1]} /><primitive object={treadMat} attach="material" />
      </mesh>
    </group>
  )
}

/** Rolltreppe: bewegte Stufen (Instanzen), Balustraden aus Glas, Handlauf und Unterbau. */
function Escalator({ c }: { c: Connector }) {
  const g = geom(c)
  const N = 34
  const ref = useRef<InstancedMesh>(null)
  const speed = c.auto === 'down' ? -1 : 1
  const mesh = useMemo(() => {
    const m = new InstancedMesh(GEO.box, treadMat, N)
    m.castShadow = true; m.frustumCulled = false
    return m
  }, [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const stepLen = g.len / N
    const phase = ((clock.elapsedTime * 0.85 * speed) / stepLen) % 1
    for (let i = 0; i < N; i++) {
      const s = (((i + phase) % N) + N) % N / N // 0..1 entlang der Steigung
      // Position entlang der Steigung: x läuft in Steigrichtung, y steigt linear
      _o.position.set(g.cx + (s - 0.5) * g.L * g.dir, g.cy + (s - 0.5) * g.H, g.cz)
      _o.rotation.set(0, 0, g.angle)
      _o.scale.set(stepLen * 0.94, 0.06, g.w - 0.14)
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <primitive ref={ref} object={mesh} />
      {/* Unterbau */}
      <mesh position={[g.cx, g.cy - 0.28, g.cz]} rotation-z={g.angle}><boxGeometry args={[g.len, 0.34, g.w - 0.06]} /><primitive object={darkMat} attach="material" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[g.cx, g.cy, g.cz + s * (g.w / 2 - 0.03)]} rotation-z={g.angle}>
          <mesh position={[0, 0.38, 0]}><boxGeometry args={[g.len, 0.7, 0.05]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, 0.78, 0]}><boxGeometry args={[g.len, 0.09, 0.11]} /><primitive object={darkMat} attach="material" /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[g.len, 0.08, 0.09]} /><primitive object={metalMat} attach="material" /></mesh>
        </group>
      ))}
    </group>
  )
}

/** Alle Verbinder zwischen zwei Etagen. Wird nur gerendert, wenn beide Etagen sichtbar sind. */
export function Connectors({ lowerId, upperId }: { lowerId: string; upperId: string }) {
  return (
    <group>
      {connectors.filter((c) => c.lower === lowerId && c.upper === upperId).map((c) => (
        c.kind === 'stairs' ? <Stairs key={c.id} c={c} /> : <Escalator key={c.id} c={c} />
      ))}
    </group>
  )
}
export { FLOOR_H }
