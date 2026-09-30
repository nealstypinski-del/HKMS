import type { DepartmentId, FloorId } from './types';

/**
 * Zusätzliche Räume (Flügel) für Messe, Workshops und die Abteilungsetagen.
 * Reine Daten: eine Aufgabe. Koordinaten sind abstrakte Meter, der Flügel beginnt bei x = 46.
 */
export type RoomKind = 'MEETING' | 'LOUNGE' | 'WELLNESS' | 'EXPO';

export interface RoomSpec {
  id: string;
  floorId: FloorId;
  label: string;
  kind: RoomKind;
  departmentId?: DepartmentId;
  /** Linke obere Ecke des ersten Platzes. */
  x: number;
  y: number;
  /** Sitze (MEETING, LOUNGE, WELLNESS) oder Messestände (EXPO). */
  count: number;
  /** Plätze je Reihe. */
  cols: number;
}

const m = (floorId: FloorId, id: string, label: string, x: number, y: number, count: number, cols: number, departmentId?: DepartmentId): RoomSpec => ({
  id, floorId, label, kind: 'MEETING', x, y, count, cols, ...(departmentId ? { departmentId } : {}),
});
const l = (floorId: FloorId, id: string, label: string, x: number, y: number, count: number, cols: number, departmentId?: DepartmentId): RoomSpec => ({
  id, floorId, label, kind: 'LOUNGE', x, y, count, cols, ...(departmentId ? { departmentId } : {}),
});

export const EXTRA_ROOMS: readonly RoomSpec[] = [
  // Erdgeschoss: Messehalle
  m('floor-0', 'main-stage', 'Main Stage', 46, 2, 48, 8),
  m('floor-0', 'workshop-a', 'Workshop A', 64, 2, 12, 4),
  m('floor-0', 'workshop-b', 'Workshop B', 74, 2, 12, 4),
  m('floor-0', 'workshop-c', 'Workshop C', 64, 13, 12, 4),
  m('floor-0', 'workshop-d', 'Workshop D', 74, 13, 12, 4),
  { id: 'expo', floorId: 'floor-0', label: 'Expo Halle', kind: 'EXPO', x: 46, y: 15, count: 12, cols: 4 },
  l('floor-0', 'vip-lounge', 'VIP Lounge', 72, 25, 6, 3),

  // HerkulesJobs
  m('floor-1', 'kundenraum-2', 'Kundenraum 2', 46, 3, 6, 3, 'HERKULESJOBS'),
  m('floor-1', 'kundenraum-3', 'Kundenraum 3', 56, 3, 6, 3, 'HERKULESJOBS'),
  m('floor-1', 'verhandlungsraum', 'Verhandlungsraum', 66, 3, 8, 4, 'HERKULESJOBS'),
  m('floor-1', 'recruiting-studio', 'Recruiting Studio', 46, 14, 6, 3, 'HERKULESJOBS'),
  l('floor-1', 'employer-lounge', 'Arbeitgeber Lounge', 60, 22, 4, 2, 'HERKULESJOBS'),

  // KasselMemes
  m('floor-2', 'redaktionskonferenz', 'Redaktionskonferenz', 46, 3, 8, 4, 'KASSELMEMES'),
  m('floor-2', 'videostudio', 'Videostudio', 58, 3, 6, 3, 'KASSELMEMES'),
  m('floor-2', 'fotostudio', 'Fotostudio', 68, 3, 4, 2, 'KASSELMEMES'),
  m('floor-2', 'gewinnspielraum', 'Gewinnspielraum', 46, 14, 6, 3, 'KASSELMEMES'),
  l('floor-2', 'creator-lounge', 'Creator Lounge', 60, 22, 4, 2, 'KASSELMEMES'),

  // AI und Entwicklung
  m('floor-3', 'testlabor', 'Testlabor', 46, 3, 6, 3, 'SHARED'),
  m('floor-3', 'review-raum-2', 'Review Raum 2', 56, 3, 6, 3, 'SHARED'),
  m('floor-3', 'innovation-lab', 'Innovation Lab', 66, 3, 8, 4, 'SHARED'),
  m('floor-3', 'retro-raum', 'Retro Raum', 46, 14, 6, 3, 'SHARED'),
  l('floor-3', 'dev-cafe', 'Entwickler Café', 60, 22, 4, 2, 'SHARED'),

  // Wellness und Dachlounge
  { id: 'ruheraum', floorId: 'floor-4', label: 'Ruheraum', kind: 'WELLNESS', x: 46, y: 5, count: 4, cols: 2 },
  { id: 'yoga-raum', floorId: 'floor-4', label: 'Yoga Raum', kind: 'WELLNESS', x: 58, y: 5, count: 6, cols: 3 },
  l('floor-4', 'dachbar', 'Dachbar mit Fernseher', 66, 16, 6, 3),
];

/** Zonen, in denen sich Agenten im Wellnessbereich ausruhen. */
export const WELLNESS_ZONES: readonly string[] = ['wellness', 'ruheraum', 'yoga-raum', 'dachlounge', 'dachbar'];
