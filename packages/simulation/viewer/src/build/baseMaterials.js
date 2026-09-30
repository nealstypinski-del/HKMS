import * as T from '../textures.js';
import { M } from './materials.js';

/** Texturen und Grundmaterialien der Böden und Wände. */
export function createBases() {
  const tex = { oak: T.oakTex(), marble: T.marbleTex(), wood: T.woodTex(), woodDark: T.woodTex('#8a5a36', 4), tile: T.tileTex(), carpetHJ: T.carpetTex('#6b5a52', 11), carpetKM: T.carpetTex('#3d6b68', 12), carpetDev: T.carpetTex('#4b5478', 13), carpetWell: T.carpetTex('#7d6a9e', 14), carpetWarm: T.carpetTex('#8a5b3d', 15), wall: T.wallTex(), slab: T.slabTex(), grass: T.grassTex(), asphalt: T.asphaltTex() };
  const bases = { oak: M(0xffffff, { map: tex.oak, r: 0.5 }), marble: M(0xffffff, { map: tex.marble, r: 0.35 }), wood: M(0xffffff, { map: tex.wood, r: 0.55 }), woodDark: M(0xffffff, { map: tex.woodDark, r: 0.5 }), tile: M(0xffffff, { map: tex.tile, r: 0.35 }), carpetHJ: M(0xffffff, { map: tex.carpetHJ, r: 0.95 }), carpetKM: M(0xffffff, { map: tex.carpetKM, r: 0.95 }), carpetDev: M(0xffffff, { map: tex.carpetDev, r: 0.95 }), carpetWell: M(0xffffff, { map: tex.carpetWell, r: 0.95 }), carpetWarm: M(0xffffff, { map: tex.carpetWarm, r: 0.95 }), wall: M(0xffffff, { map: tex.wall, r: 0.9 }), slab: M(0xffffff, { map: tex.slab, r: 0.9 }) };
  return { tex, bases };
}
