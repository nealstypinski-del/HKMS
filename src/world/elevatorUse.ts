import { getFloor } from './generate'

/** Abstand (Meter) zur Aufzugstür, ab dem die Etagenwahl geöffnet werden darf. */
export const ELEVATOR_REACH = 6

export function nearElevator(floorId: string, x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  const d = getFloor(floorId).elevatorDoor
  return Math.hypot(x - d.x, z - d.z) < ELEVATOR_REACH
}
