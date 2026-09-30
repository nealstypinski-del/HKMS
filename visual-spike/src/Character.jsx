import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Rig } from './Assets.jsx'
import { labelRoot } from './labelRoot.js'
import { STATUS } from './theme.js'

const SKIN = ['#f1c9a5', '#e0a97f', '#c68863', '#8d5a3b', '#f7d9bf']
const rnd = (a, b) => a + Math.random() * (b - a)

// Figur mit Skelett und Animationen (Idle, Walk, SitIdle, SitType).
// pose: 'sit' | 'stand' | 'walk'. Bei 'walk' läuft die Figur entlang von `path` (Array aus [x,z]).
// `sim` (nur Schreibtisch-Figuren): { route: [[x,z],...] Weg vom Stuhl zum Kaffeeautomaten, wait: [min,max], stay: [min,max] }
// dann steht die Figur nach einiger Zeit auf, holt Kaffee und setzt sich wieder.
export default function Character({
  position = [0, 0, 0], rotation = 0, shirt = '#ff8a3d', hair = '#2b2118', skin = 0,
  name = 'Agent', role = '', status = 'available', pose = 'stand', path, speed = 1.3, phase = 0, sim,
}) {
  const root = useRef()
  const seg = useRef({ i: 0, t: 0 })
  const st = useRef({
    mode: pose === 'walk' ? 'path' : pose === 'sit' ? 'sit' : 'stand',
    timer: sim ? rnd(sim.wait[0], sim.wait[1]) * (0.3 + Math.random()) : 0,
    idx: 0, x: position[0], z: position[2], face: rotation,
  })
  const [hover, setHover] = useState(false)
  const [clip, setClip] = useState(pose === 'walk' ? 'Walk' : pose === 'sit' ? (status === 'working' ? 'SitType' : 'SitIdle') : 'Idle')
  const [icon, setIcon] = useState('')
  const colors = useMemo(() => ({ shirt, hair, skin: SKIN[skin % SKIN.length] }), [shirt, hair, skin])
  const s = STATUS[status]

  const setMode = (m) => {
    const S = st.current
    S.mode = m
    if (m === 'sit') { setClip(status === 'working' ? 'SitType' : 'SitIdle'); setIcon('') }
    else if (m === 'stay') { setClip('Idle'); setIcon('☕') }
    else { setClip('Walk'); setIcon('') }
  }

  const moveToward = (S, tx, tz, dt, sp) => {
    const dx = tx - S.x
    const dz = tz - S.z
    const d = Math.hypot(dx, dz)
    if (d < 0.05) return true
    const step = Math.min(d, sp * dt)
    S.x += (dx / d) * step
    S.z += (dz / d) * step
    let da = Math.atan2(dx, dz) - S.face
    da = Math.atan2(Math.sin(da), Math.cos(da))
    S.face += da * Math.min(1, dt * 10)
    return d - step < 0.05
  }

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const S = st.current
    const g = root.current
    if (S.mode === 'path' && path?.length > 1) {
      const a = path[seg.current.i]
      const b = path[(seg.current.i + 1) % path.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      seg.current.t += (dt * speed) / len
      if (seg.current.t >= 1) { seg.current.t = 0; seg.current.i = (seg.current.i + 1) % path.length }
      const A = path[seg.current.i]
      const B = path[(seg.current.i + 1) % path.length]
      S.x = A[0] + (B[0] - A[0]) * seg.current.t
      S.z = A[1] + (B[1] - A[1]) * seg.current.t
      S.face = Math.atan2(B[0] - A[0], B[1] - A[1])
    } else if (sim) {
      const route = sim.route
      if (S.mode === 'sit') {
        S.timer -= dt
        if (S.timer <= 0) { S.idx = 0; setMode('out') }
      } else if (S.mode === 'out') {
        if (moveToward(S, route[S.idx][0], route[S.idx][1], dt, 1.35)) {
          S.idx++
          if (S.idx >= route.length) { S.timer = rnd(sim.stay[0], sim.stay[1]); S.face = sim.face; setMode('stay') }
        }
      } else if (S.mode === 'stay') {
        S.timer -= dt
        if (S.timer <= 0) { S.idx = route.length - 2; setMode('back') }
      } else if (S.mode === 'back') {
        if (S.idx < 0) {
          S.x = position[0]; S.z = position[2]; S.face = rotation
          S.timer = rnd(sim.wait[0], sim.wait[1])
          setMode('sit')
        } else if (moveToward(S, route[S.idx][0], route[S.idx][1], dt, 1.35)) S.idx--
      }
      if (S.mode === 'sit') { S.x = position[0]; S.z = position[2]; S.face = rotation }
    }
    g.position.set(S.x, position[1], S.z)
    g.rotation.y = S.face
  })

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      <Rig colors={colors} clip={clip} phase={phase} speed={clip === 'Walk' ? speed / 1.3 : 1} />
      <mesh position={[0, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.03, 6, 16]} />
        <meshBasicMaterial color={s.color} />
      </mesh>
      <Html portal={labelRoot} position={[0, 1.95, 0]} center zIndexRange={[10, 0]}>
        <div
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          style={{
            background: 'rgba(11,16,32,.85)', color: '#fff', padding: '2px 8px', borderRadius: 999,
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
            border: `1px solid ${s.color}`, cursor: 'default', pointerEvents: 'auto', position: 'relative', zIndex: hover ? 5 : 1,
          }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: s.color, display: 'inline-block' }} />
          {name}{icon ? ` ${icon}` : ''}
          {hover && role ? <span style={{ opacity: 0.7, fontWeight: 400 }}> · {role} · {s.label}</span> : null}
        </div>
      </Html>
    </group>
  )
}
