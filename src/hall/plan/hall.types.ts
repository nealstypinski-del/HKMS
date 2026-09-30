// Datentypen des Hallen Grundrisses. Nur Typen, keine Logik.

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export type RoomType =
  | 'lobby' | 'cafe' | 'canteen' | 'library' | 'lounge' | 'post' | 'gym' | 'wellness' | 'tech' | 'server'
  | 'office' | 'meeting' | 'boardroom' | 'conference' | 'training' | 'phone' | 'archive' | 'studio' | 'podcast' | 'devlounge'

/** Wandseite, an der die Tür liegt: N = kleines z, S = großes z, W = kleines x, E = großes x */
export type Side = 'N' | 'S' | 'E' | 'W'

export interface DoorDef {
  side: Side
  /** Mittelpunkt der Tür entlang der Wand */
  pos: number
  width: number
}

export interface RoomDef extends Rect {
  id: string
  name: string
  level: number
  type: RoomType
  doors: DoorDef[]
  /** Abteilung, deren Schreibtische hier stehen */
  deptId?: string
  accent: string
}

export interface Ramp {
  id: string
  kind: 'stairs' | 'escalator'
  fromLevel: number
  toLevel: number
  /** Begehbare Fläche (achsparallel) */
  rect: Rect
  /** Einheitsvektor der Steigrichtung in der x z Ebene */
  dir: [number, number]
  /** Punkt, an dem die Höhe y0 erreicht wird (entlang dir gemessen) */
  start: [number, number]
  length: number
  y0: number
  y1: number
  /** Rolltreppe: Mitnahme in m/s entlang dir (positiv = aufwärts) */
  carry?: number
}

export interface ElevatorDef {
  id: number
  /** Mittelpunkt der Kabine */
  x: number
  z: number
  /** Wartepunkt vor der Tür (gleich auf allen Ebenen) */
  standX: number
  standZ: number
  /** Blickrichtung der Tür: +1 = nach +z, -1 = nach -z */
  doorDir: 1 | -1
}

export interface Platform {
  level: number
  rect: Rect
  /** Brücken und Landeplätze haben eigene Geländer */
  kind: 'gallery' | 'landing' | 'bridge'
}

export type AreaKind = 'desk' | 'agentBench' | 'kitchen' | 'lounge' | 'meetingRoom' | 'elevator'
export type SlotPose = 'sit' | 'stand'

/** Platz, an dem eine Figur stehen oder sitzen kann. `floor` ist die Ebene. */
export interface Slot {
  id: string
  area: AreaKind
  floor: number
  x: number
  z: number
  /** Blickrichtung, 0 = nach +z, PI = nach -z */
  yaw: number
  pose: SlotPose
  seatY?: number
  roomId?: string
}

export type FurnKind =
  | 'desk' | 'chair' | 'sofa3' | 'armchair' | 'coffeeTable' | 'bookshelf' | 'cabinet' | 'plant' | 'lamp' | 'roundTable'
  | 'stool' | 'counterSeg' | 'tableSeg' | 'bench' | 'reception' | 'vending' | 'cooler' | 'printer' | 'treadmill' | 'mat'
  | 'lounger' | 'rack' | 'booth' | 'whiteboard' | 'screenWall' | 'lectern' | 'beanbag' | 'coffeeMachine' | 'camera' | 'greenScreen'
  | 'shelfLow' | 'box' | 'kicker' | 'stage' | 'rug' | 'sign' | 'weights' | 'mic'

export interface FurnItem {
  kind: FurnKind
  x: number
  z: number
  yaw: number
  level: number
  roomId: string
  /** Kollisionsgröße in Metern (vor der Drehung), null = keine Kollision */
  w: number
  d: number
  collide: boolean
  /** Optionale Farbe für Kits, die einen Akzent tragen */
  color?: string
  /** Text für Schilder und Bildschirme */
  label?: string
}

export interface DeskSpot {
  deptId: string
  roomId: string
  level: number
  x: number
  z: number
}
