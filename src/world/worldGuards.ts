import { BUILDING } from './buildingConfig'
import type { Agent, AgentStatus, Avatar } from './types'
import type { Graphics, TimeMode, WallModeSetting } from './graphicsSettings'

/** Schmale Sicht auf den Weltzustand für Prüfungen (ohne Aktionen). */
export interface WorldSnapshot {
  floorId: string
  cameraMode: string
  followId: string | null
  agents: Record<string, Agent>
  selection: { type: string; id: string } | null
  hover: { type: string; id: string } | null
  player: Avatar
  graphics: Graphics
  wallMode: WallModeSetting
  timeMode: TimeMode
}

/** Reine Prüfungen für Eingaben von Aktionen. Eine Aufgabe: unbekannte Werte erkennen, bevor sie in den Zustand gelangen. */
const FLOOR_IDS = new Set(BUILDING.floors.map((f) => f.id))
export const isFloorId = (v: unknown): v is string => typeof v === 'string' && FLOOR_IDS.has(v)

export const AGENT_STATUSES: readonly AgentStatus[] = ['working', 'idle', 'break', 'waiting', 'meeting', 'offline']
export const isAgentStatus = (v: unknown): v is AgentStatus => typeof v === 'string' && (AGENT_STATUSES as readonly string[]).includes(v)

export const CAMERA_MODES = ['tycoon', 'firstPerson', 'thirdPerson', 'building', 'follow'] as const
export const isCameraMode = (v: unknown): v is (typeof CAMERA_MODES)[number] => typeof v === 'string' && (CAMERA_MODES as readonly string[]).includes(v)

export const PANELS = ['floors', 'graphics', 'character', 'launch', 'view'] as const
export const isPanel = (v: unknown): v is (typeof PANELS)[number] => typeof v === 'string' && (PANELS as readonly string[]).includes(v)

export const SELECTION_TYPES = ['agent', 'desk', 'computer', 'department', 'elevator'] as const
export const isSelectionType = (v: unknown): boolean => typeof v === 'string' && (SELECTION_TYPES as readonly string[]).includes(v)
