import { MEETING_TABLE, layoutOf } from '../config/floorLayouts'
import { Ball, Box, Cyl } from '../world/primitives'
import { Chair } from './Chair'

export function MeetingTable({ level, accent }: { level: number; accent: string }) {
  const { x, z, radius } = MEETING_TABLE
  const slots = layoutOf(level).slots.filter((s) => s.area === 'meetingRoom')
  return (
    <group>
      <Cyl pos={[x, 0.74, z]} size={[radius, 0.07, radius]} color="#d9d2c3" />
      <Cyl pos={[x, 0.37, z]} size={[0.14, 0.72, 0.14]} color="#3a4256" />
      <Cyl pos={[x, 0.03, z]} size={[0.5, 0.06, 0.5]} color="#3a4256" />
      <Cyl pos={[x, 0.79, z]} size={[0.32, 0.02, 0.32]} color={accent} emissive={accent} ei={0.9} cast={false} />
      <Ball pos={[x, 0.98, z]} size={0.1} color={accent} emissive={accent} ei={1.2} cast={false} />
      {slots.map((s) => (
        <Chair key={s.id} pos={[s.x, 0, s.z]} yaw={s.yaw} color="#4a5573" />
      ))}
      <Box pos={[x, 0.005, z]} size={[4.6, 0.01, 4.6]} color={accent} emissive={accent} ei={0.05} cast={false} />
    </group>
  )
}
