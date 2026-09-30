import { describe, expect, it } from 'vitest'
import { cameraWallClamp, WALL_TOP } from './cameraClamp'
import { floorBaseY } from './constants'

const F = 'floor-herkulesjobs'
const base = floorBaseY(2)

describe('Kamerakollision gegen Wände', () => {
  it('bremst die Kamera vor einer geschlossenen Glaswand', () => {
    // Spieler im Korridor, Kamera dahinter südlich der Wand bei z = 3 (Südreihe, ohne Türlücke bei x = -12,5)
    const target = { x: -12.5, y: base + 1.35, z: -1.4 }
    const cam = { x: -12.5, y: base + 3.0, z: 4.0 }
    const t = cameraWallClamp(F, target, cam, base, WALL_TOP.high)
    expect(t).toBeLessThan(1)
    // Kamera bleibt auf der Korridorseite der Wand
    const z = target.z + (cam.z - target.z) * t
    expect(z).toBeLessThanOrEqual(3.0001)
  })
  it('lässt die Kamera durch eine Türlücke', () => {
    const target = { x: -14.75, y: base + 1.35, z: -1.4 }
    const cam = { x: -14.75, y: base + 3.0, z: 4.0 }
    expect(cameraWallClamp(F, target, cam, base, WALL_TOP.high)).toBe(1)
  })
  it('im Wandmodus halb blockiert nur eine Kamera unter der Brüstung, darüber nicht', () => {
    const target = { x: -12.5, y: base + 1.35, z: -1.4 }
    expect(cameraWallClamp(F, target, { x: -12.5, y: base + 3.0, z: 4.0 }, base, WALL_TOP.half)).toBe(1)
    expect(cameraWallClamp(F, target, { x: -12.5, y: base + 0.6, z: 4.0 }, base, WALL_TOP.half)).toBeLessThan(1)
  })
  it('im Wandmodus weg gibt es keine Kollision', () => {
    expect(cameraWallClamp(F, { x: -12.5, y: base + 1, z: -1.4 }, { x: -12.5, y: base + 1, z: 9 }, base, WALL_TOP.none)).toBe(1)
  })
  it('eine Kamera oberhalb der Wandoberkante fliegt frei darüber', () => {
    expect(cameraWallClamp(F, { x: -12.5, y: base + 1.35, z: -1.4 }, { x: -12.5, y: base + 4.6, z: 4.0 }, base, WALL_TOP.high)).toBe(1)
  })
})
