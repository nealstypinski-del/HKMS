import { getFloor } from './generate'

/**
 * Kamerakollision gegen die Trennwände einer Etage. Liefert den Anteil t (0..1) der Strecke von `from` nach `to`,
 * bis zu dem die Kamera ungehindert gelangt. Eine Wand blockiert nur, wenn die Kamera an der Schnittstelle tiefer
 * als die Wandoberkante liegt (Wandmodus hoch: 3,0 m, halb: 0,95 m, weg: keine Wand).
 */
export function cameraWallClamp(
  floorId: string,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  floorBase: number,
  wallHeight: number,
): number {
  if (wallHeight <= 0) return 1
  const walls = getFloor(floorId).walls
  const rx = to.x - from.x, rz = to.z - from.z
  let best = 1
  for (const w of walls) {
    const sx = w.x1 - w.x0, sz = w.z1 - w.z0
    const den = rx * sz - rz * sx
    if (Math.abs(den) < 1e-9) continue
    const qx = w.x0 - from.x, qz = w.z0 - from.z
    const t = (qx * sz - qz * sx) / den // Position auf der Kamerastrecke
    const u = (qx * rz - qz * rx) / den // Position auf der Wand
    if (t <= 0 || t >= best || u < 0 || u > 1) continue
    const y = from.y + (to.y - from.y) * t
    if (y - floorBase < wallHeight + 0.15) best = t
  }
  return best
}

export const WALL_TOP: Record<'high' | 'half' | 'none', number> = { high: 3.0, half: 0.95, none: 0 }
