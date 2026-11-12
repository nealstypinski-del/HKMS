// Ein Kaskadensegment liefert seine Instanzdaten (Stufen, Wangen, Treppen, Geländer, Anker).
// Segmente werden in CascadeSystem zu wenigen InstancedMesh Batches zusammengefasst: viele Teile, wenige Drawcalls.
import { CASCADE } from '../config/bergpark.config.js'
import { cascadeElevationAtV } from '../terrain/heightField.js'
import {
  halfWidthAt, segmentLength, treadLength, waterStepCount, waterTreadY, zAtV, slopeRatio, RAIL_GAPS_V,
} from './cascadeLayout.js'

const pitch = Math.atan(slopeRatio)

export function buildSegmentData(seg) {
  const stepsPerSeg = waterStepCount / CASCADE.segmentCount
  const d = { bed: [], kerbs: [], stairs: [], railPosts: [], railBars: [], anchors: [] }

  // Wasserstufen: Steinbett und beidseitige Wangenmauern
  for (let j = 0; j < stepsPerSeg; j++) {
    const k = seg.index * stepsPerSeg + j
    const v0 = k * CASCADE.stepLength
    const vm = v0 + CASCADE.stepLength / 2
    const hw = halfWidthAt(vm)
    const yw = waterTreadY(k)
    const z = zAtV(vm)
    d.bed.push({ p: [0, yw - 0.15 - 0.8, z], s: [hw * 2 + 0.2, 1.6, CASCADE.stepLength + 0.02] })
    for (const side of [-1, 1]) {
      d.kerbs.push({ p: [side * (hw + 0.35), yw + 0.25 - 0.95, z], s: [0.7, 1.9, CASCADE.stepLength + 0.04] })
    }
  }

  // Seitentreppen (visuell 535 Stufen je Seite, gelaufen wird auf der glatten Neigung)
  const kMin = Math.floor(seg.v0 / treadLength)
  const kMax = Math.min(CASCADE.stepsPerSide, Math.floor(seg.v1 / treadLength))
  const width = CASCADE.stairOuter - CASCADE.stairInner
  const cx = (CASCADE.stairOuter + CASCADE.stairInner) / 2
  for (let k = kMin; k < kMax; k++) {
    const vm = (k + 0.5) * treadLength
    const top = cascadeElevationAtV(vm) + 0.09
    const tint = 0.9 + 0.1 * ((k * 7919) % 13) / 13 + (k % 10 === 0 ? 0.06 : 0)
    for (const side of [-1, 1]) {
      d.stairs.push({ p: [side * cx, top - 0.45, zAtV(vm)], s: [width, 0.9, treadLength + 0.02], c: tint })
    }
  }
  // Wangenkante zwischen Steinplatte und Treppe
  const vMid = (seg.v0 + seg.v1) / 2
  for (const side of [-1, 1]) {
    d.kerbs.push({
      p: [side * (CASCADE.stairInner - CASCADE.kerbWidth / 2), cascadeElevationAtV(vMid) + 0.1, zAtV(vMid)],
      s: [CASCADE.kerbWidth, 0.7, segmentLength + 0.05],
      r: [pitch, 0, 0],
    })
  }
  // Geländer außen (mit Lücken an den Zugängen)
  const postEvery = 10
  for (let k = Math.ceil(kMin / postEvery) * postEvery; k < kMax; k += postEvery) {
    const v = k * treadLength
    if (RAIL_GAPS_V.some((g) => Math.abs(v - g) < 4)) continue
    const y = cascadeElevationAtV(v) + 0.09
    for (const side of [-1, 1]) {
      d.railPosts.push({ p: [side * CASCADE.railX, y + 0.5, zAtV(v)], s: [0.1, 1.0, 0.1] })
      const vb = v + (postEvery * treadLength) / 2
      if (!RAIL_GAPS_V.some((g) => Math.abs(vb - g) < 4) && vb < CASCADE.length) {
        d.railBars.push({ p: [side * CASCADE.railX, cascadeElevationAtV(vb) + 1.0, zAtV(vb)], s: [0.07, 0.07, postEvery * treadLength], r: [pitch, 0, 0] })
      }
    }
  }
  // Navigationsanker (Segment Zugangspunkte)
  d.anchors.push(
    { id: `${seg.id}-left`, x: -(CASCADE.stairInner + CASCADE.stairOuter) / 2, z: zAtV(vMid) },
    { id: `${seg.id}-right`, x: (CASCADE.stairInner + CASCADE.stairOuter) / 2, z: zAtV(vMid) },
  )
  return d
}
