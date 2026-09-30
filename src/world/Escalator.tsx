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

/** Fahrende Stufen einer Spur. Nach oben (+1) oder unten (-1). */
function Lane({ z0, z1, direction }: { z0: number; z1: number; direction: 1 | -1 }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const width = z1 - z0 - 0.08
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime * ESCALATOR.speed
    for (let i = 0; i < COUNT; i++) {
      // Position entlang der Schräge, danach zurück an den Anfang (Umlauf)
      const s = (((i * SPACING + direction * t) % LEN) + LEN) % LEN
      const f = s / LEN
      dummy.position.set(ESCALATOR.x0 + RUN * f, ESCALATOR.rise * f - 0.1, (z0 + z1) / 2)
      dummy.scale.set(STEP_W, 0.2, width)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[GEO.box, mat('#b8c2d8'), COUNT]} frustumCulled={false} castShadow receiveShadow />
}


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

