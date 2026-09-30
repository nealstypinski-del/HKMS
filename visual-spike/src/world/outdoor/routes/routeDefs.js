// Semantische Routen als Listen von Knoten IDs. Bewegung wird NIE in Charakterkomponenten festverdrahtet.
const HQ_TO_STAIR_L = ['hq-door', 'plaza-center', 'plaza-west', 'park-w1', 'park-w-cross', 'park-w2', 'pool-west', 'stair-L-approach']

export const ROUTES = {
  // HQ, Parkweg, Kaskadenfuß, linke Treppe hinauf, Herkules, rechte Treppe hinab, Wasserbecken, Waldkante, HQ
  'cascade-training-loop': {
    id: 'cascade-training-loop',
    entityId: 'route-cascade-training',
    label: 'Kaskadenlauf',
    activity: 'RUN',
    loop: true,
    nodes: [
      ...HQ_TO_STAIR_L,
      'stair-L-bottom', 'stair-L-cp1', 'stair-L-mid', 'stair-L-cp2', 'stair-L-top',
      'top-w', 'herk-w', 'herkules-viewpoint', 'herk-e', 'top-e',
      'stair-R-top', 'stair-R-cp2', 'stair-R-mid', 'stair-R-cp1', 'stair-R-bottom', 'stair-R-approach',
      'pool-east', 'pool-east-2', 'forest-edge-e', 'forest-edge-e2', 'plaza-east', 'plaza-center', 'hq-door',
    ],
  },
  'forest-training-loop': {
    id: 'forest-training-loop',
    entityId: 'route-forest-training',
    label: 'Waldlauf',
    activity: 'RUN',
    loop: true,
    nodes: ['hq-door', 'plaza-center', 'plaza-east', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'pool-east-3', 'park-e1', 'plaza-east', 'plaza-center', 'hq-door'],
  },
  'herkules-walk': {
    id: 'herkules-walk',
    entityId: 'route-herkules-walk',
    label: 'Spaziergang zum Herkules',
    activity: 'WALK',
    loop: false,
    nodes: [...HQ_TO_STAIR_L, 'stair-L-bottom', 'stair-L-cp1', 'stair-L-mid', 'stair-L-cp2', 'stair-L-top', 'top-w', 'herk-w', 'herkules-viewpoint'],
  },
  'park-walk': {
    id: 'park-walk',
    entityId: 'route-park-walk',
    label: 'Parkrunde',
    activity: 'WALK',
    loop: true,
    nodes: ['hq-door', 'plaza-center', 'plaza-west', 'park-w1', 'park-w-cross', 'park-south-mid', 'pool-east-3', 'park-e1', 'plaza-east', 'plaza-center', 'hq-door'],
  },
}

// Absicht (Terminal 4) -> Route
export const INTENT_ROUTES = {
  RUN_CASCADES: 'cascade-training-loop',
  RUN_FOREST: 'forest-training-loop',
  WALK_CASCADES: 'cascade-training-loop',
  WALK_TO_HERKULES: 'herkules-walk',
}
