import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BUILDING } from './buildingConfig'
import { getFloor } from './generate'
import { NavGrid } from './nav'
import { WorldSim } from './sim'
import type { Agent } from './types'

const avatar = { skinVariant: 0, hairStyle: 'short', hairVariant: 0, shirtVariant: 0, trousersVariant: 0, shoesVariant: 0, headwear: 'none', accessory: 'none' } as const
const mk = (i: number, floorId: string, dept: string): Agent => ({
  id: `agent-p-${i}`, name: `P${i}`, role: 'Test', provider: 'codex', departmentId: dept, floorId, status: 'working', avatar: { ...avatar }, simulated: true, draft: 'x',
})
const stats = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b)
  return { avg: v.reduce((a, b) => a + b, 0) / v.length, p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] }
}

// Misst reine Logikkosten (Node/V8). Die Grenzen sind bewusst großzügig, sie fangen nur grobe Rückschritte ab.
describe('Leistung der Logik', () => {
  it('Navigationsgitter, Wegsuche und Simulation mit 100 Agenten', () => {
    const out: Record<string, unknown> = {}
    // Gitteraufbau je Etage
    const build = BUILDING.floors.map((f) => { const t = performance.now(); new NavGrid(getFloor(f.id)); return performance.now() - t })
    out.navBuildMs = stats(build)
    expect(Math.max(...build)).toBeLessThan(300)

    // Wegsuche: Aufzug bis zu jedem Schreibtisch der HerkulesJobs Etage
    const floor = getFloor('floor-herkulesjobs')
    const nav = new NavGrid(floor)
    const times: number[] = []
    for (const d of floor.desks) { const t = performance.now(); nav.findPath(floor.elevatorExit, d.approach); times.push(performance.now() - t) }
    out.astar = { queries: times.length, ...stats(times) }
    expect(stats(times).max).toBeLessThan(60)

    // Simulation: 100 Agenten, Verteilung auf alle Abteilungen mit Schreibtischen
    const depts = floor.config.departments.filter((d) => floor.desks.some((x) => x.departmentId === d.id))
    const agents: Record<string, Agent> = {}
    for (let i = 0; i < 100; i++) agents[`agent-p-${i}`] = mk(i, floor.config.id, depts[i % depts.length].id)
    const s = new WorldSim()
    s.sync(agents, 0.25)
    const frame: number[] = []
    let settledAt = -1
    for (let f = 0; f < 30 * 120; f++) {
      const t = performance.now()
      s.update(1 / 30, agents)
      frame.push(performance.now() - t)
      if (settledAt < 0 && [...s.rt.values()].every((r) => r.phase === 'seated' || r.phase === 'standing')) settledAt = f / 30
    }
    const seated = [...s.rt.values()].filter((r) => r.phase === 'seated' && r.state === 'working').length
    const waiting = [...s.rt.values()].filter((r) => r.phase === 'standing').length
    out.sim = { agents: 100, deskCapacity: floor.desks.length, seatedWorking: seated, waitingStanding: waiting, allSettledAtSimSeconds: settledAt, frameMs: stats(frame), teleports: s.stats.teleports, repaths: s.stats.repaths }
    expect(s.stats.teleports).toBe(0)
    expect(seated).toBe(Math.min(100, floor.desks.length))
    expect(stats(frame).p95).toBeLessThan(5)
    writeFileSync(process.env.PERF_OUT ?? '/tmp/hq-perf.json', JSON.stringify(out, null, 2))
  })
})
