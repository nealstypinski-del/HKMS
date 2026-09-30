import { Armchair, Sofa } from '../../furniture/Sofa'
import { AgentBench } from '../../furniture/AgentBench'
import { Kitchen } from '../../furniture/Kitchen'
import { Lamp, Plant, Rug, Tree } from '../../furniture/Decor'
import { LOBBY_LAYOUT } from '../../config/floorLayouts'
import { FoosballTable, Picture, VendingMachine, WallClock, WaterCooler } from '../../furniture/Props'
import { Box, Cyl } from '../primitives'
import { TextPanel } from '../TextPanel'
import { HQDisplay } from '../StatusScreens'
import { ElevatorShaft } from '../Elevator'
import { Escalator } from '../Escalator'
import { Stairs } from '../Stairs'

function Reception() {
  const { x, z } = LOBBY_LAYOUT.reception
  return (
    <group>
      <Box pos={[x, 0.55, z]} size={[4.4, 1.1, 0.9]} color="#f0ebdf" />
      <Box pos={[x, 1.12, z]} size={[4.6, 0.07, 1.05]} color="#3a4256" />
      <Box pos={[x - 2.15, 0.55, z - 1.5]} size={[0.9, 1.1, 2.4]} color="#f0ebdf" />
      <Box pos={[x - 2.15, 1.12, z - 1.5]} size={[1.05, 0.07, 2.6]} color="#3a4256" />
      <Box pos={[x + 0.4, 1.45, z - 0.1]} size={[0.7, 0.45, 0.05]} color="#161b2b" />
      <TextPanel
        pos={[x, 0.55, z + 0.46]}
        size={[3.8, 0.7]}
        px={[760, 140]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#e9e4d8'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#ff8a3d'
          ctx.fillRect(0, 0, 12, h)
          ctx.fillStyle = '#2fd6c0'
          ctx.fillRect(w - 12, 0, 12, h)
          ctx.fillStyle = '#20263a'
          ctx.font = '700 46px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText('HerkulesJobs · KasselMemes', w / 2, h / 2 + 2)
        }}
      />
    </group>
  )
}

export function Lobby() {
  const { sofa, coffeeTable, armchairs } = LOBBY_LAYOUT
  return (
    <group>
      {/* Bodeneinlage unter der Anzeige */}
      <Cyl pos={[-1.6, 0.011, -3.9]} size={[2.6, 0.02, 2.6]} color="#dcd5c3" cast={false} />
      <Cyl pos={[-1.6, 0.02, -3.9]} size={[1.7, 0.02, 1.7]} color="#ff8a3d" emissive="#ff8a3d" ei={0.25} cast={false} />
      <Cyl pos={[-1.6, 0.03, -3.9]} size={[1.2, 0.02, 1.2]} color="#2fd6c0" emissive="#2fd6c0" ei={0.25} cast={false} />
      <HQDisplay />
      <Reception />
      <Kitchen />
      <AgentBench />
      {/* Lounge */}
      <Rug pos={[-7.5, 0, 3.7]} size={[6.8, 4.4]} color="#8a8fe6" />
      <Sofa pos={[sofa.x, 0, sofa.z]} yaw={0} width={3.8} color="#5b6ee1" />
      <Cyl pos={[coffeeTable.x, 0.3, coffeeTable.z]} size={[0.6, 0.05, 0.6]} color="#b98552" />
      <Cyl pos={[coffeeTable.x, 0.15, coffeeTable.z]} size={[0.08, 0.3, 0.08]} color="#3a4256" />
      {armchairs.map((a, i) => (
        <Armchair key={i} pos={[a.x, 0, a.z]} yaw={a.yaw} color="#e15b7a" />
      ))}
      <Plant pos={[-11.2, 0, 7.0]} scale={1.2} />
      <Tree pos={[11.0, 0, 6.4]} />
      <Plant pos={[9.4, 0, -0.9]} />
      <Lamp pos={[-11.2, 0, 1.6]} />
      <FoosballTable pos={[7.6, 0, 3.0]} />
      <VendingMachine pos={[-11.35, 0, -1.2]} yaw={Math.PI / 2} />
      <WaterCooler pos={[-11.5, 0, 0.3]} yaw={Math.PI / 2} />
      <WallClock pos={[-8.6, 3.6, -7.82]} />
      <Picture pos={[-5.6, 2.3, -7.82]} colors={['#ff8a3d', '#2fd6c0', '#e15b7a']} />
      <Picture pos={[-11.83, 2.3, -4.2]} rot={[0, Math.PI / 2, 0]} colors={['#5b6ee1', '#f2c94c', '#2fd6c0']} size={[1.2, 0.8]} />
      <ElevatorShaft level={0} />
      <Escalator />
      <Stairs />
    </group>
  )
}
