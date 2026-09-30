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

/** Hängende Zonenschilder. */
export function buildSigns(w) {
  const { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout } = w;
    // Zonenschilder (hängend)
    const signZones = zones.filter((z) => ['MEETING_ROOM', 'KITCHEN', 'LOUNGE', 'WELLNESS', 'WAITING_AREA', 'AGENT_BENCH', 'DESKS', 'LOBBY'].includes(z.kind));
    signZones.forEach((z) => {
      const b = z._box; const m = new THREE.MeshStandardMaterial({ map: T.textTex([z.label], { w: 768, h: 160, bg: '#141a2b', accent: '#' + new THREE.Color(z.departmentId ? DEPT_COLOR[z.departmentId] : 0xb8c4dd).getHexString(), font: 'bold 60px "Segoe UI", system-ui, sans-serif' }), emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.5 });
      m.emissiveMap = m.map; const s = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.76, 0.06), m); s.position.set((b.x0 + b.x1) / 2, 2.85, z.kind === 'DESKS' ? b.z0 - 0.4 : b.z0 + 0.05); s.castShadow = true; fg.add(s);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 4), P.dark()); cord.position.set(s.position.x, 3.5, s.position.z); fg.add(cord);
    });
}
