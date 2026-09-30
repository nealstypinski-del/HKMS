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

import { Collector } from './collector.js';
import { rand32 } from './random.js';

/** Himmel, Boden, Bäume und Skyline rund um das Haus. */
export function buildEnvironment(w) {
  const { world, X0, X1, Z0, Z1, tex } = w;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M(0xffffff, { map: (() => { const g = tex.grass; g.repeat.set(60, 60); return g; })(), r: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(20, -FH * 0.0 - 0.6, 15); ground.receiveShadow = true; world.add(ground);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 16, Z1 - Z0 + 16), M(0xffffff, { map: (() => { const a = tex.asphalt; a.repeat.set(10, 8); return a; })(), r: 1 })); pave.rotation.x = -Math.PI / 2; pave.position.set((X0 + X1) / 2, -0.55, (Z0 + Z1) / 2); pave.receiveShadow = true; world.add(pave);
  const env = new Collector(); const r2 = rand32(77);
  for (let k = 0; k < 46; k++) { const ang = r2() * 6.283, rad = 95 + r2() * 110; const x = 20 + Math.cos(ang) * rad, z = 15 + Math.sin(ang) * rad; if ((x - 20) * 0.66 + (z - 15) * 0.75 > -25) continue; const h = 12 + r2() * 30, w = 7 + r2() * 9; env.box(M(new THREE.Color().setHSL(0.58 + r2() * 0.06, 0.18, 0.55 + r2() * 0.2).getHex(), { r: 0.8 }), w, h, w * (0.8 + r2() * 0.5), x, h / 2 - 0.6, z); }
  for (let k = 0; k < 40; k++) { const x = X0 - 14 + r2() * (X1 - X0 + 40), z = Z1 + 12 + r2() * 30; if (r2() < 0.6) { env.cyl(P.walnut(), 0.18, 0.24, 1.6, x, 0.2, z, 6); env.sph(r2() > 0.5 ? P.leaf() : P.leaf2(), 1.5 + r2() * 0.6, x, 2.4, z, 1, 1.15, 1); } }
  const envG = new THREE.Group(); env.flush(envG); envG.children.forEach((m) => { m.castShadow = false; }); world.add(envG);
}
