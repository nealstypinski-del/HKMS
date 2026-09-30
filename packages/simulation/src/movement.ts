import type { AnchorBook } from './anchors';
import { elevatorCarId, elevatorLobbyId, floorIndex } from './layout';
import type { Location, Point, RouteStage, SimConfig, ZoneDef, ZoneId, AnchorType } from './types';

/** Anker, auf denen ein Agent sitzt (vor dem Weggehen folgt die Etappe STAND_UP). */
export const SEAT_TYPES: ReadonlySet<AnchorType> = new Set(['DESK', 'CHAIR', 'BENCH', 'SOFA', 'MEETING_SEAT']);

/**
 * Routenplaner. Liefert nur Absichten (Etappen mit semantischen Orten und geschätzter Dauer).
 * Wie der Weg aussieht, entscheidet Terminal 3.
 */
export class RoutePlanner {
  private zones = new Map<ZoneId, ZoneDef>();

  constructor(
    zones: readonly ZoneDef[],
    private anchors: AnchorBook,
    private config: () => SimConfig,
  ) {
    for (const z of zones) this.zones.set(z.id, z);
  }

  pointOf(loc: Location): Point {
    if (loc.anchorId && this.anchors.has(loc.anchorId)) return this.anchors.get(loc.anchorId).hint;
    return this.zones.get(loc.zoneId)?.center ?? { x: 0, y: 0 };
  }

  walkMs(a: Location, b: Location): number {
    const pa = this.pointOf(a);
    const pb = this.pointOf(b);
    const dist = Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
    return Math.max(600, Math.round((dist / this.config().walkSpeedMps) * 1000));
  }

  lobbyOf(floorId: string): Location {
    const id = elevatorLobbyId(floorId);
    return { floorId, zoneId: id, anchorId: id };
  }

  carOf(floorId: string): Location {
    return { floorId, zoneId: elevatorLobbyId(floorId), anchorId: elevatorCarId(floorId) };
  }

  static samePlace(a: Location, b: Location): boolean {
    return a.floorId === b.floorId && a.zoneId === b.zoneId && a.anchorId === b.anchorId;
  }

  /**
   * Etappen von "from" nach "to". Mehrere Etagen: Aufzugskette
   * WALK_TO_ELEVATOR, WAIT_FOR_ELEVATOR, ENTER_ELEVATOR, CHANGE_FLOOR, EXIT_ELEVATOR, WALK_TO_DESTINATION.
   */
  plan(from: Location, to: Location, standUp: boolean): RouteStage[] {
    const t = this.config().timings;
    const stages: RouteStage[] = [];
    let cur: Location = { ...from };

    if (standUp) {
      const standing: Location = { ...from, anchorId: null };
      stages.push({ kind: 'STAND_UP', from: { ...from }, to: standing, durationMs: t.standUpMs });
      cur = standing;
    }

    if (cur.floorId !== to.floorId) {
      const lobbyA = this.lobbyOf(cur.floorId);
      const carA = this.carOf(cur.floorId);
      const lobbyB = this.lobbyOf(to.floorId);
      const carB = this.carOf(to.floorId);
      const floors = Math.abs(floorIndex(to.floorId) - floorIndex(cur.floorId));
      stages.push({ kind: 'WALK_TO_ELEVATOR', from: cur, to: lobbyA, durationMs: this.walkMs(cur, lobbyA) });
      stages.push({ kind: 'WAIT_FOR_ELEVATOR', from: lobbyA, to: lobbyA, durationMs: t.elevatorWaitMs });
      stages.push({ kind: 'ENTER_ELEVATOR', from: lobbyA, to: carA, durationMs: t.elevatorEnterMs });
      stages.push({ kind: 'CHANGE_FLOOR', from: carA, to: carB, durationMs: t.elevatorFloorMs * floors });
      stages.push({ kind: 'EXIT_ELEVATOR', from: carB, to: lobbyB, durationMs: t.elevatorExitMs });
      cur = lobbyB;
    }

    if (!RoutePlanner.samePlace(cur, to)) {
      stages.push({ kind: 'WALK_TO_DESTINATION', from: cur, to: { ...to }, durationMs: this.walkMs(cur, to) });
    }
    return stages;
  }
}
