import { FLOOR_LAYOUTS, type FloorLayout } from '../config/floorLayouts'

export interface GraphNode {
  id: string
  floor: number
  x: number
  z: number
}

interface Edge {
  to: string
  cost: number
}

export interface NavGraph {
  nodes: Map<string, GraphNode>
  adjacency: Map<string, Edge[]>
}

const RIDE_COST = 4

export const elevatorNodeId = (floor: number): string => `f${floor}-elevator`

export function buildNavGraph(layouts: readonly FloorLayout[] = FLOOR_LAYOUTS): NavGraph {
  const nodes = new Map<string, GraphNode>()
  const adjacency = new Map<string, Edge[]>()
  const link = (a: string, b: string, cost?: number) => {
    const na = nodes.get(a)
    const nb = nodes.get(b)
    if (!na || !nb) return
    const c = cost ?? Math.hypot(na.x - nb.x, na.z - nb.z)
    adjacency.get(a)?.push({ to: b, cost: c })
    adjacency.get(b)?.push({ to: a, cost: c })
  }
  for (const layout of layouts) {
    for (const n of layout.nodes) {
      nodes.set(n.id, n)
      adjacency.set(n.id, [])
    }
  }
  for (const layout of layouts) layout.edges.forEach(([a, b]) => link(a, b))
  // Aufzug verbindet benachbarte Etagen
  for (let i = 0; i < layouts.length - 1; i++) link(elevatorNodeId(i), elevatorNodeId(i + 1), RIDE_COST)
  return { nodes, adjacency }
}

export const navGraph: NavGraph = buildNavGraph()

export function nearestNode(graph: NavGraph, floor: number, x: number, z: number): GraphNode {
  let best: GraphNode | undefined
  let bestDist = Infinity
  for (const n of graph.nodes.values()) {
    if (n.floor !== floor) continue
    const d = Math.hypot(n.x - x, n.z - z)
    if (d < bestDist) {
      bestDist = d
      best = n
    }
  }
  if (!best) throw new Error(`Kein Navigationsknoten auf Etage ${floor}`)
  return best
}

/** Dijkstra über den kleinen Graphen (wenige hundert Knoten). Liefert Knoten IDs von Start bis Ziel. */
export function shortestPath(graph: NavGraph, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId]
  const dist = new Map<string, number>([[fromId, 0]])
  const prev = new Map<string, string>()
  const open = new Set<string>([fromId])
  while (open.size > 0) {
    let current: string | undefined
    let best = Infinity
    for (const id of open) {
      const d = dist.get(id) ?? Infinity
      if (d < best) {
        best = d
        current = id
      }
    }
    if (current === undefined) break
    if (current === toId) break
    open.delete(current)
    for (const edge of graph.adjacency.get(current) ?? []) {
      const nd = best + edge.cost
      if (nd < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, nd)
        prev.set(edge.to, current)
        open.add(edge.to)
      }
    }
  }
  if (!prev.has(toId)) return null
  const path = [toId]
  while (path[0] !== fromId) path.unshift(prev.get(path[0] as string) as string)
  return path
}
