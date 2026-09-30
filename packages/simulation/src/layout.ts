import type {
  ActivityAnchor,
  ActivityKind,
  AnchorId,
  AnchorType,
  DepartmentId,
  FloorDef,
  FloorId,
  LayoutData,
  Point,
  ZoneDef,
  ZoneId,
  ZoneKind,
} from './types';
import type { AgentSeed } from './roster';

/**
 * Semantisches Demo Layout des HQ (Etagen, Zonen, Anker). Enthält keine Weltkoordinaten,
 * nur abstrakte Grundriss Hinweise (Meter) zur Wegzeitschätzung. Terminal 3 löst Anker selbst auf.
 *
 * Etage 0: Erdgeschoss mit Agent Bench, Küche, Lounge, Meetingräumen, Aufzug (wie im Visual Spike).
 * Etage 1 bis 3: HerkulesJobs, KasselMemes, Shared (AI/Development).
 */

export const GROUND_FLOOR: FloorId = 'floor-0';
export const DEPARTMENT_FLOOR: Record<DepartmentId, FloorId> = {
  HERKULESJOBS: 'floor-1',
  KASSELMEMES: 'floor-2',
  SHARED: 'floor-3',
};
export const DEPARTMENT_SLUG: Record<DepartmentId, string> = {
  HERKULESJOBS: 'hj',
  KASSELMEMES: 'km',
  SHARED: 'dev',
};

/** Zone der Agentenbank auf der Etage der Abteilung (dort ruhen sich die Agenten aus). */
export const homeBenchZone = (dept: DepartmentId): ZoneId => `agent-bench-${DEPARTMENT_SLUG[dept]}`;
/** Zone der Bank im Erdgeschoss (Ankunft, Überlauf). */
export const GROUND_BENCH_ZONE: ZoneId = 'agent-bench';

export const elevatorLobbyId = (floorId: FloorId): AnchorId => `elevator-lobby-f${floorIndex(floorId)}`;
export const elevatorCarId = (floorId: FloorId): AnchorId => `elevator-f${floorIndex(floorId)}`;
export const floorIndex = (floorId: FloorId): number => Number(floorId.replace('floor-', ''));

export interface LayoutOptions {
  desks: Record<DepartmentId, number>;
  /** Bankplätze im Erdgeschoss (Ankunft, Überlauf). */
  benchSeats: number;
  /** Bankplätze je Abteilungsetage. */
  floorBenchSeats: Record<DepartmentId, number>;
  coffeeMachines: number;
  kitchenSeats: number;
  loungeSeats: number;
  meetingSeats: number;
  waitingPointsPerFloor: number;
  lobbyPoints: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  desks: { HERKULESJOBS: 12, KASSELMEMES: 12, SHARED: 10 },
  benchSeats: 8,
  floorBenchSeats: { HERKULESJOBS: 12, KASSELMEMES: 12, SHARED: 10 },
  coffeeMachines: 2,
  kitchenSeats: 6,
  loungeSeats: 8,
  meetingSeats: 6,
  waitingPointsPerFloor: 4,
  lobbyPoints: 4,
};

/** Dimensioniert das Layout so, dass jeder Agent Schreibtisch und Bankplatz hat. */
export function layoutOptionsForRoster(seeds: readonly AgentSeed[]): LayoutOptions {
  const count: Record<DepartmentId, number> = { HERKULESJOBS: 0, KASSELMEMES: 0, SHARED: 0 };
  for (const s of seeds) count[s.departmentId] += 1;
  const desks = (n: number, min: number) => Math.max(min, Math.ceil(n * 1.2) + 2);
  const n = seeds.length;
  return {
    desks: {
      HERKULESJOBS: desks(count.HERKULESJOBS, DEFAULT_LAYOUT_OPTIONS.desks.HERKULESJOBS),
      KASSELMEMES: desks(count.KASSELMEMES, DEFAULT_LAYOUT_OPTIONS.desks.KASSELMEMES),
      SHARED: desks(count.SHARED, DEFAULT_LAYOUT_OPTIONS.desks.SHARED),
    },
    benchSeats: Math.max(DEFAULT_LAYOUT_OPTIONS.benchSeats, Math.ceil(n / 6)),
    floorBenchSeats: {
      HERKULESJOBS: Math.max(DEFAULT_LAYOUT_OPTIONS.floorBenchSeats.HERKULESJOBS, count.HERKULESJOBS + 2),
      KASSELMEMES: Math.max(DEFAULT_LAYOUT_OPTIONS.floorBenchSeats.KASSELMEMES, count.KASSELMEMES + 2),
      SHARED: Math.max(DEFAULT_LAYOUT_OPTIONS.floorBenchSeats.SHARED, count.SHARED + 2),
    },
    coffeeMachines: Math.max(2, Math.ceil(n / 25)),
    kitchenSeats: Math.max(6, Math.ceil(n / 8)),
    loungeSeats: Math.max(8, Math.ceil(n / 6)),
    meetingSeats: 6,
    waitingPointsPerFloor: Math.max(4, Math.ceil(n / 15)),
    lobbyPoints: 4,
  };
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');

export function buildLayout(opts: LayoutOptions = DEFAULT_LAYOUT_OPTIONS): {
  layout: LayoutData;
  anchors: Record<AnchorId, ActivityAnchor>;
} {
  const floors: FloorDef[] = [
    { id: 'floor-0', index: 0, label: 'Erdgeschoss', departmentId: null },
    { id: 'floor-1', index: 1, label: 'HerkulesJobs', departmentId: 'HERKULESJOBS' },
    { id: 'floor-2', index: 2, label: 'KasselMemes', departmentId: 'KASSELMEMES' },
    { id: 'floor-3', index: 3, label: 'AI und Development', departmentId: 'SHARED' },
  ];
  const zones: ZoneDef[] = [];
  const anchors: Record<AnchorId, ActivityAnchor> = {};

  const zone = (id: ZoneId, floorId: FloorId, kind: ZoneKind, label: string, center: Point, departmentId?: DepartmentId) =>
    zones.push({ id, floorId, kind, label, center, ...(departmentId ? { departmentId } : {}) });

  const anchor = (
    id: AnchorId,
    type: AnchorType,
    floorId: FloorId,
    zoneId: ZoneId,
    capacity: number,
    allowedActivities: ActivityKind[],
    hint: Point,
    departmentId?: DepartmentId,
  ) => {
    anchors[id] = {
      id,
      type,
      floorId,
      zoneId,
      capacity,
      occupants: [],
      reservedBy: [],
      allowedActivities,
      hint,
      ...(departmentId ? { departmentId } : {}),
    };
  };

  // Aufzug und Lobby je Etage
  for (const f of floors) {
    const z = elevatorLobbyId(f.id);
    zone(z, f.id, 'ELEVATOR_LOBBY', `Aufzugslobby ${f.label}`, { x: 2, y: 14 });
    anchor(z, 'WAITING_POINT', f.id, z, 99, ['STAND', 'WAIT'], { x: 2, y: 14 });
    anchor(elevatorCarId(f.id), 'ELEVATOR', f.id, z, 6, ['STAND'], { x: 0, y: 14 });
  }

  // Erdgeschoss
  const g = GROUND_FLOOR;
  zone(GROUND_BENCH_ZONE, g, 'AGENT_BENCH', 'Agent Bench Erdgeschoss', { x: 14, y: 24 });
  const bw = String(opts.benchSeats).length < 2 ? 2 : String(opts.benchSeats).length;
  for (let i = 0; i < opts.benchSeats; i++) {
    anchor(`bench-${pad(i + 1, bw)}`, 'BENCH', g, GROUND_BENCH_ZONE, 1, ['SIT', 'WAIT'], { x: 4 + (i % 12) * 1.2, y: 23 + Math.floor(i / 12) * 1.5 });
  }
  zone('kitchen', g, 'KITCHEN', 'Küche', { x: 34, y: 4 });
  for (let i = 0; i < opts.coffeeMachines; i++) {
    anchor(`kitchen-coffee-${pad(i + 1, 2)}`, 'COFFEE_MACHINE', g, 'kitchen', 1, ['USE_KITCHEN'], { x: 31 + i * 1.5, y: 2 });
  }
  anchor('kitchen-counter-01', 'KITCHEN_COUNTER', g, 'kitchen', 2, ['STAND', 'USE_KITCHEN'], { x: 36, y: 2 });
  for (let i = 0; i < opts.kitchenSeats; i++) {
    anchor(`kitchen-seat-${pad(i + 1, 2)}`, 'CHAIR', g, 'kitchen', 1, ['SIT', 'USE_KITCHEN'], { x: 31 + (i % 4) * 1.6, y: 5 + Math.floor(i / 4) * 1.6 });
  }
  zone('lounge', g, 'LOUNGE', 'Lounge', { x: 34, y: 24 });
  for (let i = 0; i < opts.loungeSeats; i++) {
    anchor(`lounge-sofa-${pad(i + 1, 2)}`, 'SOFA', g, 'lounge', 1, ['SIT', 'CHAT_VISUAL', 'WAIT', 'READ', 'REST'], { x: 30 + (i % 4) * 2, y: 22 + Math.floor(i / 4) * 2 });
  }
  zone('lobby', g, 'LOBBY', 'Lobby', { x: 18, y: 14 });
  for (let i = 0; i < opts.lobbyPoints; i++) {
    anchor(`lobby-point-${pad(i + 1, 2)}`, 'WAITING_POINT', g, 'lobby', 1, ['STAND', 'WAIT'], { x: 12 + i * 4, y: 14 });
  }
  const room = (id: ZoneId, floorId: FloorId, label: string, center: Point) => {
    zone(id, floorId, 'MEETING_ROOM', label, center);
    for (let i = 0; i < opts.meetingSeats; i++) {
      anchor(`${id}-seat-${pad(i + 1, 2)}`, 'MEETING_SEAT', floorId, id, 1, ['ATTEND_MEETING'], {
        x: center.x - 2 + (i % 3) * 2,
        y: center.y - 1 + Math.floor(i / 3) * 2,
      });
    }
    anchor(`${id}-whiteboard`, 'WHITEBOARD', floorId, id, 2, ['ATTEND_MEETING', 'STAND'], { x: center.x, y: center.y - 3 });
  };
  room('meeting-room-a', g, 'Meetingraum A', { x: 20, y: 4 });
  room('meeting-room-b', g, 'Meetingraum B', { x: 10, y: 4 });

  // Abteilungsetagen
  for (const dept of ['HERKULESJOBS', 'KASSELMEMES', 'SHARED'] as const) {
    const f = DEPARTMENT_FLOOR[dept];
    const slug = DEPARTMENT_SLUG[dept];
    const n = opts.desks[dept];
    const dw = String(n).length < 2 ? 2 : String(n).length;
    zone(`${slug}-desks`, f, 'DESKS', `Arbeitsplätze ${slug}`, { x: 20, y: 12 }, dept);
    for (let i = 0; i < n; i++) {
      anchor(`desk-${slug}-${pad(i + 1, dw)}`, 'DESK', f, `${slug}-desks`, 1, ['WORK'], { x: 8 + (i % 6) * 4, y: 6 + Math.floor(i / 6) * 4 }, dept);
    }
    const fbn = opts.floorBenchSeats[dept];
    const fbw = String(fbn).length < 2 ? 2 : String(fbn).length;
    zone(homeBenchZone(dept), f, 'AGENT_BENCH', `Agent Bench ${slug}`, { x: 14, y: 24 }, dept);
    for (let i = 0; i < fbn; i++) {
      anchor(`bench-${slug}-${pad(i + 1, fbw)}`, 'BENCH', f, homeBenchZone(dept), 1, ['SIT', 'WAIT'], { x: 4 + (i % 12) * 1.2, y: 23 + Math.floor(i / 12) * 1.5 }, dept);
    }
    room(`meeting-room-${slug}`, f, `Meetingraum ${slug}`, { x: 34, y: 4 });
    zone(`waiting-${slug}`, f, 'WAITING_AREA', `Warteplatz ${slug}`, { x: 34, y: 22 }, dept);
    for (let i = 0; i < opts.waitingPointsPerFloor; i++) {
      anchor(`waiting-${slug}-${pad(i + 1, 2)}`, 'WAITING_POINT', f, `waiting-${slug}`, 1, ['WAIT_FOR_APPROVAL', 'WAIT', 'STAND'], { x: 31 + (i % 4) * 1.5, y: 21 + Math.floor(i / 4) * 1.5 }, dept);
    }
  }

  return { layout: { floors, zones }, anchors };
}
