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

/** Zonenspezifische Dekoration (Regale, Küche, Wellness, Empfang, Glaswände der Meetingräume). */
export function buildZoneDecor(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
    // Zonenspezifische Dekoration
    zones.forEach((z) => {
      const b = z._box; const cx = (b.x0 + b.x1) / 2;
      if (z.kind === 'DESKS') { for (let k = 0; k < 3; k++) bookshelf(c, b.x0 + 2 + k * 2.3, Z0 + 0.35, rand); tallPlant(c, b.x1 + 0.6, b.z0 + 0.4); tallPlant(c, b.x0 - 0.9, b.z1 - 0.5); c.box(P.metal(), 0.9, 1.3, 0.6, b.x1 - 0.5, 0.65, Z0 + 0.5); c.box(M(0xdfe3ea, { r: 0.4 }), 0.55, 1.6, 0.55, b.x0 + 8.6, 0.8, Z0 + 0.5); c.cyl(M(0x6ec1ff, { r: 0.2, t: true, o: 0.6 }), 0.16, 0.16, 0.5, b.x0 + 8.6, 1.85, Z0 + 0.5, 12); }
      if (z.kind === 'LOUNGE') { const t = anchors.find((a) => a.zoneId === z.id && a.type === 'TV'); rug(c, b.x0 + 0.2, b.z0 + 2.2, b.x1 - 0.2, b.z1 - 0.2, M(0xffffff, { map: T.rugTex('#8c5a3c', '#e3c7a0'), r: 0.95 })); if (t) { plant(c, b.x0 - 0.2, b.z0 + 1.2, 1.1); c.box(P.walnut(), 1.0, 0.4, 0.6, b.x0 + 2.2, 0.2, b.z0 + 3.2); pendant(c, cx, b.z0 + 3.4, 3.4, 0.4); } tallPlant(c, b.x1 + 0.7, b.z0 + 1.2); }
      if (z.kind === 'KITCHEN') { const cx0 = (b.x0 + b.x1) / 2; c.box(P.white(), b.x1 - b.x0 + 1, 0.9, 0.6, cx0, 0.45, Z0 + 0.4 + (b.z0 < 3 ? 0 : 0)); c.box(P.walnut(), b.x1 - b.x0 + 1, 0.05, 0.65, cx0, 0.93, Z0 + 0.4); c.box(P.white(), b.x1 - b.x0 + 1, 0.7, 0.35, cx0, 2.0, Z0 + 0.22); const tzc = b.z1 - 1.6; const seats = (byZone.get(z.id) || []).filter((a) => a.type === 'CHAIR'); if (seats.length) { const sx0 = Math.min(...seats.map((s) => s.hint.x)), sx1 = Math.max(...seats.map((s) => s.hint.x)); const rows = [...new Set(seats.map((s) => s.hint.y))]; const zc = rows.length > 1 ? (Math.min(...rows) + Math.max(...rows)) / 2 : rows[0] - 0.85; c.cyl(P.white(), 0.03, 0.03, 0.72, (sx0 + sx1) / 2, 0.36, zc, 8); c.box(P.white(), Math.max(1.4, sx1 - sx0 + 0.8), 0.06, 0.8, (sx0 + sx1) / 2, 0.74, zc); } void tzc; }
      if (z.kind === 'WELLNESS') { for (let k = 0; k < 4; k++) tallPlant(c, b.x0 - 0.6 + k * 3.5, b.z0 - 0.4); c.box(M(0xd7ccec, { r: 0.6 }), 1.6, 0.25, 1.6, b.x1 + 1.2, 0.12, b.z0 + 1.0); for (let k = 0; k < 5; k++) c.sph(M(0x5f6b7a, { r: 0.6 }), 0.16, b.x1 + 0.7 + (k % 3) * 0.3, 0.4, b.z0 + 0.6 + (k % 2) * 0.4, 1, 0.7, 1); for (let k = 0; k < 4; k++) { c.cyl(M(0xffffff, { r: 0.9 }), 0.06, 0.06, 0.14, b.x1 + 1.0 + k * 0.28, 0.32, b.z0 + 1.6, 8); c.sph(M(0xffb347, { e: 0xffa500, ei: 2 }), 0.03, b.x1 + 1.0 + k * 0.28, 0.42, b.z0 + 1.6); } pendant(c, cx, (b.z0 + b.z1) / 2, 3.2, 0.5);
        // Sauna, Whirlpool, Yogamatten, Bambuswand
        const sx = b.x1 + 5.2, sz = b.z0 + 0.6, wood = M(0xb8793f, { r: 0.6 }), dwood = M(0x7a4a26, { r: 0.6 });
        c.box(wood, 3.4, 2.6, 0.12, sx + 1.7, 1.3, sz); c.box(wood, 0.12, 2.6, 2.8, sx, 1.3, sz + 1.4); c.box(wood, 0.12, 2.6, 2.8, sx + 3.4, 1.3, sz + 1.4);
        c.box(wood, 3.5, 0.12, 2.9, sx + 1.7, 2.6, sz + 1.4); c.box(P.glass(), 3.2, 2.3, 0.05, sx + 1.7, 1.25, sz + 2.8); c.box(dwood, 0.1, 2.3, 0.1, sx + 1.7, 1.25, sz + 2.8);
        c.box(dwood, 2.8, 0.1, 0.7, sx + 1.7, 0.55, sz + 0.5); c.box(dwood, 2.8, 0.1, 0.7, sx + 1.7, 1.15, sz + 0.5); c.box(M(0xff9b3d, { e: 0xff7a00, ei: 1.6 }), 0.6, 0.12, 0.05, sx + 1.7, 2.2, sz + 0.1);
        const hx = sx + 1.7, hz = sz + 6.8; c.cyl(P.white(), 1.7, 1.7, 0.7, hx, 0.35, hz, 28); c.cyl(M(0x6fd0ff, { r: 0.1, e: 0x3fb0ff, ei: 0.5 }), 1.45, 1.45, 0.05, hx, 0.73, hz, 28);
        for (const [ox, oz, col] of [[-3.2, 0.6, 0x6b5b95], [-3.2, 2.2, 0x88b04b], [-1.6, 2.2, 0xd65076]]) c.box(M(col, { r: 0.9 }), 0.7, 0.03, 1.8, b.x0 + 6 + ox + 8, 0.03, b.z1 + 3 + oz);
        for (let k = 0; k < 14; k++) c.cyl(M(0xc9b26b, { r: 0.7 }), 0.05, 0.05, 2.2, b.x0 - 0.5 + k * 0.32, 1.1, b.z0 - 1.6, 8);
      }
      if (z.kind === 'AGENT_BENCH') { plant(c, b.x0 - 0.5, b.z0 + 0.5, 0.9); plant(c, b.x1 + 0.5, b.z0 + 0.5, 0.9); }
      if (z.kind === 'WAITING_AREA') { c.box(M(0xfff3c4, { r: 0.6 }), 1.8, 0.05, 0.9, cx, 0.5, b.z1 + 0.9); for (const sx of [-0.7, 0.7]) c.box(P.metal(), 0.05, 0.5, 0.05, cx + sx, 0.25, b.z1 + 0.9); }
      if (z.kind === 'LOBBY') {
        c.box(P.walnut(), 6.2, 1.1, 1.1, 13.5, 0.55, 10.4); c.box(P.white(), 6.0, 0.05, 1.3, 13.5, 1.13, 10.5); c.box(M(0xff8a3d, { r: 0.4, e: 0xff8a3d, ei: 0.3 }), 6.2, 0.14, 0.06, 13.5, 0.98, 10.93);
        c.box(P.dark(), 0.5, 0.35, 0.4, 12.2, 1.32, 10.4); c.box(P.frame(), 0.5, 0.4, 0.05, 12.2, 1.55, 10.3);
        for (let k = 0; k < 2; k++) sofa(c, 18 + k * 2.6, 17.6, Math.PI, FABRIC[k * 2]);
        c.box(P.wood(), 1.6, 0.4, 0.8, 19.3, 0.2, 15.9); tallPlant(c, b.x0 - 0.6, b.z0 + 0.6); tallPlant(c, b.x1 + 0.6, b.z0 + 0.6);
        rug(c, 16.4, 15.0, 22.6, 19.2, M(0xffffff, { map: T.rugTex('#28405f', '#ff8a3d'), r: 0.95 }));
      }
      if (z.kind === 'MEETING_ROOM') {
        const gm = P.glass(), fr = M(0x2b3140, { r: 0.4, m: 0.4 }), hh = 2.4; const { x0, x1, z0, z1 } = b;
        c.box(gm, x1 - x0, hh, 0.04, (x0 + x1) / 2, hh / 2, z0); c.box(gm, 0.04, hh, z1 - z0, x0, hh / 2, (z0 + z1) / 2); c.box(gm, 0.04, hh, z1 - z0, x1, hh / 2, (z0 + z1) / 2);
        const gap = 1.5, mid = (x0 + x1) / 2; c.box(gm, mid - gap / 2 - x0, hh, 0.04, (x0 + mid - gap / 2) / 2, hh / 2, z1); c.box(gm, x1 - mid - gap / 2, hh, 0.04, (mid + gap / 2 + x1) / 2, hh / 2, z1);
        for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [mid - gap / 2, z1], [mid + gap / 2, z1]]) c.box(fr, 0.07, hh, 0.07, px, hh / 2, pz);
        c.box(fr, x1 - x0, 0.06, 0.06, (x0 + x1) / 2, hh, z0); c.box(fr, 0.06, 0.06, z1 - z0, x0, hh, (z0 + z1) / 2); c.box(fr, 0.06, 0.06, z1 - z0, x1, hh, (z0 + z1) / 2);
      }
    });
}
