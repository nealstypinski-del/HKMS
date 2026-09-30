import { useAgentStore } from '../agents/agent.store'
import { useOfficeStore } from '../store/office.store'
import { Character } from './Character'

/** Alle Figuren. Der Epoch Key erzwingt nach dem Zurücksetzen einen sauberen Neustart der Laufzeitzustände. */
export function CharacterLayer() {
  const order = useAgentStore((s) => s.order)
  const epoch = useOfficeStore((s) => s.worldEpoch)
  return (
    <group key={epoch}>
      {order.map((id) => (
        <Character key={id} agentId={id} />
      ))}
    </group>
  )
}
