import { Chair, Desk, Elevator, Kitchen, AgentBench, Partition, Plant, Pod, RingLight, ServerRack, Sofa, Table, WallScreen, ZoneLabel } from './Furniture.jsx'
import Character from './Character.jsx'

const SHIRTS = ['#ff8a3d', '#2fd6c0', '#5b6ee1', '#e15b7a', '#f2c94c', '#8e6bd8', '#3aa76d', '#e8e8e8']
const HAIR = ['#2b2118', '#6b4423', '#c9a24a', '#1c1c1c', '#a33b2a', '#5a5a5a']

function Prop({ d, pal }) {
  switch (d.t) {
    case 'elevator': return <Elevator position={d.p} rotation={d.r} />
    case 'kitchen': return <Kitchen position={d.p} />
    case 'bench': return <AgentBench position={d.p} />
    case 'sofa': return <Sofa position={d.p} rotation={d.r} width={d.width} />
    case 'table': return <Table position={d.p} size={d.size} h={d.h} color={pal.wood} />
    case 'chair': return <Chair position={d.p} rotation={d.r} />
    case 'plant': return <Plant position={d.p} scale={d.s} />
    case 'partition': return <Partition position={d.p} len={d.len} />
    case 'rack': return <ServerRack position={d.p} rotation={d.r} />
    case 'ringlight': return <RingLight position={d.p} rotation={d.r} />
    default: return null
  }
}

// Eine Etage aus der Konfiguration (src/data/floors.js)
export default function Floor({ floor, stats }) {
  const pal = floor.palette
  let n = 0
  return (
    <group>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[18, 0.2, 12]} />
        <meshStandardMaterial color={pal.floor} />
      </mesh>
      {floor.zones.map((z, i) => (
        <group key={i}>
          <mesh position={[z.x, 0.005 + i * 0.0015, z.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            {z.type === 'circle' ? <circleGeometry args={[z.r, 40]} /> : <planeGeometry args={[z.w, z.d]} />}
            <meshStandardMaterial color={z.color} />
          </mesh>
          {z.label && <ZoneLabel position={[z.x, 0.05, z.z - z.d / 2 + 0.3]} text={z.label} />}
        </group>
      ))}

      {floor.walls !== false && (
        <>
      <mesh position={[0, 2, -6.1]} castShadow receiveShadow>
        <boxGeometry args={[18.4, 4, 0.2]} />
        <meshStandardMaterial color={pal.wall} />
      </mesh>
      <mesh position={[0, 0.15, -5.95]}>
        <boxGeometry args={[18, 0.3, 0.1]} />
        <meshStandardMaterial color={pal.trim} />
      </mesh>
      <mesh position={[-9.1, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 4, 12.4]} />
        <meshStandardMaterial color={pal.wall} />
      </mesh>
      <mesh position={[-8.95, 0.15, 0]}>
        <boxGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color={pal.trim} />
      </mesh>
        </>
      )}
      {floor.windows.map((w, i) => (
        <mesh key={i} position={[w.x, 2.6, -5.98]}>
          <boxGeometry args={[w.w, 1.3, 0.05]} />
          <meshStandardMaterial color="#9fdcff" emissive="#9fdcff" emissiveIntensity={0.25} />
        </mesh>
      ))}

      {floor.screens.map((s, i) => {
        const lines = typeof s.lines === 'function' ? s.lines(stats) : s.lines
        if (floor.walls !== false) {
          return <WallScreen key={i} position={[s.x, s.y, -5.9]} w={s.w} h={s.h} title={s.title} accent={s.accent} bg={s.bg} lines={lines} />
        }
        // Freistehendes Display auf zwei Pfosten (ohne Rückwand)
        const y = s.y + 1.0
        return (
          <group key={i} position={[s.x, 0, -6.4]}>
            <WallScreen position={[0, y, 0]} w={s.w} h={s.h} title={s.title} accent={s.accent} bg={s.bg} lines={lines} />
            {[-1, 1].map((k) => (
              <mesh key={k} position={[k * (s.w / 2 - 0.15), (y - s.h / 2) / 2, -0.05]}>
                <boxGeometry args={[0.1, y - s.h / 2, 0.1]} />
                <meshStandardMaterial color="#20263a" />
              </mesh>
            ))}
          </group>
        )
      })}
      {(floor.pods || []).map((p, i) => <Pod key={i} {...p} />)}
      {floor.props.map((d, i) => <Prop key={i} d={d} pal={pal} />)}
      {floor.desks.map((d, i) => (
        <Desk key={i} position={[d.x, 0, d.z]} monitors={d.monitors} terminal={d.terminal} status={d.agent[2]} />
      ))}

      {floor.desks.map((d) => {
        const i = n++
        return (
          <Character key={`d${i}`} name={d.agent[0]} role={d.agent[1]} status={d.agent[2]} pose="sit"
            position={[d.x, 0, d.z + 0.95]} rotation={Math.PI}
            shirt={SHIRTS[i % 8]} hair={HAIR[i % 6]} skin={i} phase={i * 0.7} />
        )
      })}
      {floor.seated.map((s) => {
        const i = n++
        return (
          <Character key={`s${i}`} name={s.name} role={s.role} status={s.status} pose={s.pose}
            position={s.p} rotation={s.r} shirt={SHIRTS[(i + 3) % 8]} hair={HAIR[(i + 2) % 6]} skin={i + 1} phase={i} />
        )
      })}
      {floor.walkers.map((w) => {
        const i = n++
        return (
          <Character key={`w${i}`} name={w.name} role={w.role} status={w.status} pose="walk" path={w.path} speed={w.speed}
            position={[w.path[0][0], 0, w.path[0][1]]} shirt={SHIRTS[(i + 5) % 8]} hair={HAIR[(i + 1) % 6]} skin={i + 2} phase={i * 2} />
        )
      })}
    </group>
  )
}
