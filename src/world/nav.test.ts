import { describe, expect, it } from 'vitest'
import { BUILDING } from './buildingConfig'
import { getFloor } from './generate'
import { getNav } from './nav'

describe('Navigation', () => {
  for (const f of BUILDING.floors) {
    const g = getFloor(f.id)
    const nav = getNav(f.id)

    it(`${f.id}: Aufzugsausgang ist frei`, () => {
      expect(nav.isBlocked(g.elevatorExit.x, g.elevatorExit.z)).toBe(false)
    })

    it(`${f.id}: jeder Schreibtisch hat einen freien, erreichbaren Anlaufpunkt`, () => {
      for (const d of g.desks) {
        expect(nav.isBlocked(d.approach.x, d.approach.z), d.id).toBe(false)
        const path = nav.findPath(g.elevatorExit, d.approach)
        expect(path, `Pfad zu ${d.id}`).not.toBeNull()
        const end = path![path!.length - 1]
        expect(Math.hypot(end.x - d.approach.x, end.z - d.approach.z), d.id).toBeLessThan(0.3)
      }
    })

    it(`${f.id}: alle Sitze und Wartepunkte sind erreichbar`, () => {
      for (const s of g.seats) {
        expect(nav.isBlocked(s.approach.x, s.approach.z), s.id).toBe(false)
        expect(nav.findPath(g.elevatorExit, s.approach), s.id).not.toBeNull()
      }
      for (const p of [...g.spots, ...g.lobbySpots]) {
        expect(nav.isBlocked(p.pos.x, p.pos.z), p.id).toBe(false)
        expect(nav.findPath(g.elevatorExit, p.pos), p.id).not.toBeNull()
      }
    })

    it(`${f.id}: Pfade laufen nie durch blockierte Zellen (Türen)`, () => {
      for (const d of g.desks.slice(0, 12)) {
        const path = nav.findPath(g.elevatorExit, d.approach)!
        let prev = g.elevatorExit
        for (const p of path) {
          expect(nav.lineFree(prev, p)).toBe(true)
          prev = p
        }
      }
    })
  }
})
