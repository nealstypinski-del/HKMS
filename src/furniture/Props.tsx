import { Ball, Box, Cyl, RBox, type V3 } from '../world/primitives'
import { TextPanel } from '../world/TextPanel'

/** Bücherregal mit bunten Buchrücken. `yaw` 0 = Vorderseite nach +z. */
export function Bookshelf({ pos, yaw = 0, width = 1.1, seed = 1 }: { pos: V3; yaw?: number; width?: number; seed?: number }) {
  const cols = ['#c0563b', '#3f6fb0', '#e0b64a', '#4e9a6a', '#8a5aa8', '#e8e2d4', '#2f4058']
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Box pos={[0, 0.85, -0.02]} size={[width, 1.7, 0.36]} color="#8a5d38" />
      <Box pos={[0, 0.85, 0.02]} size={[width - 0.1, 1.62, 0.3]} color="#4a3524" />
      {[0.42, 0.82, 1.22, 1.6].map((y, r) => (
        <group key={y}>
          <Box pos={[0, y - 0.03, 0.02]} size={[width - 0.06, 0.04, 0.32]} color="#8a5d38" cast={false} />
          {Array.from({ length: Math.floor((width - 0.2) / 0.075) }, (_, i) => {
            const h = 0.22 + (((i * 7 + r * 3 + seed) % 5) / 5) * 0.14
            return <Box key={i} pos={[-(width - 0.2) / 2 + i * 0.075 + 0.04, y - 0.03 + h / 2 + 0.02, 0.03]} size={[0.062, h, 0.22]} color={cols[(i + r * 2 + seed) % cols.length] as string} cast={false} />
          })}
        </group>
      ))}
    </group>
  )
}

export function FileCabinet({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <RBox pos={[0, 0.6, 0]} size={[0.5, 1.2, 0.6]} color="#9aa4b8" />
      {[0.25, 0.6, 0.95].map((y) => (
        <group key={y}>
          <Box pos={[0, y, 0.305]} size={[0.44, 0.3, 0.012]} color="#b6bfd0" cast={false} />
          <Box pos={[0, y + 0.05, 0.32]} size={[0.16, 0.025, 0.02]} color="#3a4256" cast={false} />
        </group>
      ))}
    </group>
  )
}

export function Printer({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <RBox pos={[0, 0.45, 0]} size={[0.7, 0.9, 0.6]} color="#e4e7ef" />
      <Box pos={[0, 0.92, 0]} size={[0.72, 0.06, 0.62]} color="#3a4256" />
      <Box pos={[0, 0.6, 0.31]} size={[0.5, 0.04, 0.02]} color="#161b2b" cast={false} />
      <Box pos={[0.22, 0.8, 0.31]} size={[0.14, 0.08, 0.02]} color="#3ddc84" emissive="#3ddc84" ei={0.9} cast={false} />
      <Box pos={[0, 1.0, 0.1]} size={[0.4, 0.03, 0.3]} color="#ffffff" cast={false} />
    </group>
  )
}

export function WaterCooler({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <RBox pos={[0, 0.5, 0]} size={[0.38, 1.0, 0.38]} color="#e9edf5" />
      <Cyl pos={[0, 1.28, 0]} size={[0.15, 0.4, 0.15]} color="#8fd3f4" emissive="#8fd3f4" ei={0.15} />
      <Box pos={[0, 0.78, 0.2]} size={[0.16, 0.04, 0.03]} color="#3a8fd0" cast={false} />
      <Box pos={[0.06, 0.78, 0.2]} size={[0.04, 0.04, 0.03]} color="#d94b4b" cast={false} />
    </group>
  )
}

export function VendingMachine({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <RBox pos={[0, 1.0, 0]} size={[0.95, 2.0, 0.8]} color="#c8433a" />
      <Box pos={[-0.12, 1.15, 0.41]} size={[0.58, 1.3, 0.02]} color="#1b2233" cast={false} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => <Box key={`${r}${c}`} pos={[-0.3 + c * 0.18, 1.62 - r * 0.3, 0.42]} size={[0.11, 0.2, 0.02]} color={['#f2c94c', '#3ddc84', '#5b9bf0', '#ff8a3d'][(r + c) % 4] as string} emissive={['#f2c94c', '#3ddc84', '#5b9bf0', '#ff8a3d'][(r + c) % 4] as string} ei={0.5} cast={false} />),
      )}
      <Box pos={[0.33, 1.2, 0.41]} size={[0.2, 0.7, 0.02]} color="#3a4256" cast={false} />
      <Box pos={[0, 0.25, 0.41]} size={[0.6, 0.18, 0.02]} color="#161b2b" cast={false} />
    </group>
  )
}

export function WallClock({ pos, rot }: { pos: V3; rot?: V3 }) {
  return (
    <group position={pos} rotation={rot}>
      <Cyl pos={[0, 0, 0]} size={[0.3, 0.05, 0.3]} rot={[Math.PI / 2, 0, 0]} color="#20263a" />
      <TextPanel
        pos={[0, 0, 0.035]}
        size={[0.5, 0.5]}
        px={[128, 128]}
        draw={(ctx, w) => {
          ctx.fillStyle = '#f7f4ec'
          ctx.beginPath()
          ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#20263a'
          ctx.lineWidth = 4
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(w / 2 + Math.sin(a) * 50, w / 2 - Math.cos(a) * 50)
            ctx.lineTo(w / 2 + Math.sin(a) * 58, w / 2 - Math.cos(a) * 58)
            ctx.stroke()
          }
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.moveTo(w / 2, w / 2)
          ctx.lineTo(w / 2 + 28, w / 2 - 20)
          ctx.moveTo(w / 2, w / 2)
          ctx.lineTo(w / 2 - 6, w / 2 - 44)
          ctx.stroke()
        }}
      />
    </group>
  )
}

/** Gerahmtes Bild mit abstrakter Farbfläche. */
export function Picture({ pos, rot, size = [0.9, 0.65], colors = ['#ff8a3d', '#2fd6c0', '#5b6ee1'] }: { pos: V3; rot?: V3; size?: [number, number]; colors?: string[] }) {
  return (
    <group position={pos} rotation={rot}>
      <RBox pos={[0, 0, -0.02]} size={[size[0] + 0.1, size[1] + 0.1, 0.05]} color="#3a2c22" />
      <TextPanel
        pos={[0, 0, 0.012]}
        size={size}
        px={[256, 184]}
        deps={colors}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#f7f4ec'
          ctx.fillRect(0, 0, w, h)
          colors.forEach((c, i) => {
            ctx.fillStyle = c
            ctx.beginPath()
            ctx.arc(w * (0.25 + i * 0.25), h * (0.4 + (i % 2) * 0.25), 34 + i * 6, 0, Math.PI * 2)
            ctx.fill()
          })
        }}
      />
    </group>
  )
}

/** Kickertisch für die Lobby. */
export function FoosballTable({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {[[-0.6, -0.32], [0.6, -0.32], [-0.6, 0.32], [0.6, 0.32]].map(([x, z]) => <Box key={`${x}${z}`} pos={[x as number, 0.34, z as number]} size={[0.08, 0.68, 0.08]} color="#3a2c22" />)}
      <RBox pos={[0, 0.78, 0]} size={[1.5, 0.22, 0.8]} color="#8a5d38" />
      <Box pos={[0, 0.9, 0]} size={[1.34, 0.02, 0.64]} color="#2f8a52" cast={false} />
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <group key={x}>
          <Box pos={[x, 1.0, 0]} size={[0.025, 0.025, 0.98]} color="#c9d1e4" cast={false} />
          {[-0.18, 0.18].map((z) => <Box key={z} pos={[x, 0.96, z]} size={[0.05, 0.12, 0.05]} color={i % 2 ? '#e15b7a' : '#3f6fb0'} cast={false} />)}
        </group>
      ))}
    </group>
  )
}

export function TrashBin({ pos }: { pos: V3 }) {
  return <Cyl pos={[pos[0], pos[1] + 0.18, pos[2]]} size={[0.15, 0.36, 0.15]} color="#59627f" />
}

export function CoatRack({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.9, 0]} size={[0.025, 1.8, 0.025]} color="#3a2c22" />
      <Cyl pos={[0, 0.02, 0]} size={[0.25, 0.04, 0.25]} color="#3a2c22" />
      {[0, 1, 2, 3].map((i) => <Box key={i} pos={[Math.cos(i * 1.57) * 0.1, 1.7, Math.sin(i * 1.57) * 0.1]} size={[0.16, 0.025, 0.025]} rot={[0, -i * 1.57, 0]} color="#3a2c22" />)}
      <Ball pos={[0.14, 1.5, 0]} size={[0.11] as unknown as number} color="#2f4058" />
    </group>
  )
}

/** Fensterkreuze und Vorhang für die Fensterbänder der Wände. */
export function WindowFrames({ length, axis }: { length: number; axis: 'x' | 'z' }) {
  const n = Math.round(length / 3)
  return (
    <group>
      {Array.from({ length: n + 1 }, (_, i) => {
        const o = -length / 2 + (i * length) / n
        return <Box key={i} pos={axis === 'x' ? [o, 3.6, 0] : [0, 3.6, o]} size={axis === 'x' ? [0.07, 1.15, 0.06] : [0.06, 1.15, 0.07]} color="#f2efe6" cast={false} />
      })}
      <Box pos={[0, 3.03, 0]} size={axis === 'x' ? [length, 0.07, 0.07] : [0.07, 0.07, length]} color="#f2efe6" cast={false} />
      <Box pos={[0, 4.17, 0]} size={axis === 'x' ? [length, 0.07, 0.07] : [0.07, 0.07, length]} color="#f2efe6" cast={false} />
    </group>
  )
}
