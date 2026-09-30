import { ELEVATOR_CABIN, ELEVATOR_STAND } from '../config/floorLayouts'
import { nearestNode, navGraph, shortestPath, type NavGraph } from './navGraph'

/** `locked`: Etappe im Aufzug, darf nicht durch einen neuen Plan unterbrochen werden. */
export type RouteLeg = { kind: 'walk'; x: number; z: number; locked?: boolean } | { kind: 'ride'; fromFloor: number; toFloor: number; locked: true }

export interface Position {
  floor: number
  x: number
  z: number
}

/** Plant eine Route: zum nächsten Knoten, über den Graphen (inklusive Aufzug) und zum Ziel. Kein Teleport. */
export function planRoute(from: Position, to: Position, graph: NavGraph = navGraph): RouteLeg[] {
  const start = nearestNode(graph, from.floor, from.x, from.z)
  const end = nearestNode(graph, to.floor, to.x, to.z)
  const path = shortestPath(graph, start.id, end.id)
  if (!path) return [{ kind: 'walk', x: to.x, z: to.z }]

  const legs: RouteLeg[] = []
  const pushWalk = (x: number, z: number) => {
    const last = legs[legs.length - 1]
    if (last?.kind === 'walk' && Math.hypot(last.x - x, last.z - z) < 0.05) return
    legs.push({ kind: 'walk', x, z })
  }
  pushWalk(start.x, start.z)
  let floor = start.floor
  for (const id of path.slice(1)) {
    const node = graph.nodes.get(id)
    if (!node) continue
    if (node.floor !== floor) {
      const last = legs[legs.length - 1]
      if (last?.kind === 'ride') last.toFloor = node.floor
      else {
        // In die Kabine gehen, fahren, an der Zieletage wieder herauskommen.
        legs.push({ kind: 'walk', x: ELEVATOR_CABIN.x, z: ELEVATOR_CABIN.z, locked: true })
        legs.push({ kind: 'ride', fromFloor: floor, toFloor: node.floor, locked: true })
      }
      floor = node.floor
    } else {
      const last = legs[legs.length - 1]
      if (last?.kind === 'ride') legs.push({ kind: 'walk', x: ELEVATOR_STAND.x, z: ELEVATOR_STAND.z, locked: true })
      pushWalk(node.x, node.z)
    }
  }
  pushWalk(to.x, to.z)
  return legs
}
