// Gemeinsame Typen der Welt. Reine Daten, kein Three.js, damit Logik testbar bleibt.

export interface Vec2 { x: number; z: number }
export interface Rect { x0: number; z0: number; x1: number; z1: number }

export type ZoneType =
  | 'workstations' | 'creative' | 'meeting' | 'lounge' | 'kitchen' | 'bench'
  | 'lobby' | 'booths' | 'ceo' | 'strategy' | 'servers' | 'display' | 'core' | 'elevatorLobby'

export type DoorSide = 'N' | 'S'

export interface ZoneConfig {
  id: string
  title: string
  type: ZoneType
  rect: Rect
  /** Seite mit Tür. N = Tür an der Nordkante (z0), S = Tür an der Südkante (z1). */
  door?: DoorSide
  walled?: boolean
  /** Für Arbeitsplätze: Spalten und Reihen. Kapazität = cols * rows. */
  grid?: { cols: number; rows: number }
  workstationVariant?: WorkstationVariant
  screens?: string[]
}

export type WorkstationVariant = 'sales' | 'developer' | 'research' | 'creative' | 'ops'

export interface DepartmentConfig {
  id: string
  title: string
  accent: string
  zones: ZoneConfig[]
}

export interface FloorConfig {
  id: string
  level: number
  title: string
  short: string
  accent: string
  departments: DepartmentConfig[]
}

export interface BuildingConfig {
  name: string
  floors: FloorConfig[]
}

export type FurnitureKind =
  | 'desk' | 'chair' | 'monitor' | 'monitor2' | 'keyboard' | 'computer' | 'lamp'
  | 'plant' | 'tree' | 'bookshelf' | 'sofa' | 'bench' | 'coffeeTable' | 'meetingTable'
  | 'kitchenCounter' | 'coffeeMachine' | 'fridge' | 'stool' | 'divider' | 'whiteboard'
  | 'wallDisplay' | 'bin' | 'serverRack' | 'reception' | 'booth' | 'roundTable' | 'bigScreen'

export interface FurniturePlacement {
  id: string
  kind: FurnitureKind
  x: number
  z: number
  yaw: number
  scale?: number
  color?: string
  label?: string
  /** Mittelhöhe für Wandbildschirme (überschreibt den Standard). */
  y?: number
  /** Größe für dehnbare Möbel (Tische, Theken, Displays). */
  w?: number
  d?: number
  h?: number
  zoneId: string
  /** Ob die Grundfläche im Navigationsgitter blockiert. */
  blocks: boolean
}

export interface DeskDef {
  id: string
  computerId: string
  zoneId: string
  departmentId: string
  floorId: string
  variant: WorkstationVariant
  /** Position des Sitzes (Hüfte). */
  seat: Vec2
  /** Blickrichtung der sitzenden Figur. */
  yaw: number
  /** Freier Punkt hinter dem Stuhl, von dem aus die Figur zum Sitz gleitet. */
  approach: Vec2
  pos: Vec2
}

export type SeatKind = 'sofa' | 'bench' | 'stool' | 'chair'
export interface SeatDef {
  id: string
  kind: SeatKind
  zoneId: string
  seat: Vec2
  yaw: number
  approach: Vec2
}

export interface SpotDef {
  id: string
  zoneId: string
  kind: 'waiting' | 'kitchen' | 'meeting'
  pos: Vec2
  yaw: number
}

export interface WallSeg {
  x0: number; z0: number; x1: number; z1: number
  kind: 'glass' | 'solid'
  zoneId: string
}

export interface ZoneGen {
  config: ZoneConfig
  departmentId: string
  accent: string
}

export type AgentStatus = 'working' | 'idle' | 'break' | 'waiting' | 'meeting' | 'offline'
export type Provider = 'claude-code' | 'codex' | 'chatgpt' | 'gemini'

export type HairStyle = 'short' | 'long' | 'bun' | 'mohawk' | 'spiky' | 'bald' | 'ponytail' | 'curly'
export type Headwear = 'none' | 'cap' | 'beanie' | 'crown'
export type Accessory = 'none' | 'glasses' | 'headphones'

export interface Avatar {
  skinVariant: number
  hairStyle: HairStyle
  hairVariant: number
  shirtVariant: number
  trousersVariant: number
  shoesVariant: number
  headwear: Headwear
  accessory: Accessory
}

export interface Agent {
  id: string
  name: string
  role: string
  provider: Provider
  departmentId: string
  floorId: string
  status: AgentStatus
  avatar: Avatar
  /** true = rein visuelle Simulation, keine echte Agentenaktivität. */
  simulated: boolean
  /** Mock Entwurf, der über dem Monitor angezeigt wird. Kein echter Agenteninhalt. */
  draft: string
}

export type ComputerState = 'offline' | 'idle' | 'working' | 'waiting' | 'error' | 'done'
