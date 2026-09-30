// Zentrale Konfiguration der Außenwelt (Digitaler Bergpark). Alles Tunbare steht hier.
// Konvention: 1 Weltdatei = 1 Meter (wie im HQ Spike). +Y oben, HQ im Ursprung, bergauf ist -Z.

// Öffentlich bekannte Referenzmaße (nur Größenordnung, keine forensische Rekonstruktion)
export const REF = {
  monumentHeight: 71,
  figureHeight: 8.3,
  clubLength: 4.7,
  cascadeLength: 210,
  cascadeWidth: 12,
  stepsPerSide: 535,
  characterHeight: 1.8,
}

export const WORLD = {
  bounds: { minX: -220, maxX: 220, minZ: -520, maxZ: 90 },
  hq: { x: 0, z: 0, halfW: 22, halfD: 14, floors: 4, floorHeight: 4.5, doorZ: -14, doorHalf: 2.5 },
  plaza: { x0: -26, x1: 26, z0: -58, z1: -16 },
  // Kaskade: von oben (v = 0, Herkules) nach unten (v = length, Ergebnisbecken)
  eyeHeight: 1.7,
}

export const CASCADE = {
  zTop: -336,
  length: 210,
  yBottom: 3.0,
  drop: 60,
  segmentCount: 12,
  stepLength: 1.75, // Wasserstufen (120 Stück, je 0,5 m Fall)
  channelHalf: 3.6,
  basinHalf: 6.0, // Beckenaufweitung, 12 m Referenzbreite
  deckHalf: 7.6, // Steinplatte neben dem Kanal
  kerbWidth: 0.4,
  stairInner: 8.0,
  stairOuter: 11.0,
  railX: 11.2,
  stepsPerSide: REF.stepsPerSide,
  waterLift: 0.5,
}

// Ablaufstufen der Kaskade als Metapher für den Arbeitsfluss (nur Visualisierung, keine echten KPIs)
export const CASCADE_STAGES = [
  { key: 'strategy', stageId: 'cascade-strategy', entityId: 'cascade-stage-strategy', label: 'Strategie' },
  { key: 'research', stageId: 'cascade-research', entityId: 'cascade-stage-research', label: 'Recherche' },
  { key: 'production', stageId: 'cascade-production', entityId: 'cascade-stage-production', label: 'Produktion' },
  { key: 'review', stageId: 'cascade-review', entityId: 'cascade-stage-review', label: 'Prüfung' },
  { key: 'approval', stageId: 'cascade-approval', entityId: 'cascade-stage-approval', label: 'Freigabe' },
  { key: 'output', stageId: 'cascade-output', entityId: 'cascade-stage-output', label: 'Ergebnis' },
]

export const POOL = { x: 0, z: -112, a: 22, b: 13.5, waterY: 2.7, bedY: 1.2, rimW: 0.9, rimTop: 3.25 }

export const TOP_POOL = { x: 0, z: -347, r: 7.5 }

export const MONUMENT = {
  x: 0,
  z: -400,
  // Höhenaufbau in Metern, Summe = 71 m
  octagonR: 21,
  octagonH: 22,
  tiers: [
    { h: 8, rBottom: 9.5, rTop: 9.2 },
    { h: 11, rBottom: 8.6, rTop: 6.0 },
    { h: 11, rBottom: 5.8, rTop: 3.6 },
    { h: 9, rBottom: 3.4, rTop: 2.3 },
  ],
  pedestalH: 1.7,
  figureH: REF.figureHeight,
  colliderR: 22.2,
}

export const FOREST = {
  seed: 7,
  cell: 6.2,
  // Untergrenze der Waldkante in |x| (Kaskadenrasen bleibt frei)
  edgeX: 34,
  variants: 4,
  colliderRadius: 0.45,
  allee: { x: 30.5, zFrom: -140, zTo: -330, spacing: 9 },
  maxTrees: 7200,
}

// Grafikstufen: eine Welt, skalierbare Qualität
export const QUALITY = {
  LOW: {
    label: 'Niedrig', dpr: 1, shadows: false, shadowMap: 1024, shadowRadius: 60, treeFraction: 0.16, treeNear: 30, treeMid: 80,
    drawDistance: 240, bushes: 0, rocks: 40, tufts: 0, water: 0, sweat: 'none', lampGlow: false, agentLabelDist: 18, pulses: 4,
  },
  MEDIUM: {
    label: 'Mittel', dpr: 1.25, shadows: true, shadowMap: 1024, shadowRadius: 70, treeFraction: 0.45, treeNear: 50, treeMid: 130,
    drawDistance: 380, bushes: 260, rocks: 120, tufts: 0, water: 1, sweat: 'minimal', lampGlow: true, agentLabelDist: 30, pulses: 8,
  },
  HIGH: {
    label: 'Hoch', dpr: 1.5, shadows: true, shadowMap: 2048, shadowRadius: 85, treeFraction: 1, treeNear: 75, treeMid: 190,
    drawDistance: 560, bushes: 700, rocks: 260, tufts: 1400, water: 2, sweat: 'particles', lampGlow: true, agentLabelDist: 40, pulses: 8,
  },
}

// Digitale Zwillinge: jede wichtige Umgebungsentität bekommt eine ID
export const ENTITY_IDS = {
  hq: 'hq-tower',
  herkules: 'landmark-herkules',
  resultPool: 'result-pool',
  routeCascade: 'route-cascade-training',
  routeForest: 'route-forest-training',
}
