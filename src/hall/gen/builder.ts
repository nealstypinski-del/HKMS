import { CATALOG } from './catalog'
import type { AreaKind, DeskSpot, FurnItem, FurnKind, RoomDef, Slot, SlotPose } from '../plan/hall.types'

export interface FurnResult {
  items: FurnItem[]
  slots: Slot[]
  desks: DeskSpot[]
}

/** Dreht einen lokalen Versatz (lx, lz) um `yaw` (yaw 0 blickt nach +z). */
export const rotate = (lx: number, lz: number, yaw: number): [number, number] => [lx * Math.cos(yaw) + lz * Math.sin(yaw), -lx * Math.sin(yaw) + lz * Math.cos(yaw)]

/** Sammelt Möbel, Sitzplätze und Schreibtische eines Raums. */
export class Builder {
  readonly items: FurnItem[] = []
  readonly slots: Slot[] = []
  readonly desks: DeskSpot[] = []
  private n = 0

  constructor(readonly room: RoomDef) {}

  add(kind: FurnKind, x: number, z: number, yaw = 0, extra: Partial<FurnItem> = {}): FurnItem {
    const c = CATALOG[kind]
    const item: FurnItem = { kind, x, z, yaw, level: this.room.level, roomId: this.room.id, w: c.w, d: c.d, collide: c.collide, ...extra }
    this.items.push(item)
    return item
  }

  /** Sitzplatz an (x, z), Blick nach `yaw`. */
  slot(area: AreaKind, x: number, z: number, yaw: number, pose: SlotPose = 'sit', seatY = 0.48): void {
    this.slots.push({ id: `${this.room.id}:${area}:${this.n++}`, area, floor: this.room.level, x, z, yaw, pose, seatY: pose === 'sit' ? seatY : undefined, roomId: this.room.id })
  }

  /** Stuhl mit Sitzplatz. */
  chair(area: AreaKind, x: number, z: number, yaw: number, seatY = 0.48): void {
    this.add('chair', x, z, yaw)
    this.slot(area, x, z, yaw, 'sit', seatY)
  }

  /** Stühle rund um einen Mittelpunkt, Blick zur Mitte. */
  ring(area: AreaKind, cx: number, cz: number, radius: number, count: number, from = 0, to = Math.PI * 2): void {
    for (let i = 0; i < count; i++) {
      const a = from + ((i + 0.5) * (to - from)) / count
      const x = cx + Math.sin(a) * radius
      const z = cz + Math.cos(a) * radius
      this.chair(area, x, z, Math.atan2(cx - x, cz - z))
    }
  }

  /** Sofa mit drei Sitzplätzen, Blick nach `yaw`. */
  sofa(area: AreaKind, x: number, z: number, yaw: number, color?: string): void {
    this.add('sofa3', x, z, yaw, { color })
    for (const lx of [-1.1, 0, 1.1]) {
      const [dx, dz] = rotate(lx, 0.15, yaw)
      this.slot(area, x + dx, z + dz, yaw, 'sit', 0.46)
    }
  }

  armchair(area: AreaKind, x: number, z: number, yaw: number, color?: string): void {
    this.add('armchair', x, z, yaw, { color })
    const [dx, dz] = rotate(0, 0.1, yaw)
    this.slot(area, x + dx, z + dz, yaw, 'sit', 0.46)
  }

  desk(deptId: string, x: number, z: number): void {
    this.add('desk', x, z, 0)
    this.desks.push({ deptId, roomId: this.room.id, level: this.room.level, x, z })
  }

  result(): FurnResult {
    return { items: this.items, slots: this.slots, desks: this.desks }
  }
}
