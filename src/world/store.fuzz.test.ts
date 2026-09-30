import { beforeEach, describe, expect, it } from 'vitest'
import { checkInvariants } from './invariants'
import { mulberry } from './avatar'
import { useWorld } from './store'
import type { WorldSnapshot } from './worldGuards'

const initialState = useWorld.getState()
const snap = () => useWorld.getState() as unknown as WorldSnapshot

/**
 * Fuzzing: zufällige Aktionsfolgen mit feindlichen Argumenten. Nach jeder Aktion müssen alle Invarianten gelten.
 * Mit festem Startwert, damit ein Fehlschlag reproduzierbar ist.
 */
describe('Store Fuzzing (Fehlbedienung)', () => {
  // Jeder Fall startet mit dem unveränderten Anfangszustand
  beforeEach(() => { useWorld.setState(initialState, true) })
  const hostileValues: unknown[] = [undefined, null, NaN, Infinity, -1, 0, 1e9, '', 'x', 'floor-gibt-es-nicht', {}, [], true, false, () => 1, { type: 'agent', id: 'agent-nix' }, { type: 'quatsch', id: 1 }]
  const floors = ['floor-lobby', 'floor-shared', 'floor-herkulesjobs', 'floor-kasselmemes', 'floor-ai-dev', 'floor-management']
  const modes = ['tycoon', 'firstPerson', 'thirdPerson', 'building', 'follow']
  const statuses = ['working', 'idle', 'break', 'waiting', 'meeting', 'offline']

  const run = (seed: number, steps: number) => {
    const r = mulberry(seed)
    const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]
    const anyAgent = () => { const ids = Object.keys(useWorld.getState().agents); return ids.length ? pick(ids) : 'agent-nix' }
    const arg = (): unknown => (r() < 0.45 ? pick(hostileValues) : r() < 0.5 ? pick(floors) : anyAgent())
    const log: string[] = []
    const actions: Record<string, () => void> = {
      setMode: () => useWorld.getState().setMode((r() < 0.5 ? pick(modes) : arg()) as never),
      setFloor: () => useWorld.getState().setFloor((r() < 0.5 ? pick(floors) : arg()) as never, r() < 0.5),
      followAgent: () => useWorld.getState().followAgent((r() < 0.6 ? anyAgent() : arg()) as never),
      select: () => useWorld.getState().select(r() < 0.3 ? null : ({ type: pick(['agent', 'desk', 'computer', 'department', 'elevator', 'quatsch']), id: r() < 0.5 ? anyAgent() : (arg() as string) } as never)),
      setHover: () => useWorld.getState().setHover(r() < 0.3 ? null : ({ type: 'agent', id: anyAgent() } as never)),
      setAgentStatus: () => useWorld.getState().setAgentStatus(anyAgent(), (r() < 0.6 ? pick(statuses) : arg()) as never),
      launchAgents: () => useWorld.getState().launchAgents({ floorId: (r() < 0.6 ? pick(floors) : arg()) as never, departmentId: arg() as never, count: (r() < 0.5 ? Math.floor(r() * 120) : arg()) as never, status: (r() < 0.7 ? 'working' : arg()) as never }),
      removeAgents: () => { const cut = r(); useWorld.getState().removeAgents(() => r() < cut) },
      removeSome: () => { const id = anyAgent(); useWorld.getState().removeAgents((a) => a.id === id) },
      setGraphics: () => useWorld.getState().setGraphics({ [pick(['shadows', 'ao', 'bloom', 'quality', 'labels', 'performanceMode', 'nix'])]: arg() } as never),
      setQuality: () => useWorld.getState().setQuality((r() < 0.5 ? pick(['low', 'medium', 'high']) : arg()) as never),
      setPlayer: () => useWorld.getState().setPlayer({ [pick(['skinVariant', 'hairStyle', 'shirtVariant', 'headwear', 'accessory', 'nix'])]: arg() } as never),
      setTimeMode: () => useWorld.getState().setTimeMode(arg() as never),
      setWallMode: () => useWorld.getState().setWallMode(arg() as never),
      setPanel: () => useWorld.getState().setPanel(arg() as never),
      setMap: () => useWorld.getState().setMap(arg() as never),
      setElevator: () => useWorld.getState().setElevator(arg() as never),
      stress: () => useWorld.getState().stress(arg() as never),
      walkOutside: () => useWorld.getState().walkOutside(),
      enterBuilding: () => useWorld.getState().enterBuilding(),
      rotateView: () => useWorld.getState().rotateView(arg() as never),
      switchFloorSilent: () => useWorld.getState().switchFloorSilent(arg() as never),
      setSimulate: () => useWorld.getState().setSimulate(arg() as never),
    }
    const names = Object.keys(actions)
    for (let i = 0; i < steps; i++) {
      const name = pick(names)
      log.push(name)
      try { actions[name]() } catch (e) { throw new Error(`Aktion ${name} warf: ${String(e)}\nFolge: ${log.slice(-12).join(' > ')}`) }
      const bad = checkInvariants(snap())
      if (bad.length) throw new Error(`Invariante verletzt nach ${name} (Schritt ${i}, Startwert ${seed}): ${bad.join('; ')}\nFolge: ${log.slice(-12).join(' > ')}`)
    }
  }

  for (const seed of [1, 7, 42, 1337, 2026]) {
    it(`hält alle Invarianten über 1500 zufällige Aktionen (Startwert ${seed})`, () => run(seed, 1500))
  }
  it('mit Stress Test und Massenstarts bleibt die Agentenzahl unter dem Limit', () => {
    run(99, 1500)
    expect(Object.keys(useWorld.getState().agents).length).toBeLessThanOrEqual(300)
  })
})
