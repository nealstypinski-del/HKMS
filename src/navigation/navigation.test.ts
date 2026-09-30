import { describe, expect, it } from 'vitest'
import { layoutOf } from '../config/floorLayouts'
import { planRoute } from './routes'
import { SlotAllocator, slotsOf } from './slots'

describe('Navigation', () => {
  it('erzeugt eine Route auf derselben Etage ohne Aufzug', () => {
    const bench = slotsOf(0, 'agentBench')[0]!
    const kitchen = slotsOf(0, 'kitchen')[0]!
    const legs = planRoute({ floor: 0, x: bench.x, z: bench.z }, kitchen)
    expect(legs.every((l) => l.kind === 'walk')).toBe(true)
    expect(legs.length).toBeGreaterThan(1)
  })

  it('nutzt den Aufzug zwischen Etagen und fasst mehrere Etagen zu einer Fahrt zusammen', () => {
    const bench = slotsOf(0, 'agentBench')[0]!
    const legs = planRoute({ floor: 3, x: -10, z: -5 }, bench)
    const rides = legs.filter((l) => l.kind === 'ride')
    expect(rides).toHaveLength(1)
    expect(rides[0]).toMatchObject({ fromFloor: 3, toFloor: 0 })
    const last = legs[legs.length - 1]!
    expect(last).toMatchObject({ kind: 'walk', x: bench.x, z: bench.z })
  })

  it('jede Etage hat Meeting Plätze und einen Aufzugsknoten', () => {
    for (let f = 1; f <= 3; f++) {
      expect(slotsOf(f, 'meetingRoom').length).toBeGreaterThanOrEqual(5)
      expect(layoutOf(f).nodes.some((n) => n.id === `f${f}-elevator`)).toBe(true)
    }
  })
})

describe('SlotAllocator', () => {
  it('vergibt Plätze exklusiv und gibt sie wieder frei', () => {
    const alloc = new SlotAllocator()
    const slots = slotsOf(0, 'agentBench')
    const a = alloc.claim('a', slots)!
    const b = alloc.claim('b', slots)!
    expect(a.id).not.toBe(b.id)
    expect(alloc.claim('a', slots)!.id).toBe(a.id)
    alloc.release('a')
    expect(alloc.claim('c', slots)!.id).toBe(a.id)
  })

  it('liefert undefined, wenn alles belegt ist', () => {
    const alloc = new SlotAllocator()
    const slots = slotsOf(0, 'kitchen')
    slots.forEach((_, i) => alloc.claim(`x${i}`, slots))
    expect(alloc.claim('extra', slots)).toBeUndefined()
  })
})

describe('Konferenzraum', () => {
  it('führt Wege zu Meeting Plätzen durch die Tür an der Nordwand', () => {
    const slot = slotsOf(1, 'meetingRoom')[0]!
    const legs = planRoute({ floor: 1, x: -6, z: 0.6 }, slot)
    const door = legs.find((l) => l.kind === 'walk' && Math.abs(l.x + 6) < 0.2 && Math.abs(l.z - 1.9) < 0.2)
    expect(door).toBeDefined()
  })
})
