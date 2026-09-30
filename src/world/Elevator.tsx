import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { ELEVATOR_CABIN } from '../config/floorLayouts'
import { FLOOR_HEIGHT } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { Box, glass } from './primitives'
import { TextPanel } from './TextPanel'
import { elevatorCar } from './runtime'

const { x: CX, z: CZ } = ELEVATOR_CABIN

/** Schacht und Türrahmen einer Etage (Teil der Etagengruppe). */
export function ElevatorShaft({ level }: { level: number }) {
  return (
    <group>
      <Box pos={[CX, 2.6, -7.8]} size={[2.4, 5.2, 0.1]} color="#59627f" />
      <Box pos={[CX - 1.2, 2.6, CZ]} size={[0.1, 5.2, 2.6]} color="#7d8bb0" />
      <Box pos={[CX + 1.2, 2.6, CZ]} size={[0.1, 5.2, 2.6]} color="#7d8bb0" />
      <Box pos={[CX, 0.02, CZ]} size={[2.3, 0.04, 2.6]} color="#3a4256" cast={false} />
      <Box pos={[CX - 1.25, 1.7, -5.0]} size={[0.22, 3.4, 0.24]} color="#20263a" />
      <Box pos={[CX + 1.25, 1.7, -5.0]} size={[0.22, 3.4, 0.24]} color="#20263a" />
      <Box pos={[CX, 3.5, -5.0]} size={[2.7, 0.24, 0.24]} color="#20263a" />
      <TextPanel
        pos={[CX, 3.5, -4.87]}
        size={[0.9, 0.2]}
        px={[256, 64]}
        deps={[level]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#0f1730'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#2fd6c0'
          ctx.font = '700 44px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText(level === 0 ? 'EG' : `Etage ${level}`, w / 2, h / 2 + 2)
        }}
      />
    </group>
  )
}

/** Fahrkabine. Ihre Höhe folgt der Figur, die gerade fährt. */
export function ElevatorCabin() {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.position.y += (elevatorCar.y - g.position.y) * (1 - Math.exp(-14 * dt))
    const focus = useOfficeStore.getState().focus
    g.visible = focus === 'all' || g.position.y <= (focus as number) * FLOOR_HEIGHT + 0.5
  })
  return (
    <group ref={ref} position={[CX, 0, CZ]}>
      <Box pos={[0, 0.06, 0]} size={[2.1, 0.12, 2.3]} color="#c9d3ea" />
      <Box pos={[0, 3.05, 0]} size={[2.1, 0.1, 2.3]} color="#c9d3ea" />
      <Box pos={[-1.02, 1.55, 0]} size={[0.06, 3.0, 2.3]} material={glass('#9fe7f5', 0.3)} cast={false} />
      <Box pos={[1.02, 1.55, 0]} size={[0.06, 3.0, 2.3]} material={glass('#9fe7f5', 0.3)} cast={false} />
      <Box pos={[0, 1.55, -1.12]} size={[2.1, 3.0, 0.06]} color="#7d8bb0" />
      <Box pos={[0, 2.9, 0]} size={[1.6, 0.05, 1.8]} color="#fff6e6" emissive="#fff6e6" ei={1.4} cast={false} />
    </group>
  )
}
