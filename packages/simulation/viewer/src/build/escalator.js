import * as THREE from 'three';
import { FH, ESC } from './constants.js';
import { M, P } from './materials.js';

/** Rolltreppe zwischen Etage L und L+1 (eine Spur hoch, eine runter), Stufen bewegen sich. */
export function buildEscalator(fg, L) {
  const D = ESC.zBase - ESC.zTop, tan = FH / D, ang = Math.atan(tan), pitch = 0.4, N = Math.ceil((D + 0.4) / pitch);
  const g = new THREE.Group(); fg.add(g);
  const treadM = M(0xb9c1cf, { r: 0.35, m: 0.85 }), riserM = M(0x2a2f3a, { r: 0.5, m: 0.4 });
  const treadGeo = new THREE.BoxGeometry(0.9, 0.05, 0.4), riserGeo = new THREE.BoxGeometry(0.9, 0.22, 0.03);
  const lanes = [];
  for (const [x, dir] of [[ESC.xUp, 1], [ESC.xDown, -1]]) {
    const tr = new THREE.InstancedMesh(treadGeo, treadM, N + 2), ri = new THREE.InstancedMesh(riserGeo, riserM, N + 2);
    tr.castShadow = ri.castShadow = true; tr.receiveShadow = ri.receiveShadow = true; g.add(tr, ri);
    lanes.push({ x, dir, tr, ri });
    // Unterbau, Balustraden, Handläufe (in Neigungsrichtung)
    const sl = new THREE.Group(); sl.position.set(x, 0, ESC.zBase); sl.rotation.x = ang; g.add(sl);
    const len = Math.hypot(D, FH);
    const truss = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, len), M(0x2f3542, { r: 0.5, m: 0.5 })); truss.position.set(0, -0.32, -len / 2); truss.castShadow = true; sl.add(truss);
    for (const sx of [-0.55, 0.55]) {
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, len), P.glass()); gl.position.set(sx, 0.55, -len / 2); sl.add(gl);
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, len), M(0x14161b, { r: 0.6 })); rl.position.set(sx, 1.03, -len / 2); rl.castShadow = true; sl.add(rl);
    }
  }
  const dummy = new THREE.Object3D();
  const y0 = 0;
  return {
    L, lanes, D, tan,
    /** Punkt auf einer Spur (u in Metern horizontal von der Basis). */
    point(dir, u) { const x = dir > 0 ? ESC.xUp : ESC.xDown; return { x, y: L * FH + u * tan, z: ESC.zBase - u }; },
    update(t) {
      const v = 1.2;
      for (const ln of lanes) {
        for (let k = 0; k < N + 2; k++) {
          let u = ((k * pitch + t * v * ln.dir) % (D + 0.8) + (D + 0.8)) % (D + 0.8) - 0.2;
          const vis = u > -0.15 && u < D + 0.15;
          const uu = Math.min(D, Math.max(0, u));
          dummy.position.set(ln.x, y0 + uu * tan + 0.03, ESC.zBase - uu); dummy.scale.setScalar(vis ? 1 : 0.0001); dummy.updateMatrix(); ln.tr.setMatrixAt(k, dummy.matrix);
          dummy.position.set(ln.x, y0 + uu * tan - 0.1, ESC.zBase - uu + 0.2); dummy.updateMatrix(); ln.ri.setMatrixAt(k, dummy.matrix);
        }
        ln.tr.instanceMatrix.needsUpdate = true; ln.ri.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
