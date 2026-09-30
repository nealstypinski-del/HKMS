import { Box, Cyl, type V3 } from '../world/primitives'

interface ChairProps {
  pos: V3
  /** Blickrichtung der sitzenden Person (0 = +z). Die Lehne steht dahinter. */
  yaw?: number
  color?: string
}

export function Chair({ pos, yaw = Math.PI, color = '#3a4256' }: ChairProps) {
  return (
    <group position={pos} rotation={[0, yaw - Math.PI, 0]}>
      <Cyl pos={[0, 0.22, 0]} size={[0.05, 0.36, 0.05]} color="#20263a" />
      <Cyl pos={[0, 0.04, 0]} size={[0.27, 0.06, 0.27]} color="#20263a" />
      <Box pos={[0, 0.46, 0]} size={[0.5, 0.08, 0.5]} color={color} />
      <Box pos={[0, 0.78, 0.25]} size={[0.5, 0.52, 0.07]} color={color} />
    </group>
  )
}
