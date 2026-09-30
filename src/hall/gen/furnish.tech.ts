import { Builder, type FurnResult } from './builder'
import { frameOf } from './frame'
import type { RoomDef } from '../plan/hall.types'

export function furnishServer(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (const t of [4, 7, 10]) for (const u of [-7.5, -5.5, -3.5, 3.5, 5.5, 7.5]) b.add('rack', ...f.at(u, t), 0)
  b.add('screenWall', ...f.at(0, f.depth - 0.06), f.outward, { label: 'SERVER', color: room.accent })
  return b.result()
}

export function furnishTech(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 5; i++) b.add('cabinet', ...f.at(-8 + i * 4, f.depth - 0.4), f.outward)
  for (const u of [-6, 6]) b.add('box', ...f.at(u, 5), 0)
  b.add('tableSeg', ...f.at(0, 7), 0)
  return b.result()
}

export function furnishArchive(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (const t of [4, 7, 10]) for (let i = 0; i < 6; i++) {
    const u = -8.6 + i * 1.7 + (i >= 3 ? 3.4 : 0)
    b.add('bookshelf', ...f.at(u, t), 0)
  }
  return b.result()
}

export function furnishDevLounge(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  b.sofa('lounge', ...f.at(-3, f.depth - 1.6), f.outward, '#4b3f8f')
  b.add('coffeeTable', ...f.at(-3, f.depth - 3.4), 0)
  b.add('beanbag', ...f.at(4, 7), 0, { color: '#e15b7a' })
  b.add('beanbag', ...f.at(6.4, 8.5), 0, { color: '#f2c94c' })
  b.add('kicker', ...f.at(-2, 4.6), 0)
  b.add('coffeeMachine', ...f.at(8, 1.4), 0)
  b.add('rug', ...f.at(-3, f.depth - 3), 0, { color: '#8b7cf6' })
  return b.result()
}
