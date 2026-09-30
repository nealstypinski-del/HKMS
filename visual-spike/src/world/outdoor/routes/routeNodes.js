// Semantische Wegknoten. Alle Routen, Anker und das Wegenetz verweisen auf diese IDs.
// kind bestimmt die Oberfläche der Kanten: stair (Treppe), plaza, path, forest, lawn.
import { CASCADE } from '../config/bergpark.config.js'

const zt = (v) => CASCADE.zTop + v
const xs = (CASCADE.stairInner + CASCADE.stairOuter) / 2 // Treppenmitte

export const NODES = {
  'hq-door': { x: 0, z: -7.6, kind: 'plaza' },
  'plaza-center': { x: 0, z: -30, kind: 'plaza' },
  'plaza-west': { x: -22, z: -46, kind: 'plaza' },
  'plaza-east': { x: 22, z: -46, kind: 'plaza' },
  'park-w1': { x: -31, z: -74, kind: 'path' },
  'park-w-cross': { x: -31.6, z: -92, kind: 'path' },
  'park-w2': { x: -32, z: -118, kind: 'path' },
  'pool-west': { x: -31, z: -131, kind: 'path' },
  'park-south-mid': { x: 0, z: -92, kind: 'path' },
  'park-e1': { x: 30, z: -74, kind: 'path' },
  'pool-east-3': { x: 32, z: -92, kind: 'path' },
  'pool-east-2': { x: 33, z: -110, kind: 'path' },
  'pool-east': { x: 31, z: -131, kind: 'path' },
  'stair-L-approach': { x: -xs, z: -131.5, kind: 'path' },
  'stair-L-bottom': { x: -xs, z: zt(CASCADE.length) + 0.4, kind: 'stair' },
  'stair-L-cp1': { x: -xs, z: zt(140), kind: 'stair' },
  'stair-L-mid': { x: -xs, z: zt(105), kind: 'stair' },
  'stair-L-cp2': { x: -xs, z: zt(70), kind: 'stair' },
  'stair-L-top': { x: -xs, z: zt(0) - 0.4, kind: 'stair' },
  'stair-R-approach': { x: xs, z: -131.5, kind: 'path' },
  'stair-R-bottom': { x: xs, z: zt(CASCADE.length) + 0.4, kind: 'stair' },
  'stair-R-cp1': { x: xs, z: zt(140), kind: 'stair' },
  'stair-R-mid': { x: xs, z: zt(105), kind: 'stair' },
  'stair-R-cp2': { x: xs, z: zt(70), kind: 'stair' },
  'stair-R-top': { x: xs, z: zt(0) - 0.4, kind: 'stair' },
  'top-w': { x: -13, z: -351, kind: 'plaza' },
  'herk-w': { x: -9, z: -367, kind: 'plaza' },
  'herkules-viewpoint': { x: 0, z: -369, kind: 'plaza' },
  'herk-e': { x: 9, z: -367, kind: 'plaza' },
  'top-e': { x: 13, z: -351, kind: 'plaza' },
  // Waldrunde (Ost)
  'f1': { x: 46, z: -58, kind: 'forest' },
  'f2': { x: 72, z: -90, kind: 'forest' },
  'f3': { x: 92, z: -135, kind: 'forest' },
  'f4': { x: 96, z: -190, kind: 'forest' },
  'f5': { x: 84, z: -235, kind: 'forest' },
  'f6': { x: 62, z: -262, kind: 'forest' },
  'f7': { x: 52, z: -225, kind: 'forest' },
  'f8': { x: 56, z: -175, kind: 'forest' },
  'f9': { x: 48, z: -130, kind: 'forest' },
  'forest-edge-e': { x: 46, z: -96, kind: 'forest' },
  'forest-edge-e2': { x: 40, z: -68, kind: 'forest' },
}

export const isStairNode = (id) => NODES[id]?.kind === 'stair'

export function edgeSurface(a, b) {
  const ka = NODES[a].kind
  const kb = NODES[b].kind
  if (ka === 'stair' && kb === 'stair') return 'stairs'
  if (ka === 'forest' || kb === 'forest') return 'forest'
  if (ka === 'plaza' && kb === 'plaza') return 'plaza'
  return 'path'
}
