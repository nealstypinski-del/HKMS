import { Box, type V3 } from '../world/primitives'

interface SofaProps {
  pos: V3
  /** Blickrichtung der Sitzenden (0 = nach +z) */
  yaw?: number
  width?: number
  color?: string
}

export function Sofa({ pos, yaw = 0, width = 3.8, color = '#5b6ee1' }: SofaProps) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Box pos={[0, 0.2, 0]} size={[width, 0.3, 0.95]} color={color} />
      <Box pos={[0, 0.36, 0.06]} size={[width - 0.3, 0.14, 0.8]} color={color} emissive={color} ei={0.05} />
      <Box pos={[0, 0.72, -0.4]} size={[width, 0.6, 0.16]} color={color} />
      <Box pos={[-width / 2 + 0.09, 0.45, 0]} size={[0.18, 0.5, 0.95]} color={color} />
      <Box pos={[width / 2 - 0.09, 0.45, 0]} size={[0.18, 0.5, 0.95]} color={color} />
    </group>
  )
}

export function Armchair({ pos, yaw = 0, color = '#e15b7a' }: Omit<SofaProps, 'width'>) {
  return <Sofa pos={pos} yaw={yaw} width={1.15} color={color} />
}
