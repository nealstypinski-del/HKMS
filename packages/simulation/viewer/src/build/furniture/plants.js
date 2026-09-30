import { M, P, FABRIC } from '../materials.js';

export function plant(c, x, z, s = 1) {
  c.cyl(P.pot(), 0.26 * s, 0.2 * s, 0.4 * s, x, 0.2 * s, z, 12);
  for (let i = 0; i < 5; i++) { const a = i * 1.26; c.sph(i % 2 ? P.leaf() : P.leaf2(), 0.3 * s, x + Math.cos(a) * 0.18 * s, (0.72 + (i % 3) * 0.18) * s, z + Math.sin(a) * 0.18 * s, 1, 1.25, 1); }
}

export function tallPlant(c, x, z) { c.cyl(P.pot(), 0.32, 0.26, 0.6, x, 0.3, z, 12); c.cyl(P.walnut(), 0.05, 0.07, 0.9, x, 1.0, z, 6); for (let i = 0; i < 7; i++) { const a = i * 0.9; c.sph(i % 2 ? P.leaf() : P.leaf2(), 0.36, x + Math.cos(a) * 0.32, 1.5 + (i % 4) * 0.22, z + Math.sin(a) * 0.32, 1, 0.8, 1); } }
