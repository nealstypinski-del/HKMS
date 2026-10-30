// Umgebungszustand (Tageszeit, Wetter). Terminal 3 besitzt später das globale Zeitsystem; diese Datei ist der Anschluss:
// setTimeOfDay / setWeather nehmen Werte entgegen, `envState` wird weich nachgeführt und von allen Materialien gelesen.
// Nachtlicht wird ohne dynamische Lichter erzeugt: emissive Materialien, additive Glows, Nebel und Himmelsverlauf.
import * as THREE from 'three'
import { clamp } from '../common/noise.js'

export const TIMES = ['DAY', 'EVENING', 'NIGHT']
export const WEATHERS = ['CLEAR', 'CLOUDY', 'FOG', 'RAIN', 'SNOW']

const P = (o) => o
export const ENV_PRESETS = {
  DAY: P({
    night: 0, skyTop: '#4a90d9', skyHorizon: '#cfe6f5', fog: '#cfe2ee', fogDensity: 0.00105,
    sunColor: '#fff4dc', sunIntensity: 2.3, sunDir: [0.35, 0.8, 0.5], hemiSky: '#dcecff', hemiGround: '#6a7a4a', hemiIntensity: 1.05,
  }),
  EVENING: P({
    night: 0.5, skyTop: '#5a5f9e', skyHorizon: '#ffb27a', fog: '#e0a889', fogDensity: 0.0012,
    sunColor: '#ffa060', sunIntensity: 1.6, sunDir: [-0.85, 0.28, 0.35], hemiSky: '#ffc9a8', hemiGround: '#4a4a55', hemiIntensity: 0.75,
  }),
  NIGHT: P({
    night: 1, skyTop: '#060b1d', skyHorizon: '#1b2846', fog: '#111a30', fogDensity: 0.0011,
    sunColor: '#8fa8ff', sunIntensity: 0.55, sunDir: [0.3, 0.7, -0.4], hemiSky: '#5a72b8', hemiGround: '#1c2438', hemiIntensity: 0.62,
  }),
}

// Wettermodifikatoren. RAIN und SNOW sind vorerst nur Architektur (Nebel und Licht), keine Partikel.
export const WEATHER_MODS = {
  CLEAR: { fogMul: 1, lightMul: 1 },
  CLOUDY: { fogMul: 1.5, lightMul: 0.72 },
  FOG: { fogMul: 4.2, lightMul: 0.6 },
  RAIN: { fogMul: 2.4, lightMul: 0.5, todo: 'Regenpartikel folgen später' },
  SNOW: { fogMul: 2.8, lightMul: 0.8, todo: 'Schneepartikel folgen später' },
}

const col = (h) => new THREE.Color(h)

export const envState = {
  target: 'DAY',
  weather: 'CLEAR',
  night: 0,
  skyTop: col(ENV_PRESETS.DAY.skyTop),
  skyHorizon: col(ENV_PRESETS.DAY.skyHorizon),
  fog: col(ENV_PRESETS.DAY.fog),
  fogDensity: ENV_PRESETS.DAY.fogDensity,
  sunColor: col(ENV_PRESETS.DAY.sunColor),
  sunIntensity: ENV_PRESETS.DAY.sunIntensity,
  sunDir: new THREE.Vector3(...ENV_PRESETS.DAY.sunDir),
  hemiSky: col(ENV_PRESETS.DAY.hemiSky),
  hemiGround: col(ENV_PRESETS.DAY.hemiGround),
  hemiIntensity: ENV_PRESETS.DAY.hemiIntensity,
}

const listeners = new Set()
export const subscribeEnv = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export function setTimeOfDay(t) { if (ENV_PRESETS[t]) { envState.target = t; listeners.forEach((f) => f()) } }
export function setWeather(w) { if (WEATHER_MODS[w]) { envState.weather = w; listeners.forEach((f) => f()) } }

// Weiches Nachführen in Richtung Zielpreset (pro Frame aufrufen)
export function stepEnvironment(dt) {
  const t = ENV_PRESETS[envState.target]
  const wm = WEATHER_MODS[envState.weather]
  const k = 1 - Math.exp(-dt * 1.8)
  const c = new THREE.Color()
  envState.night += (t.night - envState.night) * k
  envState.skyTop.lerp(c.set(t.skyTop), k)
  envState.skyHorizon.lerp(c.set(t.skyHorizon), k)
  envState.fog.lerp(c.set(t.fog), k)
  envState.fogDensity += (t.fogDensity * wm.fogMul - envState.fogDensity) * k
  envState.sunColor.lerp(c.set(t.sunColor), k)
  envState.sunIntensity += (t.sunIntensity * wm.lightMul - envState.sunIntensity) * k
  envState.sunDir.lerp(new THREE.Vector3(...t.sunDir), k).normalize()
  envState.hemiSky.lerp(c.set(t.hemiSky), k)
  envState.hemiGround.lerp(c.set(t.hemiGround), k)
  envState.hemiIntensity += (t.hemiIntensity * (0.5 + 0.5 * wm.lightMul) - envState.hemiIntensity) * k
  // registrierte Nachtmaterialien nachführen
  const n = clamp(envState.night, 0, 1)
  for (const r of registry) {
    if (r.kind === 'emissive') r.mat.emissiveIntensity = r.base * (r.min + (1 - r.min) * n)
    else r.mat.opacity = r.base * (r.min + (1 - r.min) * n)
  }
}

// Materialien, die nachts leuchten. kind 'emissive' skaliert emissiveIntensity, kind 'opacity' die Deckkraft (Glows).
const registry = new Set()
export function registerNightMaterial(mat, { base = 1, min = 0.1, kind = 'emissive' } = {}) {
  const r = { mat, base, min, kind }
  registry.add(r)
  return () => registry.delete(r)
}
