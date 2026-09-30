// Wandsegmente aus dem Grundriss: jede Raumwand mit Türöffnungen. Reine Geometrie Daten (Rechtecke), keine Grafik.

import { FOOT } from '../plan/hall.plan'
import type { DoorDef, Rect, RoomDef, Side } from '../plan/hall.types'

export const WALL_T = 0.3
export const DOOR_H = 3.2

export interface WallSeg extends Rect {
  level: number
  roomId: string
  /** Außenwand des Gebäudes (wird je nach Kamera ausgeblendet) */
  exterior: Side | null
  /** Segment über einer Tür (Sturz), nur obere Wandhälfte */
  lintel: boolean
}

interface Edge {
  side: Side
  /** Koordinate der Wand */
  at: number
  from: number
  to: number
  axis: 'x' | 'z'
}

function edgesOf(r: Rect): Edge[] {
  return [
    { side: 'N', at: r.z0, from: r.x0, to: r.x1, axis: 'x' },
    { side: 'S', at: r.z1, from: r.x0, to: r.x1, axis: 'x' },
    { side: 'W', at: r.x0, from: r.z0, to: r.z1, axis: 'z' },
    { side: 'E', at: r.x1, from: r.z0, to: r.z1, axis: 'z' },
  ]
}

const isExterior = (e: Edge): Side | null => {
  if (e.side === 'N' && e.at === FOOT.z0) return 'N'
  if (e.side === 'S' && e.at === FOOT.z1) return 'S'
  if (e.side === 'W' && e.at === FOOT.x0) return 'W'
  if (e.side === 'E' && e.at === FOOT.x1) return 'E'
  return null
}

function cut(from: number, to: number, doors: DoorDef[]): Array<[number, number]> {
  const gaps = doors.map((d): [number, number] => [d.pos - d.width / 2, d.pos + d.width / 2]).sort((a, b) => a[0] - b[0])
  const out: Array<[number, number]> = []
  let cur = from
  for (const [g0, g1] of gaps) {
    if (g0 > cur) out.push([cur, g0])
    cur = Math.max(cur, g1)
  }
  if (cur < to) out.push([cur, to])
  return out
}

/** Wände eines Raums (Mitte auf der Raumkante, Dicke WALL_T). Die Türen bekommen zusätzlich einen Sturz. */
export function wallsOfRoom(room: RoomDef): WallSeg[] {
  const segs: WallSeg[] = []
  const t = WALL_T / 2
  for (const e of edgesOf(room)) {
    const doors = room.doors.filter((d) => d.side === e.side)
    const exterior = isExterior(e)
    const push = (a: number, b: number, lintel: boolean) => {
      segs.push(
        e.axis === 'x'
          ? { x0: a, x1: b, z0: e.at - t, z1: e.at + t, level: room.level, roomId: room.id, exterior, lintel }
          : { x0: e.at - t, x1: e.at + t, z0: a, z1: b, level: room.level, roomId: room.id, exterior, lintel },
      )
    }
    for (const [a, b] of cut(e.from, e.to, doors)) push(a, b, false)
    for (const d of doors) push(d.pos - d.width / 2, d.pos + d.width / 2, true)
  }
  return segs
}
