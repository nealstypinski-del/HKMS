import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import Character from './Character.jsx'
import { AgentBench, Desk, Elevator, HQDisplay, Kitchen, Plant, Sofa, Table } from './Furniture.jsx'
import { C, STATUS } from './theme.js'

const SHIRTS = ['#ff8a3d', '#2fd6c0', '#5b6ee1', '#e15b7a', '#f2c94c', '#8e6bd8', '#3aa76d', '#e8e8e8']
const HAIR = ['#2b2118', '#6b4423', '#c9a24a', '#1c1c1c', '#a33b2a', '#5a5a5a']

// Schreibtischreihen: 3 Reihen zu je 4 Plätzen
const DESK_X = [-7, -4.6, -2.2, 0.2]
const DESK_Z = [-3.6, -0.6, 2.4]

const DESK_AGENTS = [
  ['Lena', 'Lead Research', 'working'], ['Tom', 'Lead Research', 'working'], ['Mira', 'Employer Research', 'working'], ['Jan', 'Sales', 'waiting'],
  ['Sofia', 'Sales', 'working'], ['Ali', 'Outreach', 'working'], ['Nora', 'Customer Success', 'waiting'], ['Ben', 'Recruiting Content', 'working'],
  ['Kai', 'Codex Developer', 'working'], ['Ida', 'Claude Developer', 'working'], ['Paul', 'Reviewer', 'error'], ['Emma', 'QA', 'waiting'],
]
const BENCH_AGENTS = [['Max', 'Research'], ['Zoe', 'Sales'], ['Leo', 'Trend Scout'], ['Yara', 'Redaktion']]
const BENCH_X = [-5.2, -3.9, -2.1, -0.8]

const WALKERS = [
  { name: 'Finn', role: 'Trend Scout', status: 'working', path: [[2.2, 4.1], [2.2, -4.15], [6.6, -4.15], [2.2, -4.15]], speed: 1.3 },
  { name: 'Ruby', role: 'Creative', status: 'working', path: [[3, 4.1], [-6.4, 4.1]], speed: 1.1 },
  { name: 'Omar', role: 'Partnerships', status: 'working', path: [[7.2, 0.3], [3.8, 0.3], [3.8, 1.6], [7.2, 1.6]], speed: 0.9 },
]

function useStats() {
  return useMemo(() => {
    const all = [
      ...DESK_AGENTS.map((a) => a[2]),
      ...BENCH_AGENTS.map(() => 'available'),
      ...WALKERS.map((w) => w.status),
      'meeting', 'meeting', 'meeting',
    ]
    const count = (k) => all.filter((s) => s === k).length
    return { total: all.length, working: count('working'), waiting: count('waiting'), available: count('available'), meeting: count('meeting'), error: count('error') }
  }, [])
}

function Building({ stats }) {
  return (
    <group>
      {/* Runde Plattform */}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <cylinderGeometry args={[15, 15.4, 0.7, 64]} />
        <meshStandardMaterial color={C.platform} flatShading />
      </mesh>
      <mesh position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[15, 0.09, 8, 96]} />
        <meshStandardMaterial color={C.platformRim} emissive={C.platformRim} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[13.6, 0.04, 8, 96]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={1.2} />
      </mesh>

      {/* Boden, Rückwand, Seitenwand */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[18, 0.2, 12]} />
        <meshStandardMaterial color={C.floor} />
      </mesh>
      {/* Zonen: Arbeitsbereich, Küche, Lounge */}
      <mesh position={[-3.6, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9.6, 10.6]} />
        <meshStandardMaterial color={C.floorAlt} />
      </mesh>
      <mesh position={[5.5, 0.006, -3.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.2, 4.6]} />
        <meshStandardMaterial color="#c9d6d9" />
      </mesh>
      <mesh position={[5.6, 0.007, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.9, 40]} />
        <meshStandardMaterial color="#7d8bf0" />
      </mesh>
      <mesh position={[-3, 0.006, 5.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 1.9]} />
        <meshStandardMaterial color="#ffd0a8" />
      </mesh>

      <mesh position={[0, 2, -6.1]} castShadow receiveShadow>
        <boxGeometry args={[18.4, 4, 0.2]} />
        <meshStandardMaterial color={C.wall} />
      </mesh>
      <mesh position={[0, 0.15, -5.95]}>
        <boxGeometry args={[18, 0.3, 0.1]} />
        <meshStandardMaterial color={C.orange} />
      </mesh>
      <mesh position={[-9.1, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 4, 12.4]} />
        <meshStandardMaterial color={C.wall} />
      </mesh>
      <mesh position={[-8.95, 0.15, 0]}>
        <boxGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color={C.orange} />
      </mesh>
      {/* Fensterband Rückwand */}
      <mesh position={[5.5, 2.6, -5.98]}>
        <boxGeometry args={[6, 1.3, 0.05]} />
        <meshStandardMaterial color="#9fdcff" emissive="#9fdcff" emissiveIntensity={0.25} />
      </mesh>

      <HQDisplay position={[-3, 2.4, -5.9]} stats={stats} />
      <Elevator position={[-8.8, 0, 4]} rotation={Math.PI / 2} />
      <Kitchen position={[5.5, 0, -5.4]} />
      <AgentBench position={[-3, 0, 5.3]} />

      {/* Lounge */}
      <Sofa position={[5.6, 0, 5.3]} rotation={Math.PI} color={C.sofa} />
      <Sofa position={[8.3, 0, 3.2]} rotation={-Math.PI / 2} color={C.sofaAlt} width={2.0} />
      <Table position={[5.6, 0, 3.2]} size={[1.4, 0.06, 0.8]} />
      <Plant position={[8.2, 0, 5.3]} scale={1.3} />
      <Plant position={[-8.4, 0, -5.4]} scale={1.4} />
      <Plant position={[8.4, 0, -0.6]} scale={1.1} />
      <Plant position={[2.6, 0, 5.4]} />

      {/* Schreibtische */}
      {DESK_Z.map((z, r) =>
        DESK_X.map((x, c) => {
          const a = DESK_AGENTS[r * 4 + c]
          return <Desk key={`${r}-${c}`} position={[x, 0, z]} dual={r === 2} active={a[2] !== 'error'} accent={a[2] === 'waiting' ? '#ffc94d' : C.screen} />
        }),
      )}
    </group>
  )
}

function People() {
  return (
    <group>
      {DESK_Z.map((z, r) =>
        DESK_X.map((x, c) => {
          const i = r * 4 + c
          const [name, role, status] = DESK_AGENTS[i]
          return (
            <Character key={name} name={name} role={role} status={status} pose="sit" position={[x, 0, z + 0.95]} rotation={Math.PI}
              shirt={SHIRTS[i % SHIRTS.length]} hair={HAIR[i % HAIR.length]} skin={i} phase={i * 0.7} />
          )
        }),
      )}
      {BENCH_AGENTS.map(([name, role], i) => (
        <Character key={name} name={name} role={role} status="available" pose="sit" position={[BENCH_X[i], 0, 5.35]}
          shirt={SHIRTS[(i + 3) % SHIRTS.length]} hair={HAIR[(i + 2) % HAIR.length]} skin={i + 1} phase={i} />
      ))}
      {WALKERS.map((w, i) => (
        <Character key={w.name} name={w.name} role={w.role} status={w.status} pose="walk" path={w.path} speed={w.speed}
          position={[w.path[0][0], 0, w.path[0][1]]} shirt={SHIRTS[(i + 5) % SHIRTS.length]} hair={HAIR[(i + 1) % HAIR.length]} skin={i + 2} phase={i * 2} />
      ))}
      {/* Meeting in der Lounge */}
      <Character name="Clara" role="Manager" status="meeting" pose="sit" position={[5.2, 0, 5.3]} rotation={0} shirt="#e15b7a" hair="#1c1c1c" skin={0} phase={1} />
      <Character name="Dio" role="Strategie" status="meeting" pose="sit" position={[6.1, 0, 5.3]} rotation={0} shirt="#3aa76d" hair="#6b4423" skin={3} phase={2} />
      <Character name="Sam" role="Design" status="meeting" pose="sit" position={[8.3, 0, 3.2]} rotation={-Math.PI / 2} shirt="#f2c94c" hair="#a33b2a" skin={2} phase={3} />
    </group>
  )
}

export default function App() {
  const stats = useStats()
  return (
    <>
      <Canvas shadows orthographic dpr={[1, 2]} camera={{ position: [17, 15, 17], zoom: 50, near: 0.1, far: 200 }}>
        <color attach="background" args={[C.bg]} />
        <hemisphereLight args={['#dfe9ff', '#5a4a3a', 0.9]} />
        <directionalLight
          position={[10, 16, 8]} intensity={1.9} castShadow
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14}
          shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} shadow-bias={-0.0004}
        />
        <pointLight position={[-3, 3.5, 0]} intensity={12} distance={12} color="#ffe2c2" />
        <Building stats={stats} />
        <People />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={30} blur={2.2} far={3} />
        <OrbitControls
          target={[0, 0, 0]} enablePan={false} minZoom={26} maxZoom={100}
          minPolarAngle={0.55} maxPolarAngle={1.25} minAzimuthAngle={0.1} maxAzimuthAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 800, letterSpacing: 3, color: C.orange, fontSize: 18 }}>HERKULES AI HQ</div>
        <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>Visual Spike 0.1 · Erdgeschoss · keine Businesslogik</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 5 }}>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: v.color }} />
              {v.label}: {stats[k]}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 16, color: '#8fa0c4', fontSize: 12, pointerEvents: 'none' }}>
        Ziehen: drehen · Scrollen: zoomen
      </div>
    </>
  )
}
