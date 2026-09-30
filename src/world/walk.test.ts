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
