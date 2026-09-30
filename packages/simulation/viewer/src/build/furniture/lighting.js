import { M, P, FABRIC } from '../materials.js';

export function pendant(c, x, z, y = 3.3, r = 0.35) { c.cyl(P.dark(), 0.01, 0.01, 4.2 - y, x, (4.2 + y) / 2 - 0.4, z, 4); c.cyl(P.light(), r * 0.6, r, 0.22, x, y, z, 16); }
