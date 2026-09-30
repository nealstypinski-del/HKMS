import * as THREE from 'three';

const mats = new Map();
/** Leert den Materialspeicher (beim Neuaufbau, sonst wächst er mit jeder neuen Textur). */
export function resetMaterialCache() { mats.clear(); }
export function M(color, o = {}) {
  const key = JSON.stringify([color, o.r, o.m, o.e, o.ei, o.t, o.o, o.map && o.map.uuid]);
  let m = mats.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.72, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.o ?? 1, map: o.map ?? null, depthWrite: o.t ? false : true });
  if (o.map && o.e !== undefined) m.emissiveMap = o.map;
  mats.set(key, m); return m;
}

/** Sammelt statische Geometrie je Material und verschmilzt sie (wenige Draw Calls). */

export const P = {
  wood: () => M(0xc4915c, { r: 0.6 }), walnut: () => M(0x6b4a2e, { r: 0.55 }), white: () => M(0xf3f3ef, { r: 0.5 }), metal: () => M(0x9aa3b2, { r: 0.35, m: 0.8 }),
  dark: () => M(0x20242e, { r: 0.5 }), frame: () => M(0x0d1016, { r: 0.4 }), leaf: () => M(0x3f9a55, { r: 0.85 }), leaf2: () => M(0x5fb36a, { r: 0.85 }), pot: () => M(0xd8d1c4, { r: 0.8 }),
  glass: () => M(0xbfe3ff, { r: 0.05, t: true, o: 0.22 }), light: () => M(0xfff2c8, { e: 0xffe9b0, ei: 1.4, r: 0.4 }), cup: () => M(0xffffff, { r: 0.4 }),
};
export const FABRIC = [0x2e8f9a, 0xd9793a, 0x4a63c9, 0x7d5fb0, 0x8791a3, 0xc25b6a];
