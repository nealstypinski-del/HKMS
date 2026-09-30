import { MEETING_ROOM } from '../config/floorLayouts'
import { Box, glass } from './primitives'
import { TextPanel } from './TextPanel'
import { floorMaterial } from './textures'

/** Konferenzraum mit Glaswänden und Tür zur Hauptachse. Der Tisch steht in MeetingTable. */
export function ConferenceRoom({ accent, label }: { accent: string; label: string }) {
  const R = MEETING_ROOM
  const h = 2.9
  const g = glass('#bfe6f5', 0.26)
  const cx = (R.x0 + R.x1) / 2
  const cz = (R.z0 + R.z1) / 2
  const doorX = (R.doorX0 + R.doorX1) / 2
  return (
    <group>
      <Box pos={[cx, 0.012, cz]} size={[R.x1 - R.x0, 0.02, R.z1 - R.z0]} material={floorMaterial('parquet', '#a06a3c', R.x1 - R.x0, R.z1 - R.z0)} cast={false} />
      {/* Nordwand mit Türöffnung */}
      <Box pos={[(R.x0 + R.doorX0) / 2, h / 2, R.z0]} size={[R.doorX0 - R.x0, h, 0.05]} material={g} cast={false} />
      <Box pos={[(R.doorX1 + R.x1) / 2, h / 2, R.z0]} size={[R.x1 - R.doorX1, h, 0.05]} material={g} cast={false} />
      <Box pos={[R.x0, h / 2, cz]} size={[0.05, h, R.z1 - R.z0]} material={g} cast={false} />
      <Box pos={[R.x1, h / 2, cz]} size={[0.05, h, R.z1 - R.z0]} material={g} cast={false} />
      <Box pos={[cx, h / 2, R.z1]} size={[R.x1 - R.x0, h, 0.05]} material={g} cast={false} />
      {/* Rahmen, Oberkante, Türpfosten */}
      <Box pos={[cx, h, R.z1]} size={[R.x1 - R.x0 + 0.1, 0.06, 0.08]} color="#20263a" cast={false} />
      <Box pos={[R.x0, h, cz]} size={[0.08, 0.06, R.z1 - R.z0]} color="#20263a" cast={false} />
      <Box pos={[R.x1, h, cz]} size={[0.08, 0.06, R.z1 - R.z0]} color="#20263a" cast={false} />
      {[R.x0, R.doorX0, R.doorX1, R.x1].map((x) => (
        <Box key={x} pos={[x, h / 2, R.z0]} size={[0.09, h, 0.09]} color="#20263a" />
      ))}
      <Box pos={[doorX, h - 0.3, R.z0]} size={[R.doorX1 - R.doorX0 + 0.1, 0.5, 0.08]} color="#161d33" />
      <TextPanel
        pos={[doorX, h - 0.3, R.z0 - 0.05]}
        size={[1.3, 0.42]}
        px={[400, 130]}
        deps={[label, accent]}
        draw={(ctx, w, hh) => {
          ctx.fillStyle = '#0f1730'
          ctx.fillRect(0, 0, w, hh)
          ctx.fillStyle = accent
          ctx.fillRect(0, 0, 10, hh)
          ctx.fillStyle = '#e8ecf8'
          ctx.font = '700 34px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText('Konferenzraum', 26, 44)
          ctx.font = '500 26px system-ui, sans-serif'
          ctx.fillStyle = '#9aa6c9'
          ctx.fillText(label, 26, 92)
        }}
      />
    </group>
  )
}
