import type { SimulationState } from './state';
import type { AgentStatus, DepartmentId, FloorId, Point, ZoneId, ZoneKind } from './types';

/**
 * Daten für eine Minimap (z. B. oben rechts). Rein semantisch: Zonen mit Anzahl und Status der Agenten.
 * Darstellung, Farben und Umrandung entscheidet Terminal 3.
 */
export interface MinimapZone {
  id: ZoneId;
  kind: ZoneKind;
  label: string;
  center: Point;
  departmentId?: DepartmentId;
  agentCount: number;
  byStatus: Partial<Record<AgentStatus, number>>;
}

export interface MinimapFloor {
  id: FloorId;
  index: number;
  label: string;
  departmentId: DepartmentId | null;
  agentCount: number;
  zones: MinimapZone[];
}

export function buildMinimap(state: SimulationState): MinimapFloor[] {
  const byZone = new Map<ZoneId, MinimapZone>();
  const floors: MinimapFloor[] = state.layout.floors.map((f) => ({ id: f.id, index: f.index, label: f.label, departmentId: f.departmentId, agentCount: 0, zones: [] }));
  const floorById = new Map(floors.map((f) => [f.id, f]));
  for (const z of state.layout.zones) {
    const mz: MinimapZone = { id: z.id, kind: z.kind, label: z.label, center: { ...z.center }, ...(z.departmentId ? { departmentId: z.departmentId } : {}), agentCount: 0, byStatus: {} };
    byZone.set(z.id, mz);
    floorById.get(z.floorId)?.zones.push(mz);
  }
  for (const id of state.agentOrder) {
    const a = state.agents[id]!;
    if (a.status === 'OFFLINE') continue;
    const z = byZone.get(a.location.zoneId);
    if (!z) continue;
    z.agentCount += 1;
    z.byStatus[a.status] = (z.byStatus[a.status] ?? 0) + 1;
    floorById.get(a.location.floorId)!.agentCount += 1;
  }
  return floors;
}
