import { M, P, FABRIC } from '../materials.js';
import * as THREE from 'three';
import * as T from '../../textures.js';
import { chairAt } from './seating.js';
import { plant } from './plants.js';

export function desk(c, x, z, deptHex, seed) {
  const top = P.wood(), acc = M(deptHex, { r: 0.5 });
  c.box(top, 2.3, 0.06, 1.1, x, 0.74, z);
  for (const sx of [-1.08, 1.08]) for (const sz of [-0.48, 0.48]) c.box(P.metal(), 0.05, 0.72, 0.05, x + sx, 0.36, z + sz);
  c.box(P.white(), 2.3, 0.5, 0.03, x, 0.5, z - 0.5);
  c.box(P.white(), 0.5, 0.6, 0.9, x + 0.85, 0.4, z);
  c.box(acc, 0.46, 0.03, 0.02, x + 0.85, 0.55, z + 0.46);
  const kinds = ['code', 'chart', 'chat'];
  const sc = M(0xffffff, { map: T.screenTex(kinds[seed % 3], '#' + new THREE.Color(deptHex).getHexString(), seed), e: 0xffffff, ei: 0.9, r: 0.3 });
  const mons = seed % 2 ? [-0.5, 0.5] : [0];
  for (const mx of mons) {
    c.cyl(P.dark(), 0.05, 0.08, 0.05, x + mx, 0.79, z - 0.28, 10); c.box(P.dark(), 0.05, 0.22, 0.05, x + mx, 0.9, z - 0.3);
    c.box(P.frame(), 0.86, 0.5, 0.04, x + mx, 1.16, z - 0.3);
    c.box(sc, 0.78, 0.43, 0.01, x + mx, 1.16, z - 0.277);
  }
  c.box(P.dark(), 0.5, 0.025, 0.16, x - 0.1, 0.78, z + 0.15); c.box(P.dark(), 0.07, 0.03, 0.11, x + 0.35, 0.78, z + 0.15);
  c.cyl(M(deptHex, { r: 0.4 }), 0.05, 0.045, 0.1, x - 0.85, 0.82, z - 0.25, 10);
  if (seed % 3 === 0) plant(c, x - 0.9, z + 0.05, 0.35);
  chairAt(c, x, z + 1.05, 0, [0x30384a, 0x3a3f52, 0x2b3a3f][seed % 3]);
}

export function bookshelf(c, x, z, rand) {
  const w = 2.0, h = 2.1;
  c.box(P.walnut(), 0.05, h, 0.4, x - w / 2, h / 2, z); c.box(P.walnut(), 0.05, h, 0.4, x + w / 2, h / 2, z); c.box(P.walnut(), w, h, 0.03, x, h / 2, z - 0.19);
  for (let s = 0; s <= 5; s++) c.box(P.walnut(), w, 0.04, 0.4, x, 0.02 + s * 0.4, z);
  const cols = [0xc0392b, 0x2980b9, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xecf0f1, 0xff8a3d, 0x2fd6c0];
  for (let s = 0; s < 5; s++) { let bx = x - w / 2 + 0.1; while (bx < x + w / 2 - 0.15) { const bw = 0.05 + rand() * 0.07, bh = 0.24 + rand() * 0.12; if (rand() > 0.1) c.box(M(cols[Math.floor(rand() * cols.length)], { r: 0.7 }), bw, bh, 0.26, bx + bw / 2, 0.06 + s * 0.4 + bh / 2 + 0.02, z + 0.02); bx += bw + 0.01; } }
}

export function whiteboardBoard(c, x, z) {
  c.box(M(0xf7f9fc, { r: 0.3 }), 2.4, 1.3, 0.05, x, 1.55, z); c.box(P.metal(), 2.5, 0.06, 0.08, x, 0.87, z); c.box(P.metal(), 2.5, 0.05, 0.08, x, 2.22, z);
  for (const sx of [-1.1, 1.1]) c.box(P.metal(), 0.05, 0.9, 0.05, x + sx, 0.45, z - 0.1);
  c.box(M(0x2f6fdb, { r: 0.6 }), 1.0, 0.04, 0.01, x - 0.3, 1.9, z + 0.03); c.box(M(0xdd3b3b, { r: 0.6 }), 0.6, 0.04, 0.01, x + 0.35, 1.65, z + 0.03); c.box(M(0x2fb56a, { r: 0.6 }), 0.8, 0.04, 0.01, x - 0.4, 1.4, z + 0.03);
}
