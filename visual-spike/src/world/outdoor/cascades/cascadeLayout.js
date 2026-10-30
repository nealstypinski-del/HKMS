// Geometrische Beschreibung der Kaskade (ohne Rendering). v = Strecke vom Herkules (oben, 0) nach unten.
import { CASCADE, CASCADE_STAGES, POOL } from '../config/bergpark.config.js'
import { cascadeElevationAtV } from '../terrain/heightField.js'

export const zAtV = (v) => CASCADE.zTop + v
export const segmentLength = CASCADE.length / CASCADE.segmentCount
export const stageLength = CASCADE.length / CASCADE_STAGES.length
export const waterStepCount = Math.round(CASCADE.length / CASCADE.stepLength)
export const treadLength = CASCADE.length / CASCADE.stepsPerSide
export const slopeRatio = CASCADE.drop / CASCADE.length

// Kanalhalbbreite: schmal auf den Stufen, Aufweitung zur Segmentmitte (Becken)
export function halfWidthAt(v) {
  const u = ((v % segmentLength) + segmentLength) % segmentLength / segmentLength
  const bump = Math.exp(-(((u - 0.5) / 0.2) ** 2))
  return CASCADE.channelHalf + (CASCADE.basinHalf - CASCADE.channelHalf) * bump
}

export const waterTreadY = (k) => cascadeElevationAtV(k * CASCADE.stepLength) + CASCADE.waterLift
export const stageIndexAtV = (v) => Math.min(CASCADE_STAGES.length - 1, Math.max(0, Math.floor(v / stageLength)))

// Austritt ins Ergebnisbecken
export const OUTFALL = { v0: CASCADE.length, v1: CASCADE.length + 3.4, y0: waterTreadY(waterStepCount), y1: POOL.waterY + 0.05 }

// Zugangslücken im Geländer (Bank und Anker)
export const RAIL_GAPS_V = [70, 140]

export const segments = Array.from({ length: CASCADE.segmentCount }, (_, i) => {
  const v0 = i * segmentLength
  const vm = v0 + segmentLength / 2
  const stageIndex = stageIndexAtV(vm)
  return {
    index: i,
    id: `cascade-segment-${String(i).padStart(2, '0')}`,
    stageIndex,
    stageKey: CASCADE_STAGES[stageIndex].key,
    v0,
    v1: v0 + segmentLength,
    center: [0, cascadeElevationAtV(vm), zAtV(vm)],
    radius: segmentLength * 0.5 + 10,
  }
})

export const segmentAtV = (v) => segments[Math.min(segments.length - 1, Math.max(0, Math.floor(v / segmentLength)))]
