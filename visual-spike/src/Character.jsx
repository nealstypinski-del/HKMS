import { useRef, useState } from 'react'
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
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
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
      const x = a[0] + (b[0] - a[0]) * st.t
      const z = a[1] + (b[1] - a[1]) * st.t
      root.current.position.set(x, 0, z)
      root.current.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1])
      const sw = Math.sin(t * 8) * 0.6
      legL.current.rotation.x = sw
      legR.current.rotation.x = -sw
      armL.current.rotation.x = -sw
      armR.current.rotation.x = sw
      body.current.position.y = Math.abs(Math.sin(t * 8)) * 0.05
    } else if (sitting) {
      // Tippen: Arme wippen leicht, Kopf minimal in Bewegung
      const typing = status === 'working' ? 1 : 0.15
      armL.current.rotation.x = -1.2 + Math.sin(t * 14) * 0.12 * typing
      armR.current.rotation.x = -1.2 + Math.sin(t * 14 + 1.7) * 0.12 * typing
      body.current.position.y = Math.sin(t * 2) * 0.008
    } else {
      body.current.position.y = Math.sin(t * 1.6) * 0.02
      armL.current.rotation.x = Math.sin(t * 1.3) * 0.08
      armR.current.rotation.x = -Math.sin(t * 1.3) * 0.08
    }
  })

  const legY = sitting ? 0.42 : 0.42
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      <group ref={body} position={[0, sitting ? -0.02 : 0, 0]}>
        {/* Beine */}
        <group ref={legL} position={[-0.11, legY, 0]} rotation={[sitting ? -1.45 : 0, 0, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <boxGeometry args={[0.14, 0.42, 0.16]} />
            <meshStandardMaterial color="#2c3350" flatShading />
          </mesh>
        </group>
        <group ref={legR} position={[0.11, legY, 0]} rotation={[sitting ? -1.45 : 0, 0, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <boxGeometry args={[0.14, 0.42, 0.16]} />
            <meshStandardMaterial color="#2c3350" flatShading />
          </mesh>
        </group>
        {/* Torso */}
        <mesh position={[0, 0.66, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.28, 4, 8]} />
          <meshStandardMaterial color={shirt} flatShading />
        </mesh>
        {/* Arme */}
        <group ref={armL} position={[-0.27, 0.8, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <boxGeometry args={[0.1, 0.34, 0.1]} />
            <meshStandardMaterial color={shirt} flatShading />
          </mesh>
        </group>
        <group ref={armR} position={[0.27, 0.8, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <boxGeometry args={[0.1, 0.34, 0.1]} />
            <meshStandardMaterial color={shirt} flatShading />
          </mesh>
        </group>
        {/* Kopf */}
        <mesh position={[0, 1.13, 0]} castShadow>
          <sphereGeometry args={[0.27, 12, 10]} />
          <meshStandardMaterial color={SKIN[skin % SKIN.length]} flatShading />
        </mesh>
        <mesh position={[0, 1.26, -0.02]} castShadow>
          <sphereGeometry args={[0.285, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hair} flatShading />
        </mesh>
        {/* Augen */}
        <mesh position={[-0.09, 1.15, 0.24]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.09, 1.15, 0.24]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Statusring über dem Kopf */}
        <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.03, 6, 16]} />
          <meshBasicMaterial color={s.color} />
        </mesh>
        <Html position={[0, 1.8, 0]} center zIndexRange={[10, 0]}>
          <div
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            style={{
              background: 'rgba(11,16,32,.85)', color: '#fff', padding: '2px 8px', borderRadius: 999,
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
              border: `1px solid ${s.color}`, cursor: 'default', position: 'relative', zIndex: hover ? 5 : 1,
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
