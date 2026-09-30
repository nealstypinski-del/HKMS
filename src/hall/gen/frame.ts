import type { RoomDef, Side } from '../plan/hall.types'

/** Raumkoordinaten: u läuft entlang der Türwand (0 = Mitte), t misst von der Türwand ins Rauminnere. */
export interface Frame {
  cx: number
  cz: number
  /** Ausdehnung entlang der Türwand */
  span: number
  /** Tiefe ins Raum hinein */
  depth: number
  side: Side
  /** Blickrichtung ins Rauminnere (weg von der Tür) */
  inward: number
  /** Blickrichtung zur Tür */
  outward: number
  at: (u: number, t: number) => [number, number]
}

export function frameOf(room: RoomDef): Frame {
  const side = (room.doors[0] as { side: Side }).side
  const cx = (room.x0 + room.x1) / 2
  const cz = (room.z0 + room.z1) / 2
  const inwardBySide: Record<Side, number> = { N: 0, S: Math.PI, E: -Math.PI / 2, W: Math.PI / 2 }
  const inward = inwardBySide[side]
  const horizontal = side === 'N' || side === 'S'
  const span = horizontal ? room.x1 - room.x0 : room.z1 - room.z0
  const depth = horizontal ? room.z1 - room.z0 : room.x1 - room.x0
  const at = (u: number, t: number): [number, number] => {
    switch (side) {
      case 'N': return [cx + u, room.z0 + t]
      case 'S': return [cx + u, room.z1 - t]
      case 'E': return [room.x1 - t, cz + u]
      case 'W': return [room.x0 + t, cz + u]
    }
  }
  return { cx, cz, span, depth, side, inward, outward: inward + Math.PI, at }
}
