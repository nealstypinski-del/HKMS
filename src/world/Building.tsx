import { PLATFORM_RADIUS, FLOOR_HEIGHT } from '../config/office.config'
import { Box, Cyl } from './primitives'
import { ElevatorCabin } from './Elevator'
import { FloorLevel } from './FloorLevel'
import { DevFloor } from './floors/DevFloor'
import { HerkulesFloor } from './floors/HerkulesFloor'
import { KasselFloor } from './floors/KasselFloor'
import { Lobby } from './floors/Lobby'
import { TextPanel } from './TextPanel'

/** Runde Plattform, vier Etagen und der Aufzug. */
export function Building() {
  return (
    <group>
      <Cyl pos={[0, -1.15, 0]} size={[PLATFORM_RADIUS, 1.0, PLATFORM_RADIUS]} color="#1a2240" />
      <Cyl pos={[0, -0.6, 0]} size={[PLATFORM_RADIUS - 0.4, 0.2, PLATFORM_RADIUS - 0.4]} color="#232d57" />
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[PLATFORM_RADIUS - 0.3, PLATFORM_RADIUS - 0.3, 1]}>
        <torusGeometry args={[1, 0.006, 6, 120]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff8a3d" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[PLATFORM_RADIUS - 2, PLATFORM_RADIUS - 2, 1]}>
        <torusGeometry args={[1, 0.004, 6, 120]} />
        <meshStandardMaterial color="#2fd6c0" emissive="#2fd6c0" emissiveIntensity={1.4} />
      </mesh>
      <FloorLevel level={0}>
        <Lobby />
      </FloorLevel>
      <FloorLevel level={1}>
        <HerkulesFloor />
      </FloorLevel>
      <FloorLevel level={2}>
        <KasselFloor />
      </FloorLevel>
      <FloorLevel level={3}>
        <DevFloor />
        <RoofSign />
      </FloorLevel>
      <ElevatorCabin />
    </group>
  )
}

/** Dachschild des Gebäudes (gehört zur obersten Etage). */
function RoofSign() {
  const y = FLOOR_HEIGHT - 0.35
  return (
    <group>
      <Box pos={[-6, y + 1.0, -7.9]} size={[0.25, 2.0, 0.25]} color="#3a4256" />
      <Box pos={[6, y + 1.0, -7.9]} size={[0.25, 2.0, 0.25]} color="#3a4256" />
      <Box pos={[0, y + 1.9, -7.9]} size={[12.8, 1.3, 0.2]} color="#0d1428" />
      <TextPanel
        pos={[0, y + 1.9, -7.78]}
        size={[12.4, 1.2]}
        px={[1024, 99]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#0d1428'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#ff8a3d'
          ctx.fillRect(0, h - 8, w / 2, 8)
          ctx.fillStyle = '#2fd6c0'
          ctx.fillRect(w / 2, h - 8, w / 2, 8)
          ctx.fillStyle = '#e8ecf8'
          ctx.font = '800 62px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText('HERKULES AI HQ', w / 2, h / 2 - 2)
        }}
      />
    </group>
  )
}
