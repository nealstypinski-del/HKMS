import { Builder, type FurnResult } from './builder'
import { frameOf } from './frame'
import { face } from './furnish.public'
import type { RoomDef } from '../plan/hall.types'

/** Langer Tisch aus Segmenten mit Stühlen an beiden Längsseiten. */
function longTable(b: Builder, f: ReturnType<typeof frameOf>, segs: number, t: number): void {
  const len = segs * 2.4
  for (let i = 0; i < segs; i++) b.add('tableSeg', ...f.at(-len / 2 + 1.2 + i * 2.4, t), 0)
  const per = Math.floor(len / 1.2)
  for (let i = 0; i < per; i++) {
    const u = -len / 2 + 0.6 + i * 1.2
    for (const dt of [-1.05, 1.05]) {
      const [x, z] = f.at(u, t + dt)
      const [tx, tz] = f.at(u, t)
      b.chair('meetingRoom', x, z, face(x, z, tx, tz))
    }
  }
}

export function furnishMeeting(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  const segs = 3
  const t = Math.min(6, f.depth / 2)
  const len = segs * 2.4
  for (let i = 0; i < segs; i++) b.add('tableSeg', ...f.at(-len / 2 + 1.2 + i * 2.4, t), 0)
  for (let i = 0; i < 6; i++) {
    for (const dt of [-1.05, 1.05]) {
      const [x, z] = f.at(-len / 2 + 0.6 + i * 1.2, t + dt)
      const [tx, tz] = f.at(-len / 2 + 0.6 + i * 1.2, t)
      b.chair('meetingRoom', x, z, face(x, z, tx, tz))
    }
  }
  b.add('whiteboard', ...f.at(-5, f.depth - 0.06), f.outward, { color: room.accent })
  b.add('screenWall', ...f.at(3, f.depth - 0.06), f.outward, { label: room.name, color: room.accent })
  b.add('plant', ...f.at(-f.span / 2 + 1, 1.2), 0)
  b.add('plant', ...f.at(f.span / 2 - 1, 1.2), 0)
  return b.result()
}

export function furnishBoardroom(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  longTable(b, f, 5, 6)
  b.add('screenWall', ...f.at(0, f.depth - 0.06), f.outward, { label: room.name, color: room.accent })
  for (let i = 0; i < 4; i++) b.add('shelfLow', ...f.at(-12 + i * 1.7, f.depth - 0.4), f.outward)
  b.add('rug', ...f.at(0, 6), 0, { color: '#6a4a6e' })
  for (const u of [-14.6, 14.6]) b.add('plant', ...f.at(u, 1.4), 0)
  return b.result()
}

/** Konferenzsaal: Stuhlreihen wie im Theater, Bühne mit Pult vor der Leinwand. */
export function furnishConference(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (const t of [3.8, 5.0, 6.2, 7.4]) {
    for (let i = 0; i < 8; i++) {
      for (const side of [-1, 1]) {
        const u = side * (2.4 + i * 0.85)
        const [x, z] = f.at(u, t)
        b.chair('meetingRoom', x, z, f.inward)
      }
    }
  }
  b.add('stage', ...f.at(0, f.depth - 1.6), 0, { color: room.accent })
  b.add('lectern', ...f.at(-3, f.depth - 2.2), f.outward)
  b.add('screenWall', ...f.at(0, f.depth - 0.06), f.outward, { label: 'KONFERENZ', color: room.accent })
  for (const u of [-15, 15]) b.add('plant', ...f.at(u, 1.4), 0)
  return b.result()
}

export function furnishTraining(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (const t of [4.6, 8.0]) {
    for (const u of [-9, 0, 9]) {
      b.add('tableSeg', ...f.at(u, t), 0)
      for (const du of [-0.7, 0.7]) {
        const [x, z] = f.at(u + du, t + 1.0)
        b.chair('meetingRoom', x, z, f.inward + Math.PI)
      }
    }
  }
  b.add('whiteboard', ...f.at(-6, f.depth - 0.06), f.outward, { color: room.accent })
  b.add('screenWall', ...f.at(6, f.depth - 0.06), f.outward, { label: 'SCHULUNG', color: room.accent })
  return b.result()
}

export function furnishPhone(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 4; i++) b.add('booth', ...f.at(-6 + i * 4, f.depth - 1.2), f.outward, { color: room.accent })
  b.add('plant', ...f.at(-8.6, 1.2), 0)
  b.add('plant', ...f.at(8.6, 1.2), 0)
  return b.result()
}

export function furnishStudio(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  b.add('greenScreen', ...f.at(0, f.depth - 0.1), f.outward)
  b.add('camera', ...f.at(-3, 5), f.inward)
  b.add('camera', ...f.at(4, 6), f.inward)
  b.add('tableSeg', ...f.at(0, f.depth - 2.4), 0)
  b.add('lamp', ...f.at(-7, 4), 0)
  b.add('lamp', ...f.at(7, 4), 0)
  b.add('cabinet', ...f.at(-8.6, 1.2), 0)
  return b.result()
}

export function furnishPodcast(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  const [cx, cz] = f.at(0, 7)
  b.add('roundTable', cx, cz, 0)
  b.ring('meetingRoom', cx, cz, 1.35, 4)
  for (let i = 0; i < 4; i++) b.add('mic', cx + Math.sin(i * 1.57) * 0.5, cz + Math.cos(i * 1.57) * 0.5, 0)
  b.add('rug', cx, cz, 0, { color: '#2a3357' })
  b.add('screenWall', ...f.at(0, f.depth - 0.06), f.outward, { label: 'ON AIR', color: '#ff5c5c' })
  return b.result()
}
