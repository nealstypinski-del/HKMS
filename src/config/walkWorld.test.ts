import { describe, expect, it } from 'vitest'
import { COLLIDERS, ESCALATOR, ESCALATOR_HOLE, STAIRS, STAIR_HOLE, groundAt, holesOf, levelOfHeight, resolveCollisions, subtractHoles } from './walkWorld'

describe('walkWorld', () => {
  it('Treppe steigt von 0 auf Etage 1 in 30 Stufen à 0,2 m', () => {
    expect(STAIRS.steps * 2 * STAIRS.stepRise).toBeCloseTo(6, 6)
    let y = 0
    let x = STAIRS.runA.x0 + 0.05
    const z = 5.6
    while (x < STAIRS.runA.x1) {
      y = groundAt(x, z, y).y
      x += 0.05
    }
    expect(y).toBeGreaterThan(2.8)
    x = STAIRS.landing.x1 - 0.1
    for (let i = 0; i < 200 && x > STAIRS.runB.x0 + 0.02; i++) {
      y = groundAt(x, 7.0, y).y
      x -= 0.03
    }
    expect(y).toBeGreaterThan(5.85)
  })

  it('Unter dem Podest bleibt die Figur auf Etage 0 statt nach oben zu springen', () => {
    expect(groundAt(9.0, 6.0, 0).y).toBe(0)
    expect(groundAt(9.0, 6.0, 3).y).toBeCloseTo(3, 6)
    expect(groundAt(6.0, 7.0, 0).y).toBe(0)
  })

  it('Rolltreppe: Steigung und Mitnahme in beide Richtungen', () => {
    const upMid = groundAt((ESCALATOR.x0 + ESCALATOR.x1) / 2, 6.0, 3)
    const downMid = groundAt((ESCALATOR.x0 + ESCALATOR.x1) / 2, 7.2, 3)
    expect(upMid.y).toBeCloseTo(3, 1)
    expect(upMid.carry[0]).toBeGreaterThan(0)
    expect(downMid.carry[0]).toBeLessThan(0)
  })

  it('Öffnungen in der Decke schneiden die Bodenplatte sauber aus', () => {
    expect(holesOf(1)).toEqual([ESCALATOR_HOLE, STAIR_HOLE])
    expect(holesOf(0)).toEqual([])
    const parts = subtractHoles({ x0: -12, x1: 12, z0: -8, z1: 8 }, holesOf(1))
    const area = parts.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0)
    const holeArea = holesOf(1).reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0)
    expect(area).toBeCloseTo(24 * 16 - holeArea, 6)
  })

  it('Kollision: Schreibtische blockieren, freie Fläche nicht', () => {
    const [x, z] = resolveCollisions(-10.2, -5.8, 6, COLLIDERS)
    expect(Math.hypot(x + 10.2, z + 5.8)).toBeGreaterThan(0.4)
    expect(resolveCollisions(0, 1, 0, COLLIDERS)).toEqual([0, 1])
  })

  it('Etagenbestimmung aus der Höhe', () => {
    expect([0, 4.9, 5.1, 6, 12.5, 18].map(levelOfHeight)).toEqual([0, 0, 1, 1, 2, 3])
  })
})
