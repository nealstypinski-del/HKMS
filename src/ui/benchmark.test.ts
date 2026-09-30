import { beforeEach, describe, expect, it } from 'vitest'
import { useWorld } from '../world/store'
import { bench, cancelBenchmark, runBenchmark } from './perf'

const initialState = useWorld.getState()
const now = () => useWorld.getState()
const instant = () => Promise.resolve()

describe('Benchmark: Fehlbedienung und Aufräumen', () => {
  beforeEach(() => {
    useWorld.setState(initialState, true)
    bench.running = false; bench.cancelRequested = false; bench.rows = []; bench.note = ''
  })

  it('läuft normal durch, räumt auf und stellt die Ansicht wieder her', async () => {
    now().setMode('thirdPerson')
    const before = Object.keys(now().agents).length
    const out = await runBenchmark(() => 1, { levels: [0, 10], wait: instant, hidden: () => false })
    expect(out).toBe('done')
    expect(bench.running).toBe(false)
    expect(bench.rows.map((r) => r.agents)).toEqual([0, 10])
    expect(now().benchmarkRunning).toBe(false)
    expect(now().cameraMode).toBe('thirdPerson')
    expect(Object.keys(now().agents).length).toBe(before) // Teststräger entfernt
  })

  it('ein Fehler mitten im Lauf lässt den Benchmark nicht gesperrt zurück', async () => {
    let calls = 0
    const out = await runBenchmark(() => 1, { levels: [10, 25], hidden: () => false, wait: () => { if (++calls === 2) throw new Error('kaputt'); return Promise.resolve() } })
    expect(out).toBe('error')
    expect(bench.running).toBe(false)
    expect(now().benchmarkRunning).toBe(false)
    expect(bench.note).toContain('kaputt')
    expect(Object.keys(now().agents).filter((k) => k.startsWith('agent-stress-'))).toHaveLength(0)
    // Ein neuer Lauf ist danach möglich
    expect(await runBenchmark(() => 1, { levels: [0], wait: instant, hidden: () => false })).toBe('done')
  })

  it('Abbrechen beendet den Lauf sofort und räumt auf', async () => {
    const out = await runBenchmark(() => 1, { levels: [10, 25, 50], hidden: () => false, wait: () => { cancelBenchmark(); return Promise.resolve() } })
    expect(out).toBe('cancelled')
    expect(bench.note).toBe('Abgebrochen')
    expect(bench.rows).toHaveLength(0)
    expect(now().benchmarkRunning).toBe(false)
  })

  it('bricht ab, wenn der Tab im Hintergrund ist (sonst wären die Zahlen ungültig)', async () => {
    const out = await runBenchmark(() => 1, { levels: [10], wait: instant, hidden: () => true })
    expect(out).toBe('hidden')
    expect(bench.note).toContain('Hintergrund')
  })

  it('ein zweiter gleichzeitiger Start wird abgelehnt', async () => {
    const first = runBenchmark(() => 1, { levels: [0], wait: () => new Promise((r) => setTimeout(r, 20)), hidden: () => false })
    expect(await runBenchmark(() => 1, { levels: [0], wait: instant })).toBe('busy')
    expect(await first).toBe('done')
  })

  it('während des Laufs sind Start, Löschen und Stresstest gesperrt', async () => {
    const ids = Object.keys(now().agents)
    let checked = false
    await runBenchmark(() => 1, {
      levels: [10], hidden: () => false,
      wait: () => {
        if (!checked) {
          checked = true
          const n = Object.keys(now().agents).length
          expect(now().launchAgents({ count: 5 })).toEqual([])
          now().removeAgents(() => true)
          now().stress(50)
          expect(Object.keys(now().agents).length).toBe(n) // unverändert
          expect(now().notice).toContain('Benchmark')
        }
        return Promise.resolve()
      },
    })
    expect(checked).toBe(true)
    // Nach dem Lauf sind die Aktionen wieder frei
    expect(now().launchAgents({ count: 2 })).toHaveLength(2)
    expect(Object.keys(now().agents)).toEqual(expect.arrayContaining(ids))
  })

  it('Messwerte ohne Bilder gelten als ungültig statt als 0 FPS Ergebnis', async () => {
    await runBenchmark(() => 1, { levels: [0], wait: instant, hidden: () => false })
    expect(bench.rows[0].valid).toBe(false)
  })
})

describe('Panels schließen sich gegenseitig', () => {
  beforeEach(() => { useWorld.setState(initialState, true) })
  it('Karte, Panel und Aufzugswahl sind nie gleichzeitig offen', () => {
    const s = () => useWorld.getState()
    s().setPanel('graphics'); s().setMap(true)
    expect(s().panel).toBeNull(); expect(s().mapOpen).toBe(true)
    s().setPanel('launch')
    expect(s().mapOpen).toBe(false); expect(s().panel).toBe('launch')
    s().setElevator(true)
    expect(s().panel).toBeNull(); expect(s().elevatorOpen).toBe(true)
    s().setMap(true)
    expect(s().elevatorOpen).toBe(false)
  })
})
