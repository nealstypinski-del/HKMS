import { resetDemo } from '../agents/agent.service'
import { slotAllocator } from '../navigation/slots'
import { useOfficeStore } from '../store/office.store'
import { characterRegistry, deskOccupancy, elevatorCar } from './runtime'

/** Setzt Demo Daten und den flüchtigen 3D Zustand gemeinsam zurück. */
export function resetWorld(): void {
  resetDemo()
  slotAllocator.clear()
  deskOccupancy.clear()
  characterRegistry.clear()
  elevatorCar.y = 0
  useOfficeStore.getState().bumpWorld()
}
