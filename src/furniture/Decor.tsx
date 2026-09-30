import { Ball, Box, Cone, Cyl, type V3 } from '../world/primitives'
import { TextPanel, fillRound } from '../world/TextPanel'

export function Plant({ pos, scale = 1 }: { pos: V3; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <Cyl pos={[0, 0.25, 0]} size={[0.28, 0.5, 0.28]} color="#e9e4d8" />
      <Cyl pos={[0, 0.5, 0]} size={[0.24, 0.04, 0.24]} color="#5b3d28" />
      <Ball pos={[0, 0.95, 0]} size={0.42} color="#3f9d5f" />
      <Ball pos={[0.2, 1.25, 0.05]} size={0.3} color="#4caf6a" />
      <Ball pos={[-0.18, 1.2, -0.1]} size={0.27} color="#2f8a52" />
    </group>
  )
}

export function Tree({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.3, 0]} size={[0.35, 0.6, 0.35]} color="#e9e4d8" />
      <Cyl pos={[0, 1.2, 0]} size={[0.07, 1.2, 0.07]} color="#6b4423" />
      <Cone pos={[0, 2.2, 0]} size={[0.75, 1.2, 0.75]} color="#3f9d5f" />
      <Cone pos={[0, 2.8, 0]} size={[0.55, 0.9, 0.55]} color="#4caf6a" />
    </group>
  )
}

/** Wandtafel mit abstrakten Notizen. */
export function Whiteboard({ pos, size = [2.4, 1.3], accent = '#ff8a3d', rot }: { pos: V3; size?: [number, number]; accent?: string; rot?: V3 }) {
  return (
    <group position={pos} rotation={rot}>
      <Box pos={[0, 0, -0.02]} size={[size[0] + 0.14, size[1] + 0.14, 0.05]} color="#59627f" />
      <TextPanel
        pos={[0, 0, 0.01]}
        size={size}
        px={[512, 280]}
        deps={[accent]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#f7f9fc'
          ctx.fillRect(0, 0, w, h)
          const colors = [accent, '#5b6ee1', '#9aa6c2']
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = colors[i % 3] as string
            ctx.fillRect(28, 34 + i * 38, 90 + ((i * 97) % 260), 9)
          }
          fillRound(ctx, w - 170, 30, 130, 90, 10, accent + '55')
          fillRound(ctx, w - 170, 140, 130, 90, 10, '#5b6ee155')
        }}
      />
    </group>
  )
}

/** Wandbildschirm mit frei zeichenbarem Inhalt. */
export function WallScreen({ pos, size, px = [512, 160], draw, deps = [], frame = '#161b2b' }: { pos: V3; size: [number, number]; px?: [number, number]; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; deps?: readonly unknown[]; frame?: string }) {
  return (
    <group position={pos}>
      <Box pos={[0, 0, -0.03]} size={[size[0] + 0.16, size[1] + 0.16, 0.08]} color={frame} />
      <TextPanel pos={[0, 0, 0.02]} size={size} px={px} draw={draw} deps={deps} />
    </group>
  )
}

export function Rug({ pos, size, color }: { pos: V3; size: [number, number]; color: string }) {
  return <Box pos={[pos[0], 0.012, pos[2]]} size={[size[0], 0.02, size[1]]} color={color} cast={false} />
}

export function ServerRack({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Box pos={[0, 1.1, 0]} size={[0.85, 2.2, 0.9]} color="#1c2233" />
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i}>
          <Box pos={[0, 0.3 + i * 0.29, 0.46]} size={[0.74, 0.2, 0.02]} color="#2b3348" />
          <Box pos={[-0.28, 0.3 + i * 0.29, 0.48]} size={[0.05, 0.05, 0.02]} color={i % 3 === 0 ? '#ffc94d' : '#3ddc84'} emissive={i % 3 === 0 ? '#ffc94d' : '#3ddc84'} ei={1.6} cast={false} />
        </group>
      ))}
    </group>
  )
}

export function BeanBag({ pos, color }: { pos: V3; color: string }) {
  return <Ball pos={[pos[0], 0.3, pos[2]]} size={[0.55, 0.36, 0.55]} color={color} />
}

export function Lamp({ pos, color = '#ffd9a8' }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.03, 0]} size={[0.2, 0.06, 0.2]} color="#20263a" />
      <Cyl pos={[0, 0.8, 0]} size={[0.025, 1.6, 0.025]} color="#20263a" />
      <Cyl pos={[0, 1.65, 0]} size={[0.24, 0.26, 0.24]} color={color} emissive={color} ei={1.1} cast={false} />
    </group>
  )
}
