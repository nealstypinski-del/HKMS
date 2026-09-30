import { Builder, type FurnResult } from './builder'
import { frameOf, type Frame } from './frame'
import type { RoomDef } from '../plan/hall.types'

const plants = (b: Builder, f: Frame, us: number[], ts: number[]): void => {
  for (const u of us) for (const t of ts) b.add('plant', ...f.at(u, t), 0)
}

/** Blickrichtung von (x, z) zum Punkt (tx, tz) */
export const face = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z)

export function furnishLobby(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  b.add('reception', ...f.at(-9, 5), f.outward, { color: room.accent })
  b.add('screenWall', ...f.at(0, f.depth - 0.2), f.outward, { label: 'HERKULES AI HQ', color: room.accent })
  b.sofa('lounge', ...f.at(9, 8.4), f.outward, '#5b6ee1')
  b.add('coffeeTable', ...f.at(9, 6.6), 0)
  b.armchair('lounge', ...f.at(5.4, 6.6), Math.PI / 2, '#e15b7a')
  b.armchair('lounge', ...f.at(12.6, 6.6), -Math.PI / 2, '#e15b7a')
  b.add('rug', ...f.at(9, 6.8), 0, { color: '#8a8fe6' })
  b.add('kicker', ...f.at(-9, 9.6), 0)
  b.add('vending', ...f.at(14.8, 10.6), Math.PI / 2)
  b.add('cooler', ...f.at(-14.8, 10.8), 0)
  plants(b, f, [-14.6, 14.6], [1.4])
  b.add('lamp', ...f.at(-3.4, 10.4), 0)
  return b.result()
}

export function furnishCafe(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 6; i++) b.add('counterSeg', ...f.at(-14.5 + i * 2.1, f.depth - 1.0), f.outward)
  b.add('coffeeMachine', ...f.at(-13, f.depth - 1.0), f.outward)
  b.add('coffeeMachine', ...f.at(-9, f.depth - 1.0), f.outward)
  for (let i = 0; i < 6; i++) {
    const [x, z] = f.at(-13.5 + i * 2.1, f.depth - 2.5)
    b.add('stool', x, z, f.inward)
    b.slot('kitchen', x, z, f.inward, 'sit', 0.7)
  }
  for (const u of [2, 8, 13]) {
    const [tx, tz] = f.at(u, 6.4)
    b.add('roundTable', tx, tz, 0)
    b.ring('kitchen', tx, tz, 1.35, 4)
  }
  plants(b, f, [-14.8, 14.8], [1.4, 10.4])
  return b.result()
}

export function furnishCanteen(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 6; i++) b.add('counterSeg', ...f.at(-6 + i * 2.1, f.depth - 0.9), f.outward)
  for (const t of [4.6, 8.0]) {
    for (const u of [-10.5, 0, 10.5]) {
      for (const k of [-1.2, 1.2]) b.add('tableSeg', ...f.at(u + k, t), 0)
      const [x0, z0] = f.at(u, t)
      for (const du of [-2.1, 0, 2.1]) {
        for (const dt of [-0.95, 0.95]) {
          const [x, z] = f.at(u + du, t + dt)
          b.chair('kitchen', x, z, face(x, z, x0, z0) + 0)
        }
      }
    }
  }
  b.add('vending', ...f.at(-14.8, f.depth - 1.0), f.outward)
  plants(b, f, [-14.8, 14.8], [1.4])
  return b.result()
}

export function furnishLibrary(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 9; i++) b.add('bookshelf', ...f.at(-13.6 + i * 3.4, f.depth - 0.3), f.outward)
  for (let i = 0; i < 6; i++) b.add('bookshelf', ...f.at(-13.6 + i * 5.4, 7.6), f.inward)
  for (const u of [-10, 0, 10]) {
    const [tx, tz] = f.at(u, 4.2)
    b.add('roundTable', tx, tz, 0)
    b.ring('lounge', tx, tz, 1.3, 3)
  }
  b.add('lamp', ...f.at(-15, 5), 0)
  b.add('lamp', ...f.at(15, 5), 0)
  return b.result()
}

/** Agentenlounge: hier warten Agenten ohne Aufgabe auf der Agentenbank. */
export function furnishAgentLounge(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (const t of [5.2, 8.4]) {
    for (const u of [-9, -4.5, 4.5, 9]) {
      const [x, z] = f.at(u, t)
      b.add('bench', x, z, f.outward)
      for (const du of [-0.5, 0.5]) {
        const [sx, sz] = f.at(u + du, t)
        b.slot('agentBench', sx, sz, f.outward, 'sit', 0.48)
      }
    }
  }
  b.add('screenWall', ...f.at(0, f.depth - 0.2), f.outward, { label: 'AGENTENBANK', color: room.accent })
  b.add('rug', ...f.at(0, 6.8), 0, { color: room.accent })
  plants(b, f, [-14.8, 14.8], [1.4, 10.6])
  b.add('cooler', ...f.at(-12, f.depth - 0.6), f.outward)
  return b.result()
}

export function furnishPost(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 8; i++) b.add('shelfLow', ...f.at(-13 + i * 3.6, f.depth - 0.4), f.outward)
  for (const [u, t] of [[-10, 6], [-6, 8], [4, 6], [9, 8]] as const) b.add('box', ...f.at(u, t), 0)
  for (let i = 0; i < 4; i++) b.add('tableSeg', ...f.at(-6 + i * 2.6, 5), 0)
  b.add('printer', ...f.at(13.5, 2), f.inward)
  return b.result()
}

export function furnishGym(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 4; i++) b.add('treadmill', ...f.at(-7 + i * 4.4, f.depth - 1.6), f.outward)
  for (let i = 0; i < 3; i++) b.add('weights', ...f.at(-5 + i * 4.5, 5), 0)
  for (let i = 0; i < 3; i++) b.add('mat', ...f.at(-7 + i * 5, 3.4), 0, { color: i % 2 ? '#3f6fb0' : '#e15b7a' })
  b.add('screenWall', ...f.at(0, f.depth - 0.2), f.outward, { label: 'FITNESS', color: room.accent })
  plants(b, f, [-8.6, 8.6], [1.2])
  return b.result()
}

export function furnishWellness(room: RoomDef): FurnResult {
  const b = new Builder(room)
  const f = frameOf(room)
  for (let i = 0; i < 3; i++) b.add('lounger', ...f.at(-6 + i * 6, f.depth - 1.4), f.outward)
  b.add('rug', ...f.at(0, 5), 0, { color: '#9cc9c1' })
  plants(b, f, [-8.4, 8.4], [1.2, 5, 8])
  b.add('lamp', ...f.at(-8, f.depth - 0.8), 0)
  b.add('lamp', ...f.at(8, f.depth - 0.8), 0)
  return b.result()
}
