/** Schmale Schnittstelle nach außen (Terminal 1 / Anwendung). Die Welt löst nur Events aus, sie führt keine Geschäftslogik aus. */
export interface WorldEventMap {
  onAgentSelected: { agentId: string }
  onDeskSelected: { deskId: string; floorId: string }
  onComputerSelected: { computerId: string; floorId: string }
  onDepartmentSelected: { departmentId: string; floorId: string }
  onElevatorSelected: { floorId: string }
}
type Listener<K extends keyof WorldEventMap> = (p: WorldEventMap[K]) => void
const listeners: Record<string, Set<(p: never) => void>> = {}

export const worldEvents = {
  on<K extends keyof WorldEventMap>(k: K, fn: Listener<K>) {
    const set = (listeners[k] ??= new Set())
    set.add(fn as (p: never) => void)
    return () => { set.delete(fn as (p: never) => void) }
  },
  emit<K extends keyof WorldEventMap>(k: K, p: WorldEventMap[K]) {
    listeners[k]?.forEach((fn) => (fn as Listener<K>)(p))
  },
}
