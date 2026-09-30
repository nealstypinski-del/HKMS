import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import Floor from './Floor.jsx'
import Environment from './Environment.jsx'
import Player from './Player.jsx'
import { Facade, LiteFloor, Signs } from './Building.jsx'
import { FLOORS, floorStats } from './data/floors.js'
import { STATUS } from './theme.js'
import { labelRoot } from './labelRoot.js'
import { DOOR_HALF, ELEVATOR_EXIT, ESC, FLOOR_H, HALF_X, HALF_Z, OUTDOOR } from './world.js'
import { EscalatorPair } from './Escalator.jsx'
import Effects from './Effects.jsx'

// Kollisionsboxen [xmin, xmax, zmin, zmax] für Haus, Etage und Außenwelt
function buildColliders(floor, idx) {
  const b = []
  const W = HALF_X + 0.45
  b.push([-W, W, -HALF_Z - 0.4, -HALF_Z + 0.05], [-W, -HALF_X + 0.05, -HALF_Z, HALF_Z], [HALF_X - 0.05, W, -HALF_Z, HALF_Z])
  if (idx === 0) b.push([-W, -DOOR_HALF, HALF_Z - 0.05, HALF_Z + 0.4], [DOOR_HALF, W, HALF_Z - 0.05, HALF_Z + 0.4])
  else b.push([-W, W, HALF_Z - 0.05, HALF_Z + 0.4])
  b.push([-9.4, -8.55, 3.1, 4.9]) // Aufzug
  floor.desks.forEach((d) => b.push([d.x - 0.95, d.x + 0.95, d.z - 0.5, d.z + 1.35]))
  ;(floor.pods || []).forEach((p) => {
    if (p.type === 'wall') b.push([p.x - p.w / 2, p.x + p.w / 2, p.z - 0.3, p.z + 0.3])
    else b.push([p.x - p.w / 2, p.x - 0.8, p.z - 0.1, p.z + 0.1], [p.x + 0.8, p.x + p.w / 2, p.z - 0.1, p.z + 0.1])
  })
  floor.props.forEach((d) => {
    const [x, , z] = d.p
    if (d.t === 'table') b.push([x - d.size[0] / 2, x + d.size[0] / 2, z - d.size[2] / 2, z + d.size[2] / 2])
    if (d.t === 'sofa') { const sw = Math.abs(Math.sin(d.r || 0)) > 0.5; const hw = (d.width || 2.2) / 2; b.push(sw ? [x - 0.5, x + 0.5, z - hw, z + hw] : [x - hw, x + hw, z - 0.5, z + 0.5]) }
    if (d.t === 'bench') b.push([x - 3.1, x + 3.1, z - 0.5, z + 0.5])
    if (d.t === 'kitchen') b.push([x - 2.2, x + 2.2, z - 0.5, z + 0.5], [x - 1.4, x + 1.4, z + 1.6, z + 2.8])
    if (d.t === 'rack') b.push([x - 0.5, x + 0.5, z - 0.5, z + 0.5])
    if (d.t === 'plant') b.push([x - 0.4, x + 0.4, z - 0.4, z + 0.4])
    if (d.t === 'model' && d.c) { const sw = Math.abs(Math.sin(d.r || 0)) > 0.5; const [hx, hz] = sw ? [d.c[1], d.c[0]] : d.c; b.push([x - hx, x + hx, z - hz, z + hz]) }
  })
  if (idx < 3) b.push([ESC.xUp - 0.55, ESC.xDown + 0.55, ESC.z0 + 0.05, ESC.z1 - 0.05]) // Rolltreppe nach oben
  OUTDOOR.trees.forEach(([x, z, s]) => b.push([x - 0.4 * s, x + 0.4 * s, z - 0.4 * s, z + 0.4 * s]))
  OUTDOOR.bollards.forEach(([x, z]) => b.push([x - 0.1, x + 0.1, z - 0.1, z + 0.1]))
  b.push([OUTDOOR.sofa[0] - 1.1, OUTDOOR.sofa[0] + 1.1, OUTDOOR.sofa[1] - 0.5, OUTDOOR.sofa[1] + 0.5])
  b.push([OUTDOOR.bench[0] - 1.3, OUTDOOR.bench[0] + 1.3, OUTDOOR.bench[1] - 0.4, OUTDOOR.bench[1] + 0.4])
  return b
}

const Btn = ({ on, color, children, ...p }) => (
  <button {...p} style={{
    background: on ? color : 'rgba(11,16,32,.85)', color: on ? '#111' : '#fff', border: `1px solid ${color}`,
    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
  }}>{children}</button>
)

export default function App() {
  const [idx, setIdx] = useState(0)
  const [inside, setInside] = useState(false)
  const [spawn, setSpawn] = useState({ x: 0, z: 17, face: Math.PI, key: 0 })
  const [rideTo, setRideTo] = useState(null)
  const controls = useRef()
  const controlsRef = controls
  const keysRef = useRef({})
  const autoRef = useRef({ target: null, run: false })
  const posRef = useRef(null)
  const capture = typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture')
  const floor = FLOORS[idx]
  const pal = floor.palette
  const stats = useMemo(() => floorStats(floor), [floor])
  const colliders = useMemo(() => buildColliders(floor, idx), [floor, idx])
  const shown = inside ? Math.max(idx, rideTo ?? idx) + 1 : FLOORS.length
  const topY = FLOORS.length * FLOOR_H

  const goFloorRef = useRef(() => {})
  const goFloor = (i) => {
    setIdx(i)
    setSpawn({ x: ELEVATOR_EXIT[0], z: ELEVATOR_EXIT[1], face: Math.PI / 2, key: spawn.key + 1 })
    setInside(true)
  }
  goFloorRef.current = goFloor
  const overview = () => {
    const c = controls.current
    if (!c) return
    c.object.position.set(inside ? 16 : 26, (inside ? idx * FLOOR_H : 0) + (inside ? 17 : 22), inside ? 20 : 34)
    c.target.set(0, (inside ? idx * FLOOR_H : 4), 0)
  }

  return (
    <>
      <div ref={(el) => { labelRoot.current = el }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }} />
      <Canvas shadows dpr={[1, 2]} frameloop={capture ? 'never' : 'always'} gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ advance, scene }) => { window.__hkms = {
          scene,
          advance,
          floor: (i) => goFloorRef.current(i),
          go: (x, z, run = false) => { autoRef.current.target = [x, z]; autoRef.current.run = run },
          arrived: () => !autoRef.current.target,
          pos: () => posRef.current && [posRef.current.x, posRef.current.y, posRef.current.z],
          cam: (px, py, pz, tx, ty, tz) => { const c = controlsRef.current; c.object.position.set(px, py, pz); c.target.set(tx, ty, tz); c.update() },
        } }} camera={{ position: [12, 9, 40], fov: 42, near: 0.1, far: 600 }}>
        <color attach="background" args={['#070b1c']} />
        <fog attach="fog" args={['#070b1c', 90, 260]} />
        <Stars radius={220} depth={60} count={3000} factor={5} fade />
        <hemisphereLight args={['#b9c8ff', '#4a3f4a', 0.75]} />
        <directionalLight
          position={[18, 40, 26]} intensity={1.7} castShadow
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-34} shadow-camera-right={34}
          shadow-camera-top={34} shadow-camera-bottom={-34} shadow-camera-near={1} shadow-camera-far={120} shadow-bias={-0.0004}
        />
        <Environment />
        <Facade top={inside ? shown * FLOOR_H : topY} hideFront={inside} />
        <Signs showRoof={!inside} showDoor={!inside} topY={topY} />
        {!inside && (
          <mesh position={[0, topY + 0.15, 0]}>
            <boxGeometry args={[HALF_X * 2 + 0.6, 0.3, HALF_Z * 2 + 0.6]} />
            <meshStandardMaterial color="#1c2234" />
          </mesh>
        )}
        {FLOORS.slice(0, shown).map((f, i) => (
          <group key={f.id} position={[0, i * FLOOR_H, 0]}>
            {i === idx ? <Floor floor={f} stats={stats} /> : <LiteFloor floor={f} />}
            {i < FLOORS.length - 1 && <EscalatorPair />}
          </group>
        ))}
        <Player
          y={idx * FLOOR_H} floorIdx={idx} colliders={colliders} controlsRef={controls} spawn={spawn} onInside={setInside}
          keysRef={keysRef} autoRef={autoRef} posRef={posRef}
          onRide={(from, to) => setRideTo(to)}
          onRideDone={(to) => { setIdx(to); setRideTo(null) }}
        />
        <Effects ssao={!capture} />
        <OrbitControls
          ref={controls} target={[0, 3, 12]} enablePan={false} minDistance={3.5} maxDistance={45}
          minPolarAngle={0.25} maxPolarAngle={1.45}
        />
      </Canvas>

      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 800, letterSpacing: 3, color: pal.trim, fontSize: 18 }}>HERKULES KI-ZENTRALE</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
          {inside ? floor.title : 'Vor dem Haus'} · Visual Spike 0.5
        </div>
        {inside && (
          <div style={{ marginTop: 12, display: 'grid', gap: 5 }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 10, background: v.color }} />
                {v.label}: {stats[k]}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: '#fff', fontSize: 12, opacity: 0.8, textAlign: 'right' }}>Aufzug · Etage wählen</div>
        <Btn on={false} color="#9fb0d4" onClick={overview}>Übersicht</Btn>
        {[...FLOORS].reverse().map((f) => {
          const i = FLOORS.indexOf(f)
          return <Btn key={f.id} on={inside && i === idx} color={f.palette.trim} onClick={() => goFloor(i)}>{f.tab}</Btn>
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 14, left: 16, color: '#9fb0d4', fontSize: 12, pointerEvents: 'none' }}>
        W A S D oder Pfeiltasten: laufen · Umschalt: rennen · Maus ziehen: Kamera drehen · Mausrad: zoomen · Rolltreppe rechts im Haus betreten (Aufzug: Etagenwahl)
      </div>
    </>
  )
}
