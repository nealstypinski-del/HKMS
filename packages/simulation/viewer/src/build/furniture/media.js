import { M, P, FABRIC } from '../materials.js';

export function tvUnit(c, x, z, tvs, floorY, variant) {
  c.box(P.walnut(), 2.4, 0.5, 0.55, x, 0.25, z); c.box(P.dark(), 0.1, 0.05, 0.2, x, 0.52, z);
  c.box(P.frame(), 2.0, 1.15, 0.08, x, 1.3, z - 0.05);
  tvs.push({ x, y: floorY + 1.3, z: z - 0.005, variant });
}
