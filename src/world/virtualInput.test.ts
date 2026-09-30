import { beforeEach, describe, expect, it } from 'vitest'
import { nearElevator } from './elevatorUse'
import { getFloor } from './generate'
import { clampStick, resetVirtualInput, setVirtualRun, setVirtualStick, virtualInput } from './virtualInput'

describe('Virtueller Joystick', () => {
  beforeEach(resetVirtualInput)
  it('begrenzt jede Eingabe auf den Bereich -1 bis 1 und macht aus Unsinn 0', () => {
    setVirtualStick(5, -9)
    expect(virtualInput).toMatchObject({ x: 1, y: -1 })
    for (const bad of [NaN, Infinity, -Infinity]) { setVirtualStick(bad, bad); expect(virtualInput.x).toBeLessThanOrEqual(1); expect(Number.isFinite(virtualInput.x) && Number.isFinite(virtualInput.y)).toBe(true) }
    setVirtualStick(NaN, NaN)
    expect(virtualInput).toMatchObject({ x: 0, y: 0 })
  })
  it('Rennen akzeptiert nur echte Wahrheitswerte', () => {
    setVirtualRun('ja' as never); expect(virtualInput.run).toBe(false)
    setVirtualRun(true); expect(virtualInput.run).toBe(true)
    resetVirtualInput(); expect(virtualInput.run).toBe(false)
  })
  it('clampStick: proportional innerhalb, Länge 1 außerhalb, y nach unten ist rückwärts', () => {
    expect(clampStick(26, 0, 52)).toEqual({ x: 0.5, y: -0 })
    expect(clampStick(0, -52, 52)).toEqual({ x: 0, y: 1 }) // Finger nach oben = vorwärts
    const far = clampStick(1000, 1000, 52)
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(1, 10)
    expect(far.y).toBeLessThan(0)
    expect(clampStick(10, 10, 0)).toEqual({ x: 0, y: 0 })
    expect(clampStick(NaN, 5, 52).x).toBe(0)
    expect(clampStick(3, 3, -5)).toEqual({ x: 0, y: 0 })
  })
})

describe('Aufzug in Reichweite', () => {
  it('erkennt Nähe zur Aufzugstür jeder Etage und lehnt Ferne und Unsinn ab', () => {
    for (const id of ['floor-lobby', 'floor-herkulesjobs', 'floor-management']) {
      const d = getFloor(id).elevatorDoor
      expect(nearElevator(id, d.x, d.z + 2)).toBe(true)
      expect(nearElevator(id, d.x + 30, d.z)).toBe(false)
    }
    expect(nearElevator('floor-lobby', NaN, 0)).toBe(false)
    expect(nearElevator('floor-lobby', 0, Infinity)).toBe(false)
  })
})
