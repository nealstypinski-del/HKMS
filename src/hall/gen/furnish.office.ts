import { Builder, type FurnResult } from './builder'
import { frameOf } from './frame'
import type { RoomDef } from '../plan/hall.types'

/** Büro: zwei Blöcke aus je 2 x 2 Schreibtischen (alle Blick nach -z), Sofaecke, Regale, Pflanzen. */
export function furnishOffice(room: RoomDef, clusters = 2): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  const deptId = room.deptId as string
  const doorAtMin = f.side === 'N'
  const rows = doorAtMin ? [room.z0 + 5.6, room.z0 + 9.2] : [room.z1 - 9.5, room.z1 - 5.9]
  const cols = clusters === 2 ? [-7.7, -4.3, 4.3, 7.7] : [-4.3, 4.3]
  for (const rz of rows) for (const cu of cols) b.desk(deptId, f.cx + cu, rz)
  // Stühle zu den Schreibtischen
  for (const d of b.desks) b.add('chair', d.x - 0.35, d.z + 0.78, Math.PI)
  const far = doorAtMin ? room.z1 - 0.3 : room.z0 + 0.3
  for (const u of [-14, -11.5, 11.5, 14]) b.add('bookshelf', f.cx + u, far + (doorAtMin ? -0.05 : 0.05), doorAtMin ? Math.PI : 0)
  for (const u of [-9, 9]) b.add('cabinet', f.cx + u, far + (doorAtMin ? -0.1 : 0.1), doorAtMin ? Math.PI : 0)
  b.add('printer', f.cx - 6.5, far + (doorAtMin ? -0.1 : 0.1), doorAtMin ? Math.PI : 0)
  b.add('cooler', f.cx + 6.5, far + (doorAtMin ? -0.1 : 0.1), doorAtMin ? Math.PI : 0)
  const nearWall = doorAtMin ? room.z0 + 0.6 : room.z1 - 0.6
  for (const u of [-15, 15]) b.add('plant', f.cx + u, nearWall, 0)
  for (const u of [-15, 15]) b.add('lamp', f.cx + u, doorAtMin ? room.z1 - 1.2 : room.z0 + 1.2, 0)
  // Sofaecke in der Mitte am hinteren Ende
  const sz = doorAtMin ? room.z1 - 1.5 : room.z0 + 1.5
  b.sofa('lounge', f.cx, sz, doorAtMin ? Math.PI : 0, room.accent)
  b.add('rug', f.cx, sz + (doorAtMin ? -1.6 : 1.6), 0, { color: room.accent })
  b.add('coffeeTable', f.cx, sz + (doorAtMin ? -1.6 : 1.6), 0)
  const wallX = clusters === 2 ? room.x0 + 0.06 : room.x0 + 0.06
  b.add('whiteboard', wallX, f.cz, Math.PI / 2, { color: room.accent })
  b.add('screenWall', f.cx, far + (doorAtMin ? 0.2 : -0.2), doorAtMin ? Math.PI : 0, { label: room.name, color: room.accent })
  return b.result()
}
