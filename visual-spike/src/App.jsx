import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, Stars } from '@react-three/drei'
import Floor from './Floor.jsx'
import { FLOORS, floorStats } from './data/floors.js'
import { STATUS } from './theme.js'
import { labelRoot } from './labelRoot.js'

function Platform({ pal }) {
  return (
    <group>
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <cylinderGeometry args={[15, 15.4, 0.7, 64]} />
        <meshStandardMaterial color={pal.platform} flatShading />
      </mesh>
      <mesh position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[15, 0.09, 8, 96]} />
        <meshStandardMaterial color={pal.trim} emissive={pal.trim} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[13.6, 0.04, 8, 96]} />
        <meshStandardMaterial color={pal.accent} emissive={pal.accent} emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}

export default function App() {
  const [idx, setIdx] = useState(0)
  const floor = FLOORS[idx]
  const pal = floor.palette
  const stats = useMemo(() => floorStats(floor), [floor])
  return (
    <>
      <div ref={(el) => { labelRoot.current = el }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }} />
      <Canvas shadows orthographic dpr={[1, 2]} camera={{ position: [17, 15, 17], zoom: 50, near: 0.1, far: 200 }}>
        <color attach="background" args={[pal.bg]} />
        <Stars radius={80} depth={30} count={1500} factor={3} fade />
        <hemisphereLight args={['#dfe9ff', '#5a4a3a', idx === 3 ? 1.5 : 0.9]} />
        <directionalLight
          position={[10, 16, 8]} intensity={idx === 3 ? 2.2 : 1.9} castShadow
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14}
          shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} shadow-bias={-0.0004}
        />
        <pointLight position={[-3, 3.5, 0]} intensity={12} distance={12} color="#ffe2c2" />
        <Platform pal={pal} />
        <Floor key={floor.id} floor={floor} stats={stats} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={30} blur={2.2} far={3} />
        <OrbitControls
          target={[0, 0, 0]} enablePan={false} minZoom={26} maxZoom={100}
          minPolarAngle={0.55} maxPolarAngle={1.25} minAzimuthAngle={0.1} maxAzimuthAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 800, letterSpacing: 3, color: pal.trim, fontSize: 18 }}>HERKULES AI HQ</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{floor.title} · Visual Spike 0.2</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 5 }}>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: v.color }} />
              {v.label}: {stats[k]}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...FLOORS].reverse().map((f) => {
          const i = FLOORS.indexOf(f)
          const on = i === idx
          return (
            <button key={f.id} onClick={() => setIdx(i)} style={{
              background: on ? f.palette.trim : 'rgba(11,16,32,.85)', color: on ? '#111' : '#fff', border: `1px solid ${f.palette.trim}`,
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
            }}>{f.tab}</button>
          )
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 16, color: '#8fa0c4', fontSize: 12, pointerEvents: 'none' }}>
        Ziehen: drehen · Scrollen: zoomen · Mausover auf Namen: Rolle und Status
      </div>
    </>
  )
}
