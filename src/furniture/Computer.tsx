import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { ComputerState } from '../agents/agent.types'
import { Box, GEO } from '../world/primitives'
import { deskOccupancy } from '../world/runtime'
import { screenMaterial, screenOffMaterial, type ScreenKind, type ScreenMode } from '../world/screens'

interface MonitorProps {
  deskId: string
  state: ComputerState
  kind: ScreenKind
  pos: [number, number, number]
  rotY?: number
  scale?: number
}

function materialFor(kind: ScreenKind, state: ComputerState, occupied: boolean): { key: string; material: THREE.Material } {
  if (state === 'offline') return { key: 'off', material: screenOffMaterial }
  const mode: ScreenMode = !occupied || state === 'idle' ? 'sleep' : state
  return { key: `${kind}:${mode}`, material: screenMaterial(kind, mode) }
}

/** Monitor: aktiviert sich erst, wenn der zugewiesene Agent wirklich am Platz sitzt. */
export function Monitor({ deskId, state, kind, pos, rotY = 0, scale = 1 }: MonitorProps) {
  const ref = useRef<THREE.Mesh>(null)
  const current = useRef('')
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const { key, material } = materialFor(kind, state, deskOccupancy.get(deskId) === true)
    if (key !== current.current) {
      current.current = key
      mesh.material = material
    }
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={scale}>
      <Box pos={[0, 0.03, 0]} size={[0.3, 0.03, 0.2]} color="#20263a" />
      <Box pos={[0, 0.2, 0]} size={[0.06, 0.34, 0.05]} color="#20263a" />
      <Box pos={[0, 0.55, 0]} size={[0.78, 0.5, 0.05]} color="#161b2b" />
      <mesh ref={ref} geometry={GEO.plane} material={screenOffMaterial} position={[0, 0.55, 0.028]} scale={[0.71, 0.43, 1]} />
    </group>
  )
}
