import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Sammelt statische Geometrie je Material und verschmilzt sie (wenige Draw Calls). */
export class Collector {
  constructor() { this.map = new Map(); }
  add(geo, mat, x, y, z, ry = 0, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    let l = this.map.get(mat); if (!l) { l = []; this.map.set(mat, l); } l.push(geo);
  }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry, rx, rz); }
  cyl(mat, rt, rb, h, x, y, z, seg = 14) { this.add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z); }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 12, 9); g.scale(sx, sy, sz); this.add(g, mat, x, y, z); }
  /** Bodenfläche mit Texturwiederholung nach Weltmaßen. */
  plane(mat, x0, z0, x1, z1, y, tile = 4) {
    const w = x1 - x0, d = z1 - z0; const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile);
    this.add(g, mat, (x0 + x1) / 2, y, (z0 + z1) / 2);
  }
  /** Lokales Koordinatensystem (Position und Drehung um Y) für zusammengesetzte Möbel. */
  frame(x, z, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry), me = this;
    const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    return {
      box(mat, w, h, d, lx, ly, lz, lry = 0) { const [wx, wz] = W(lx, lz); me.box(mat, w, h, d, wx, ly, wz, ry + lry); },
      cyl(mat, rt, rb, h, lx, ly, lz, seg = 14) { const [wx, wz] = W(lx, lz); me.cyl(mat, rt, rb, h, wx, ly, wz, seg); },
      sph(mat, r, lx, ly, lz, sx = 1, sy = 1, sz = 1) { const [wx, wz] = W(lx, lz); me.sph(mat, r, wx, ly, wz, sx, sy, sz); },
    };
  }
  flush(group) {
    for (const [mat, list] of this.map) {
      const merged = mergeGeometries(list, false); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.transparent; mesh.receiveShadow = true; group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.map.clear();
  }
}
