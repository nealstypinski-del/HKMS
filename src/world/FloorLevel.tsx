import { useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { FLOOR_DEPTH, FLOOR_HEIGHT, FLOOR_THICKNESS, FLOOR_WIDTH, floorByLevel, floorY } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { HALF_D, HALF_W, holesOf, subtractHoles } from '../config/walkWorld'
import { Box, glass } from './primitives'
import { LIFT_DISTANCE, floorLift } from './runtime'

const W = FLOOR_WIDTH
const D = FLOOR_DEPTH
const H = FLOOR_HEIGHT - FLOOR_THICKNESS

/** Wände sichtbar nur, solange die Kamera auf der Innenseite steht, sonst verdecken sie den Blick. */
function Walls({ accent }: { accent: string }) {
  const back = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const front = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    const { x, z } = camera.position
    if (back.current) back.current.visible = z > -D / 2
    if (left.current) left.current.visible = x > -W / 2
    if (right.current) right.current.visible = x < W / 2
    if (front.current) front.current.visible = z < D / 2
  })
  const wall = '#f4f0e6'
  return (
    <>
      <group ref={back}>
        <Box pos={[0, H / 2, -D / 2]} size={[W + 0.3, H, 0.3]} color={wall} />
        <Box pos={[0, 3.6, -D / 2 + 0.16]} size={[W, 1.1, 0.04]} color="#bfe3f2" emissive="#8fd0ea" ei={0.25} cast={false} />
        <Box pos={[0, 0.12, -D / 2 + 0.17]} size={[W, 0.24, 0.05]} color="#59627f" cast={false} />
        <Box pos={[0, H - 0.06, -D / 2 + 0.17]} size={[W, 0.08, 0.05]} color={accent} emissive={accent} ei={0.6} cast={false} />
      </group>
      <group ref={left}>
        <Box pos={[-W / 2, H / 2, 0]} size={[0.3, H, D]} color={wall} />
        <Box pos={[-W / 2 + 0.16, 3.6, 0]} size={[0.04, 1.1, D - 0.6]} color="#bfe3f2" emissive="#8fd0ea" ei={0.25} cast={false} />
        <Box pos={[-W / 2 + 0.17, H - 0.06, 0]} size={[0.05, 0.08, D]} color={accent} emissive={accent} ei={0.6} cast={false} />
      </group>
      <group ref={right}>
        <Box pos={[W / 2, H / 2, 0]} size={[0.06, H, D]} material={glass()} cast={false} />
        {[-D / 2, -D / 6, D / 6, D / 2].map((z) => (
          <Box key={z} pos={[W / 2, H / 2, z]} size={[0.14, H, 0.12]} color="#e6e1d4" />
        ))}
      </group>
      <group ref={front}>
        <Box pos={[0, H / 2, D / 2]} size={[W, H, 0.06]} material={glass()} cast={false} />
        {[-W / 2, -W / 6, W / 6, W / 2].map((x) => (
          <Box key={x} pos={[x, H / 2, D / 2]} size={[0.12, H, 0.14]} color="#e6e1d4" />
        ))}
      </group>
    </>
  )
}

/** Eine Etage: Bodenplatte, Wände, Randleuchte, Etagenlicht. Ausgeblendete Etagen fahren nach oben weg. */
export function FloorLevel({ level, children }: { level: number; children: ReactNode }) {
  const cfg = floorByLevel(level)
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const focus = useOfficeStore.getState().focus
    const target = focus !== 'all' && level > focus ? LIFT_DISTANCE : 0
    const cur = floorLift[level] as number
    const next = cur + (target - cur) * (1 - Math.exp(-5 * dt))
    const lift = Math.abs(target - next) < 0.02 ? target : next
    floorLift[level] = lift
    g.position.y = floorY(level) + lift
    g.visible = lift < LIFT_DISTANCE - 0.25
  })
  const holes = holesOf(level)
  const slabParts = subtractHoles({ x0: -HALF_W, x1: HALF_W, z0: -HALF_D, z1: HALF_D }, holes)
  const lights: Array<[number, number]> = []
  for (const x of [-8, 0, 8]) for (const z of [-4, 3]) if (!holes.some((h) => x + 1 > h.x0 && x - 1 < h.x1 && z + 0.4 > h.z0 && z - 0.4 < h.z1)) lights.push([x, z])
  const light = cfg.company === 'kasselmemes' ? '#b8fff2' : cfg.company === 'herkulesjobs' ? '#ffe2c4' : level === 3 ? '#d8d2ff' : '#fff6e6'
  return (
    <group ref={group} position={[0, floorY(level), 0]}>
      {slabParts.map((r, i) => (
        <group key={i}>
          <Box pos={[(r.x0 + r.x1) / 2, -FLOOR_THICKNESS / 2, (r.z0 + r.z1) / 2]} size={[r.x1 - r.x0, FLOOR_THICKNESS, r.z1 - r.z0]} color={cfg.floorColor} />
          <Box pos={[(r.x0 + r.x1) / 2, -FLOOR_THICKNESS - 0.02, (r.z0 + r.z1) / 2]} size={[r.x1 - r.x0 - 0.02, 0.03, r.z1 - r.z0 - 0.02]} color="#f2f4f9" emissive="#ffffff" ei={0.12} cast={false} />
        </group>
      ))}
      {[[0, -D / 2 - 0.05, W + 0.3, 0.15], [0, D / 2 + 0.05, W + 0.3, 0.15], [-W / 2 - 0.05, 0, 0.15, D], [W / 2 + 0.05, 0, 0.15, D]].map(([x, z, w, d], i) => (
        <Box key={i} pos={[x as number, -FLOOR_THICKNESS - 0.02, z as number]} size={[w as number, 0.12, d as number]} color="#1a2240" />
      ))}
      {lights.map(([x, z]) => (
        <Box key={`${x}${z}`} pos={[x, -FLOOR_THICKNESS - 0.05, z]} size={[1.8, 0.03, 0.5]} color="#fffdf5" emissive="#fff6e0" ei={1.6} cast={false} />
      ))}
      <Box pos={[0, 0.0, D / 2 + 0.1]} size={[W + 0.4, 0.06, 0.12]} color={cfg.accent} emissive={cfg.accent} ei={1.1} cast={false} />
      <Box pos={[W / 2 + 0.1, 0.0, 0]} size={[0.12, 0.06, D + 0.4]} color={cfg.accent} emissive={cfg.accent} ei={1.1} cast={false} />
      {[
        [-W / 2, -D / 2],
        [W / 2, -D / 2],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} pos={[x as number, H / 2, z as number]} size={[0.28, H, 0.28]} color="#e6e1d4" />
      ))}
      <Walls accent={cfg.accent} />
      <pointLight position={[0, 4.6, 0]} color={light} intensity={45} distance={26} decay={2} />
      {children}
    </group>
  )
}
