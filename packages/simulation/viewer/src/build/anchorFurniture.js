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

/** Möbel aus den Ankern der Simulation, dazu Sitzpositionen für die Figuren. */
export function buildAnchorFurniture(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
    // Anker zu Möbeln
    const tvOf = (a) => (a.focusAnchorId ? anchorById.get(a.focusAnchorId) : null);
    zones.forEach((z) => {
      const an = (byZone.get(z.id) || []).filter((a) => a.floorId === fdef.id); const b = z._box;
      if (z.kind === 'DESKS') an.filter((a) => a.type === 'DESK').forEach((a, k) => { desk(c, a.hint.x, a.hint.y, DEPT_COLOR[a.departmentId] ?? 0x8b9cff, k + i * 7); seatInfo.set(a.id, { x: a.hint.x, z: a.hint.y + 1.05, y: 0.5, yaw: Math.PI, pose: 'sit', desk: true }); });
      an.forEach((a) => {
        const { x, y: hz } = a.hint;
        if (a.type === 'BENCH') { bench(c, x, hz, FABRIC[(Math.round(x * 2)) % 3 === 0 ? 0 : 2]); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw: Math.PI, pose: 'sit' }); }
        else if (a.type === 'SOFA' && z.kind === 'WELLNESS') { lounger(c, x, hz); seatInfo.set(a.id, { x, z: hz, y: 0.52, yaw: Math.PI / 2, pose: 'lie' }); }
        else if (a.type === 'SOFA') { const tv = tvOf(a); const yaw = tv ? Math.atan2(tv.hint.x - x, tv.hint.y - hz) : 0; sofa(c, x, hz, yaw, FABRIC[(Math.round(x + hz)) % FABRIC.length]); seatInfo.set(a.id, { x, z: hz + 0.05, y: 0.5, yaw, pose: 'sit' }); }
        else if (a.type === 'TV') tvUnit(c, x, hz, tvs, i * FH, (i + Math.round(x)) % 3);
        else if (a.type === 'COFFEE_MACHINE') { coffeeCounter(c, x, hz); seatInfo.set(a.id, { x, z: hz + 0.55, y: 0, yaw: Math.PI, pose: 'coffee' }); }
        else if (a.type === 'KITCHEN_COUNTER') { c.box(P.white(), 1.4, 0.9, 0.7, x, 0.45, hz - 0.3); c.box(P.walnut(), 1.5, 0.06, 0.78, x, 0.93, hz - 0.3); c.box(P.metal(), 0.5, 0.03, 0.4, x, 0.97, hz - 0.3); c.box(M(0xdfe3ea, { r: 0.3, m: 0.5 }), 0.7, 1.9, 0.7, x + 1.2, 0.95, hz - 0.35); seatInfo.set(a.id, { x, z: hz + 0.5, y: 0, yaw: Math.PI, pose: 'stand' }); }
        else if (a.type === 'CHAIR') { const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const yaw = Math.atan2(cx - x, cz - hz); chairAt(c, x, hz, yaw + Math.PI, 0xd9793a); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw, pose: 'sit' }); }
        else if (a.type === 'WAITING_POINT' && z.kind === 'WAITING_AREA') { c.cyl(P.dark(), 0.03, 0.03, 0.4, x, 0.2, hz, 6); c.cyl(M(0xffc94d, { r: 0.7 }), 0.24, 0.24, 0.1, x, 0.45, hz, 16); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw: Math.PI, pose: 'sit' }); }
        else if (a.type === 'WAITING_POINT' && z.kind === 'LOBBY') seatInfo.set(a.id, { x, z: hz, y: 0, yaw: Math.PI, pose: 'stand' });
        else if (a.type === 'WHITEBOARD') { whiteboardBoard(c, x, hz); seatInfo.set(a.id, { x, z: hz + 0.8, y: 0, yaw: Math.PI, pose: 'stand' }); }
      });
      // Meetingtisch je Reihenpaar
      if (z.kind === 'MEETING_ROOM') {
        const seats = an.filter((a) => a.type === 'MEETING_SEAT'); const rows = [...new Set(seats.map((s) => s.hint.y))].sort((p, q) => p - q);
        const xs = seats.map((s) => s.hint.x); const tx0 = Math.min(...xs) - 0.5, tx1 = Math.max(...xs) + 0.5;
        for (let r = 1; r < rows.length; r++) { const zc = (rows[r - 1] + rows[r]) / 2; c.box(P.wood(), tx1 - tx0, 0.07, 0.9, (tx0 + tx1) / 2, 0.75, zc); for (const sx of [tx0 + 0.3, tx1 - 0.3]) c.box(P.metal(), 0.06, 0.72, 0.6, sx, 0.36, zc); c.box(P.dark(), 0.35, 0.02, 0.25, (tx0 + tx1) / 2, 0.79, zc); pendant(c, (tx0 + tx1) / 2, zc); }
        if (rows.length < 2) { const zc = rows[0] + 1; c.box(P.wood(), tx1 - tx0, 0.07, 0.9, (tx0 + tx1) / 2, 0.75, zc); }
        seats.forEach((s) => { const row = rows.indexOf(s.hint.y); const yaw = row === 0 ? 0 : Math.PI; chairAt(c, s.hint.x, s.hint.y, yaw + Math.PI, 0x30384a); seatInfo.set(s.id, { x: s.hint.x, z: s.hint.y, y: 0.5, yaw: row === 0 ? 0 : Math.PI, pose: 'sit' }); });
      }
    });
}
