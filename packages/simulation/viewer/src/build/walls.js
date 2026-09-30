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

/** Außenwände mit Fenstern, Poster, Etagenschild und Brüstung. */
export function buildWalls(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
    // Außenwände (Rückseite und Westseite) mit Fensterbändern, vorne und rechts offen (Puppenhausschnitt)
    const wallH = FH - 0.4; const glass = P.glass(); const wm = bases.wall; const pil = M(0xdfe2e8, { r: 0.6 });
    c.box(wm, X1 - X0, 0.9, 0.3, (X0 + X1) / 2, 0.45, Z0); c.box(wm, X1 - X0, 0.5, 0.3, (X0 + X1) / 2, wallH - 0.25, Z0);
    c.box(wm, 0.3, 0.9, Z1 - Z0, X0, 0.45, (Z0 + Z1) / 2); c.box(wm, 0.3, 0.5, Z1 - Z0, X0, wallH - 0.25, (Z0 + Z1) / 2);
    for (let px = X0; px <= X1 + 0.01; px += 5.6) c.box(pil, 0.4, wallH, 0.34, Math.min(px, X1), wallH / 2, Z0);
    for (let pz = Z0; pz <= Z1 + 0.01; pz += 5.6) c.box(pil, 0.34, wallH, 0.4, X0, wallH / 2, Math.min(pz, Z1));
    c.box(glass, X1 - X0, wallH - 1.4, 0.06, (X0 + X1) / 2, 0.9 + (wallH - 1.4) / 2, Z0); c.box(glass, 0.06, wallH - 1.4, Z1 - Z0, X0, 0.9 + (wallH - 1.4) / 2, (Z0 + Z1) / 2);
    // Sockelleiste, Poster, Uhr
    const logo = fdef.departmentId === 'HERKULESJOBS' ? ['HERKULESJOBS', '#ff8a3d'] : fdef.departmentId === 'KASSELMEMES' ? ['KASSELMEMES', '#2fd6c0'] : i === 0 ? ['HERKULES HQ', '#ff8a3d'] : fdef.departmentId === 'SHARED' ? ['AI UND ENTWICKLUNG', '#8b9cff'] : ['WELLNESS', '#b59ad6'];
    const poster = M(0xffffff, { map: T.textTex([logo[0]], { w: 1024, h: 256, bg: '#141a2b', accent: logo[1], font: 'bold 96px "Segoe UI", system-ui, sans-serif', sub: 'DEMO Umgebung' }), e: 0xffffff, ei: 0.35, r: 0.4 });
    c.box(poster, 6.4, 1.6, 0.06, 20, 2.55, Z0 + 0.2); c.box(M(0xffffff, { r: 0.4 }), 0.6, 0.6, 0.05, 31, 2.6, Z0 + 0.2); c.cyl(M(0x111111, { r: 0.4 }), 0.26, 0.26, 0.04, 31, 2.6, Z0 + 0.24, 20);
    const flabel = M(0xffffff, { map: T.textTex([`ETAGE ${i}  ${fdef.label.toUpperCase()}`], { w: 1024, h: 64, bg: '#141a2b', accent: logo[1], font: 'bold 34px "Segoe UI", system-ui, sans-serif', border: false }), r: 0.5 });
    c.box(flabel, 9, 0.34, 0.03, X0 + 6.2, -0.2, Z1 + 0.13);
    // Brüstung vorne und rechts (niedriges Glas)
    const rail = M(0x8d97ad, { r: 0.4, m: 0.6 }); const bg = P.glass();
    c.box(bg, X1 - X0, 0.95, 0.04, (X0 + X1) / 2, 0.5, Z1 + 0.05); c.box(bg, 0.04, 0.95, Z1 - Z0, X1 + 0.05, 0.5, (Z0 + Z1) / 2);
    c.box(rail, X1 - X0, 0.04, 0.05, (X0 + X1) / 2, 1.0, Z1 + 0.05); c.box(rail, 0.05, 0.04, Z1 - Z0, X1 + 0.05, 1.0, (Z0 + Z1) / 2);
    for (let px = X0; px <= X1; px += 4) c.box(rail, 0.04, 1.0, 0.04, px, 0.5, Z1 + 0.05);
    for (let pz = Z0; pz <= Z1; pz += 4) c.box(rail, 0.04, 1.0, 0.04, X1 + 0.05, 0.5, pz);
}
