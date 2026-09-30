// Grundriss der Messehalle: 96 m x 64 m, drei Ebenen, 30 Räume rund um das Atrium mit Park und Wasserfall.
// Alle Zahlen in Metern. Ebenenhöhe 6 m. Dieser Datensatz ist die einzige Quelle für Wände, Böden, Möbel, Navigation und Kollision.

import { FLOOR_HEIGHT } from '../../config/office.config'
import type { DoorDef, ElevatorDef, Platform, Ramp, Rect, RoomDef, RoomType } from './hall.types'

export const LEVELS = 3
export const LEVEL_H = FLOOR_HEIGHT
export const FOOT: Rect = { x0: -48, x1: 48, z0: -32, z1: 32 }
/** Atrium: Park im Erdgeschoss, darüber offene Galerien */
export const ATRIUM: Rect = { x0: -36, x1: 36, z0: -20, z1: 20 }
/** Freier Luftraum über dem Park (ab Ebene 1) */
export const VOID: Rect = { x0: -32, x1: 32, z0: -16, z1: 16 }
export const ROOF_Y = LEVELS * LEVEL_H
export const GALLERY_W = 4

const HJ = '#ff8a3d'
const KM = '#2fd6c0'
const DEV = '#8b7cf6'
const NEUTRAL = '#e8ddc8'

type Slot = 'SW' | 'SC' | 'SE' | 'NW' | 'NC' | 'NE' | 'W1' | 'W2' | 'E1' | 'E2'

const SLOT_RECT: Record<Slot, Rect> = {
  SW: { x0: -48, x1: -16, z0: 20, z1: 32 },
  SC: { x0: -16, x1: 16, z0: 20, z1: 32 },
  SE: { x0: 16, x1: 48, z0: 20, z1: 32 },
  NW: { x0: -48, x1: -16, z0: -32, z1: -20 },
  NC: { x0: -16, x1: 16, z0: -32, z1: -20 },
  NE: { x0: 16, x1: 48, z0: -32, z1: -20 },
  W1: { x0: -48, x1: -36, z0: -20, z1: 0 },
  W2: { x0: -48, x1: -36, z0: 0, z1: 20 },
  E1: { x0: 36, x1: 48, z0: -20, z1: 0 },
  E2: { x0: 36, x1: 48, z0: 0, z1: 20 },
}

/** Tür zur Galerie oder zum Park, mittig an der Wand zum Atrium */
function innerDoor(slot: Slot, width = 4): DoorDef {
  const r = SLOT_RECT[slot]
  switch (slot) {
    case 'SW': case 'SC': case 'SE': return { side: 'N', pos: (r.x0 + r.x1) / 2, width }
    case 'NW': case 'NC': case 'NE': return { side: 'S', pos: (r.x0 + r.x1) / 2, width }
    case 'W1': case 'W2': return { side: 'E', pos: (r.z0 + r.z1) / 2, width }
    case 'E1': case 'E2': return { side: 'W', pos: (r.z0 + r.z1) / 2, width }
  }
}

interface Spec {
  slot: Slot
  id: string
  name: string
  type: RoomType
  deptId?: string
  accent?: string
}

const SPECS: Record<number, Spec[]> = {
  0: [
    { slot: 'SW', id: 'cafe', name: 'Café', type: 'cafe', accent: HJ },
    { slot: 'SC', id: 'lobby', name: 'Eingangslobby', type: 'lobby', accent: HJ },
    { slot: 'SE', id: 'canteen', name: 'Kantine', type: 'canteen', accent: KM },
    { slot: 'NW', id: 'library', name: 'Bibliothek', type: 'library', accent: NEUTRAL },
    { slot: 'NC', id: 'agentlounge', name: 'Agentenlounge', type: 'lounge', accent: KM },
    { slot: 'NE', id: 'post', name: 'Postraum', type: 'post', accent: NEUTRAL },
    { slot: 'W1', id: 'gym', name: 'Fitnessraum', type: 'gym', accent: HJ },
    { slot: 'W2', id: 'wellness', name: 'Ruheraum', type: 'wellness', accent: KM },
    { slot: 'E1', id: 'tech', name: 'Technikraum', type: 'tech', accent: DEV },
    { slot: 'E2', id: 'server', name: 'Serverraum', type: 'server', accent: DEV },
  ],
  1: [
    { slot: 'SW', id: 'hj-sales-room', name: 'HerkulesJobs Vertrieb', type: 'office', deptId: 'hj-sales', accent: HJ },
    { slot: 'SC', id: 'hj-recruiting-room', name: 'Recruiting', type: 'office', deptId: 'hj-recruiting', accent: HJ },
    { slot: 'SE', id: 'hj-cs-room', name: 'Customer Success', type: 'office', deptId: 'hj-cs', accent: HJ },
    { slot: 'NW', id: 'board', name: 'Vorstandsraum', type: 'boardroom', accent: HJ },
    { slot: 'NC', id: 'conference', name: 'Konferenzsaal', type: 'conference', accent: HJ },
    { slot: 'NE', id: 'training', name: 'Schulungsraum', type: 'training', accent: HJ },
    { slot: 'W1', id: 'meet-1', name: 'Besprechung 1', type: 'meeting', accent: HJ },
    { slot: 'W2', id: 'meet-2', name: 'Besprechung 2', type: 'meeting', accent: HJ },
    { slot: 'E1', id: 'phone', name: 'Telefonkabinen', type: 'phone', accent: HJ },
    { slot: 'E2', id: 'archive', name: 'Archiv', type: 'archive', accent: NEUTRAL },
  ],
  2: [
    { slot: 'SW', id: 'km-trends-room', name: 'KasselMemes Trends', type: 'office', deptId: 'km-trends', accent: KM },
    { slot: 'SC', id: 'km-redaktion-room', name: 'Redaktion', type: 'office', deptId: 'km-redaktion', accent: KM },
    { slot: 'SE', id: 'km-creative-room', name: 'Creative Studio', type: 'office', deptId: 'km-creative', accent: KM },
    { slot: 'NW', id: 'qa', name: 'QA Labor', type: 'office', deptId: 'dev', accent: DEV },
    { slot: 'NC', id: 'dev-room', name: 'Development', type: 'office', deptId: 'dev', accent: DEV },
    { slot: 'NE', id: 'meet-3', name: 'Besprechung 3', type: 'meeting', accent: KM },
    { slot: 'W1', id: 'video', name: 'Videostudio', type: 'studio', accent: KM },
    { slot: 'W2', id: 'podcast', name: 'Podcastraum', type: 'podcast', accent: KM },
    { slot: 'E1', id: 'meet-4', name: 'Besprechung 4', type: 'meeting', accent: KM },
    { slot: 'E2', id: 'devlounge', name: 'Dev Lounge', type: 'devlounge', accent: DEV },
  ],
}

function buildRooms(): RoomDef[] {
  const rooms: RoomDef[] = []
  for (let level = 0; level < LEVELS; level++) {
    for (const s of SPECS[level] as Spec[]) {
      const doors = [innerDoor(s.slot, s.type === 'lobby' ? 12 : 4)]
      // Haupteingang der Lobby: Außenwand im Süden
      if (s.type === 'lobby') doors.push({ side: 'S', pos: 0, width: 10 })
      rooms.push({ id: s.id, name: s.name, level, type: s.type, deptId: s.deptId, accent: s.accent ?? NEUTRAL, doors, ...SLOT_RECT[s.slot] })
    }
  }
  return rooms
}

export const ROOMS: readonly RoomDef[] = buildRooms()
export const roomsOfLevel = (level: number): RoomDef[] => ROOMS.filter((r) => r.level === level)
export const roomById = (id: string): RoomDef | undefined => ROOMS.find((r) => r.id === id)

/** Galerien der Ebenen 1 und 2 (umlaufend um den Luftraum) */
const GALLERIES: Rect[] = [
  { x0: ATRIUM.x0, x1: ATRIUM.x1, z0: ATRIUM.z0, z1: VOID.z0 }, // Nord
  { x0: ATRIUM.x0, x1: ATRIUM.x1, z0: VOID.z1, z1: ATRIUM.z1 }, // Süd
  { x0: ATRIUM.x0, x1: VOID.x0, z0: VOID.z0, z1: VOID.z1 }, // West
  { x0: VOID.x1, x1: ATRIUM.x1, z0: VOID.z0, z1: VOID.z1 }, // Ost
]

const STAIR_W = 2.5
const STAIR_LEN = 28
const stairRect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, x1, z0, z1 })

export const RAMPS: readonly Ramp[] = [
  // Große Treppen Ebene 0 nach 1, gegenläufig an West und Ostseite
  { id: 'stairs-w', kind: 'stairs', fromLevel: 0, toLevel: 1, rect: stairRect(-32, -14, -32 + STAIR_W, 14), dir: [0, -1], start: [-30.75, 14], length: STAIR_LEN, y0: 0, y1: LEVEL_H },
  { id: 'stairs-e', kind: 'stairs', fromLevel: 0, toLevel: 1, rect: stairRect(32 - STAIR_W, -14, 32, 14), dir: [0, 1], start: [30.75, -14], length: STAIR_LEN, y0: 0, y1: LEVEL_H },
  // Ebene 1 nach 2 entlang der Nordkante
  { id: 'stairs-n', kind: 'stairs', fromLevel: 1, toLevel: 2, rect: stairRect(-14, -16, 14, -16 + STAIR_W), dir: [1, 0], start: [-14, -14.75], length: STAIR_LEN, y0: LEVEL_H, y1: 2 * LEVEL_H },
  // Rolltreppe Ebene 0 nach 1: Auffahrt und Abfahrt nebeneinander, Ausstieg an der Südgalerie
  { id: 'escalator-up', kind: 'escalator', fromLevel: 0, toLevel: 1, rect: stairRect(14.2, 5.6, 15.4, 16), dir: [0, 1], start: [14.8, 5.6], length: 10.4, y0: 0, y1: LEVEL_H, carry: 0.75 },
  { id: 'escalator-down', kind: 'escalator', fromLevel: 0, toLevel: 1, rect: stairRect(15.6, 5.6, 16.8, 16), dir: [0, 1], start: [16.2, 5.6], length: 10.4, y0: 0, y1: LEVEL_H, carry: -0.75 },
]

/** Landeplätze am oberen Ende der Treppen (in Höhe der Zielebene) */
const LANDINGS: Platform[] = [
  { level: 1, rect: { x0: -32, x1: -32 + STAIR_W, z0: -16, z1: -14 }, kind: 'landing' },
  { level: 1, rect: { x0: 32 - STAIR_W, x1: 32, z0: 14, z1: 16 }, kind: 'landing' },
  { level: 2, rect: { x0: 14, x1: 16, z0: -16, z1: -16 + STAIR_W }, kind: 'landing' },
]

const BRIDGES: Platform[] = [
  { level: 1, rect: { x0: -21.5, x1: -18.5, z0: VOID.z0, z1: VOID.z1 }, kind: 'bridge' },
  { level: 2, rect: { x0: 18.5, x1: 21.5, z0: VOID.z0, z1: VOID.z1 }, kind: 'bridge' },
]

export const ELEVATORS: readonly ElevatorDef[] = [
  { id: 0, x: -25.75, z: 14.75, standX: -25.75, standZ: 17.6, doorDir: 1 },
  { id: 1, x: 25.75, z: -14.75, standX: 25.75, standZ: -17.6, doorDir: -1 },
]
export const ELEVATOR_SIZE = 2.5

/** Alle Bodenplatten außer den Räumen: Galerien, Landeplätze, Brücken je Ebene (Ebene 0 hat den Park) */
export function platformsOfLevel(level: number): Platform[] {
  if (level === 0) return []
  const galleries: Platform[] = GALLERIES.map((rect) => ({ level, rect, kind: 'gallery' as const }))
  return [...galleries, ...LANDINGS.filter((p) => p.level === level), ...BRIDGES.filter((p) => p.level === level)]
}

export const rampsAt = (level: number): Ramp[] => RAMPS.filter((r) => r.fromLevel === level)

/** Seiten des Luftraums, an denen Geländer stehen, mit Lücken für Treppenanschlüsse (Intervalle entlang der Kante) */
export interface RailEdge {
  axis: 'x' | 'z'
  /** feste Koordinate der Kante */
  at: number
  from: number
  to: number
  gaps: Array<[number, number]>
}

export function voidRails(level: number): RailEdge[] {
  if (level === 0) return []
  const gapsFor = (edge: 'W' | 'E' | 'N' | 'S'): Array<[number, number]> => {
    const gaps: Array<[number, number]> = []
    for (const p of LANDINGS.filter((l) => l.level === level)) {
      const r = p.rect
      if (edge === 'W' && r.x0 === VOID.x0) gaps.push([r.z0, r.z1])
      if (edge === 'E' && r.x1 === VOID.x1) gaps.push([r.z0, r.z1])
      if (edge === 'N' && r.z0 === VOID.z0) gaps.push([r.x0, r.x1])
      if (edge === 'S' && r.z1 === VOID.z1) gaps.push([r.x0, r.x1])
    }
    // Brücken schließen an Nord und Südkante an
    for (const b of BRIDGES.filter((p) => p.level === level)) {
      if (edge === 'N' || edge === 'S') gaps.push([b.rect.x0, b.rect.x1])
    }
    // Treppen, die auf dieser Ebene beginnen: Einstieg an der Kante (erste 2 m)
    for (const ramp of RAMPS.filter((rp) => rp.fromLevel === level && rp.kind === 'stairs')) {
      const r = ramp.rect
      if (edge === 'N' && r.z0 === VOID.z0) gaps.push([r.x0, r.x0 + 2])
      if (edge === 'S' && r.z1 === VOID.z1) gaps.push([r.x1 - 2, r.x1])
    }
    return gaps
  }
  return [
    { axis: 'z', at: VOID.z0, from: VOID.x0, to: VOID.x1, gaps: gapsFor('N') },
    { axis: 'z', at: VOID.z1, from: VOID.x0, to: VOID.x1, gaps: gapsFor('S') },
    { axis: 'x', at: VOID.x0, from: VOID.z0, to: VOID.z1, gaps: gapsFor('W') },
    { axis: 'x', at: VOID.x1, from: VOID.z0, to: VOID.z1, gaps: gapsFor('E') },
  ]
}
