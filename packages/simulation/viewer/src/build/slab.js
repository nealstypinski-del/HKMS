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

/** Deckenplatte mit Öffnung für die Rolltreppen und Kantenleiste in Abteilungsfarbe. */
export function buildSlab(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
  const hasHole = i >= 1;
    // Deckenplatte mit Öffnung für die Rolltreppen
    const slabM = bases.slab, topM = i === 0 ? bases.marble : bases.oak;
    const hx0 = ESC.holeX0, hx1 = ESC.holeX1, hz0 = ESC.holeZ0, hz1 = ESC.holeZ1;
    if (hasHole) {
      c.box(slabM, hx0 - X0, 0.4, Z1 - Z0, (X0 + hx0) / 2, -0.2, (Z0 + Z1) / 2); c.box(slabM, X1 - hx1, 0.4, Z1 - Z0, (hx1 + X1) / 2, -0.2, (Z0 + Z1) / 2);
      c.box(slabM, hx1 - hx0, 0.4, hz0 - Z0, (hx0 + hx1) / 2, -0.2, (Z0 + hz0) / 2); c.box(slabM, hx1 - hx0, 0.4, Z1 - hz1, (hx0 + hx1) / 2, -0.2, (hz1 + Z1) / 2);
      c.plane(topM, X0, Z0, hx0, Z1, 0.004, 6); c.plane(topM, hx1, Z0, X1, Z1, 0.004, 6); c.plane(topM, hx0, Z0, hx1, hz0, 0.004, 6); c.plane(topM, hx0, hz1, hx1, Z1, 0.004, 6);
    } else { c.box(slabM, X1 - X0, 0.4, Z1 - Z0, (X0 + X1) / 2, -0.2, (Z0 + Z1) / 2); c.plane(topM, X0, Z0, X1, Z1, 0.004, 6); }
    // Kantenleiste in Abteilungsfarbe
    const edge = M(accent, { r: 0.4, e: accent, ei: 0.25 });
    c.box(edge, X1 - X0 + 0.2, 0.14, 0.14, (X0 + X1) / 2, -0.07, Z1 + 0.05); c.box(edge, 0.14, 0.14, Z1 - Z0 + 0.2, X1 + 0.05, -0.07, (Z0 + Z1) / 2);
}
