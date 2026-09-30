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

// Arbeitsplatz: Schreibtisch, Monitor(e), Stuhl. Blick nach -z (zur Rückwand).
export function Desk({ position, active = true, dual = false, accent = C.screen }) {
  const glow = useRef()
  useFrame(({ clock }) => {
    if (glow.current && active) glow.current.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 3 + position[0]) * 0.25
  })
  const screenMat = (
    <meshStandardMaterial ref={glow} color={active ? accent : C.screenOff} emissive={active ? accent : '#000'} emissiveIntensity={0.8} />
  )
  return (
    <group position={position}>
      <Box p={[0, 0.72, 0]} s={[1.7, 0.08, 0.85]} c={C.wood} />
      <Box p={[-0.75, 0.36, 0]} s={[0.08, 0.72, 0.75]} c={C.woodDark} />
      <Box p={[0.75, 0.36, 0]} s={[0.08, 0.72, 0.75]} c={C.woodDark} />
      {(dual ? [-0.42, 0.42] : [0]).map((x) => (
        <group key={x} position={[x, 0.76, -0.22]}>
          <Box p={[0, 0.06, 0]} s={[0.12, 0.12, 0.12]} c={C.metal} />
          <Box p={[0, 0.36, 0]} s={[0.72, 0.44, 0.05]} c={C.metal} />
          <mesh position={[0, 0.36, 0.03]}>
            <boxGeometry args={[0.64, 0.36, 0.01]} />
            {screenMat}
          </mesh>
        </group>
      ))}
      <Box p={[0, 0.77, 0.15]} s={[0.5, 0.03, 0.18]} c="#f4f4f4" />
      <Chair position={[0, 0, 0.95]} />
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
      <Html position={[0, 2.8, 0.2]} center style={{ pointerEvents: 'none' }}>
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
      <Html position={[0, 1.6, -0.4]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#111', background: C.orange, padding: '3px 12px', borderRadius: 6, fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>AGENTENBANK</div>
      </Html>
    </group>
  )
}

// Zentrales Display an der Rückwand (Canvas-Textur, wird jede Sekunde aktualisiert)
export function HQDisplay({ position, stats }) {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 1024
    cv.height = 512
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  useEffect(() => {
    const cv = tex.image
    const g = cv.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 1024, 512)
    grad.addColorStop(0, '#0d1b2e')
    grad.addColorStop(1, '#173056')
    g.fillStyle = grad
    g.fillRect(0, 0, 1024, 512)
    g.strokeStyle = C.teal
    g.lineWidth = 8
    g.strokeRect(8, 8, 1008, 496)
    g.fillStyle = C.orange
    g.font = '800 68px system-ui, sans-serif'
    g.fillText('HERKULES HQ', 48, 105)
    g.fillStyle = '#e8fff9'
    g.font = '600 44px system-ui, sans-serif'
    g.fillText(`${stats.total} Agenten online`, 48, 185)
    const rows = [
      [`${stats.working} arbeiten`, '#3ddc84'],
      [`${stats.waiting} warten`, '#ffc94d'],
      [`${stats.available} verfügbar`, '#dfe6f2'],
      [`${stats.meeting} Meeting`, '#4da3ff'],
      [`${stats.error} Fehler`, '#ff5c5c'],
    ]
    let x = 48
    g.font = '600 36px system-ui, sans-serif'
    rows.forEach(([txt, col], i) => {
      const y = 260 + Math.floor(i / 3) * 56
      if (i === 3) x = 48
      g.fillStyle = col
      g.fillText(txt, x, y)
      x += g.measureText(txt).width + 44
    })
    g.fillStyle = '#9fb3d1'
    g.font = '500 32px system-ui, sans-serif'
    g.fillText('Heute: 23 Tasks abgeschlossen', 48, 400)
    g.fillText('6 Freigaben erforderlich', 48, 448)
    tex.needsUpdate = true
  }, [stats, tex])
  return (
    <group position={position}>
      <Box p={[0, 0, 0]} s={[5.6, 2.9, 0.15]} c={C.metal} />
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[5.4, 2.7]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}
