// UI und Kamera Zustand. Enthält bewusst keine Agenten Daten (die liegen im agent.store).

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { persistenceAdapter } from '../storage/storage'
import { TOP_LEVEL } from '../config/office.config'
import { useAgentStore } from '../agents/agent.store'

export type FloorFocus = number | 'all'
export type Selection = { kind: 'agent'; id: string } | { kind: 'desk'; id: string } | null
export type Hover = { kind: 'agent' | 'desk'; id: string } | null

export interface CameraRequest {
  seq: number
  kind: 'floor' | 'all' | 'department' | 'agent' | 'reset'
  level?: number
  targetId?: string
}

export interface SavedCamera {
  position: [number, number, number]
  target: [number, number, number]
}

export type ViewMode = 'overview' | 'walk'

interface OfficeState {
  mode: ViewMode
  walkLevel: number
  prevFocus: FloorFocus
  selection: Selection
  hover: Hover
  focus: FloorFocus
  cameraRequest: CameraRequest | null
  savedCamera: SavedCamera | null
  worldEpoch: number
  select: (s: Selection) => void
  setHover: (h: Hover) => void
  focusFloor: (level: FloorFocus) => void
  focusDepartment: (id: string) => void
  focusAgent: (id: string) => void
  resetView: () => void
  saveCamera: (c: SavedCamera) => void
  bumpWorld: () => void
  enterWalk: () => void
  exitWalk: (level: number) => void
  setWalkLevel: (level: number) => void
}

let seq = 0
const request = (r: Omit<CameraRequest, 'seq'>): CameraRequest => ({ ...r, seq: ++seq })

const isVec3 = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

export const useOfficeStore = create<OfficeState>()(
  persist(
    (set) => ({
      mode: 'overview' as ViewMode,
      walkLevel: 0,
      prevFocus: 0 as FloorFocus,
      selection: null,
      hover: null,
      focus: 0,
      cameraRequest: null,
      savedCamera: null,
      worldEpoch: 0,
      select: (selection) => set({ selection }),
      setHover: (hover) => set({ hover }),
      focusFloor: (level) => set({ focus: level, cameraRequest: request(level === 'all' ? { kind: 'all' } : { kind: 'floor', level }) }),
      focusDepartment: (id) => {
        const dept = INITIAL_DEPARTMENTS.find((d) => d.id === id)
        if (!dept) return
        set({ focus: dept.floor, cameraRequest: request({ kind: 'department', targetId: id, level: dept.floor }) })
      },
      focusAgent: (id) => {
        const agent = useAgentStore.getState().agents[id]
        const dept = agent ? INITIAL_DEPARTMENTS.find((d) => d.id === agent.department) : undefined
        set((s) => ({
          selection: { kind: 'agent', id },
          focus: s.focus === 'all' ? 'all' : Math.max(s.focus, dept?.floor ?? 0),
          cameraRequest: request({ kind: 'agent', targetId: id }),
        }))
      },
      resetView: () => set({ focus: 0, cameraRequest: request({ kind: 'reset' }) }),
      saveCamera: (savedCamera) => set({ savedCamera }),
      enterWalk: () => set((s) => ({ mode: 'walk', walkLevel: 0, prevFocus: s.focus, focus: 'all', selection: null, hover: null })),
      exitWalk: (level) => set({ mode: 'overview', focus: level, cameraRequest: request({ kind: 'floor', level }) }),
      setWalkLevel: (walkLevel) => set({ walkLevel }),
      bumpWorld: () => set((s) => ({ worldEpoch: s.worldEpoch + 1, selection: null, hover: null })),
    }),
    {
      name: 'office',
      version: 1,
      storage: createJSONStorage(() => persistenceAdapter),
      partialize: (s) => ({ focus: s.focus, savedCamera: s.savedCamera }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { focus?: unknown; savedCamera?: { position?: unknown; target?: unknown } | null }
        const focus = p.focus === 'all' || (typeof p.focus === 'number' && p.focus >= 0 && p.focus <= TOP_LEVEL) ? (p.focus as FloorFocus) : current.focus
        const cam = p.savedCamera
        const savedCamera = cam && isVec3(cam.position) && isVec3(cam.target) ? { position: cam.position, target: cam.target } : null
        return { ...current, focus, savedCamera }
      },
    },
  ),
)
