import { labelRoot } from './labelRoot.js'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { C } from './theme.js'

const Box = ({ p = [0, 0, 0], s = [1, 1, 1], c = '#fff', ...rest }) => (
  <mesh position={p} castShadow receiveShadow {...rest}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} flatShading />
  </mesh>
)

function useTerminalTexture(t) {
  return useMemo(() => {
    if (!t) return null
    const cv = document.createElement('canvas')
    cv.width = 320
    cv.height = 180
    const g = cv.getContext('2d')
    g.fillStyle = '#070b14'
    g.fillRect(0, 0, 320, 180)
    g.fillStyle = '#1b2438'
    g.fillRect(0, 0, 320, 22)
    ;['#ff5c5c', '#ffc94d', '#3ddc84'].forEach((c, i) => {
      g.fillStyle = c
      g.beginPath()
      g.arc(14 + i * 16, 11, 4, 0, Math.PI * 2)
      g.fill()
    })
    const col = { working: '#3ddc84', waiting: '#ffc94d', error: '#ff5c5c' }[t.state] || '#dfe6f2'
    g.font = 'bold 20px monospace'
    g.fillStyle = col
    g.fillText(`● ${t.state.toUpperCase()}`, 12, 50)
    g.font = '16px monospace'
    g.fillStyle = '#9fb3d1'
    g.fillText(`repo:   ${t.repo}`.slice(0, 34), 12, 80)
    g.fillText(`branch: ${t.branch}`.slice(0, 34), 12, 104)
    g.fillStyle = '#e8fff9'
    g.fillText(`> ${t.task}`.slice(0, 34), 12, 136)
    g.fillStyle = '#7cf0ff'
    g.fillText('$ _', 12, 164)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [t?.repo, t?.branch, t?.task, t?.state])
}

// Arbeitsplatz: Schreibtisch, 1 bis 3 Monitore, Stuhl. Blick nach -z (zur Rückwand).
// Mit `terminal` zeigen die Monitore einen Terminalzustand (repo, branch, task).
export function Desk({
  position, active = true, monitors = 1, accent = C.screen, wood = C.wood, woodDark = C.woodDark, chair = C.metal, terminal,
}) {
  const glow = useRef()
  const tex = useTerminalTexture(terminal)
  useFrame(({ clock }) => {
    if (glow.current && active) glow.current.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 3 + position[0]) * 0.25
  })
  const xs = monitors === 3 ? [-0.56, 0, 0.56] : monitors === 2 ? [-0.42, 0.42] : [0]
  const w = monitors === 3 ? 0.52 : 0.72
  return (
    <group position={position}>
      <Box p={[0, 0.72, 0]} s={[monitors === 3 ? 2.0 : 1.7, 0.08, 0.85]} c={wood} />
      <Box p={[monitors === 3 ? -0.95 : -0.75, 0.36, 0]} s={[0.08, 0.72, 0.75]} c={woodDark} />
      <Box p={[monitors === 3 ? 0.95 : 0.75, 0.36, 0]} s={[0.08, 0.72, 0.75]} c={woodDark} />
      {xs.map((x, i) => (
        <group key={x} position={[x, 0.76, -0.22]} rotation={[0, monitors === 3 ? -x * 0.25 : 0, 0]}>
          <Box p={[0, 0.06, 0]} s={[0.12, 0.12, 0.12]} c={C.metal} />
          <Box p={[0, 0.36, 0]} s={[w + 0.08, 0.44, 0.05]} c={C.metal} />
          <mesh position={[0, 0.36, 0.03]}>
            <boxGeometry args={[w, 0.36, 0.01]} />
            {tex ? (
              <meshBasicMaterial map={tex} toneMapped={false} />
            ) : (
              <meshStandardMaterial ref={i === 0 ? glow : undefined} color={active ? accent : C.screenOff} emissive={active ? accent : '#000'} emissiveIntensity={0.8} />
            )}
          </mesh>
        </group>
      ))}
      <Box p={[0, 0.77, 0.15]} s={[0.5, 0.03, 0.18]} c="#f4f4f4" />
      <Chair position={[0, 0, 0.95]} color={chair} />
    </group>
  )
}

export function Chair({ position = [0, 0, 0], rotation = 0, color = C.metal }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box p={[0, 0.42, 0]} s={[0.5, 0.07, 0.5]} c={color} />
      <Box p={[0, 0.75, 0.22]} s={[0.5, 0.6, 0.07]} c={color} />
      <Box p={[0, 0.2, 0]} s={[0.08, 0.4, 0.08]} c="#222" />
      <Box p={[0, 0.03, 0]} s={[0.5, 0.05, 0.5]} c="#222" />
    </group>
  )
}

export function Plant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.2, 0.5, 8]} />
        <meshStandardMaterial color="#e8e0d0" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.26) * 0.14, 0.75 + (i % 2) * 0.12, Math.sin(i * 1.26) * 0.14]} castShadow>
          <icosahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color={C.plant} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function Sofa({ position, rotation = 0, color = C.sofa, width = 2.2 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box p={[0, 0.25, 0]} s={[width, 0.5, 0.9]} c={color} />
      <Box p={[0, 0.7, -0.35]} s={[width, 0.55, 0.22]} c={color} />
      <Box p={[-width / 2 + 0.1, 0.5, 0]} s={[0.2, 0.5, 0.9]} c={color} />
      <Box p={[width / 2 - 0.1, 0.5, 0]} s={[0.2, 0.5, 0.9]} c={color} />
    </group>
  )
}

export function Table({ position, size = [1.6, 0.06, 0.9], color = C.wood, h = 0.5 }) {
  return (
    <group position={position}>
      <Box p={[0, h, 0]} s={size} c={color} />
      <Box p={[0, h / 2, 0]} s={[0.12, h, 0.12]} c={C.metal} />
    </group>
  )
}

// Aufzug mit sich öffnenden Türen
export function Elevator({ position, rotation = 0, label = 'AUFZUG' }) {
  const l = useRef()
  const r = useRef()
  useFrame(({ clock }) => {
    const open = (Math.sin(clock.elapsedTime * 0.5) + 1) / 2 > 0.6 ? 0.42 : 0
    l.current.position.x += (-0.25 - open - l.current.position.x) * 0.08
    r.current.position.x += (0.25 + open - r.current.position.x) * 0.08
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box p={[0, 1.3, 0]} s={[1.6, 2.6, 0.3]} c={C.metal} />
      <mesh position={[0, 1.1, 0.16]}>
        <boxGeometry args={[1.0, 2.0, 0.02]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffb066" emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={l} position={[-0.25, 1.1, 0.19]} castShadow>
        <boxGeometry args={[0.5, 2.0, 0.04]} />
        <meshStandardMaterial color="#c9ced8" metalness={0.5} roughness={0.4} flatShading />
      </mesh>
      <mesh ref={r} position={[0.25, 1.1, 0.19]} castShadow>
        <boxGeometry args={[0.5, 2.0, 0.04]} />
        <meshStandardMaterial color="#c9ced8" metalness={0.5} roughness={0.4} flatShading />
      </mesh>
      <Box p={[0, 2.35, 0.18]} s={[0.6, 0.14, 0.04]} c={C.orange} />
      <Html portal={labelRoot} position={[0, 2.8, 0.2]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#fff', background: '#1a2240', padding: '2px 8px', borderRadius: 6, fontSize: 12, letterSpacing: 2 }}>{label}</div>
      </Html>
    </group>
  )
}

// Küche: Zeile mit Schränken, Kochinsel, Kaffeemaschine
export function Kitchen({ position }) {
  return (
    <group position={position}>
      <Box p={[0, 0.45, 0]} s={[4.2, 0.9, 0.8]} c="#f3eee4" />
      <Box p={[0, 0.93, 0]} s={[4.3, 0.06, 0.9]} c="#2d3448" />
      <Box p={[0, 1.9, -0.1]} s={[4.2, 0.9, 0.5]} c={C.orange} />
      <Box p={[-1.2, 1.15, 0]} s={[0.35, 0.4, 0.3]} c="#222" />
      <mesh position={[-1.2, 1.4, 0]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#ff5c5c" emissive="#ff5c5c" emissiveIntensity={1} />
      </mesh>
      <Box p={[0, 0.5, 2.2]} s={[2.6, 1.0, 1.0]} c="#f3eee4" />
      <Box p={[0, 1.03, 2.2]} s={[2.7, 0.06, 1.1]} c={C.wood} />
      {[-0.9, 0, 0.9].map((x) => (
        <group key={x} position={[x, 0, 3.15]}>
          <Box p={[0, 0.3, 0]} s={[0.4, 0.06, 0.4]} c={C.teal} />
          <Box p={[0, 0.15, 0]} s={[0.06, 0.3, 0.06]} c="#222" />
          <Box p={[0, 0.6, 0.18]} s={[0.4, 0.55, 0.06]} c={C.teal} />
        </group>
      ))}
    </group>
  )
}

// Agentenbank: lange Bank, auf der verfügbare Agenten warten
export function AgentBench({ position }) {
  return (
    <group position={position}>
      <Box p={[0, 0.3, 0]} s={[6.2, 0.16, 0.9]} c={C.orange} />
      <Box p={[0, 0.7, -0.4]} s={[6.2, 0.7, 0.12]} c={C.orange} />
      {[-2.8, 0, 2.8].map((x) => <Box key={x} p={[x, 0.14, 0]} s={[0.14, 0.28, 0.7]} c={C.metal} />)}
      <Html portal={labelRoot} position={[0, 1.6, -0.4]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#111', background: C.orange, padding: '3px 12px', borderRadius: 6, fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>AGENTENBANK</div>
      </Html>
    </group>
  )
}

// Allgemeines Wanddisplay (Canvas-Textur). lines: [{ t, c, s }]
export function WallScreen({ position, w = 5.4, h = 2.7, title, lines = [], accent = C.orange, bg = '#0d1b2e' }) {
  const px = Math.round((1024 * h) / w)
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 1024
    cv.height = px
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [px])
  const key = JSON.stringify([title, lines, accent, bg])
  useEffect(() => {
    const cv = tex.image
    const g = cv.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 1024, px)
    grad.addColorStop(0, bg)
    grad.addColorStop(1, '#173056')
    g.fillStyle = grad
    g.fillRect(0, 0, 1024, px)
    g.strokeStyle = accent
    g.lineWidth = 8
    g.strokeRect(8, 8, 1008, px - 16)
    g.fillStyle = accent
    g.font = '800 72px system-ui, sans-serif'
    g.fillText(title, 48, 110)
    let y = 110
    lines.forEach((l) => {
      const size = l.s || 46
      y += size * 1.45 + 6
      g.fillStyle = l.c || '#e8fff9'
      g.font = `600 ${size}px system-ui, sans-serif`
      g.fillText(l.t, 48, y)
    })
    tex.needsUpdate = true
  }, [key, tex, px])
  return (
    <group position={position}>
      <Box p={[0, 0, 0]} s={[w + 0.2, h + 0.2, 0.15]} c={C.metal} />
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Partition({ position, len = 6, axis = 'z', color = C.orange }) {
  const s = axis === 'z' ? [0.12, 1.3, len] : [len, 1.3, 0.12]
  return (
    <group position={position}>
      <Box p={[0, 0.65, 0]} s={s} c="#f4f1ea" />
      <Box p={[0, 1.33, 0]} s={axis === 'z' ? [0.16, 0.08, len] : [len, 0.08, 0.16]} c={color} />
    </group>
  )
}

export function ServerRack({ position, rotation = 0 }) {
  const leds = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 7) % 5), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box p={[0, 1.1, 0]} s={[0.9, 2.2, 0.9]} c="#0f1424" />
      {leds.map((k, i) => (
        <mesh key={i} position={[-0.25 + (i % 3) * 0.25, 0.35 + Math.floor(i / 3) * 0.5, 0.46]}>
          <boxGeometry args={[0.12, 0.06, 0.02]} />
          <meshStandardMaterial color="#111" emissive={['#3ddc84', '#7cf0ff', '#ffc94d', '#3ddc84', '#ff5c5c'][k]} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}

// Ringlicht mit Kamera für das Video-/Reels-Studio; Blick nach lokal +z
export function RingLight({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box p={[0, 0.75, 0]} s={[0.06, 1.5, 0.06]} c="#222" />
      <Box p={[0, 0.03, 0]} s={[0.7, 0.05, 0.7]} c="#222" />
      <mesh position={[0, 1.55, 0]} castShadow>
        <torusGeometry args={[0.42, 0.05, 8, 24]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.6} />
      </mesh>
      <Box p={[0, 1.55, -0.05]} s={[0.22, 0.16, 0.3]} c="#111" />
      <Box p={[0, 1.55, 0.14]} s={[0.1, 0.1, 0.1]} c="#333" />
    </group>
  )
}

export function ZoneLabel({ position, text }) {
  return (
    <Html portal={labelRoot} position={position} center style={{ pointerEvents: 'none' }}>
      <div style={{ color: '#0b1020', opacity: 0.5, fontSize: 10, fontWeight: 800, letterSpacing: 2, whiteSpace: 'nowrap' }}>{text}</div>
    </Html>
  )
}
