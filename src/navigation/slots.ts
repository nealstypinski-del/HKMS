import { deskSeatPosition, layoutOf, type AreaKind, type Slot } from '../config/floorLayouts'
import { FLOOR_HEIGHT } from '../config/office.config'
import type { Desk } from '../agents/agent.types'

export const deskSlot = (desk: Desk): Slot => {
  const seat = deskSeatPosition(desk.position[0], desk.position[2])
  return { id: `seat:${desk.id}`, area: 'desk', floor: Math.round(desk.position[1] / FLOOR_HEIGHT), x: seat.x, z: seat.z, yaw: Math.PI, pose: 'sit' }
}

export const slotsOf = (floor: number, area: AreaKind): Slot[] => layoutOf(floor).slots.filter((s) => s.area === area)

/** Notfallplatz, falls alle Plätze eines Bereichs belegt sind: Stehplatz am Rand der Hauptachse. */
export const overflowSlot = (floor: number, agentId: string): Slot => {
  let h = 0
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) | 0
  const x = -9 + (Math.abs(h) % 16)
  return { id: `overflow:${agentId}`, area: 'lounge', floor, x, z: 1.9, yaw: 0, pose: 'stand' }
}

/** Vergibt Plätze exklusiv, damit sich keine zwei Figuren denselben Sitz teilen. */
export class SlotAllocator {
  private readonly occupant = new Map<string, string>()
  private readonly slotOf = new Map<string, string>()

  claim(agentId: string, candidates: readonly Slot[]): Slot | undefined {
    const current = this.slotOf.get(agentId)
    const same = candidates.find((s) => s.id === current)
    if (same) return same
    const free = candidates.find((s) => !this.occupant.has(s.id) || this.occupant.get(s.id) === agentId)
    this.release(agentId)
    if (!free) return undefined
    this.occupant.set(free.id, agentId)
    this.slotOf.set(agentId, free.id)
    return free
  }

  release(agentId: string): void {
    const id = this.slotOf.get(agentId)
    if (id && this.occupant.get(id) === agentId) this.occupant.delete(id)
    this.slotOf.delete(agentId)
  }

  currentSlotId(agentId: string): string | undefined {
    return this.slotOf.get(agentId)
  }

  occupantOf(slotId: string): string | undefined {
    return this.occupant.get(slotId)
  }

  clear(): void {
    this.occupant.clear()
    this.slotOf.clear()
  }
}

export const slotAllocator = new SlotAllocator()
