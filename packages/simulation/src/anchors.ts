import type { ActivityAnchor, AgentId, AnchorId, AnchorType, FloorId, ZoneId } from './types';

export class InvariantError extends Error {}

/**
 * Verwaltung aller Aktivitätsanker. Kapazität = Belegung + Reservierung.
 * Dadurch können Agenten nie auf demselben Stuhl "stapeln".
 */
export class AnchorBook {
  private byType = new Map<AnchorType, ActivityAnchor[]>();
  private byZone = new Map<ZoneId, ActivityAnchor[]>();

  constructor(public readonly anchors: Record<AnchorId, ActivityAnchor>) {
    for (const a of Object.values(anchors)) {
      push(this.byType, a.type, a);
      push(this.byZone, a.zoneId, a);
    }
  }

  get(id: AnchorId): ActivityAnchor {
    const a = this.anchors[id];
    if (!a) throw new InvariantError(`Unbekannter Anker: ${id}`);
    return a;
  }

  has(id: AnchorId): boolean {
    return id in this.anchors;
  }

  ofType(type: AnchorType): readonly ActivityAnchor[] {
    return this.byType.get(type) ?? [];
  }

  inZone(zoneId: ZoneId): readonly ActivityAnchor[] {
    return this.byZone.get(zoneId) ?? [];
  }

  used(a: ActivityAnchor): number {
    return a.occupants.length + a.reservedBy.length;
  }

  holds(a: ActivityAnchor, agentId: AgentId): boolean {
    return a.occupants.includes(agentId) || a.reservedBy.includes(agentId);
  }

  isFree(id: AnchorId, forAgent?: AgentId): boolean {
    const a = this.get(id);
    if (forAgent && this.holds(a, forAgent)) return true;
    return this.used(a) < a.capacity;
  }

  freeCapacity(id: AnchorId): number {
    const a = this.get(id);
    return a.capacity - this.used(a);
  }

  /** Erster freier Anker (in Layout Reihenfolge) passend zu Typ, optional Zone, Etage, Abteilung. */
  findFree(
    type: AnchorType,
    agentId: AgentId,
    filter: { zoneId?: ZoneId; floorId?: FloorId; departmentId?: string } = {},
  ): ActivityAnchor | null {
    const list = filter.zoneId ? this.inZone(filter.zoneId) : this.ofType(type);
    for (const a of list) {
      if (a.type !== type) continue;
      if (filter.floorId && a.floorId !== filter.floorId) continue;
      if (filter.departmentId && a.departmentId !== filter.departmentId) continue;
      if (this.holds(a, agentId) || this.used(a) < a.capacity) return a;
    }
    return null;
  }

  reserve(id: AnchorId, agentId: AgentId): void {
    const a = this.get(id);
    if (this.holds(a, agentId)) return;
    if (this.used(a) >= a.capacity) throw new InvariantError(`Anker ${id} ist voll (Kapazität ${a.capacity})`);
    a.reservedBy.push(agentId);
  }

  /** Reservierung (oder freie Kapazität) in Belegung umwandeln. */
  occupy(id: AnchorId, agentId: AgentId): void {
    const a = this.get(id);
    if (a.occupants.includes(agentId)) return;
    const i = a.reservedBy.indexOf(agentId);
    if (i >= 0) a.reservedBy.splice(i, 1);
    else if (this.used(a) >= a.capacity) throw new InvariantError(`Anker ${id} ist voll (Kapazität ${a.capacity})`);
    a.occupants.push(agentId);
  }

  /** Physisch verlassen. Optional bleibt die Reservierung (z. B. Schreibtisch während eines Meetings). */
  vacate(id: AnchorId, agentId: AgentId, keepReservation: boolean): void {
    const a = this.get(id);
    const i = a.occupants.indexOf(agentId);
    if (i < 0) return;
    a.occupants.splice(i, 1);
    if (keepReservation && !a.reservedBy.includes(agentId)) a.reservedBy.push(agentId);
  }

  release(id: AnchorId, agentId: AgentId): void {
    const a = this.get(id);
    const i = a.occupants.indexOf(agentId);
    if (i >= 0) a.occupants.splice(i, 1);
    const j = a.reservedBy.indexOf(agentId);
    if (j >= 0) a.reservedBy.splice(j, 1);
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
