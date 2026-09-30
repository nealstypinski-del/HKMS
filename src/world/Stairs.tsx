import { STAIRS } from '../config/walkWorld'
import { Box, glass } from './primitives'

/** Zweiläufige Treppe mit Podest. Läuft von Etage n (Höhe 0 lokal) nach n+1 (Höhe 6). */
export function Stairs() {
  const S = STAIRS
  const wA = S.runA.z1 - S.runA.z0
  const wB = S.runB.z1 - S.runB.z0
  const zA = (S.runA.z0 + S.runA.z1) / 2
  const zB = (S.runB.z0 + S.runB.z1) / 2
  const tread = '#c49a68'
  return (
    <group>
      {Array.from({ length: S.steps }, (_, i) => {
        const top = S.stepRise * (i + 1)
        return (
          <group key={`a${i}`}>
            <Box pos={[S.runA.x0 + S.stepRun * (i + 0.5), top / 2, zA]} size={[S.stepRun, top, wA]} color="#8a8fa8" />
            <Box pos={[S.runA.x0 + S.stepRun * (i + 0.5), top + 0.01, zA]} size={[S.stepRun, 0.03, wA]} color={tread} />
          </group>
        )
      })}
      <Box pos={[(S.landing.x0 + S.landing.x1) / 2, S.half / 2, (S.landing.z0 + S.landing.z1) / 2]} size={[S.landing.x1 - S.landing.x0, S.half, S.landing.z1 - S.landing.z0]} color="#8a8fa8" />
      <Box pos={[(S.landing.x0 + S.landing.x1) / 2, S.half + 0.01, (S.landing.z0 + S.landing.z1) / 2]} size={[S.landing.x1 - S.landing.x0, 0.03, S.landing.z1 - S.landing.z0]} color={tread} />
      {Array.from({ length: S.steps }, (_, i) => {
        const top = S.half + S.stepRise * (i + 1)
        return (
          <group key={`b${i}`}>
            <Box pos={[S.runB.x1 - S.stepRun * (i + 0.5), top - 0.1, zB]} size={[S.stepRun, 0.2, wB]} color="#8a8fa8" />
            <Box pos={[S.runB.x1 - S.stepRun * (i + 0.5), top + 0.01, zB]} size={[S.stepRun, 0.03, wB]} color={tread} />
          </group>
        )
      })}
      {/* Wange unter dem oberen Lauf */}
      <Box pos={[(S.runB.x0 + S.runB.x1) / 2, S.half + 1.4, S.runB.z1 - 0.03]} rot={[0, 0, -Math.atan2(S.half, S.runB.x1 - S.runB.x0)]} size={[Math.hypot(S.runB.x1 - S.runB.x0, S.half), 0.35, 0.06]} color="#59627f" />
      {/* Glasgeländer mit Handlauf */}
      <Rail x0={S.runA.x0} y0={0} x1={S.runA.x1} y1={S.half} z={S.runA.z0 - 0.03} />
      <Rail x0={S.runA.x0} y0={0} x1={S.runA.x1} y1={S.half} z={6.3} />
      <Rail x0={S.runB.x1} y0={S.half} x1={S.runB.x0} y1={2 * S.half} z={S.runB.z1 + 0.03} />
      <Rail x0={S.runB.x1} y0={S.half} x1={S.runB.x0} y1={2 * S.half} z={S.runB.z0 - 0.03} />
      <Post x={S.landing.x1 + 0.03} y={S.half} z0={S.landing.z0} z1={S.landing.z1} />
      <Post x={S.runB.x1 + 0.03} y={2 * S.half} z0={S.runB.z0} z1={S.runB.z1} />
    </group>
  )
}

/** Schräges Glasgeländer entlang eines Laufs. */
function Rail({ x0, y0, x1, y1, z }: { x0: number; y0: number; x1: number; y1: number; z: number }) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  const ang = Math.atan2(y1 - y0, x1 - x0)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return (
    <group>
      <Box pos={[cx, cy + 0.55, z]} rot={[0, 0, ang]} size={[len, 0.9, 0.03]} material={glass('#bfe6f5', 0.3)} cast={false} />
      <Box pos={[cx, cy + 1.02, z]} rot={[0, 0, ang]} size={[len, 0.05, 0.07]} color="#20263a" />
    </group>
  )
}

/** Waagerechtes Geländer am Podest oder Treppenkopf. */
function Post({ x, y, z0, z1 }: { x: number; y: number; z0: number; z1: number }) {
  return (
    <group>
      <Box pos={[x, y + 0.55, (z0 + z1) / 2]} size={[0.03, 0.9, z1 - z0]} material={glass('#bfe6f5', 0.3)} cast={false} />
      <Box pos={[x, y + 1.02, (z0 + z1) / 2]} size={[0.07, 0.05, z1 - z0]} color="#20263a" />
    </group>
  )
}
