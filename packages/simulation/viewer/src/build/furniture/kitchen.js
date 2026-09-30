import { M, P, FABRIC } from '../materials.js';

export function coffeeCounter(c, x, z) {
  c.box(P.white(), 1.6, 0.9, 0.7, x, 0.45, z - 0.35); c.box(P.walnut(), 1.7, 0.06, 0.78, x, 0.93, z - 0.35);
  c.box(M(0x2b2f3a, { r: 0.3, m: 0.6 }), 0.5, 0.6, 0.45, x, 1.26, z - 0.42); c.box(M(0xff4d4d, { e: 0xff2222, ei: 0.8 }), 0.05, 0.05, 0.02, x + 0.1, 1.42, z - 0.19);
  c.cyl(P.cup(), 0.05, 0.04, 0.09, x + 0.5, 1.0, z - 0.3, 10);
}
