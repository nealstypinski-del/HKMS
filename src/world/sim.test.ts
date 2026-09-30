import { describe, expect, it } from 'vitest'
import { getFloor } from './generate'
import { getNav } from './nav'
import { WorldSim } from './sim'
import type { Agent, AgentStatus } from './types'

const avatar = { skinVariant: 0, hairStyle: 'short', hairVariant: 0, shirtVariant: 0, trousersVariant: 0, shoesVariant: 0, headwear: 'none', accessory: 'none' } as const

const mk = (i: number, floorId: string, dept: string, status: AgentStatus = 'working'): Agent => ({
  id: `agent-t-${i}`, name: `T${i}`, role: 'Test', provider: 'codex', draft: 'Test', departmentId: dept, floorId, status, avatar: { ...avatar }, simulated: true,
})

const run = (s: WorldSim, agents: Record<string, Agent>, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 30) s.update(1 / 30, agents)
}

describe('Simulation', () => {
  it('startet Agenten, sie laufen ins Büro und sitzen alle an einem eigenen Rechner', () => {
    const floor = getFloor('floor-herkulesjobs')
    const agents: Record<string, Agent> = {}
    const N = 60
    for (let i = 0; i < N; i++) {
      const dept = floor.config.departments.filter((d) => floor.desks.some((x) => x.departmentId === d.id))[i % 4]
      agents[`agent-t-${i}`] = mk(i, floor.config.id, dept.id)
    }
    const s = new WorldSim()
    s.sync(agents, 0.3)
    run(s, agents, 90)
    let seated = 0
    const used = new Set<string>()
    for (const r of s.rt.values()) {
      if (r.phase === 'seated' && r.state === 'working') { seated++; used.add(r.deskId!) }
    }
    expect(seated).toBe(N)
    expect(used.size).toBe(N)
    expect(s.stats.teleports).toBe(0)
  })

  it('keine Figur bleibt an einer Tür hängen (Fortschritt, keine Teleports)', () => {
    const floor = getFloor('floor-kasselmemes')
    const distToSeg = (px: number, pz: number, w: { x0: number; z0: number; x1: number; z1: number }) => {
      const x0 = Math.min(w.x0, w.x1), x1 = Math.max(w.x0, w.x1), z0 = Math.min(w.z0, w.z1), z1 = Math.max(w.z0, w.z1)
      return Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(z0 - pz, 0, pz - z1))
    }
    const depts = floor.config.departments.filter((d) => floor.desks.some((x) => x.departmentId === d.id))
    const agents: Record<string, Agent> = {}
    for (let i = 0; i < 80; i++) agents[`agent-t-${i}`] = mk(i, floor.config.id, depts[i % depts.length].id)
    const s = new WorldSim()
    s.sync(agents, 0.2)
    for (let t = 0; t < 100; t += 1 / 30) {
      s.update(1 / 30, agents)
      for (const r of s.rt.values()) {
        if (r.phase !== 'walk' || r.hidden) continue
        for (const w of floor.walls) {
          // Wandstärke 0.2, Agentenradius 0.3: Mittelpunkt muss mindestens 0.3 von der Wandmitte entfernt sein.
          expect(distToSeg(r.x, r.z, w), `${r.id} berührt Wand bei ${r.x.toFixed(2)},${r.z.toFixed(2)}`).toBeGreaterThan(0.2)
        }
      }
    }
    expect(s.stats.teleports).toBe(0)
    for (const r of s.rt.values()) expect(['seated', 'standing']).toContain(r.phase)
  })

  it('Überlauf: mehr Agenten als Schreibtische warten und übernehmen freie Plätze', () => {
    const floor = getFloor('floor-shared')
    const cap = floor.desks.length
    const agents: Record<string, Agent> = {}
    for (let i = 0; i < cap + 6; i++) agents[`agent-t-${i}`] = mk(i, floor.config.id, 'dept-shared-ops')
    const s = new WorldSim()
    s.sync(agents, 0.05)
    run(s, agents, 80)
    const seated = [...s.rt.values()].filter((r) => r.phase === 'seated').length
    expect(seated).toBe(cap)
    // Zwei Agenten gehen in die Pause → zwei Wartende rücken nach.
    agents['agent-t-0'] = { ...agents['agent-t-0'], status: 'break' }
    agents['agent-t-1'] = { ...agents['agent-t-1'], status: 'break' }
    run(s, agents, 40)
    const working = [...s.rt.values()].filter((r) => r.phase === 'seated' && r.state === 'working').length
    expect(working).toBe(cap)
    expect(s.stats.teleports).toBe(0)
  })

  it('Statuswechsel: idle → Bank/Sofa, break → Küche, offline → verborgen', () => {
    const floor = getFloor('floor-lobby')
    const agents: Record<string, Agent> = {
      'agent-t-0': mk(0, floor.config.id, 'dept-shared', 'idle'),
      'agent-t-1': mk(1, floor.config.id, 'dept-shared', 'break'),
      'agent-t-2': mk(2, floor.config.id, 'dept-shared', 'offline'),
    }
    const s = new WorldSim()
    s.sync(agents, 0.1)
    run(s, agents, 40)
    expect(s.get('agent-t-0')!.state).toBe('sitting')
    expect(['break', 'sitting']).toContain(s.get('agent-t-1')!.state)
    expect(s.get('agent-t-2')!.hidden).toBe(true)
  })

  for (const fid of ['floor-herkulesjobs', 'floor-kasselmemes']) {
    it(`${fid}: Agenten gehen in den Konferenzraum und sitzen auf verschiedenen Stühlen`, () => {
      const floor = getFloor(fid)
      const chairs = floor.seats.filter((x) => x.kind === 'chair')
      expect(chairs.length).toBeGreaterThanOrEqual(10)
      const agents: Record<string, Agent> = {}
      for (let i = 0; i < 8; i++) agents[`agent-t-${i}`] = mk(i, fid, floor.config.departments[0].id, 'meeting')
      const s = new WorldSim()
      s.sync(agents, 0.2)
      run(s, agents, 60)
      const seatIds = new Set<string>()
      for (const r of s.rt.values()) {
        expect(r.phase).toBe('seated')
        expect(r.state).toBe('meeting')
        seatIds.add(r.goal!.id)
        // Sitzhöhe erreicht und Figur steht im Raum des Konferenzzimmers
        expect(r.sit).toBe(1)
        const zone = floor.zones.find((z) => z.config.type === 'meeting')!.config.rect
        expect(r.x).toBeGreaterThan(zone.x0); expect(r.x).toBeLessThan(zone.x1)
        expect(r.z).toBeGreaterThan(zone.z0); expect(r.z).toBeLessThan(zone.z1)
      }
      expect(seatIds.size).toBe(8)
      expect(s.stats.teleports).toBe(0)
    })
  }
})
