import * as THREE from 'three';
import * as T from './textures.js';
import { FH, ESC, DEPT_COLOR } from './build/constants.js';
import { Collector } from './build/collector.js';
import { rand32 } from './build/random.js';
import { createBases } from './build/baseMaterials.js';
import { buildSlab } from './build/slab.js';
import { buildZoneFloors } from './build/zoneFloors.js';
import { buildAnchorFurniture } from './build/anchorFurniture.js';
import { buildZoneDecor } from './build/zoneDecor.js';
import { buildExtraDecor } from './build/extraDecor.js';
import { buildWalls } from './build/walls.js';
import { buildSigns } from './build/signs.js';
import { buildEscalator } from './build/escalator.js';
import { buildEnvironment } from './build/environment.js';

export { FH, ESC, DEPT_COLOR } from './build/constants.js';
export { M, resetMaterialCache } from './build/materials.js';

/** Baut das Hochhaus aus Layout und Ankern der Simulation. Die Einzelteile liegen in ./build. */
export function buildWorld(engine, scene) {
  const layout = engine.getLayout(), anchors = engine.getAnchors();
  let maxX = 0, maxZ = 0; anchors.forEach((a) => { maxX = Math.max(maxX, a.hint.x); maxZ = Math.max(maxZ, a.hint.y); });
  const X0 = -1.2, Z0 = -1.2, X1 = Math.max(40, maxX + 3.2), Z1 = Math.max(30, maxZ + 3.2);
  const byZone = new Map(); anchors.forEach((a) => { if (!byZone.has(a.zoneId)) byZone.set(a.zoneId, []); byZone.get(a.zoneId).push(a); });
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  const seatInfo = new Map(); const tvs = []; const escalators = []; const floors = [];
  const { tex, bases } = createBases();
  const world = new THREE.Group(); scene.add(world);

  for (const fdef of layout.floors) {
    const i = fdef.index, fg = new THREE.Group(); fg.position.y = i * FH; world.add(fg);
    const c = new Collector(); const rand = rand32(100 + i);
    const accent = fdef.departmentId ? DEPT_COLOR[fdef.departmentId] : (i === 4 ? 0xb59ad6 : 0xe8edf7);
    const zones = layout.zones.filter((z) => z.floorId === fdef.id);
    const w = { c, i, fdef, fg, zones, byZone, anchors, anchorById, seatInfo, tvs, bases, accent, rand, X0, X1, Z0, Z1, layout };

    buildSlab(w); buildZoneFloors(w); buildAnchorFurniture(w); buildZoneDecor(w); buildExtraDecor(w); buildWalls(w);
    c.flush(fg);
    let esc = null; if (i < layout.floors.length - 1) { esc = buildEscalator(fg, i); escalators.push(esc); }
    buildSigns({ ...w, fg });
    floors.push({ index: i, group: fg, escalator: esc, accent });
  }

  // TV Bildschirme (animiert)
  const tvCanvases = [];
  tvs.forEach((t) => { const f = Math.round((t.y - 1.3) / FH); const tc = T.tvCanvas(); tc.draw(0, t.variant); const m = new THREE.MeshBasicMaterial({ map: tc.texture }); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.02), m); s.position.set(t.x, 1.3, t.z + 0.05); floors[f].group.add(s); tvCanvases.push({ tc, v: t.variant, floor: f, mesh: s }); });

  buildEnvironment({ world, X0, X1, Z0, Z1, tex });

  return { world, floors, escalators, tvCanvases, seatInfo, bounds: { X0, X1, Z0, Z1 } };
}
