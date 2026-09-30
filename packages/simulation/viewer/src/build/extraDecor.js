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

/** Zusätzliche Einrichtung: Wandbilder, Dashboards, Drucker, Lampen, Pflanzen, Rolltreppenschild. */
export function buildExtraDecor(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
    // Zusätzliche Einrichtung
    const art = [['#ff8a3d', '#2b3a67'], ['#2fd6c0', '#f2c94c'], ['#8b9cff', '#e15b7a'], ['#f2c94c', '#3ea6a0']];
    for (let k = 0; k < 4; k++) { const z0 = 3.5 + k * 6.4; if (z0 > 9.5 && z0 < 19) continue; c.box(M(0xf4f0e8, { r: 0.6 }), 0.05, 1.3, 1.9, X0 + 0.25, 1.9, z0); c.box(M(art[k][0], { r: 0.6 }), 0.02, 0.9, 0.7, X0 + 0.29, 1.95, z0 - 0.4); c.box(M(art[k][1], { r: 0.6 }), 0.02, 0.6, 0.7, X0 + 0.29, 1.75, z0 + 0.4); }
    if (fdef.departmentId) { const sc = M(0xffffff, { map: T.screenTex('chart', '#' + new THREE.Color(accent).getHexString(), 40 + i), e: 0xffffff, ei: 0.8, r: 0.3 }); for (const wx of [27, 33]) { c.box(P.frame(), 2.4, 1.4, 0.06, wx, 1.9, Z0 + 0.22); c.box(sc, 2.25, 1.25, 0.01, wx, 1.9, Z0 + 0.26); } c.box(M(0xe7e9ee, { r: 0.4 }), 0.9, 0.55, 0.6, 24.5, 0.95, Z0 + 0.6); c.box(P.metal(), 0.9, 0.9, 0.6, 24.5, 0.45, Z0 + 0.6); c.box(P.dark(), 0.7, 0.03, 0.4, 24.5, 1.24, Z0 + 0.6); }
    for (const [bx, bz] of [[6.4, 5.6], [29.6, 9.4], [29.6, 13.4]]) { c.cyl(M(0x4a5368, { r: 0.5 }), 0.16, 0.13, 0.42, bx, 0.21, bz, 10); }
    for (const [lx, lz] of [[15, 22.5], [24, 20]]) { c.cyl(P.metal(), 0.02, 0.02, 1.6, lx, 0.8, lz, 6); c.cyl(P.dark(), 0.16, 0.16, 0.03, lx, 0.02, lz, 12); c.cyl(P.light(), 0.13, 0.24, 0.3, lx, 1.65, lz, 14); }
    for (const pz of [3.0, 6.6, 8.6, 23.4, 26.6]) plant(c, X0 + 0.9, pz, 1.0); for (const px of [9, 16.5, 24.5, 34.5]) tallPlant(c, px, Z1 - 0.7);
    // Rolltreppen Umgebung: Beschilderung und Pflanzen
    const escSign = (i < 4) ? T.textTex(['Rolltreppe', `Etage ${i + 1} ▲`], { w: 512, h: 256, bg: '#1c2333', accent: '#ff8a3d', font: 'bold 54px "Segoe UI", system-ui, sans-serif' }) : null;
    if (escSign) { c.box(P.metal(), 0.06, 1.6, 0.06, 2.6, 0.8, 19.6); c.box(M(0xffffff, { map: escSign, e: 0xffffff, ei: 0.5 }), 1.5, 0.75, 0.05, 2.6, 1.85, 19.6); }
    plant(c, 5.9, 20.4, 1.2); tallPlant(c, 0.2, 21.8);
}
