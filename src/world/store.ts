import { create } from 'zustand'
import { BUILDING } from './buildingConfig'
import { worldEvents } from './events'
import { allowedLaunch, limitMessage, sanitizeCount, MAX_LAUNCH_AT_ONCE } from './limits'
import { effectiveGraphics, QUALITIES, QUALITY_PRESETS, TIME_MODES, WALL_MODES, type Graphics, type Quality, type TimeMode, type WallModeSetting } from './graphicsSettings'
import { loadPersisted, sanitizeAvatar, sanitizeGraphics, savePersisted } from './persist'
import { isAgentStatus, isCameraMode, isFloorId, isPanel, isSelectionType } from './worldGuards'
import { player } from './player'
import { deptsWithDesks, floorOfDepartment, initialAgents, makeAgent } from './mockAgents'
import type { Agent, AgentStatus, Avatar } from './types'

export type CameraMode = 'tycoon' | 'firstPerson' | 'thirdPerson' | 'building' | 'follow'
export type { Graphics, Quality, TimeMode, WallModeSetting }
export { QUALITY_PRESETS, effectiveGraphics }

export type Selection =
  | { type: 'agent' | 'desk' | 'computer' | 'department' | 'elevator'; id: string }
  | null

const saved = loadPersisted()

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
  /** Sims Wandmodus: hoch (Glas), halb (Brüstung), weg. */
  notice: string | null
  setNotice: (n: string | null) => void
  wallMode: WallModeSetting
  setWallMode: (m: WallModeSetting) => void
  /** Zähler: jede Erhöhung dreht die Übersichtskamera um 90 Grad (Vorzeichen in viewRotateDir). */
  viewRotate: number
  viewRotateDir: 1 | -1
  rotateView: (dir: 1 | -1) => void

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
  timeMode: saved.timeMode,
  graphics: saved.graphics,
  player: saved.player,
  simulateActivity: true,
  notice: null,
  setNotice: (n) => set({ notice: n }),
  wallMode: 'high',
  setWallMode: (m) => { if ((WALL_MODES as readonly unknown[]).includes(m)) set({ wallMode: m }) },
  viewRotate: 0,
  viewRotateDir: 1,
  rotateView: (dir) => { if (dir === 1 || dir === -1) set((s) => ({ viewRotate: s.viewRotate + 1, viewRotateDir: dir })) },

  panel: null,
  mapOpen: false,
  elevatorOpen: false,
  showPerf: true,
  transition: 0,
  outside: true,
  setOutside: (b) => set({ outside: b === true }),
  climbing: false,
  setClimbing: (b) => set({ climbing: b === true }),
  switchFloorSilent: (id) => { if (!isFloorId(id)) return; player.skipSpawn = true; set({ floorId: id, climbing: false }) },
  // Vor das Gebäude stellen und in Ego Ansicht wechseln: man läuft selbst durch den Eingang hinein.
  walkOutside: () => {
    player.x = 0; player.z = 26; player.yaw = Math.PI; player.floorId = 'floor-lobby'; player.skipSpawn = true; player.dy = 0; player.ride = null
    set((s) => ({ floorId: 'floor-lobby', cameraMode: 'thirdPerson', outside: true, climbing: false, followId: null, mapOpen: false, panel: null, transition: s.transition + 1 }))
  },
  enterBuilding: () => {
    player.x = 0; player.z = 12.9; player.yaw = Math.PI; player.floorId = 'floor-lobby'; player.skipSpawn = true; player.dy = 0; player.ride = null
    set((s) => ({ floorId: 'floor-lobby', cameraMode: 'thirdPerson', outside: false, climbing: false, followId: null, mapOpen: false, panel: null, transition: s.transition + 1 }))
  },

  setMode: (m) => {
    if (!isCameraMode(m)) return
    const st = get()
    // Folgen braucht einen vorhandenen Agenten, sonst bliebe die Ansicht ohne Ziel hängen.
    if (m === 'follow' && !(st.followId && st.agents[st.followId])) return
    set({ cameraMode: m, followId: m === 'follow' ? st.followId : null, mapOpen: false })
  },
  setFloor: (id, keepMode = true) => {
    if (!isFloorId(id)) return
    const st = get()
    if (st.floorId === id) { if (keepMode === false) set({ cameraMode: 'tycoon', followId: null }); return }
    // Wechsel der Etage beendet Folgen und Fahrt und verwirft Auswahlen, die zur alten Etage gehören.
    const keepSel = st.selection?.type === 'agent' ? st.selection : null
    set((s) => ({
      floorId: id, transition: s.transition + 1, elevatorOpen: false, climbing: false,
      cameraMode: keepMode === false || s.cameraMode === 'follow' ? ('tycoon' as CameraMode) : s.cameraMode,
      followId: null, selection: keepSel, hover: null,
    }))
  },
  followAgent: (id) => set((s) => {
    if (!id) return { followId: null, cameraMode: s.cameraMode === 'follow' ? ('tycoon' as CameraMode) : s.cameraMode }
    const a = typeof id === 'string' ? s.agents[id] : undefined
    if (!a) return s // unbekannter oder gelöschter Agent: nichts ändern
    return { followId: id, cameraMode: 'follow' as CameraMode, floorId: a.floorId, climbing: false, selection: { type: 'agent' as const, id }, transition: a.floorId !== s.floorId ? s.transition + 1 : s.transition }
  }),
  select: (sel) => {
    if (sel === null) { set({ selection: null }); return }
    if (typeof sel !== 'object' || !isSelectionType(sel.type) || typeof sel.id !== 'string' || sel.id === '') return
    if (sel.type === 'agent' && !get().agents[sel.id]) return // gelöschte oder erfundene Agenten nicht auswählbar
    set({ selection: sel })
    const st = get()
    if (sel.type === 'agent') worldEvents.emit('onAgentSelected', { agentId: sel.id })
    else if (sel.type === 'desk') worldEvents.emit('onDeskSelected', { deskId: sel.id, floorId: st.floorId })
    else if (sel.type === 'computer') worldEvents.emit('onComputerSelected', { computerId: sel.id, floorId: st.floorId })
    else if (sel.type === 'department') worldEvents.emit('onDepartmentSelected', { departmentId: sel.id, floorId: floorOfDepartment(sel.id) ?? st.floorId })
    else worldEvents.emit('onElevatorSelected', { floorId: st.floorId })
  },
  setHover: (h) => set((s) => ({ hover: h && typeof h === 'object' && isSelectionType(h.type) && typeof h.id === 'string' && (h.type !== 'agent' || s.agents[h.id]) ? h : null })),
  setPanel: (p) => { if (p === null || isPanel(p)) set({ panel: p }) },
  setMap: (o) => set({ mapOpen: o === true }),
  setElevator: (o) => set({ elevatorOpen: o === true }),
  setTimeMode: (t) => {
    if (!(TIME_MODES as readonly unknown[]).includes(t)) return
    set({ timeMode: t })
    savePersisted({ graphics: get().graphics, player: get().player, timeMode: t })
  },
  setGraphics: (patch) => {
    if (typeof patch !== 'object' || patch === null) return
    const cur = get().graphics
    const g = sanitizeGraphics({ ...cur, ...patch })
    // Ungültige Einzelwerte der Anfrage verwerfen, gültige übernehmen, der Rest bleibt wie er war.
    for (const k of Object.keys(patch)) {
      if (!(k in cur) || (g as unknown as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]) (g as unknown as Record<string, unknown>)[k] = (cur as unknown as Record<string, unknown>)[k]
    }
    set({ graphics: g })
    savePersisted({ graphics: g, player: get().player, timeMode: get().timeMode })
  },
  setQuality: (q) => {
    if (!(QUALITIES as readonly unknown[]).includes(q)) return
    const g = { ...get().graphics, ...QUALITY_PRESETS[q], quality: q }
    set({ graphics: g })
    savePersisted({ graphics: g, player: get().player, timeMode: get().timeMode })
  },
  setPlayer: (patch) => {
    if (typeof patch !== 'object' || patch === null) return
    const cur = get().player
    const p = sanitizeAvatar({ ...cur, ...patch })
    for (const k of Object.keys(patch)) {
      if (!(k in cur) || (p as unknown as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]) (p as unknown as Record<string, unknown>)[k] = (cur as unknown as Record<string, unknown>)[k]
    }
    set({ player: p })
    savePersisted({ graphics: get().graphics, player: p, timeMode: get().timeMode })
  },
  setSimulate: (b) => set({ simulateActivity: b === true }),
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),

  setAgentStatus: (id, status) => set((s) => {
    if (!isAgentStatus(status) || typeof id !== 'string') return s
    const a = s.agents[id]
    if (!a || a.status === status) return s
    return { agents: { ...s.agents, [id]: { ...a, status } }, agentsVersion: s.agentsVersion + 1 }
  }),

  launchAgents: ({ floorId, departmentId, count, status = 'working' }) => {
    // Eingaben prüfen: unbekannte Etage oder Abteilung fallen auf sichere Werte zurück, die Anzahl wird begrenzt.
    const known = BUILDING.floors.find((f) => f.id === floorId)
    const floor = known ? known.id : get().floorId
    const dept = departmentId && deptsWithDesks(floor).some((d) => d.id === departmentId) ? departmentId : undefined
    const { count: n, reason } = allowedLaunch(count, Object.keys(get().agents).length)
    const msg = limitMessage(reason, n)
    if (msg) set({ notice: msg })
    if (n === 0) return []
    const depts = dept ? [dept] : deptsWithDesks(floor).map((d) => d.id)
    const fallback = BUILDING.floors.find((f) => f.id === floor)!.departments[0].id
    const created: Agent[] = []
    const st = isAgentStatus(status) ? status : 'working'
    for (let i = 0; i < n; i++) created.push(makeAgent(depts.length ? depts[i % depts.length] : fallback, st))
    set((s) => ({ agents: { ...s.agents, ...Object.fromEntries(created.map((a) => [a.id, a])) }, agentsVersion: s.agentsVersion + 1 }))
    return created.map((a) => a.id)
  },

  removeAgents: (filter) => set((s) => {
    if (typeof filter !== 'function') return s
    const agents = Object.fromEntries(Object.entries(s.agents).filter(([, a]) => !filter(a)))
    const followGone = s.followId !== null && !agents[s.followId]
    return {
      agents, agentsVersion: s.agentsVersion + 1,
      selection: s.selection?.type === 'agent' && !agents[s.selection.id] ? null : s.selection,
      hover: s.hover?.type === 'agent' && !agents[s.hover.id] ? null : s.hover,
      // Wird der verfolgte Agent gelöscht, endet die Verfolgung sofort.
      followId: followGone ? null : s.followId,
      cameraMode: followGone && s.cameraMode === 'follow' ? ('tycoon' as CameraMode) : s.cameraMode,
    }
  }),

  stress: (n) => {
    const st = get()
    st.removeAgents((a) => a.id.startsWith('agent-stress-'))
    n = Math.min(sanitizeCount(n), MAX_LAUNCH_AT_ONCE)
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
