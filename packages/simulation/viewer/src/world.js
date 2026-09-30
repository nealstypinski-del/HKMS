import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

export const FH = 4.2; // Etagenhöhe (Meter)
export const ESC = { xUp: 1.6, xDown: 3.6, zBase: 17.8, zTop: 10.9, holeX0: 0.4, holeX1: 4.8, holeZ0: 10.9, holeZ1: 13.6 };
export const DEPT_COLOR = { HERKULESJOBS: 0xff8a3d, KASSELMEMES: 0x2fd6c0, SHARED: 0x8b9cff };

const mats = new Map();
export function M(color, o = {}) {
  const key = JSON.stringify([color, o.r, o.m, o.e, o.ei, o.t, o.o, o.map && o.map.uuid]);
  let m = mats.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.72, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.o ?? 1, map: o.map ?? null, depthWrite: o.t ? false : true });
  if (o.map && o.e !== undefined) m.emissiveMap = o.map;
  mats.set(key, m); return m;
}

/** Sammelt statische Geometrie je Material und verschmilzt sie (wenige Draw Calls). */
class Collector {
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

// ---------------------------------------------------------------------------
// Möbel
// ---------------------------------------------------------------------------
const P = {
  wood: () => M(0xc4915c, { r: 0.6 }), walnut: () => M(0x6b4a2e, { r: 0.55 }), white: () => M(0xf3f3ef, { r: 0.5 }), metal: () => M(0x9aa3b2, { r: 0.35, m: 0.8 }),
  dark: () => M(0x20242e, { r: 0.5 }), frame: () => M(0x0d1016, { r: 0.4 }), leaf: () => M(0x3f9a55, { r: 0.85 }), leaf2: () => M(0x5fb36a, { r: 0.85 }), pot: () => M(0xd8d1c4, { r: 0.8 }),
  glass: () => M(0xbfe3ff, { r: 0.05, t: true, o: 0.22 }), light: () => M(0xfff2c8, { e: 0xffe9b0, ei: 1.4, r: 0.4 }), cup: () => M(0xffffff, { r: 0.4 }),
};
const FABRIC = [0x2e8f9a, 0xd9793a, 0x4a63c9, 0x7d5fb0, 0x8791a3, 0xc25b6a];

function plant(c, x, z, s = 1) {
  c.cyl(P.pot(), 0.26 * s, 0.2 * s, 0.4 * s, x, 0.2 * s, z, 12);
  for (let i = 0; i < 5; i++) { const a = i * 1.26; c.sph(i % 2 ? P.leaf() : P.leaf2(), 0.3 * s, x + Math.cos(a) * 0.18 * s, (0.72 + (i % 3) * 0.18) * s, z + Math.sin(a) * 0.18 * s, 1, 1.25, 1); }
}
function tallPlant(c, x, z) { c.cyl(P.pot(), 0.32, 0.26, 0.6, x, 0.3, z, 12); c.cyl(P.walnut(), 0.05, 0.07, 0.9, x, 1.0, z, 6); for (let i = 0; i < 7; i++) { const a = i * 0.9; c.sph(i % 2 ? P.leaf() : P.leaf2(), 0.36, x + Math.cos(a) * 0.32, 1.5 + (i % 4) * 0.22, z + Math.sin(a) * 0.32, 1, 0.8, 1); } }

function chairAt(c, x, z, ry, color) {
  const f = c.frame(x, z, ry), fab = M(color, { r: 0.8 });
  f.box(fab, 0.5, 0.07, 0.5, 0, 0.47, 0); f.box(fab, 0.5, 0.52, 0.07, 0, 0.78, -0.23);
  f.cyl(P.metal(), 0.03, 0.03, 0.4, 0, 0.25, 0, 8);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; f.box(P.dark(), 0.3, 0.03, 0.05, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, -a); }
}

function desk(c, x, z, deptHex, seed) {
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

function bench(c, x, z, hex) {
  const pad = M(hex, { r: 0.8 });
  c.box(P.wood(), 1.05, 0.08, 0.6, x, 0.42, z); c.box(pad, 0.95, 0.09, 0.5, x, 0.5, z);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.22, 0.22]) c.box(P.metal(), 0.05, 0.4, 0.05, x + sx, 0.2, z + sz);
}

function sofa(c, x, z, ry, hex) {
  const f = c.frame(x, z, ry), fab = M(hex, { r: 0.85 }), light = M(new THREE.Color(hex).offsetHSL(0, 0, 0.08).getHex(), { r: 0.85 });
  f.box(fab, 1.8, 0.35, 0.9, 0, 0.27, 0); f.box(fab, 1.8, 0.62, 0.22, 0, 0.72, -0.34);
  f.box(fab, 0.2, 0.55, 0.9, -0.9, 0.5, 0); f.box(fab, 0.2, 0.55, 0.9, 0.9, 0.5, 0);
  f.box(light, 0.75, 0.13, 0.62, -0.38, 0.52, 0.06); f.box(light, 0.75, 0.13, 0.62, 0.38, 0.52, 0.06);
  f.box(light, 0.3, 0.3, 0.1, -0.5, 0.78, -0.22, 0.2); f.box(light, 0.3, 0.3, 0.1, 0.5, 0.78, -0.22, -0.2);
  for (const sx of [-0.8, 0.8]) f.box(P.dark(), 0.06, 0.1, 0.06, sx, 0.05, 0.35);
}

function lounger(c, x, z) {
  c.box(P.white(), 2.1, 0.16, 0.85, x, 0.3, z); c.box(M(0xb59ad6, { r: 0.85 }), 2.0, 0.14, 0.78, x, 0.43, z);
  c.box(M(0xe8dcf7, { r: 0.85 }), 0.5, 0.16, 0.7, x - 0.75, 0.55, z);
  c.box(M(0xffffff, { r: 0.9 }), 0.9, 0.05, 0.75, x + 0.35, 0.53, z);
  for (const sx of [-0.95, 0.95]) c.box(P.walnut(), 0.06, 0.24, 0.06, x + sx, 0.12, z);
}

function coffeeCounter(c, x, z) {
  c.box(P.white(), 1.6, 0.9, 0.7, x, 0.45, z - 0.35); c.box(P.walnut(), 1.7, 0.06, 0.78, x, 0.93, z - 0.35);
  c.box(M(0x2b2f3a, { r: 0.3, m: 0.6 }), 0.5, 0.6, 0.45, x, 1.26, z - 0.42); c.box(M(0xff4d4d, { e: 0xff2222, ei: 0.8 }), 0.05, 0.05, 0.02, x + 0.1, 1.42, z - 0.19);
  c.cyl(P.cup(), 0.05, 0.04, 0.09, x + 0.5, 1.0, z - 0.3, 10);
}

function tvUnit(c, x, z, tvs, floorY, variant) {
  c.box(P.walnut(), 2.4, 0.5, 0.55, x, 0.25, z); c.box(P.dark(), 0.1, 0.05, 0.2, x, 0.52, z);
  c.box(P.frame(), 2.0, 1.15, 0.08, x, 1.3, z - 0.05);
  tvs.push({ x, y: floorY + 1.3, z: z - 0.005, variant });
}

function bookshelf(c, x, z, rand) {
  const w = 2.0, h = 2.1;
  c.box(P.walnut(), 0.05, h, 0.4, x - w / 2, h / 2, z); c.box(P.walnut(), 0.05, h, 0.4, x + w / 2, h / 2, z); c.box(P.walnut(), w, h, 0.03, x, h / 2, z - 0.19);
  for (let s = 0; s <= 5; s++) c.box(P.walnut(), w, 0.04, 0.4, x, 0.02 + s * 0.4, z);
  const cols = [0xc0392b, 0x2980b9, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xecf0f1, 0xff8a3d, 0x2fd6c0];
  for (let s = 0; s < 5; s++) { let bx = x - w / 2 + 0.1; while (bx < x + w / 2 - 0.15) { const bw = 0.05 + rand() * 0.07, bh = 0.24 + rand() * 0.12; if (rand() > 0.1) c.box(M(cols[Math.floor(rand() * cols.length)], { r: 0.7 }), bw, bh, 0.26, bx + bw / 2, 0.06 + s * 0.4 + bh / 2 + 0.02, z + 0.02); bx += bw + 0.01; } }
}

function whiteboardBoard(c, x, z) {
  c.box(M(0xf7f9fc, { r: 0.3 }), 2.4, 1.3, 0.05, x, 1.55, z); c.box(P.metal(), 2.5, 0.06, 0.08, x, 0.87, z); c.box(P.metal(), 2.5, 0.05, 0.08, x, 2.22, z);
  for (const sx of [-1.1, 1.1]) c.box(P.metal(), 0.05, 0.9, 0.05, x + sx, 0.45, z - 0.1);
  c.box(M(0x2f6fdb, { r: 0.6 }), 1.0, 0.04, 0.01, x - 0.3, 1.9, z + 0.03); c.box(M(0xdd3b3b, { r: 0.6 }), 0.6, 0.04, 0.01, x + 0.35, 1.65, z + 0.03); c.box(M(0x2fb56a, { r: 0.6 }), 0.8, 0.04, 0.01, x - 0.4, 1.4, z + 0.03);
}

function pendant(c, x, z, y = 3.3, r = 0.35) { c.cyl(P.dark(), 0.01, 0.01, 4.2 - y, x, (4.2 + y) / 2 - 0.4, z, 4); c.cyl(P.light(), r * 0.6, r, 0.22, x, y, z, 16); }

function rug(c, x0, z0, x1, z1, mat) { c.plane(mat, x0, z0, x1, z1, 0.012, Math.max(x1 - x0, z1 - z0)); }

// ---------------------------------------------------------------------------
// Etagen
// ---------------------------------------------------------------------------
function rand32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildWorld(engine, scene) {
  const layout = engine.getLayout(), anchors = engine.getAnchors();
  let maxX = 0, maxZ = 0; anchors.forEach((a) => { maxX = Math.max(maxX, a.hint.x); maxZ = Math.max(maxZ, a.hint.y); });
  const X0 = -1.2, Z0 = -1.2, X1 = Math.max(40, maxX + 3.2), Z1 = Math.max(30, maxZ + 3.2);
  const byZone = new Map(); anchors.forEach((a) => { if (!byZone.has(a.zoneId)) byZone.set(a.zoneId, []); byZone.get(a.zoneId).push(a); });
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  const seatInfo = new Map(); const tvs = []; const escalators = []; const floors = [];
  const floorIdx = (id) => Number(id.replace('floor-', ''));
  const tex = { oak: T.oakTex(), marble: T.marbleTex(), wood: T.woodTex(), woodDark: T.woodTex('#8a5a36', 4), tile: T.tileTex(), carpetHJ: T.carpetTex('#6b5a52', 11), carpetKM: T.carpetTex('#3d6b68', 12), carpetDev: T.carpetTex('#4b5478', 13), carpetWell: T.carpetTex('#7d6a9e', 14), carpetWarm: T.carpetTex('#8a5b3d', 15), wall: T.wallTex(), slab: T.slabTex(), grass: T.grassTex(), asphalt: T.asphaltTex() };
  const bases = { oak: M(0xffffff, { map: tex.oak, r: 0.5 }), marble: M(0xffffff, { map: tex.marble, r: 0.35 }), wood: M(0xffffff, { map: tex.wood, r: 0.55 }), woodDark: M(0xffffff, { map: tex.woodDark, r: 0.5 }), tile: M(0xffffff, { map: tex.tile, r: 0.35 }), carpetHJ: M(0xffffff, { map: tex.carpetHJ, r: 0.95 }), carpetKM: M(0xffffff, { map: tex.carpetKM, r: 0.95 }), carpetDev: M(0xffffff, { map: tex.carpetDev, r: 0.95 }), carpetWell: M(0xffffff, { map: tex.carpetWell, r: 0.95 }), carpetWarm: M(0xffffff, { map: tex.carpetWarm, r: 0.95 }), wall: M(0xffffff, { map: tex.wall, r: 0.9 }), slab: M(0xffffff, { map: tex.slab, r: 0.9 }) };
  const world = new THREE.Group(); scene.add(world);

  const zoneFloor = (z) => z.kind === 'DESKS' ? (z.departmentId === 'HERKULESJOBS' ? bases.carpetHJ : z.departmentId === 'KASSELMEMES' ? bases.carpetKM : bases.carpetDev)
    : z.kind === 'WELLNESS' ? bases.carpetWell : z.kind === 'KITCHEN' ? bases.tile : z.kind === 'LOUNGE' ? bases.carpetWarm : z.kind === 'MEETING_ROOM' ? bases.wood
    : z.kind === 'AGENT_BENCH' ? bases.woodDark : z.kind === 'WAITING_AREA' ? bases.carpetWarm : z.kind === 'LOBBY' ? bases.marble : null;

  for (const fdef of layout.floors) {
    const i = fdef.index, fg = new THREE.Group(); fg.position.y = i * FH; world.add(fg);
    const c = new Collector(); const rand = rand32(100 + i);
    const accent = fdef.departmentId ? DEPT_COLOR[fdef.departmentId] : (i === 4 ? 0xb59ad6 : 0xe8edf7);
    const zones = layout.zones.filter((z) => z.floorId === fdef.id);
    const hasHole = i >= 1;

    // Deckenplatte mit Öffnung für die Rolltreppen
    const slabM = bases.slab, topM = i === 0 ? bases.marble : bases.oak;
    const hx0 = ESC.holeX0, hx1 = ESC.holeX1, hz0 = ESC.holeZ0, hz1 = ESC.holeZ1;
    if (hasHole) {
      c.box(slabM, hx0 - X0, 0.4, Z1 - Z0, (X0 + hx0) / 2, -0.2, (Z0 + Z1) / 2); c.box(slabM, X1 - hx1, 0.4, Z1 - Z0, (hx1 + X1) / 2, -0.2, (Z0 + Z1) / 2);
      c.box(slabM, hx1 - hx0, 0.4, hz0 - Z0, (hx0 + hx1) / 2, -0.2, (Z0 + hz0) / 2); c.box(slabM, hx1 - hx0, 0.4, Z1 - hz1, (hx0 + hx1) / 2, -0.2, (hz1 + Z1) / 2);
      c.plane(topM, X0, Z0, hx0, Z1, 0.004, 6); c.plane(topM, hx1, Z0, X1, Z1, 0.004, 6); c.plane(topM, hx0, Z0, hx1, hz0, 0.004, 6); c.plane(topM, hx0, hz1, hx1, Z1, 0.004, 6);
    } else { c.box(slabM, X1 - X0, 0.4, Z1 - Z0, (X0 + X1) / 2, -0.2, (Z0 + Z1) / 2); c.plane(topM, X0, Z0, X1, Z1, 0.004, 6); }
    // Kantenleiste in Abteilungsfarbe
    const edge = M(accent, { r: 0.4, e: accent, ei: 0.25 });
    c.box(edge, X1 - X0 + 0.2, 0.14, 0.14, (X0 + X1) / 2, -0.07, Z1 + 0.05); c.box(edge, 0.14, 0.14, Z1 - Z0 + 0.2, X1 + 0.05, -0.07, (Z0 + Z1) / 2);

    // Zonenböden
    zones.forEach((z, zi) => {
      const an = byZone.get(z.id) || []; let x0 = z.center.x - 3, x1 = z.center.x + 3, z0 = z.center.y - 2.5, z1 = z.center.y + 2.5;
      if (an.length) { x0 = Math.min(...an.map((a) => a.hint.x)) - 1.6; x1 = Math.max(...an.map((a) => a.hint.x)) + 1.6; z0 = Math.min(...an.map((a) => a.hint.y)) - 1.9; z1 = Math.max(...an.map((a) => a.hint.y)) + 1.9; }
      z._box = { x0, x1, z0, z1 };
      const m = zoneFloor(z); if (m && z.kind !== 'ELEVATOR_LOBBY') c.plane(m, x0, z0, x1, z1, 0.008 + zi * 0.0006, z.kind === 'DESKS' ? 3 : 4);
    });

    // Anker zu Möbeln
    const tvOf = (a) => (a.focusAnchorId ? anchorById.get(a.focusAnchorId) : null);
    zones.forEach((z) => {
      const an = (byZone.get(z.id) || []).filter((a) => a.floorId === fdef.id); const b = z._box;
      if (z.kind === 'DESKS') an.filter((a) => a.type === 'DESK').forEach((a, k) => { desk(c, a.hint.x, a.hint.y, DEPT_COLOR[a.departmentId] ?? 0x8b9cff, k + i * 7); seatInfo.set(a.id, { x: a.hint.x, z: a.hint.y + 1.05, y: 0.5, yaw: Math.PI, pose: 'sit', desk: true }); });
      an.forEach((a) => {
        const { x, y: hz } = a.hint;
        if (a.type === 'BENCH') { bench(c, x, hz, FABRIC[(Math.round(x * 2)) % 3 === 0 ? 0 : 2]); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw: Math.PI, pose: 'sit' }); }
        else if (a.type === 'SOFA' && z.kind === 'WELLNESS') { lounger(c, x, hz); seatInfo.set(a.id, { x, z: hz, y: 0.52, yaw: Math.PI / 2, pose: 'lie' }); }
        else if (a.type === 'SOFA') { const tv = tvOf(a); const yaw = tv ? Math.atan2(tv.hint.x - x, tv.hint.y - hz) : 0; sofa(c, x, hz, yaw, FABRIC[(Math.round(x + hz)) % FABRIC.length]); seatInfo.set(a.id, { x, z: hz + 0.05, y: 0.5, yaw, pose: 'sit' }); }
        else if (a.type === 'TV') tvUnit(c, x, hz, tvs, i * FH, (i + Math.round(x)) % 3);
        else if (a.type === 'COFFEE_MACHINE') { coffeeCounter(c, x, hz); seatInfo.set(a.id, { x, z: hz + 0.55, y: 0, yaw: Math.PI, pose: 'coffee' }); }
        else if (a.type === 'KITCHEN_COUNTER') { c.box(P.white(), 1.4, 0.9, 0.7, x, 0.45, hz - 0.3); c.box(P.walnut(), 1.5, 0.06, 0.78, x, 0.93, hz - 0.3); c.box(P.metal(), 0.5, 0.03, 0.4, x, 0.97, hz - 0.3); c.box(M(0xdfe3ea, { r: 0.3, m: 0.5 }), 0.7, 1.9, 0.7, x + 1.2, 0.95, hz - 0.35); seatInfo.set(a.id, { x, z: hz + 0.5, y: 0, yaw: Math.PI, pose: 'stand' }); }
        else if (a.type === 'CHAIR') { const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const yaw = Math.atan2(cx - x, cz - hz); chairAt(c, x, hz, yaw + Math.PI, 0xd9793a); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw, pose: 'sit' }); }
        else if (a.type === 'WAITING_POINT' && z.kind === 'WAITING_AREA') { c.cyl(P.dark(), 0.03, 0.03, 0.4, x, 0.2, hz, 6); c.cyl(M(0xffc94d, { r: 0.7 }), 0.24, 0.24, 0.1, x, 0.45, hz, 16); seatInfo.set(a.id, { x, z: hz, y: 0.5, yaw: Math.PI, pose: 'sit' }); }
        else if (a.type === 'WAITING_POINT' && z.kind === 'LOBBY') seatInfo.set(a.id, { x, z: hz, y: 0, yaw: Math.PI, pose: 'stand' });
        else if (a.type === 'WHITEBOARD') { whiteboardBoard(c, x, hz); seatInfo.set(a.id, { x, z: hz + 0.8, y: 0, yaw: Math.PI, pose: 'stand' }); }
      });
      // Meetingtisch je Reihenpaar
      if (z.kind === 'MEETING_ROOM') {
        const seats = an.filter((a) => a.type === 'MEETING_SEAT'); const rows = [...new Set(seats.map((s) => s.hint.y))].sort((p, q) => p - q);
        const xs = seats.map((s) => s.hint.x); const tx0 = Math.min(...xs) - 0.5, tx1 = Math.max(...xs) + 0.5;
        for (let r = 1; r < rows.length; r++) { const zc = (rows[r - 1] + rows[r]) / 2; c.box(P.wood(), tx1 - tx0, 0.07, 0.9, (tx0 + tx1) / 2, 0.75, zc); for (const sx of [tx0 + 0.3, tx1 - 0.3]) c.box(P.metal(), 0.06, 0.72, 0.6, sx, 0.36, zc); c.box(P.dark(), 0.35, 0.02, 0.25, (tx0 + tx1) / 2, 0.79, zc); pendant(c, (tx0 + tx1) / 2, zc); }
        if (rows.length < 2) { const zc = rows[0] + 1; c.box(P.wood(), tx1 - tx0, 0.07, 0.9, (tx0 + tx1) / 2, 0.75, zc); }
        seats.forEach((s) => { const row = rows.indexOf(s.hint.y); const yaw = row === 0 ? 0 : Math.PI; chairAt(c, s.hint.x, s.hint.y, yaw + Math.PI, 0x30384a); seatInfo.set(s.id, { x: s.hint.x, z: s.hint.y, y: 0.5, yaw: row === 0 ? 0 : Math.PI, pose: 'sit' }); });
      }
    });

    // Zonenspezifische Dekoration
    zones.forEach((z) => {
      const b = z._box; const cx = (b.x0 + b.x1) / 2;
      if (z.kind === 'DESKS') { for (let k = 0; k < 3; k++) bookshelf(c, b.x0 + 2 + k * 2.3, Z0 + 0.35, rand); tallPlant(c, b.x1 + 0.6, b.z0 + 0.4); tallPlant(c, b.x0 - 0.9, b.z1 - 0.5); c.box(P.metal(), 0.9, 1.3, 0.6, b.x1 - 0.5, 0.65, Z0 + 0.5); c.box(M(0xdfe3ea, { r: 0.4 }), 0.55, 1.6, 0.55, b.x0 + 8.6, 0.8, Z0 + 0.5); c.cyl(M(0x6ec1ff, { r: 0.2, t: true, o: 0.6 }), 0.16, 0.16, 0.5, b.x0 + 8.6, 1.85, Z0 + 0.5, 12); }
      if (z.kind === 'LOUNGE') { const t = anchors.find((a) => a.zoneId === z.id && a.type === 'TV'); rug(c, b.x0 + 0.2, b.z0 + 2.2, b.x1 - 0.2, b.z1 - 0.2, M(0xffffff, { map: T.rugTex('#8c5a3c', '#e3c7a0'), r: 0.95 })); if (t) { plant(c, b.x0 - 0.2, b.z0 + 1.2, 1.1); c.box(P.walnut(), 1.0, 0.4, 0.6, b.x0 + 2.2, 0.2, b.z0 + 3.2); pendant(c, cx, b.z0 + 3.4, 3.4, 0.4); } tallPlant(c, b.x1 + 0.7, b.z0 + 1.2); }
      if (z.kind === 'KITCHEN') { const cx0 = (b.x0 + b.x1) / 2; c.box(P.white(), b.x1 - b.x0 + 1, 0.9, 0.6, cx0, 0.45, Z0 + 0.4 + (b.z0 < 3 ? 0 : 0)); c.box(P.walnut(), b.x1 - b.x0 + 1, 0.05, 0.65, cx0, 0.93, Z0 + 0.4); c.box(P.white(), b.x1 - b.x0 + 1, 0.7, 0.35, cx0, 2.0, Z0 + 0.22); const tzc = b.z1 - 1.6; const seats = (byZone.get(z.id) || []).filter((a) => a.type === 'CHAIR'); if (seats.length) { const sx0 = Math.min(...seats.map((s) => s.hint.x)), sx1 = Math.max(...seats.map((s) => s.hint.x)); const rows = [...new Set(seats.map((s) => s.hint.y))]; const zc = rows.length > 1 ? (Math.min(...rows) + Math.max(...rows)) / 2 : rows[0] - 0.85; c.cyl(P.white(), 0.03, 0.03, 0.72, (sx0 + sx1) / 2, 0.36, zc, 8); c.box(P.white(), Math.max(1.4, sx1 - sx0 + 0.8), 0.06, 0.8, (sx0 + sx1) / 2, 0.74, zc); } void tzc; }
      if (z.kind === 'WELLNESS') { for (let k = 0; k < 4; k++) tallPlant(c, b.x0 - 0.6 + k * 3.5, b.z0 - 0.4); c.box(M(0xd7ccec, { r: 0.6 }), 1.6, 0.25, 1.6, b.x1 + 1.2, 0.12, b.z0 + 1.0); for (let k = 0; k < 5; k++) c.sph(M(0x5f6b7a, { r: 0.6 }), 0.16, b.x1 + 0.7 + (k % 3) * 0.3, 0.4, b.z0 + 0.6 + (k % 2) * 0.4, 1, 0.7, 1); for (let k = 0; k < 4; k++) { c.cyl(M(0xffffff, { r: 0.9 }), 0.06, 0.06, 0.14, b.x1 + 1.0 + k * 0.28, 0.32, b.z0 + 1.6, 8); c.sph(M(0xffb347, { e: 0xffa500, ei: 2 }), 0.03, b.x1 + 1.0 + k * 0.28, 0.42, b.z0 + 1.6); } pendant(c, cx, (b.z0 + b.z1) / 2, 3.2, 0.5);
        // Sauna, Whirlpool, Yogamatten, Bambuswand
        const sx = b.x1 + 5.2, sz = b.z0 + 0.6, wood = M(0xb8793f, { r: 0.6 }), dwood = M(0x7a4a26, { r: 0.6 });
        c.box(wood, 3.4, 2.6, 0.12, sx + 1.7, 1.3, sz); c.box(wood, 0.12, 2.6, 2.8, sx, 1.3, sz + 1.4); c.box(wood, 0.12, 2.6, 2.8, sx + 3.4, 1.3, sz + 1.4);
        c.box(wood, 3.5, 0.12, 2.9, sx + 1.7, 2.6, sz + 1.4); c.box(P.glass(), 3.2, 2.3, 0.05, sx + 1.7, 1.25, sz + 2.8); c.box(dwood, 0.1, 2.3, 0.1, sx + 1.7, 1.25, sz + 2.8);
        c.box(dwood, 2.8, 0.1, 0.7, sx + 1.7, 0.55, sz + 0.5); c.box(dwood, 2.8, 0.1, 0.7, sx + 1.7, 1.15, sz + 0.5); c.box(M(0xff9b3d, { e: 0xff7a00, ei: 1.6 }), 0.6, 0.12, 0.05, sx + 1.7, 2.2, sz + 0.1);
        const hx = sx + 1.7, hz = sz + 6.8; c.cyl(P.white(), 1.7, 1.7, 0.7, hx, 0.35, hz, 28); c.cyl(M(0x6fd0ff, { r: 0.1, e: 0x3fb0ff, ei: 0.5 }), 1.45, 1.45, 0.05, hx, 0.73, hz, 28);
        for (const [ox, oz, col] of [[-3.2, 0.6, 0x6b5b95], [-3.2, 2.2, 0x88b04b], [-1.6, 2.2, 0xd65076]]) c.box(M(col, { r: 0.9 }), 0.7, 0.03, 1.8, b.x0 + 6 + ox + 8, 0.03, b.z1 + 3 + oz);
        for (let k = 0; k < 14; k++) c.cyl(M(0xc9b26b, { r: 0.7 }), 0.05, 0.05, 2.2, b.x0 - 0.5 + k * 0.32, 1.1, b.z0 - 1.6, 8);
      }
      if (z.kind === 'AGENT_BENCH') { plant(c, b.x0 - 0.5, b.z0 + 0.5, 0.9); plant(c, b.x1 + 0.5, b.z0 + 0.5, 0.9); }
      if (z.kind === 'WAITING_AREA') { c.box(M(0xfff3c4, { r: 0.6 }), 1.8, 0.05, 0.9, cx, 0.5, b.z1 + 0.9); for (const sx of [-0.7, 0.7]) c.box(P.metal(), 0.05, 0.5, 0.05, cx + sx, 0.25, b.z1 + 0.9); }
      if (z.kind === 'LOBBY') {
        c.box(P.walnut(), 6.2, 1.1, 1.1, 13.5, 0.55, 10.4); c.box(P.white(), 6.0, 0.05, 1.3, 13.5, 1.13, 10.5); c.box(M(0xff8a3d, { r: 0.4, e: 0xff8a3d, ei: 0.3 }), 6.2, 0.14, 0.06, 13.5, 0.98, 10.93);
        c.box(P.dark(), 0.5, 0.35, 0.4, 12.2, 1.32, 10.4); c.box(P.frame(), 0.5, 0.4, 0.05, 12.2, 1.55, 10.3);
        for (let k = 0; k < 2; k++) sofa(c, 18 + k * 2.6, 17.6, Math.PI, FABRIC[k * 2]);
        c.box(P.wood(), 1.6, 0.4, 0.8, 19.3, 0.2, 15.9); tallPlant(c, b.x0 - 0.6, b.z0 + 0.6); tallPlant(c, b.x1 + 0.6, b.z0 + 0.6);
        rug(c, 16.4, 15.0, 22.6, 19.2, M(0xffffff, { map: T.rugTex('#28405f', '#ff8a3d'), r: 0.95 }));
      }
      if (z.kind === 'MEETING_ROOM') {
        const gm = P.glass(), fr = M(0x2b3140, { r: 0.4, m: 0.4 }), hh = 2.4; const { x0, x1, z0, z1 } = b;
        c.box(gm, x1 - x0, hh, 0.04, (x0 + x1) / 2, hh / 2, z0); c.box(gm, 0.04, hh, z1 - z0, x0, hh / 2, (z0 + z1) / 2); c.box(gm, 0.04, hh, z1 - z0, x1, hh / 2, (z0 + z1) / 2);
        const gap = 1.5, mid = (x0 + x1) / 2; c.box(gm, mid - gap / 2 - x0, hh, 0.04, (x0 + mid - gap / 2) / 2, hh / 2, z1); c.box(gm, x1 - mid - gap / 2, hh, 0.04, (mid + gap / 2 + x1) / 2, hh / 2, z1);
        for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [mid - gap / 2, z1], [mid + gap / 2, z1]]) c.box(fr, 0.07, hh, 0.07, px, hh / 2, pz);
        c.box(fr, x1 - x0, 0.06, 0.06, (x0 + x1) / 2, hh, z0); c.box(fr, 0.06, 0.06, z1 - z0, x0, hh, (z0 + z1) / 2); c.box(fr, 0.06, 0.06, z1 - z0, x1, hh, (z0 + z1) / 2);
      }
    });

    // Zusätzliche Einrichtung
    const art = [['#ff8a3d', '#2b3a67'], ['#2fd6c0', '#f2c94c'], ['#8b9cff', '#e15b7a'], ['#f2c94c', '#3ea6a0']];
    for (let k = 0; k < 4; k++) { const z0 = 3.5 + k * 6.4; if (z0 > 9.5 && z0 < 19) continue; c.box(M(0xf4f0e8, { r: 0.6 }), 0.05, 1.3, 1.9, X0 + 0.25, 1.9, z0); c.box(M(art[k][0], { r: 0.6 }), 0.02, 0.9, 0.7, X0 + 0.29, 1.95, z0 - 0.4); c.box(M(art[k][1], { r: 0.6 }), 0.02, 0.6, 0.7, X0 + 0.29, 1.75, z0 + 0.4); }
    if (fdef.departmentId) { const sc = M(0xffffff, { map: T.screenTex('chart', '#' + new THREE.Color(accent).getHexString(), 40 + i), e: 0xffffff, ei: 0.8, r: 0.3 }); for (const wx of [27, 33]) { c.box(P.frame(), 2.4, 1.4, 0.06, wx, 1.9, Z0 + 0.22); c.box(sc, 2.25, 1.25, 0.01, wx, 1.9, Z0 + 0.26); } c.box(M(0xe7e9ee, { r: 0.4 }), 0.9, 0.55, 0.6, 24.5, 0.95, Z0 + 0.6); c.box(P.metal(), 0.9, 0.9, 0.6, 24.5, 0.45, Z0 + 0.6); c.box(P.dark(), 0.7, 0.03, 0.4, 24.5, 1.24, Z0 + 0.6); }
    for (const [bx, bz] of [[6.4, 5.6], [29.6, 9.4], [29.6, 13.4]]) { c.cyl(M(0x4a5368, { r: 0.5 }), 0.16, 0.13, 0.42, bx, 0.21, bz, 10); }
    for (const [lx, lz] of [[15, 22.5], [24, 20]]) { c.cyl(P.metal(), 0.02, 0.02, 1.6, lx, 0.8, lz, 6); c.cyl(P.dark(), 0.16, 0.16, 0.03, lx, 0.02, lz, 12); c.cyl(P.light(), 0.13, 0.24, 0.3, lx, 1.65, lz, 14); }
    for (const pz of [3.0, 6.6, 8.6, 23.4, 26.6]) plant(c, X0 + 0.9, pz, 1.0); for (const px of [9, 16.5, 24.5, 34.5]) tallPlant(c, px, Z1 - 0.7);
    // Rolltreppen Umgebung: Beschilderung und Pflanzen
    const escSign = (i < 4) ? T.textTex(['Rolltreppe', `Etage ${i + 1} ▲`], { w: 512, h: 256, bg: '#1c2333', accent: '#ff8a3d', font: 'bold 54px "Segoe UI", system-ui, sans-serif' }) : null;
    if (escSign) { c.box(P.metal(), 0.06, 1.6, 0.06, 2.6, 0.8, 19.6); c.box(M(0xffffff, { map: escSign, e: 0xffffff, ei: 0.5 }), 1.5, 0.75, 0.05, 2.6, 1.85, 19.6); }
    plant(c, 5.9, 20.4, 1.2); tallPlant(c, 0.2, 21.8);

    // Außenwände (Rückseite und Westseite) mit Fensterbändern, vorne und rechts offen (Puppenhausschnitt)
    const wallH = FH - 0.4; const glass = P.glass(); const wm = bases.wall; const pil = M(0xdfe2e8, { r: 0.6 });
    c.box(wm, X1 - X0, 0.9, 0.3, (X0 + X1) / 2, 0.45, Z0); c.box(wm, X1 - X0, 0.5, 0.3, (X0 + X1) / 2, wallH - 0.25, Z0);
    c.box(wm, 0.3, 0.9, Z1 - Z0, X0, 0.45, (Z0 + Z1) / 2); c.box(wm, 0.3, 0.5, Z1 - Z0, X0, wallH - 0.25, (Z0 + Z1) / 2);
    for (let px = X0; px <= X1 + 0.01; px += 5.6) c.box(pil, 0.4, wallH, 0.34, Math.min(px, X1), wallH / 2, Z0);
    for (let pz = Z0; pz <= Z1 + 0.01; pz += 5.6) c.box(pil, 0.34, wallH, 0.4, X0, wallH / 2, Math.min(pz, Z1));
    c.box(glass, X1 - X0, wallH - 1.4, 0.06, (X0 + X1) / 2, 0.9 + (wallH - 1.4) / 2, Z0); c.box(glass, 0.06, wallH - 1.4, Z1 - Z0, X0, 0.9 + (wallH - 1.4) / 2, (Z0 + Z1) / 2);
    // Sockelleiste, Poster, Uhr
    const logo = fdef.departmentId === 'HERKULESJOBS' ? ['HERKULESJOBS', '#ff8a3d'] : fdef.departmentId === 'KASSELMEMES' ? ['KASSELMEMES', '#2fd6c0'] : i === 0 ? ['HERKULES HQ', '#ff8a3d'] : fdef.departmentId === 'SHARED' ? ['AI UND ENTWICKLUNG', '#8b9cff'] : ['WELLNESS', '#b59ad6'];
    const poster = M(0xffffff, { map: T.textTex([logo[0]], { w: 1024, h: 256, bg: '#141a2b', accent: logo[1], font: 'bold 96px "Segoe UI", system-ui, sans-serif', sub: 'DEMO Umgebung' }), e: 0xffffff, ei: 0.35, r: 0.4 });
    c.box(poster, 6.4, 1.6, 0.06, 20, 2.55, Z0 + 0.2); c.box(M(0xffffff, { r: 0.4 }), 0.6, 0.6, 0.05, 31, 2.6, Z0 + 0.2); c.cyl(M(0x111111, { r: 0.4 }), 0.26, 0.26, 0.04, 31, 2.6, Z0 + 0.24, 20);
    const flabel = M(0xffffff, { map: T.textTex([`ETAGE ${i}  ${fdef.label.toUpperCase()}`], { w: 1024, h: 64, bg: '#141a2b', accent: logo[1], font: 'bold 34px "Segoe UI", system-ui, sans-serif', border: false }), r: 0.5 });
    c.box(flabel, 9, 0.34, 0.03, X0 + 6.2, -0.2, Z1 + 0.13);
    // Brüstung vorne und rechts (niedriges Glas)
    const rail = M(0x8d97ad, { r: 0.4, m: 0.6 }); const bg = P.glass();
    c.box(bg, X1 - X0, 0.95, 0.04, (X0 + X1) / 2, 0.5, Z1 + 0.05); c.box(bg, 0.04, 0.95, Z1 - Z0, X1 + 0.05, 0.5, (Z0 + Z1) / 2);
    c.box(rail, X1 - X0, 0.04, 0.05, (X0 + X1) / 2, 1.0, Z1 + 0.05); c.box(rail, 0.05, 0.04, Z1 - Z0, X1 + 0.05, 1.0, (Z0 + Z1) / 2);
    for (let px = X0; px <= X1; px += 4) c.box(rail, 0.04, 1.0, 0.04, px, 0.5, Z1 + 0.05);
    for (let pz = Z0; pz <= Z1; pz += 4) c.box(rail, 0.04, 1.0, 0.04, X1 + 0.05, 0.5, pz);

    c.flush(fg);

    // Deckenlampen als Leuchtflächen (kein Schatten)
    // Rolltreppe zwischen dieser und der nächsten Etage
    let esc = null; if (i < layout.floors.length - 1) { esc = buildEscalator(fg, i); escalators.push(esc); }

    // Zonenschilder (hängend)
    const signZones = zones.filter((z) => ['MEETING_ROOM', 'KITCHEN', 'LOUNGE', 'WELLNESS', 'WAITING_AREA', 'AGENT_BENCH', 'DESKS', 'LOBBY'].includes(z.kind));
    signZones.forEach((z) => {
      const b = z._box; const m = new THREE.MeshStandardMaterial({ map: T.textTex([z.label], { w: 768, h: 160, bg: '#141a2b', accent: '#' + new THREE.Color(z.departmentId ? DEPT_COLOR[z.departmentId] : 0xb8c4dd).getHexString(), font: 'bold 60px "Segoe UI", system-ui, sans-serif' }), emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.5 });
      m.emissiveMap = m.map; const s = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.76, 0.06), m); s.position.set((b.x0 + b.x1) / 2, 2.85, z.kind === 'DESKS' ? b.z0 - 0.4 : b.z0 + 0.05); s.castShadow = true; fg.add(s);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 4), P.dark()); cord.position.set(s.position.x, 3.5, s.position.z); fg.add(cord);
    });
    floors.push({ index: i, group: fg, escalator: esc, accent });
  }

  // TV Bildschirme (animiert)
  const tvCanvases = [];
  tvs.forEach((t) => { const f = Math.round((t.y - 1.3) / FH); const tc = T.tvCanvas(); tc.draw(0, t.variant); const m = new THREE.MeshBasicMaterial({ map: tc.texture }); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.02), m); s.position.set(t.x, 1.3, t.z + 0.05); floors[f].group.add(s); tvCanvases.push({ tc, v: t.variant, floor: f, mesh: s }); });

  // Umgebung: Himmel, Boden, Bäume, Skyline
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M(0xffffff, { map: (() => { const g = tex.grass; g.repeat.set(60, 60); return g; })(), r: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(20, -FH * 0.0 - 0.6, 15); ground.receiveShadow = true; world.add(ground);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 16, Z1 - Z0 + 16), M(0xffffff, { map: (() => { const a = tex.asphalt; a.repeat.set(10, 8); return a; })(), r: 1 })); pave.rotation.x = -Math.PI / 2; pave.position.set((X0 + X1) / 2, -0.55, (Z0 + Z1) / 2); pave.receiveShadow = true; world.add(pave);
  const env = new Collector(); const r2 = rand32(77);
  for (let k = 0; k < 46; k++) { const ang = r2() * 6.283, rad = 95 + r2() * 110; const x = 20 + Math.cos(ang) * rad, z = 15 + Math.sin(ang) * rad; if ((x - 20) * 0.66 + (z - 15) * 0.75 > -25) continue; const h = 12 + r2() * 30, w = 7 + r2() * 9; env.box(M(new THREE.Color().setHSL(0.58 + r2() * 0.06, 0.18, 0.55 + r2() * 0.2).getHex(), { r: 0.8 }), w, h, w * (0.8 + r2() * 0.5), x, h / 2 - 0.6, z); }
  for (let k = 0; k < 40; k++) { const x = X0 - 14 + r2() * (X1 - X0 + 40), z = Z1 + 12 + r2() * 30; if (r2() < 0.6) { env.cyl(P.walnut(), 0.18, 0.24, 1.6, x, 0.2, z, 6); env.sph(r2() > 0.5 ? P.leaf() : P.leaf2(), 1.5 + r2() * 0.6, x, 2.4, z, 1, 1.15, 1); } }
  const envG = new THREE.Group(); env.flush(envG); envG.children.forEach((m) => { m.castShadow = false; }); world.add(envG);

  return { world, floors, escalators, tvCanvases, seatInfo, bounds: { X0, X1, Z0, Z1 } };
}

// ---------------------------------------------------------------------------
// Rolltreppe (Paar: eine Spur hoch, eine runter), Stufen bewegen sich
// ---------------------------------------------------------------------------
function buildEscalator(fg, L) {
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
