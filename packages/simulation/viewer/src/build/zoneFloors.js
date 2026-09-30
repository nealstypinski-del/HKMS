import * as THREE from 'three';
import * as T from '../textures.js';
import { FH, ESC, DEPT_COLOR } from './constants.js';
import { M, P, FABRIC } from './materials.js';
import { plant, tallPlant } from './furniture/plants.js';
import { chairAt, bench, sofa, lounger } from './furniture/seating.js';
import { desk, bookshelf, whiteboardBoard } from './furniture/office.js';
import { coffeeCounter } from './furniture/kitchen.js';
import { tvUnit } from './furniture/media.js';
import { pendant } from './furniture/lighting.js';
import { rug } from './furniture/textiles.js';

/** Bodenflächen je Zone (Teppich, Holz, Fliesen, Marmor) und Zonenrahmen. */
export function buildZoneFloors(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
  const zoneFloor = (z) => z.kind === 'DESKS' ? (z.departmentId === 'HERKULESJOBS' ? bases.carpetHJ : z.departmentId === 'KASSELMEMES' ? bases.carpetKM : bases.carpetDev)
    : z.kind === 'WELLNESS' ? bases.carpetWell : z.kind === 'KITCHEN' ? bases.tile : z.kind === 'LOUNGE' ? bases.carpetWarm : z.kind === 'MEETING_ROOM' ? bases.wood
    : z.kind === 'AGENT_BENCH' ? bases.woodDark : z.kind === 'WAITING_AREA' ? bases.carpetWarm : z.kind === 'LOBBY' ? bases.marble : null;
    // Zonenböden
    zones.forEach((z, zi) => {
      const an = byZone.get(z.id) || []; let x0 = z.center.x - 3, x1 = z.center.x + 3, z0 = z.center.y - 2.5, z1 = z.center.y + 2.5;
      if (an.length) { x0 = Math.min(...an.map((a) => a.hint.x)) - 1.6; x1 = Math.max(...an.map((a) => a.hint.x)) + 1.6; z0 = Math.min(...an.map((a) => a.hint.y)) - 1.9; z1 = Math.max(...an.map((a) => a.hint.y)) + 1.9; }
      z._box = { x0, x1, z0, z1 };
      const m = zoneFloor(z); if (m && z.kind !== 'ELEVATOR_LOBBY') c.plane(m, x0, z0, x1, z1, 0.008 + zi * 0.0006, z.kind === 'DESKS' ? 3 : 4);
    });
}
