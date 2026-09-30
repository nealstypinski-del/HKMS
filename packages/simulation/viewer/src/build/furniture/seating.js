import { M, P, FABRIC } from '../materials.js';
import * as THREE from 'three';

export function chairAt(c, x, z, ry, color) {
  const f = c.frame(x, z, ry), fab = M(color, { r: 0.8 });
  f.box(fab, 0.5, 0.07, 0.5, 0, 0.47, 0); f.box(fab, 0.5, 0.52, 0.07, 0, 0.78, -0.23);
  f.cyl(P.metal(), 0.03, 0.03, 0.4, 0, 0.25, 0, 8);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; f.box(P.dark(), 0.3, 0.03, 0.05, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, -a); }
}

export function bench(c, x, z, hex) {
  const pad = M(hex, { r: 0.8 });
  c.box(P.wood(), 1.05, 0.08, 0.6, x, 0.42, z); c.box(pad, 0.95, 0.09, 0.5, x, 0.5, z);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.22, 0.22]) c.box(P.metal(), 0.05, 0.4, 0.05, x + sx, 0.2, z + sz);
}

export function sofa(c, x, z, ry, hex) {
  const f = c.frame(x, z, ry), fab = M(hex, { r: 0.85 }), light = M(new THREE.Color(hex).offsetHSL(0, 0, 0.08).getHex(), { r: 0.85 });
  f.box(fab, 1.8, 0.35, 0.9, 0, 0.27, 0); f.box(fab, 1.8, 0.62, 0.22, 0, 0.72, -0.34);
  f.box(fab, 0.2, 0.55, 0.9, -0.9, 0.5, 0); f.box(fab, 0.2, 0.55, 0.9, 0.9, 0.5, 0);
  f.box(light, 0.75, 0.13, 0.62, -0.38, 0.52, 0.06); f.box(light, 0.75, 0.13, 0.62, 0.38, 0.52, 0.06);
  f.box(light, 0.3, 0.3, 0.1, -0.5, 0.78, -0.22, 0.2); f.box(light, 0.3, 0.3, 0.1, 0.5, 0.78, -0.22, -0.2);
  for (const sx of [-0.8, 0.8]) f.box(P.dark(), 0.06, 0.1, 0.06, sx, 0.05, 0.35);
}

export function lounger(c, x, z) {
  c.box(P.white(), 2.1, 0.16, 0.85, x, 0.3, z); c.box(M(0xb59ad6, { r: 0.85 }), 2.0, 0.14, 0.78, x, 0.43, z);
  c.box(M(0xe8dcf7, { r: 0.85 }), 0.5, 0.16, 0.7, x - 0.75, 0.55, z);
  c.box(M(0xffffff, { r: 0.9 }), 0.9, 0.05, 0.75, x + 0.35, 0.53, z);
  for (const sx of [-0.95, 0.95]) c.box(P.walnut(), 0.06, 0.24, 0.06, x + sx, 0.12, z);
}
