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
 * Semantisches Demo Layout des Hochhauses (Etagen, Zonen, Anker), alle Bezeichnungen auf Deutsch.
 * Enthält keine Weltkoordinaten, nur abstrakte Grundriss Hinweise (Meter) zur Wegzeitschätzung.
 * Terminal 3 löst Anker selbst auf.
 *
 *  Etage 0  Empfang und Erdgeschoss: Lobby, Küche und Café, Lounge mit Fernseher, kleine Agentenbank,
 *           Besprechungsräume A und B, Konferenzraum
 *  Etage 1  HerkulesJobs: Vertrieb und Recruiting, Bank, Kundenraum, Teamlounge, Teeküche, Warteplatz
 *  Etage 2  KasselMemes: Newsroom, Bank, Redaktionsraum, Community Lounge, Teeküche, Warteplatz
 *  Etage 3  AI und Development: Entwicklung, Bank, Review Raum, Entwickler Lounge, Teeküche, Warteplatz
 *  Etage 4  Wellness und Dachlounge: Wellnessraum, Dachlounge mit Fernseher
 */

export const GROUND_FLOOR: FloorId = 'floor-0';
export const WELLNESS_FLOOR: FloorId = 'floor-4';
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
/** Küche und Lounge der Abteilungsetage (Ausweichen auf das Erdgeschoss bleibt möglich). */
export const floorKitchenZone = (dept: DepartmentId): ZoneId => `kitchen-${DEPARTMENT_SLUG[dept]}`;
export const floorLoungeZone = (dept: DepartmentId): ZoneId => `lounge-${DEPARTMENT_SLUG[dept]}`;
export const GROUND_KITCHEN_ZONE: ZoneId = 'kitchen';
export const GROUND_LOUNGE_ZONE: ZoneId = 'lounge';
export const WELLNESS_ZONE: ZoneId = 'wellness';
export const ROOF_LOUNGE_ZONE: ZoneId = 'dachlounge';

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
  /** Optionale Erweiterungen (Standardwerte siehe DEFAULT_EXTRAS). */
  floorLoungeSeats?: number;
  floorKitchenSeats?: number;
  wellnessSeats?: number;
  roofLoungeSeats?: number;
  conferenceSeats?: number;
}

const DEFAULT_EXTRAS = { floorLoungeSeats: 4, floorKitchenSeats: 2, wellnessSeats: 6, roofLoungeSeats: 6, conferenceSeats: 12 };

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
  const d = DEFAULT_LAYOUT_OPTIONS;
  return {
    desks: {
      HERKULESJOBS: desks(count.HERKULESJOBS, d.desks.HERKULESJOBS),
      KASSELMEMES: desks(count.KASSELMEMES, d.desks.KASSELMEMES),
      SHARED: desks(count.SHARED, d.desks.SHARED),
    },
    benchSeats: Math.max(d.benchSeats, Math.ceil(n / 6)),
    floorBenchSeats: {
      HERKULESJOBS: Math.max(d.floorBenchSeats.HERKULESJOBS, count.HERKULESJOBS + 2),
      KASSELMEMES: Math.max(d.floorBenchSeats.KASSELMEMES, count.KASSELMEMES + 2),
      SHARED: Math.max(d.floorBenchSeats.SHARED, count.SHARED + 2),
    },
    coffeeMachines: Math.max(2, Math.ceil(n / 25)),
    kitchenSeats: Math.max(6, Math.ceil(n / 8)),
    loungeSeats: Math.max(8, Math.ceil(n / 6)),
    meetingSeats: 6,
    waitingPointsPerFloor: Math.max(4, Math.ceil(n / 15)),
    lobbyPoints: 4,
    floorLoungeSeats: Math.max(4, Math.ceil(n / 12)),
    floorKitchenSeats: Math.max(2, Math.ceil(n / 20)),
    wellnessSeats: Math.max(6, Math.ceil(n / 8)),
    roofLoungeSeats: Math.max(6, Math.ceil(n / 8)),
    conferenceSeats: Math.max(12, Math.ceil(n / 5)),
  };
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');
const width = (n: number) => Math.max(2, String(n).length);

export function buildLayout(options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS): {
  layout: LayoutData;
  anchors: Record<AnchorId, ActivityAnchor>;
} {
  const opts = { ...DEFAULT_EXTRAS, ...options };
  const floors: FloorDef[] = [
    { id: 'floor-0', index: 0, label: 'Empfang und Erdgeschoss', departmentId: null },
    { id: 'floor-1', index: 1, label: 'HerkulesJobs', departmentId: 'HERKULESJOBS' },
    { id: 'floor-2', index: 2, label: 'KasselMemes', departmentId: 'KASSELMEMES' },
    { id: 'floor-3', index: 3, label: 'AI und Entwicklung', departmentId: 'SHARED' },
    { id: 'floor-4', index: 4, label: 'Wellness und Dachlounge', departmentId: null },
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
    extra: { departmentId?: DepartmentId; focusAnchorId?: AnchorId } = {},
  ) => {
    anchors[id] = { id, type, floorId, zoneId, capacity, occupants: [], reservedBy: [], allowedActivities, hint, ...extra };
  };

  const SOFA_ACTIVITIES: ActivityKind[] = ['SIT', 'CHAT_VISUAL', 'WAIT', 'READ', 'REST', 'WATCH_TV'];

  /** Lounge mit Sofas, die auf einen Fernseher ausgerichtet sind. */
  const lounge = (zoneId: ZoneId, floorId: FloorId, label: string, center: Point, seats: number, prefix: string, dept?: DepartmentId) => {
    zone(zoneId, floorId, 'LOUNGE', label, center, dept);
    const tv = `${prefix}-tv-01`;
    anchor(tv, 'TV', floorId, zoneId, 0, ['WATCH_TV'], { x: center.x, y: center.y - 3 }, dept ? { departmentId: dept } : {});
    const w = width(seats);
    for (let i = 0; i < seats; i++) {
      anchor(`${prefix}-sofa-${pad(i + 1, w)}`, 'SOFA', floorId, zoneId, 1, SOFA_ACTIVITIES, { x: center.x - 3 + (i % 4) * 2, y: center.y + Math.floor(i / 4) * 2 }, { ...(dept ? { departmentId: dept } : {}), focusAnchorId: tv });
    }
  };

  /** Küche mit Kaffeemaschinen, Arbeitsplatte und Sitzplätzen. */
  const kitchen = (zoneId: ZoneId, floorId: FloorId, label: string, center: Point, coffee: number, seats: number, prefix: string, counter: boolean, dept?: DepartmentId) => {
    zone(zoneId, floorId, 'KITCHEN', label, center, dept);
    const dx = dept ? { departmentId: dept } : {};
    for (let i = 0; i < coffee; i++) anchor(`${prefix}-coffee-${pad(i + 1, 2)}`, 'COFFEE_MACHINE', floorId, zoneId, 1, ['USE_KITCHEN'], { x: center.x - 3 + i * 1.5, y: center.y - 2 }, dx);
    if (counter) anchor(`${prefix}-counter-01`, 'KITCHEN_COUNTER', floorId, zoneId, 2, ['STAND', 'USE_KITCHEN'], { x: center.x + 2, y: center.y - 2 }, dx);
    for (let i = 0; i < seats; i++) anchor(`${prefix}-seat-${pad(i + 1, 2)}`, 'CHAIR', floorId, zoneId, 1, ['SIT', 'USE_KITCHEN'], { x: center.x - 3 + (i % 4) * 1.6, y: center.y + 1 + Math.floor(i / 4) * 1.6 }, dx);
  };

  const room = (id: ZoneId, floorId: FloorId, label: string, center: Point, seats: number, dept?: DepartmentId) => {
    zone(id, floorId, 'MEETING_ROOM', label, center, dept);
    for (let i = 0; i < seats; i++) {
      anchor(`${id}-seat-${pad(i + 1, 2)}`, 'MEETING_SEAT', floorId, id, 1, ['ATTEND_MEETING'], { x: center.x - 2 + (i % 4) * 1.6, y: center.y - 1 + Math.floor(i / 4) * 2 }, dept ? { departmentId: dept } : {});
    }
    anchor(`${id}-whiteboard`, 'WHITEBOARD', floorId, id, 2, ['ATTEND_MEETING', 'STAND'], { x: center.x, y: center.y - 3 });
  };

  // Aufzug und Aufzugslobby je Etage
  for (const f of floors) {
    const z = elevatorLobbyId(f.id);
    zone(z, f.id, 'ELEVATOR_LOBBY', `Aufzugslobby ${f.label}`, { x: 2, y: 14 });
    anchor(z, 'WAITING_POINT', f.id, z, 99, ['STAND', 'WAIT'], { x: 2, y: 14 });
    anchor(elevatorCarId(f.id), 'ELEVATOR', f.id, z, 6, ['STAND'], { x: 0, y: 14 });
  }

  // Etage 0: Empfang und Erdgeschoss
  const g = GROUND_FLOOR;
  zone(GROUND_BENCH_ZONE, g, 'AGENT_BENCH', 'Agentenbank Erdgeschoss', { x: 14, y: 24 });
  const bw = width(opts.benchSeats);
  for (let i = 0; i < opts.benchSeats; i++) {
    anchor(`bench-${pad(i + 1, bw)}`, 'BENCH', g, GROUND_BENCH_ZONE, 1, ['SIT', 'WAIT'], { x: 4 + (i % 12) * 1.2, y: 23 + Math.floor(i / 12) * 1.5 });
  }
  kitchen(GROUND_KITCHEN_ZONE, g, 'Küche und Café', { x: 34, y: 4 }, opts.coffeeMachines, opts.kitchenSeats, 'kitchen', true);
  lounge(GROUND_LOUNGE_ZONE, g, 'Lounge mit Fernseher', { x: 34, y: 24 }, opts.loungeSeats, 'lounge');
  zone('lobby', g, 'LOBBY', 'Empfang und Lobby', { x: 18, y: 14 });
  for (let i = 0; i < opts.lobbyPoints; i++) {
    anchor(`lobby-point-${pad(i + 1, 2)}`, 'WAITING_POINT', g, 'lobby', 1, ['STAND', 'WAIT'], { x: 12 + i * 4, y: 14 });
  }
  room('meeting-room-a', g, 'Besprechungsraum A', { x: 20, y: 4 }, opts.meetingSeats);
  room('meeting-room-b', g, 'Besprechungsraum B', { x: 10, y: 4 }, opts.meetingSeats);
  room('konferenz', g, 'Konferenzraum Herkules', { x: 27, y: 14 }, opts.conferenceSeats);

  // Etagen 1 bis 3: Abteilungen
  const deptLabels: Record<DepartmentId, { desks: string; meeting: string; lounge: string; kitchen: string; bench: string; waiting: string }> = {
    HERKULESJOBS: { desks: 'Vertrieb und Recruiting', meeting: 'Kundenraum', lounge: 'Teamlounge HerkulesJobs', kitchen: 'Teeküche HerkulesJobs', bench: 'Agentenbank HerkulesJobs', waiting: 'Warteplatz Freigaben HerkulesJobs' },
    KASSELMEMES: { desks: 'Newsroom KasselMemes', meeting: 'Redaktionsraum', lounge: 'Community Lounge', kitchen: 'Teeküche KasselMemes', bench: 'Agentenbank KasselMemes', waiting: 'Warteplatz Freigaben KasselMemes' },
    SHARED: { desks: 'Entwicklung und Betrieb', meeting: 'Review Raum', lounge: 'Entwickler Lounge', kitchen: 'Teeküche Entwicklung', bench: 'Agentenbank Entwicklung', waiting: 'Warteplatz Freigaben Entwicklung' },
  };
  for (const dept of ['HERKULESJOBS', 'KASSELMEMES', 'SHARED'] as const) {
    const f = DEPARTMENT_FLOOR[dept];
    const slug = DEPARTMENT_SLUG[dept];
    const L = deptLabels[dept];
    const n = opts.desks[dept];
    const dw = width(n);
    zone(`${slug}-desks`, f, 'DESKS', L.desks, { x: 20, y: 12 }, dept);
    for (let i = 0; i < n; i++) {
      anchor(`desk-${slug}-${pad(i + 1, dw)}`, 'DESK', f, `${slug}-desks`, 1, ['WORK'], { x: 8 + (i % 6) * 4, y: 6 + Math.floor(i / 6) * 4 }, { departmentId: dept });
    }
    const fbn = opts.floorBenchSeats[dept];
    const fbw = width(fbn);
    zone(homeBenchZone(dept), f, 'AGENT_BENCH', L.bench, { x: 14, y: 24 }, dept);
    for (let i = 0; i < fbn; i++) {
      anchor(`bench-${slug}-${pad(i + 1, fbw)}`, 'BENCH', f, homeBenchZone(dept), 1, ['SIT', 'WAIT'], { x: 4 + (i % 12) * 1.2, y: 23 + Math.floor(i / 12) * 1.5 }, { departmentId: dept });
    }
    room(`meeting-room-${slug}`, f, L.meeting, { x: 34, y: 4 }, opts.meetingSeats, dept);
    kitchen(floorKitchenZone(dept), f, L.kitchen, { x: 26, y: 4 }, 1, opts.floorKitchenSeats, `kitchen-${slug}`, false, dept);
    lounge(floorLoungeZone(dept), f, L.lounge, { x: 26, y: 24 }, opts.floorLoungeSeats, `lounge-${slug}`, dept);
    zone(`waiting-${slug}`, f, 'WAITING_AREA', L.waiting, { x: 34, y: 22 }, dept);
    for (let i = 0; i < opts.waitingPointsPerFloor; i++) {
      anchor(`waiting-${slug}-${pad(i + 1, 2)}`, 'WAITING_POINT', f, `waiting-${slug}`, 1, ['WAIT_FOR_APPROVAL', 'WAIT', 'STAND'], { x: 31 + (i % 4) * 1.5, y: 21 + Math.floor(i / 4) * 1.5 }, { departmentId: dept });
    }
  }

  // Etage 4: Wellness und Dachlounge
  const w4 = WELLNESS_FLOOR;
  zone(WELLNESS_ZONE, w4, 'WELLNESS', 'Wellnessraum', { x: 12, y: 10 });
  for (let i = 0; i < opts.wellnessSeats; i++) {
    anchor(`wellness-liege-${pad(i + 1, 2)}`, 'SOFA', w4, WELLNESS_ZONE, 1, ['REST', 'SIT', 'READ'], { x: 8 + (i % 3) * 2.5, y: 8 + Math.floor(i / 3) * 2.5 });
  }
  lounge(ROOF_LOUNGE_ZONE, w4, 'Dachlounge mit Fernseher', { x: 28, y: 12 }, opts.roofLoungeSeats, 'dachlounge');

  return { layout: { floors, zones }, anchors };
}
