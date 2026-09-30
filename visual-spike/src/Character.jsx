import { labelRoot } from './labelRoot.js'
import { useMemo, useRef, useState } from 'react'
import { Model } from './Assets.jsx'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { STATUS } from './theme.js'

const SKIN = ['#f1c9a5', '#e0a97f', '#c68863', '#8d5a3b', '#f7d9bf']

// Einfache Low-Poly-Figur: großer Kopf, kapselförmiger Körper, wenige Materialien.
// pose: 'sit' | 'stand' | 'walk'; bei 'walk' läuft die Figur entlang von `path` (Array aus [x,z]).
export default function Character({
  position = [0, 0, 0], rotation = 0, shirt = '#ff8a3d', hair = '#2b2118', skin = 0,
  name = 'Agent', role = '', status = 'available', pose = 'stand', path, speed = 1.2, phase = 0,
}) {
  const root = useRef()
  const [hover, setHover] = useState(false)
  const body = useRef()
  const seg = useRef({ i: 0, t: 0 })
  const sitting = pose === 'sit'
  const s = STATUS[status]

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase
    if (pose === 'walk' && path?.length > 1) {
      const st = seg.current
      const a = path[st.i]
      const b = path[(st.i + 1) % path.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      st.t += (dt * speed) / len
      if (st.t >= 1) { st.t = 0; st.i = (st.i + 1) % path.length }
      root.current.position.set(a[0] + (b[0] - a[0]) * st.t, 0, a[1] + (b[1] - a[1]) * st.t)
      root.current.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1])
      body.current.position.y = Math.abs(Math.sin(t * 8)) * 0.06
      body.current.rotation.z = Math.sin(t * 8) * 0.06
    } else if (sitting) {
      body.current.position.y = Math.sin(t * 2) * 0.008 + (status === 'working' ? Math.abs(Math.sin(t * 14)) * 0.006 : 0)
    } else {
      body.current.position.y = Math.sin(t * 1.6) * 0.02
    }
  })

  const colors = useMemo(() => ({ shirt, hair, skin: SKIN[skin % SKIN.length] }), [shirt, hair, skin])
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      <group ref={body}>
        <Model name={sitting ? 'character_sit' : 'character'} colors={colors} />
        {/* Statusring über dem Kopf */}
        <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
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
            {name}
            {hover && role ? <span style={{ opacity: 0.7, fontWeight: 400 }}> · {role} · {s.label}</span> : null}
          </div>
        </Html>
      </group>
    </group>
  )
}
