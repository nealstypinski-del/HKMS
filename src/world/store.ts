import { create } from 'zustand'
import { BUILDING } from './buildingConfig'
import { DEFAULT_PLAYER } from './avatar'
import { worldEvents } from './events'
import { player } from './player'
import { deptsWithDesks, floorOfDepartment, initialAgents, makeAgent } from './mockAgents'
import type { Agent, AgentStatus, Avatar } from './types'

export type CameraMode = 'tycoon' | 'firstPerson' | 'thirdPerson' | 'building' | 'follow'
export type TimeMode = 'auto' | 'day' | 'evening' | 'night'
export type Quality = 'low' | 'medium' | 'high'

export interface Graphics {
  quality: Quality
  shadows: boolean
  ao: boolean
  bloom: boolean
  labels: boolean
  activityFx: boolean
  reflections: boolean
  hqLighting: boolean
  background: boolean
  performanceMode: boolean
}

export const QUALITY_PRESETS: Record<Quality, Omit<Graphics, 'quality' | 'labels' | 'performanceMode'>> = {
  low: { shadows: false, ao: false, bloom: false, activityFx: false, reflections: false, hqLighting: false, background: true },
  medium: { shadows: true, ao: false, bloom: true, activityFx: true, reflections: false, hqLighting: false, background: true },
  high: { shadows: true, ao: true, bloom: true, activityFx: true, reflections: true, hqLighting: true, background: true },
}

/** Wirksame Einstellungen: der Performance Modus schaltet alle teuren Effekte ab. */
const effCache = new WeakMap<Graphics, Graphics>()
export function effectiveGraphics(g: Graphics): Graphics {
  if (!g.performanceMode) return g
  // Gecacht, damit Zustand Selektoren eine stabile Referenz bekommen (sonst Endlosschleife im Rendering).
  let e = effCache.get(g)
  if (!e) { e = { ...g, shadows: false, ao: false, bloom: false, reflections: false, hqLighting: false, activityFx: false }; effCache.set(g, e) }
  return e
}

export type Selection =
  | { type: 'agent' | 'desk' | 'computer' | 'department' | 'elevator'; id: string }
  | null

const LS = 'herkules-hq-v1'
interface Persisted { graphics?: Graphics; player?: Avatar; timeMode?: TimeMode }
const load = (): Persisted => {
  try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} }
}
const persist = (p: Persisted) => { try { localStorage.setItem(LS, JSON.stringify(p)) } catch { /* Speicher nicht verfügbar */ } }

const saved = load()
const defaultGraphics: Graphics = { quality: 'medium', labels: true, performanceMode: false, ...QUALITY_PRESETS.medium }

export const DEFAULT_FLOOR = 'floor-herkulesjobs'

interface WorldStore {
  // Business-Zustand (Adapter zu Terminal 1): Agenten kommen von außen, hier nur Mock-Daten.
  agents: Record<string, Agent>
  agentsVersion: number
  selection: Selection
  hover: Selection

  // Sicht
  cameraMode: CameraMode
  floorId: string
  followId: string | null
  timeMode: TimeMode
  graphics: Graphics
  player: Avatar
  simulateActivity: boolean

  // UI
  panel: null | 'floors' | 'graphics' | 'character' | 'launch' | 'view'
  mapOpen: boolean
  elevatorOpen: boolean
  showPerf: boolean
  transition: number // steigt bei Etagenwechsel, löst den Fade aus
  /** Spieler steht im Freien vor dem Gebäude (Erdgeschoss, Ego). */
  outside: boolean
  setOutside: (b: boolean) => void
  /** Spieler befindet sich auf Treppe oder Rolltreppe: obere Etage wird mit gerendert. */
  climbing: boolean
  setClimbing: (b: boolean) => void
  /** Etagenwechsel ohne Überblendung (Treppe, Rolltreppe). */
  switchFloorSilent: (id: string) => void
  enterBuilding: () => void
  walkOutside: () => void

  setMode: (m: CameraMode) => void
  setFloor: (id: string, keepMode?: boolean) => void
  followAgent: (id: string | null) => void
  select: (s: Selection) => void
  setHover: (s: Selection) => void
  setPanel: (p: WorldStore['panel']) => void
  setMap: (o: boolean) => void
  setElevator: (o: boolean) => void
  setTimeMode: (t: TimeMode) => void
  setGraphics: (patch: Partial<Graphics>) => void
  setQuality: (q: Quality) => void
  setPlayer: (patch: Partial<Avatar>) => void
  setSimulate: (b: boolean) => void
  togglePerf: () => void

  // Agenten
  setAgentStatus: (id: string, s: AgentStatus) => void
  launchAgents: (opts: { floorId?: string; departmentId?: string; count: number; status?: AgentStatus }) => string[]
  removeAgents: (filter: (a: Agent) => boolean) => void
  stress: (n: number) => void
}

export const useWorld = create<WorldStore>((set, get) => ({
  agents: Object.fromEntries(initialAgents().map((a) => [a.id, a])),
  agentsVersion: 1,
  selection: null,
  hover: null,

  cameraMode: 'thirdPerson',
  floorId: 'floor-lobby',
  followId: null,
  timeMode: saved.timeMode ?? 'auto',
  graphics: saved.graphics ?? defaultGraphics,
  player: saved.player ?? DEFAULT_PLAYER,
  simulateActivity: true,

  panel: null,
  mapOpen: false,
  elevatorOpen: false,
  showPerf: true,
  transition: 0,
  outside: true,
  setOutside: (b) => set({ outside: b }),
  climbing: false,
  setClimbing: (b) => set({ climbing: b }),
  switchFloorSilent: (id) => { player.skipSpawn = true; set({ floorId: id, climbing: false }) },
  // Vor das Gebäude stellen und in Ego Ansicht wechseln: man läuft selbst durch den Eingang hinein.
  walkOutside: () => {
    player.x = 0; player.z = 26; player.yaw = Math.PI; player.floorId = 'floor-lobby'; player.skipSpawn = true; player.dy = 0; player.ride = null
    set((s) => ({ floorId: 'floor-lobby', cameraMode: 'thirdPerson', outside: true, mapOpen: false, panel: null, transition: s.transition + 1 }))
  },
  enterBuilding: () => {
    player.x = 0; player.z = 12.9; player.yaw = Math.PI; player.floorId = 'floor-lobby'; player.skipSpawn = true; player.dy = 0; player.ride = null
    set((s) => ({ floorId: 'floor-lobby', cameraMode: 'thirdPerson', outside: false, mapOpen: false, panel: null, transition: s.transition + 1 }))
  },

  setMode: (m) => set({ cameraMode: m, followId: m === 'follow' ? get().followId : null, mapOpen: false }),
  setFloor: (id, keepMode = true) => {
    if (get().floorId === id) { if (!keepMode) set({ cameraMode: 'tycoon' }); return }
    set((s) => ({ floorId: id, transition: s.transition + 1, elevatorOpen: false, cameraMode: keepMode ? s.cameraMode : 'tycoon' }))
  },
  followAgent: (id) => set((s) => {
    if (!id) return { followId: null, cameraMode: 'tycoon' as CameraMode }
    const a = s.agents[id]
    return { followId: id, cameraMode: 'follow' as CameraMode, floorId: a ? a.floorId : s.floorId, selection: { type: 'agent' as const, id }, transition: a && a.floorId !== s.floorId ? s.transition + 1 : s.transition }
  }),
  select: (sel) => {
    set({ selection: sel })
    const st = get()
    if (!sel) return
    if (sel.type === 'agent') worldEvents.emit('onAgentSelected', { agentId: sel.id })
    else if (sel.type === 'desk') worldEvents.emit('onDeskSelected', { deskId: sel.id, floorId: st.floorId })
    else if (sel.type === 'computer') worldEvents.emit('onComputerSelected', { computerId: sel.id, floorId: st.floorId })
    else if (sel.type === 'department') worldEvents.emit('onDepartmentSelected', { departmentId: sel.id, floorId: floorOfDepartment(sel.id) ?? st.floorId })
    else worldEvents.emit('onElevatorSelected', { floorId: st.floorId })
  },
  setHover: (h) => set({ hover: h }),
  setPanel: (p) => set({ panel: p }),
  setMap: (o) => set({ mapOpen: o }),
  setElevator: (o) => set({ elevatorOpen: o }),
  setTimeMode: (t) => { set({ timeMode: t }); persist({ ...load(), graphics: get().graphics, player: get().player, timeMode: t }) },
  setGraphics: (patch) => {
    const g = { ...get().graphics, ...patch }
    set({ graphics: g })
    persist({ graphics: g, player: get().player, timeMode: get().timeMode })
  },
  setQuality: (q) => {
    const g = { ...get().graphics, ...QUALITY_PRESETS[q], quality: q }
    set({ graphics: g })
    persist({ graphics: g, player: get().player, timeMode: get().timeMode })
  },
  setPlayer: (patch) => {
    const p = { ...get().player, ...patch }
    set({ player: p })
    persist({ graphics: get().graphics, player: p, timeMode: get().timeMode })
  },
  setSimulate: (b) => set({ simulateActivity: b }),
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),

  setAgentStatus: (id, status) => set((s) => {
    const a = s.agents[id]
    if (!a || a.status === status) return s
    return { agents: { ...s.agents, [id]: { ...a, status } }, agentsVersion: s.agentsVersion + 1 }
  }),

  launchAgents: ({ floorId, departmentId, count, status = 'working' }) => {
    const floor = floorId ?? get().floorId
    const depts = departmentId ? [departmentId] : deptsWithDesks(floor).map((d) => d.id)
    const fallback = BUILDING.floors.find((f) => f.id === floor)!.departments[0].id
    const created: Agent[] = []
    for (let i = 0; i < count; i++) created.push(makeAgent(depts.length ? depts[i % depts.length] : fallback, status))
    set((s) => ({ agents: { ...s.agents, ...Object.fromEntries(created.map((a) => [a.id, a])) }, agentsVersion: s.agentsVersion + 1 }))
    return created.map((a) => a.id)
  },

  removeAgents: (filter) => set((s) => {
    const agents = Object.fromEntries(Object.entries(s.agents).filter(([, a]) => !filter(a)))
    return { agents, agentsVersion: s.agentsVersion + 1, selection: s.selection?.type === 'agent' && !agents[s.selection.id] ? null : s.selection }
  }),

  stress: (n) => {
    const st = get()
    st.removeAgents((a) => a.id.startsWith('agent-stress-'))
    if (n <= 0) return
    const depts = deptsWithDesks(st.floorId).map((d) => d.id)
    const dl = depts.length ? depts : [BUILDING.floors.find((f) => f.id === st.floorId)!.departments[0].id]
    const mix: AgentStatus[] = ['working', 'working', 'working', 'working', 'idle', 'break', 'waiting']
    const list: Agent[] = []
    for (let i = 0; i < n; i++) {
      const a = makeAgent(dl[i % dl.length], mix[i % mix.length])
      list.push({ ...a, id: a.id.replace('agent-', 'agent-stress-') })
    }
    set((s) => ({ agents: { ...s.agents, ...Object.fromEntries(list.map((a) => [a.id, a])) }, agentsVersion: s.agentsVersion + 1 }))
  },
}))

export const useAgent = (id: string) => useWorld((s) => s.agents[id])

/** Wandelt die Tageszeit in einen Wert 0 = Nacht ... 1 = Tag. */
export function timeOfDay(mode: TimeMode, now = new Date()): number {
  if (mode === 'day') return 1
  if (mode === 'evening') return 0.45
  if (mode === 'night') return 0
  const h = now.getHours() + now.getMinutes() / 60
  if (h >= 8 && h <= 17) return 1
  if (h >= 17 && h < 20) return 1 - ((h - 17) / 3) * 0.9
  if (h >= 5 && h < 8) return ((h - 5) / 3)
  return 0
}
