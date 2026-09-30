import { describe, expect, it } from 'vitest'
import { ROOMS, roomsOfLevel, LEVELS } from '../plan/hall.plan'
import { overlaps } from './rect'
import { wallsOfRoom } from './walls'

describe('Hallen Grundriss', () => {
  it('hat 30 Räume auf 3 Ebenen mit eindeutigen Ids', () => {
    expect(ROOMS).toHaveLength(30)
    expect(new Set(ROOMS.map((r) => r.id)).size).toBe(30)
    for (let l = 0; l < LEVELS; l++) expect(roomsOfLevel(l)).toHaveLength(10)
  })

  it('Räume einer Ebene überlappen sich nicht', () => {
    for (let l = 0; l < LEVELS; l++) {
      const rooms = roomsOfLevel(l)
      for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) expect(overlaps(rooms[i]!, rooms[j]!)).toBe(false)
    }
  })

  it('jeder Raum hat mindestens eine Tür, die auf der Raumkante liegt', () => {
    for (const r of ROOMS) {
      expect(r.doors.length).toBeGreaterThan(0)
      for (const d of r.doors) {
        const [lo, hi] = d.side === 'N' || d.side === 'S' ? [r.x0, r.x1] : [r.z0, r.z1]
        expect(d.pos - d.width / 2).toBeGreaterThanOrEqual(lo)
        expect(d.pos + d.width / 2).toBeLessThanOrEqual(hi)
      }
    }
  })

  it('Wände lassen genau die Türbreite offen', () => {
    const lobby = ROOMS.find((r) => r.id === 'lobby')!
    const north = wallsOfRoom(lobby).filter((s) => !s.lintel && Math.abs((s.z0 + s.z1) / 2 - lobby.z0) < 0.01)
    const solid = north.reduce((sum, s) => sum + (s.x1 - s.x0), 0)
    expect(solid).toBeCloseTo(32 - 12, 6)
  })
})
