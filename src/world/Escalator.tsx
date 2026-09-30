import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ESCALATOR, ESCALATOR_SLOPE } from '../config/walkWorld'
import { Box, GEO, glass, mat } from './primitives'

const RUN = ESCALATOR.x1 - ESCALATOR.x0
const LEN = Math.hypot(RUN, ESCALATOR.rise)
const ANGLE = Math.atan(ESCALATOR_SLOPE)
const SPACING = 0.4
const COUNT = Math.ceil(LEN / SPACING)
const STEP_W = SPACING * Math.cos(ANGLE)

const CYCLE_SPEED = ESCALATOR.speed
const MARKS = 26

/** Fahrende Stufen einer Spur: dunkler Körper, geriffelte helle Trittfläche, gelbe Vorderkante. */
function Lane({ z0, z1, direction }: { z0: number; z1: number; direction: 1 | -1 }) {
  const body = useRef<THREE.InstancedMesh>(null)
  const tread = useRef<THREE.InstancedMesh>(null)
  const edge = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const width = z1 - z0 - 0.08
  useFrame(({ clock }) => {
    const m = body.current
    const tr = tread.current
    const ed = edge.current
    if (!m || !tr || !ed) return
    const t = clock.elapsedTime * CYCLE_SPEED
    escalatorProbe.offset = (direction * t) % LEN
    const put = (mesh: THREE.InstancedMesh, i: number, dx: number, dy: number, sx: number, sy: number) => {
      const s2 = (((i * SPACING + direction * t) % LEN) + LEN) % LEN
      const f = s2 / LEN
      dummy.position.set(ESCALATOR.x0 + RUN * f + dx, ESCALATOR.rise * f + dy, (z0 + z1) / 2)
      dummy.scale.set(sx, sy, width)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    for (let i = 0; i < COUNT; i++) {
      put(m, i, 0, -0.1, STEP_W, 0.2)
      put(tr, i, -0.02, 0.005, STEP_W * 0.72, 0.03)
      put(ed, i, STEP_W / 2 - 0.02, 0.012, 0.035, 0.034)
    }
    m.instanceMatrix.needsUpdate = true
    tr.instanceMatrix.needsUpdate = true
    ed.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={body} args={[GEO.box, mat('#3f465c'), COUNT]} frustumCulled={false} castShadow receiveShadow />
      <instancedMesh ref={tread} args={[GEO.box, mat('#c9d1e4'), COUNT]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={edge} args={[GEO.box, mat('#ffd23f', '#ffb800', 0.6), COUNT]} frustumCulled={false} />
    </>
  )
}

/** Bewegte Markierungen auf dem Handlauf (der Handlauf fährt mit den Stufen). */
function HandrailMarks({ z, direction }: { z: number; direction: 1 | -1 }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime * CYCLE_SPEED
    for (let i = 0; i < MARKS; i++) {
      const s2 = (((i * (LEN / MARKS) + direction * t) % LEN) + LEN) % LEN
      const f = s2 / LEN
      dummy.position.set(ESCALATOR.x0 + RUN * f, ESCALATOR.rise * f + 1.06, z)
      dummy.rotation.set(0, 0, ANGLE)
      dummy.scale.set(0.12, 0.02, 0.09)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[GEO.box, mat('#ff8a3d', '#ff8a3d', 0.5), MARKS]} frustumCulled={false} />
}

/** Messwert für Tests im Browser: aktuelle Verschiebung der Stufen in Metern entlang der Schräge. */
export const escalatorProbe = { offset: 0 }

/** Rolltreppe zwischen Lobby und Etage 1: eine Spur fährt hinauf, eine hinunter. */
export function Escalator() {
  const E = ESCALATOR
  const cx = (E.x0 + E.x1) / 2
  const cy = E.rise / 2
  const rails: Array<[number, number]> = [
    [E.outer.z0, E.up.z0],
    [E.up.z1, E.down.z0],
    [E.down.z1, E.outer.z1],
  ]
  return (
    <group>
      <HandrailMarks z={(E.outer.z0 + E.up.z0) / 2} direction={1} />
      <HandrailMarks z={(E.up.z1 + E.down.z0) / 2} direction={1} />
      <HandrailMarks z={(E.down.z1 + E.outer.z1) / 2} direction={-1} />
      <Lane z0={E.up.z0} z1={E.up.z1} direction={1} />
      <Lane z0={E.down.z0} z1={E.down.z1} direction={-1} />
      {/* Tragwerk unter den Stufen */}
      <Box pos={[cx, cy - 0.45, (E.outer.z0 + E.outer.z1) / 2]} rot={[0, 0, ANGLE]} size={[LEN, 0.5, E.outer.z1 - E.outer.z0]} color="#3a4256" />
      {rails.map(([a, b], i) => (
        <group key={i}>
          <Box pos={[cx, cy + 0.5, (a + b) / 2]} rot={[0, 0, ANGLE]} size={[LEN, 0.9, b - a]} material={i === 1 ? mat('#59627f') : glass('#bfe6f5', 0.35)} cast={false} />
          <Box pos={[cx, cy + 1.0, (a + b) / 2]} rot={[0, 0, ANGLE]} size={[LEN, 0.07, Math.max(0.12, b - a)]} color="#161b2b" />
        </group>
      ))}
      {/* Kammplatten am Ein und Ausstieg */}
      <Box pos={[E.x0 - 0.2, 0.02, (E.up.z0 + E.down.z1) / 2]} size={[0.4, 0.04, E.down.z1 - E.up.z0]} color="#59627f" />
      <Box pos={[E.x1 + 0.2, E.rise + 0.02, (E.up.z0 + E.down.z1) / 2]} size={[0.4, 0.04, E.down.z1 - E.up.z0]} color="#59627f" />
      {/* Pfeile am Einstieg: oben und unten */}
      <Box pos={[E.x0 - 0.2, 0.05, (E.up.z0 + E.up.z1) / 2]} size={[0.3, 0.02, 0.3]} color="#3ddc84" emissive="#3ddc84" ei={1.2} cast={false} />
      <Box pos={[E.x0 - 0.2, 0.05, (E.down.z0 + E.down.z1) / 2]} size={[0.3, 0.02, 0.3]} color="#ff6b6b" emissive="#ff6b6b" ei={1.2} cast={false} />
    </group>
  )
}

