// Geometrie der Etagen: Schreibtischblöcke, Slots (Sitz und Stehplätze) und Navigationsgraph.
// Visualisierung (world/) und Navigation (navigation/) lesen dieselben Zahlen, damit Figuren nie an Möbeln vorbeilaufen.

import { AISLE_Z } from './office.config'

export type AreaKind = 'desk' | 'agentBench' | 'kitchen' | 'lounge' | 'meetingRoom' | 'elevator'
export type SlotPose = 'sit' | 'stand'

export interface Slot {
  id: string
  area: AreaKind
  floor: number
  x: number
  z: number
  /** Blickrichtung, 0 = nach +z (zur Kamera), PI = nach -z */
  yaw: number
  pose: SlotPose
  /** Höhe der Sitzfläche (Standard 0.5) */
  seatY?: number
}

export interface NavNode {
  id: string
  floor: number
  x: number
  z: number
}

export interface FloorLayout {
  level: number
  /** Schreibtischmitten je Abteilung als [x, z] */
  deskPositions: Record<string, [number, number][]>
  slots: Slot[]
  nodes: NavNode[]
  edges: [string, string][]
}

export const ROW_Z = [-5.8, -2.4] as const
/** Sitzposition relativ zur Schreibtischmitte, Blick nach -z */
export const SEAT_DX = -0.35
export const SEAT_DZ = 0.78
/** Mitte der Aufzugskabine (Fahrgäste stehen hier während der Fahrt) */
export const ELEVATOR_CABIN = { x: 10.5, z: -6.3 } as const
export const ELEVATOR_STAND = { x: 10.5, z: -3.4 } as const
export const MEETING_TABLE = { x: -6, z: 4.6, radius: 1.15, seatRadius: 1.75 } as const
/** Konferenzraum mit Glaswänden, Tür an der Nordseite (zur Hauptachse) */
export const MEETING_ROOM = { x0: -8.6, x1: -3.6, z0: 1.9, z1: 7.4, doorX0: -6.7, doorX1: -5.3 } as const

export const LOBBY_LAYOUT = {
  reception: { x: -8.6, z: -5.6 },
  hqDisplay: { x: -1.6, z: -7.85 },
  bench: { x: -0.5, z: 3.0, seats: 6 },
  sofa: { x: -7.5, z: 2.6 },
  coffeeTable: { x: -7.5, z: 4.5 },
  armchairs: [
    { x: -10.4, z: 4.5, yaw: Math.PI / 2 },
    { x: -4.6, z: 4.5, yaw: -Math.PI / 2 },
  ],
  kitchen: { counterX: 5.5, counterZ: -7.5, islandX: 5.5, islandZ: -4.4 },
} as const

export const yawTo = (fromX: number, fromZ: number, toX: number, toZ: number): number => Math.atan2(toX - fromX, toZ - fromZ)

export const deskSeatPosition = (deskX: number, deskZ: number): { x: number; z: number } => ({ x: deskX + SEAT_DX, z: deskZ + SEAT_DZ })

interface DeskBlock {
  deptId: string
  originX: number
  desks: number
}

const blockPositions = (b: DeskBlock): [number, number][] =>
  Array.from({ length: b.desks }, (_, i): [number, number] => [b.originX + (i % 2) * 3, ROW_Z[Math.floor(i / 2)] as number])

const uniqueSorted = (xs: number[]): number[] => {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted.filter((x, i) => i === 0 || x - (sorted[i - 1] as number) > 0.05)
}

interface Graph {
  nodes: NavNode[]
  edges: [string, string][]
}

function buildGraph(level: number, laneXs: number[]): Graph {
  const nodes: NavNode[] = []
  const edges: [string, string][] = []
  const grid = Array.from({ length: 15 }, (_, i) => -10.5 + i * 1.5)
  const aisleXs = uniqueSorted([...grid, ...laneXs])
  const aisleId = (x: number) => `f${level}-a${x.toFixed(2)}`
  aisleXs.forEach((x, i) => {
    nodes.push({ id: aisleId(x), floor: level, x, z: AISLE_Z })
    if (i > 0) edges.push([aisleId(aisleXs[i - 1] as number), aisleId(x)])
  })
  for (const lx of laneXs) {
    let prev = aisleId(lx)
    for (let r = ROW_Z.length - 1; r >= 0; r--) {
      const id = `f${level}-l${lx.toFixed(2)}-r${r}`
      nodes.push({ id, floor: level, x: lx, z: (ROW_Z[r] as number) + SEAT_DZ })
      edges.push([prev, id])
      prev = id
    }
  }
  if (level > 0) {
    // Konferenzraum: Tür an der Nordwand, Knoten vor und hinter der Tür
    const doorX = (MEETING_ROOM.doorX0 + MEETING_ROOM.doorX1) / 2
    nodes.push({ id: `f${level}-mr-door`, floor: level, x: doorX, z: MEETING_ROOM.z0 })
    nodes.push({ id: `f${level}-mr-in`, floor: level, x: doorX, z: MEETING_ROOM.z0 + 0.6 })
    edges.push([aisleId(-6), `f${level}-mr-door`], [`f${level}-mr-door`, `f${level}-mr-in`])
  }
  const elevId = `f${level}-elevator`
  nodes.push({ id: elevId, floor: level, x: ELEVATOR_STAND.x, z: ELEVATOR_STAND.z })
  edges.push([aisleId(ELEVATOR_STAND.x), elevId])
  return { nodes, edges }
}

const lanesFor = (blocks: DeskBlock[]): number[] => blocks.flatMap((b) => [b.originX - 1.5, b.originX + 1.5, b.originX + 4.5])

function meetingSlots(level: number): Slot[] {
  return Array.from({ length: 5 }, (_, i) => {
    const a = Math.PI + (i + 0.5) * (Math.PI / 5)
    const x = MEETING_TABLE.x + MEETING_TABLE.seatRadius * Math.cos(a)
    const z = MEETING_TABLE.z + MEETING_TABLE.seatRadius * Math.sin(a)
    return { id: `f${level}-meeting-${i}`, area: 'meetingRoom' as const, floor: level, x, z, yaw: yawTo(x, z, MEETING_TABLE.x, MEETING_TABLE.z), pose: 'sit' as const }
  })
}

function deptFloor(level: number, blocks: DeskBlock[]): FloorLayout {
  const graph = buildGraph(level, lanesFor(blocks))
  return {
    level,
    deskPositions: Object.fromEntries(blocks.map((b) => [b.deptId, blockPositions(b)])),
    slots: meetingSlots(level),
    ...graph,
  }
}

function lobbyFloor(): FloorLayout {
  const graph = buildGraph(0, [])
  const L = LOBBY_LAYOUT
  const slots: Slot[] = []
  for (let i = 0; i < L.bench.seats; i++) {
    slots.push({ id: `f0-bench-${i}`, area: 'agentBench', floor: 0, x: L.bench.x - (L.bench.seats - 1) / 2 + i, z: L.bench.z, yaw: Math.PI, pose: 'sit', seatY: 0.48 })
  }
  const sofaXs = [-8.85, -7.95, -7.05, -6.15]
  sofaXs.forEach((x, i) => slots.push({ id: `f0-lounge-sofa-${i}`, area: 'lounge', floor: 0, x, z: L.sofa.z + 0.35, yaw: 0, pose: 'sit', seatY: 0.46 }))
  L.armchairs.forEach((a, i) => slots.push({ id: `f0-lounge-arm-${i}`, area: 'lounge', floor: 0, x: a.x + (a.yaw > 0 ? 0.1 : -0.1), z: a.z, yaw: a.yaw, pose: 'sit', seatY: 0.46 }))
  const stoolXs = [4.4, 5.15, 5.9, 6.65]
  stoolXs.forEach((x, i) => slots.push({ id: `f0-kitchen-stool-${i}`, area: 'kitchen', floor: 0, x, z: -3.55, yaw: Math.PI, pose: 'sit', seatY: 0.72 }))
  slots.push({ id: 'f0-kitchen-stand-0', area: 'kitchen', floor: 0, x: 3.2, z: -3.6, yaw: Math.PI, pose: 'stand' })
  slots.push({ id: 'f0-kitchen-stand-1', area: 'kitchen', floor: 0, x: 7.8, z: -3.6, yaw: Math.PI, pose: 'stand' })
  return { level: 0, deskPositions: {}, slots, ...graph }
}

const HJ_BLOCKS: DeskBlock[] = [
  { deptId: 'hj-sales', originX: -10.2, desks: 4 },
  { deptId: 'hj-recruiting', originX: -3.2, desks: 4 },
  { deptId: 'hj-cs', originX: 4.2, desks: 3 },
]
const KM_BLOCKS: DeskBlock[] = [
  { deptId: 'km-trends', originX: -10.2, desks: 4 },
  { deptId: 'km-redaktion', originX: -3.2, desks: 4 },
  { deptId: 'km-creative', originX: 4.2, desks: 4 },
]
const DEV_BLOCKS: DeskBlock[] = [{ deptId: 'dev', originX: -10.2, desks: 4 }, { deptId: 'dev', originX: -3.2, desks: 4 }]

export const FLOOR_LAYOUTS: readonly FloorLayout[] = [lobbyFloor(), deptFloor(1, HJ_BLOCKS), deptFloor(2, KM_BLOCKS), mergeDev()]

// Die Dev Etage nutzt eine Abteilung über zwei Blöcke: Positionen zusammenführen.
function mergeDev(): FloorLayout {
  const base = deptFloor(3, DEV_BLOCKS)
  base.deskPositions = { dev: DEV_BLOCKS.flatMap(blockPositions) }
  return base
}

export const layoutOf = (level: number): FloorLayout => FLOOR_LAYOUTS[level] as FloorLayout
