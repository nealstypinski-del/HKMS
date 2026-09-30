import { describe, expect, it } from 'vitest'
import { spawnPlayer, stepPlayer, type PlayerState } from './playerPhysics'

/** Steuert die Figur wie ein Nutzer: immer auf den nächsten Wegpunkt zu. */
function follow(p: PlayerState, waypoints: Array<[number, number]>, maxSeconds = 90, dt = 1 / 60): number {
  let t = 0
  for (const [wx, wz] of waypoints) {
    while (t < maxSeconds) {
      const dx = wx - p.x
      const dz = wz - p.z
      if (Math.hypot(dx, dz) < 0.25) break
      stepPlayer(p, dx, dz, false, dt)
      t += dt
    }
  }
  for (let i = 0; i < 30; i++) stepPlayer(p, 0, 0, false, dt)
  return t
}

describe('Spielerphysik', () => {
  it('geht in der Lobby geradeaus ohne Höhenänderung', () => {
    const p = spawnPlayer()
    follow(p, [[3, 2.2]])
    expect(p.x).toBeGreaterThan(2.7)
    expect(p.y).toBe(0)
  })

  it('steigt über die Treppe von Etage 0 auf Etage 1', () => {
    const p = spawnPlayer()
    const seconds = follow(p, [[3.5, 2.2], [3.5, 5.6], [8.0, 5.6], [9.2, 5.8], [9.2, 7.0], [7.0, 7.0], [3.0, 7.0]])
    expect(p.y).toBeGreaterThan(5.9)
    expect(p.level).toBe(1)
    expect(seconds).toBeLessThan(45)
  })

  it('Treppe funktioniert auch bei niedriger Bildrate (0,05 s pro Bild)', () => {
    const p = spawnPlayer()
    follow(p, [[3.5, 1.8], [3.5, 5.6], [8.0, 5.6], [9.2, 5.9], [9.2, 7.0], [7.0, 7.0], [3.0, 7.0]], 90, 0.05)
    expect(p.y).toBeGreaterThan(5.9)
    expect(p.level).toBe(1)
  })

  it('Rolltreppe trägt hinauf und wieder hinunter', () => {
    const up = spawnPlayer()
    up.x = -8.6
    up.z = 6.0
    follow(up, [[-7.0, 6.0]])
    const before = up.x
    // Loslassen: die Rolltreppe transportiert weiter
    for (let i = 0; i < 60 * 25; i++) stepPlayer(up, 0, 0, false, 1 / 60)
    expect(up.x).toBeGreaterThan(before + 5)
    expect(up.y).toBeGreaterThan(5.5)

    const down = spawnPlayer()
    down.x = 3.2
    down.z = 7.2
    down.y = 6
    follow(down, [[1.5, 7.2]])
    for (let i = 0; i < 60 * 25; i++) stepPlayer(down, 0, 0, false, 1 / 60)
    expect(down.y).toBeLessThan(0.5)
    expect(down.level).toBe(0)
  })

  it('läuft nicht durch Schreibtische und fällt nicht durch Geländer', () => {
    const p = spawnPlayer()
    p.x = -10.2
    p.z = 0.6
    p.y = 6
    p.level = 1
    for (let i = 0; i < 240; i++) stepPlayer(p, 0, -1, false, 1 / 60)
    expect(p.z).toBeGreaterThan(-2.4 + 0.43)
    expect(p.y).toBe(6)
  })

  it('Geländer hält die Figur an der Deckenöffnung der Treppe', () => {
    const p = spawnPlayer()
    p.x = 8
    p.z = 5.4
    p.y = 6
    p.level = 1
    for (let i = 0; i < 240; i++) stepPlayer(p, 0, 1, false, 1 / 60)
    expect(p.y).toBeGreaterThan(5.9)
  })
})
