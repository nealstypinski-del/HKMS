import { describe, expect, it } from 'vitest'
import { connectors, heightAt, laneLength, stepRide, tryBoard, type PlayerLike } from './connectors'
import { FLOOR_H } from './constants'
import { getFloor } from './generate'
import { getNav } from './nav'

const mkPlayer = (floorId: string, x: number, z: number): PlayerLike => ({ x, z, floorId, dy: 0, ride: null })

describe('Treppe und Rolltreppen', () => {
  for (const c of connectors) {
    it(`${c.id}: Ausgangspunkte sind frei und vom Aufzug aus erreichbar`, () => {
      const lower = getNav(c.lower), upper = getNav(c.upper)
      expect(lower.isBlocked(c.lowerExit.x, c.lowerExit.z), 'unterer Ausgang').toBe(false)
      expect(upper.isBlocked(c.upperExit.x, c.upperExit.z), 'oberer Ausgang').toBe(false)
      expect(lower.findPath(getFloor(c.lower).elevatorExit, c.lowerExit)).not.toBeNull()
      expect(upper.findPath(getFloor(c.upper).elevatorExit, c.upperExit)).not.toBeNull()
    })

    it(`${c.id}: Fahrt dauert und endet exakt am Ausgang der richtigen Etage`, () => {
      const dirUp = Math.sign(c.xHigh - c.xLow)
      const startFloor = c.auto === 'down' ? c.upper : c.lower
      const zc = (c.lane.z0 + c.lane.z1) / 2
      const p = mkPlayer(startFloor, 0, zc)
      // Einstiegszone: Punkt mittig darin, Bewegung in Einstiegsrichtung
      const board = startFloor === c.lower ? c.lowerBoard! : c.upperBoard!
      const bx = (board.x0 + board.x1) / 2, bz = (board.z0 + board.z1) / 2
      const c2 = tryBoard(p, bx, bz, startFloor === c.lower ? dirUp : 0, startFloor === c.lower ? 0 : -1)
      expect(c2?.id).toBe(c.id)
      let steps = 0
      let res = null as ReturnType<typeof stepRide>
      let maxDy = 0
      const axis = c.auto === 'down' ? 0 : dirUp
      for (; steps < 3000 && !res; steps++) {
        res = stepRide(p, 1 / 30, axis)
        maxDy = Math.max(maxDy, p.dy)
      }
      expect(res).not.toBeNull()
      const seconds = steps / 30
      const expectedFloor = c.auto === 'down' ? c.lower : c.upper
      expect(res!.floor).toBe(expectedFloor)
      expect(maxDy).toBeGreaterThan(0.5 * FLOOR_H)
      // Fahrzeit stimmt mit Länge und Geschwindigkeit überein (Toleranz für die Zeitschritte)
      const speed = c.kind === 'stairs' ? 2.3 : 0.85
      const expected = laneLength(c) / (c.auto === 'up' ? speed + 0.5 * 1 : speed)
      expect(Math.abs(seconds - expected)).toBeLessThan(expected * 0.08 + 0.2)
      expect(heightAt(1)).toBe(FLOOR_H)
    })
  }

  it('die Einstiegszonen liegen nicht im blockierten Bereich der Navigation, sind also betretbar', () => {
    for (const c of connectors) {
      if (c.lowerBoard) {
        // Ein Punkt vor der Zone muss frei sein
        const x = c.xLow + Math.sign(c.xLow - c.xHigh) * 1.2
        expect(getNav(c.lower).isBlocked(x, (c.lowerBoard.z0 + c.lowerBoard.z1) / 2)).toBe(false)
      }
    }
  })
})
