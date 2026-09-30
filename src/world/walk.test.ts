import { describe, expect, it } from 'vitest'
import { HALF_D } from './constants'
import { walkable } from './walk'

describe('Begehbarkeit im Erdgeschoss', () => {
  const F = 'floor-lobby'
  it('die Fläche außerhalb ist frei begehbar', () => {
    expect(walkable(F, 0, 60)).toBe(true)
    expect(walkable(F, -90, -40)).toBe(true)
    expect(walkable(F, 120, 0)).toBe(true)
  })
  it('die Fassade ist geschlossen, nur der Eingang lässt durch', () => {
    expect(walkable(F, -10, HALF_D + 0.2)).toBe(false)
    expect(walkable(F, 10, HALF_D + 0.2)).toBe(false)
    expect(walkable(F, 0, HALF_D + 0.2)).toBe(true)
  })
  it('vom Eingang aus gibt es einen zusammenhängenden Weg ins Foyer', () => {
    // Schrittweise von außen durch den Eingang laufen, ohne je gesperrt zu sein
    for (let z = 22; z >= 13.6; z -= 0.1) expect(walkable(F, 0, z), `z=${z.toFixed(1)}`).toBe(true)
  })
  it('die Nordfassade ist von außen nicht durchgehbar', () => {
    expect(walkable(F, 0, -HALF_D - 0.2)).toBe(false)
  })
})

import { connectors } from './connectors'
import { getFloor } from './generate'
import { getNav } from './nav'

describe('Vom Eingang zu Treppe und Rolltreppen', () => {
  const nav = getNav('floor-lobby')
  const inside = { x: 0, z: 13.4 }
  it('der Eingang führt zu jedem unteren Ausgang der Verbinder (Wegsuche im Erdgeschoss)', () => {
    for (const c of connectors) {
      const p = nav.findPath(inside, c.lowerExit)
      expect(p, c.id).not.toBeNull()
    }
  })
  it('vom Eingang aus sind Kernbereiche erreichbar (Küche, Lounge, Bank, Besprechung)', () => {
    const f = getFloor('floor-lobby')
    for (const s of f.spots) expect(nav.findPath(inside, s.pos), s.id).not.toBeNull()
    for (const s of f.seats.filter((x) => x.kind === 'bench' || x.kind === 'sofa')) expect(nav.findPath(inside, s.approach), s.id).not.toBeNull()
  })
})
