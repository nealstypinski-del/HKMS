// Wassershader für Kaskade und Ergebnisbecken: animierte UV Strömung, Schaum an Kanten, kein Fluidsystem.
// Qualität wird über define QUALITY gewählt: 0 = einfache Streifen, 1 = animiertes Rauschen, 2 = zusätzlich Himmelsreflexion (Fresnel).
import * as THREE from 'three'
import { CASCADE, CASCADE_STAGES, POOL } from '../config/bergpark.config.js'
import { pulseState } from './CompletionPulse.js'

const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = h21(i); float b = h21(i + vec2(1.0, 0.0)); float c = h21(i + vec2(0.0, 1.0)); float d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm2(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
`

const CASCADE_VERT = /* glsl */ `
attribute float aDrop;
attribute float aV;
varying vec2 vUv; varying float vDrop; varying float vV; varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vUv = uv; vDrop = aDrop; vV = aV;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const CASCADE_FRAG = /* glsl */ `
varying vec2 vUv; varying float vDrop; varying float vV; varying vec3 vWorld;
uniform float uTime; uniform float uActivity; uniform float uNight; uniform float uStageLen;
uniform float uStage[6]; uniform float uBlocked[6];
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uWarm; uniform vec3 uSky;
uniform vec4 uPulse[8]; uniform vec3 uPulseCol[8];
${NOISE}
#include <fog_pars_fragment>
void main(){
  int si = int(clamp(floor(vV / uStageLen - 0.001), 0.0, 5.0));
  float act = uStage[si];
  float blocked = uBlocked[si];
  float speed = (0.5 + 1.6 * act) * (0.35 + 0.65 * uActivity) * (1.0 - 0.55 * blocked);
  vec2 p = (vDrop > 0.5) ? vec2(vUv.x * 9.0, vUv.y * 2.5 - uTime * 3.5 * speed) : vec2(vUv.x * 7.0, vV * 0.9 - uTime * speed * 1.5);
  #if QUALITY == 0
    float n = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 2.2);
    float n2 = n;
  #else
    float n = fbm2(p);
    float n2 = vnoise(p * 2.7 + vec2(3.1, -uTime * speed * 2.0));
  #endif
  vec3 col = mix(uDeep, uShallow, n);
  float foam = smoothstep(0.64, 0.92, n2) * (0.25 + 0.75 * vDrop) + vDrop * 0.3;
  col = mix(col, uFoam, clamp(foam, 0.0, 1.0));
  float edge = abs(vUv.x * 2.0 - 1.0);
  col *= 1.0 - 0.22 * smoothstep(0.7, 1.0, edge);
  col *= mix(0.72, 1.28, act) * mix(0.8, 1.15, uActivity);
  col = mix(col, col * vec3(1.25, 1.0, 0.55) + uWarm * 0.1, blocked * 0.55);
  col *= mix(1.0, 0.55, uNight);
  col += uShallow * 0.09 * uNight;
  float glow = 0.0; vec3 gc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float s = uPulse[i].y;
    if (s > 0.001) { float d = (vV - uPulse[i].x) / uPulse[i].z; float g = s * exp(-d * d); glow += g; gc += uPulseCol[i] * g; }
  }
  col += gc * (0.55 + 0.45 * (1.0 - edge * 0.6)) * 1.5;
  #if QUALITY == 2
    vec3 V = normalize(cameraPosition - vWorld);
    float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    col = mix(col, uSky, fr * 0.35 * (1.0 - vDrop));
  #endif
  gl_FragColor = vec4(col, clamp(mix(0.88, 0.95, vDrop) + glow * 0.1, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

const POOL_FRAG = /* glsl */ `
varying vec2 vUv; varying float vDrop; varying float vV; varying vec3 vWorld;
uniform float uTime; uniform float uNight; uniform float uPoolGlow;
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uSky; uniform vec3 uInflow; uniform vec3 uCenter;
uniform vec2 uRipple[4];
${NOISE}
#include <fog_pars_fragment>
void main(){
  vec2 q = vWorld.xz - uCenter.xz;
  float r = length(q / vec2(${POOL.a.toFixed(1)}, ${POOL.b.toFixed(1)}));
  #if QUALITY == 0
    float n = 0.5 + 0.25 * sin(q.x * 0.4 + uTime * 0.4) * sin(q.y * 0.5 - uTime * 0.3);
  #else
    float n = fbm2(q * 0.22 + vec2(uTime * 0.04, -uTime * 0.05));
  #endif
  vec3 col = mix(uDeep, uShallow, n * 0.8 + (1.0 - r) * 0.25);
  float d = length(vWorld.xz - uInflow.xz);
  col += uFoam * exp(-d * 0.35) * 0.18;
  float rip = 0.0;
  for (int i = 0; i < 4; i++) {
    float age = uTime - uRipple[i].x;
    float s = uRipple[i].y;
    if (age > 0.0 && age < 7.0 && s > 0.0) {
      float ring = exp(-pow((d - age * 5.0) / 1.1, 2.0));
      rip += ring * s * (1.0 - age / 7.0);
    }
  }
  col += vec3(0.35, 1.0, 0.85) * rip * 1.3;
  col += vec3(0.25, 0.8, 0.7) * uPoolGlow * exp(-r * r * 2.0) * 0.6;
  col *= mix(1.0, 0.6, uNight);
  col += uShallow * 0.08 * uNight;
  #if QUALITY == 2
    vec3 V = normalize(cameraPosition - vWorld);
    float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    col = mix(col, uSky, fr * 0.4);
  #endif
  gl_FragColor = vec4(col, 0.93);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

const c = (h) => new THREE.Color(h)

// Gemeinsame Uniform Objekte: alle Qualitätsvarianten teilen sie, es wird nur einmal pro Frame geschrieben.
export const waterUniforms = {
  ...THREE.UniformsLib.fog,
  uTime: { value: 0 },
  uActivity: { value: 0.6 },
  uNight: { value: 0 },
  uStageLen: { value: CASCADE.length / CASCADE_STAGES.length },
  uStage: { value: new Float32Array(6).fill(0.6) },
  uBlocked: { value: new Float32Array(6) },
  uDeep: { value: c('#0f6f86') },
  uShallow: { value: c('#5fd8d0') },
  uFoam: { value: c('#f2fffb') },
  uWarm: { value: c('#ffc94d') },
  uSky: { value: c('#cfe6f5') },
  uPulse: { value: pulseState.uPulse },
  uPulseCol: { value: pulseState.uPulseCol },
  uPoolGlow: { value: 0 },
  uInflow: { value: new THREE.Vector3(0, POOL.waterY, CASCADE.zTop + CASCADE.length + 1) },
  uCenter: { value: new THREE.Vector3(POOL.x, POOL.waterY, POOL.z) },
  uRipple: { value: pulseState.uRipple },
}

const cache = {}
function make(kind, quality) {
  const key = `${kind}${quality}`
  if (!cache[key]) {
    cache[key] = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: CASCADE_VERT,
      fragmentShader: kind === 'pool' ? POOL_FRAG : CASCADE_FRAG,
      defines: { QUALITY: quality },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  }
  return cache[key]
}

export const getCascadeWaterMaterial = (quality = 1) => make('cascade', quality)
export const getPoolWaterMaterial = (quality = 1) => make('pool', quality)
