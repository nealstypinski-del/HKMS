// Positionale Audioanker für Wasser. Es gibt noch keine Audiodateien: optional ein synthetisches Rauschen (WebAudio) als Platzhalter.
// Lautstärken: master, ambient, water (jeweils 0..1). Standardmäßig stumm, weil Browser Autoplay blockieren.
import { CASCADE } from '../config/bergpark.config.js'
import { cascadeElevationAtV } from '../terrain/heightField.js'
import { POOL } from '../config/bergpark.config.js'

export const AUDIO_ANCHORS = [
  { id: 'cascade-top', x: 0, z: CASCADE.zTop + 8, y: cascadeElevationAtV(8) + 1, gain: 0.7, ref: 14 },
  { id: 'cascade-mid', x: 0, z: CASCADE.zTop + CASCADE.length / 2, y: cascadeElevationAtV(CASCADE.length / 2) + 1, gain: 0.9, ref: 16 },
  { id: 'cascade-bottom', x: 0, z: CASCADE.zTop + CASCADE.length - 8, y: cascadeElevationAtV(CASCADE.length - 8) + 1, gain: 1, ref: 16 },
  { id: 'result-pool', x: POOL.x, z: POOL.z, y: POOL.waterY + 1, gain: 0.6, ref: 18 },
]

export const audioSettings = { master: 0.8, ambient: 0.8, water: 0.8, enabled: false }

// Reine Berechnung (testbar): Gesamtpegel eines Ankers für einen Hörer
export function anchorGain(anchor, lx, ly, lz) {
  const d = Math.hypot(anchor.x - lx, anchor.y - ly, anchor.z - lz)
  const att = anchor.ref / (anchor.ref + Math.max(0, d - anchor.ref) * 1.2)
  return anchor.gain * att * audioSettings.master * audioSettings.ambient * audioSettings.water
}

let ctx = null
let nodes = []
export function startWaterAudio() {
  if (ctx || typeof window === 'undefined') return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
  nodes = AUDIO_ANCHORS.map((a) => {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const gain = ctx.createGain()
    gain.gain.value = 0
    const pan = ctx.createPanner()
    pan.panningModel = 'HRTF'
    pan.distanceModel = 'inverse'
    pan.refDistance = a.ref
    pan.rolloffFactor = 1
    pan.positionX.value = a.x; pan.positionY.value = a.y; pan.positionZ.value = a.z
    src.connect(filter).connect(gain).connect(pan).connect(ctx.destination)
    src.start()
    return { a, gain }
  })
}
export function stopWaterAudio() { ctx?.close(); ctx = null; nodes = [] }

// Pro Frame: Hörerposition und Pegel
export function updateWaterAudio(pos, heading) {
  if (!ctx) return
  const L = ctx.listener
  L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z
  L.forwardX.value = Math.sin(heading); L.forwardY.value = 0; L.forwardZ.value = Math.cos(heading)
  const on = audioSettings.enabled ? 0.05 : 0
  for (const n of nodes) n.gain.gain.value = on * (audioSettings.master * audioSettings.ambient * audioSettings.water) * n.a.gain
}
