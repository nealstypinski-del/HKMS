import * as THREE from 'three'
import { bake, mergeParts } from '../common/geometryUtils.js'

// Original Low Poly Vegetation. Jede Baumart hat drei Detailstufen (LOD0 nah, LOD1 mittel, LOD2 Silhouette).
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)
const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s)
const cone = (r, h, s) => new THREE.ConeGeometry(r, h, s)
const B = (g, o) => bake(g, o)

const TRUNK = '#6b4a32'

function beech() {
  return [
    mergeParts([
      B(cyl(0.28, 0.44, 7.5, 6), { p: [0, 3.75, 0], color: TRUNK }),
      B(ico(5.2), { p: [0, 11, 0], s: [1, 0.85, 1], color: '#5c9e3c' }),
      B(ico(3.4), { p: [2.8, 9, 1.2], color: '#4f9036' }),
      B(ico(3.6), { p: [-2.6, 9.4, -1], color: '#67a843' }),
    ]),
    mergeParts([B(cyl(0.3, 0.42, 7, 5), { p: [0, 3.5, 0], color: TRUNK }), B(ico(5.6, 0), { p: [0, 10.5, 0], s: [1.05, 0.9, 1.05], color: '#5c9e3c' })]),
    mergeParts([B(cyl(0.35, 0.5, 6, 3), { p: [0, 3, 0], color: TRUNK }), B(new THREE.OctahedronGeometry(6, 0), { p: [0, 10.5, 0], color: '#579a3a' })]),
  ]
}

function oak() {
  return [
    mergeParts([
      B(cyl(0.5, 0.75, 4.6, 6), { p: [0, 2.3, 0], color: '#5f4430' }),
      B(ico(6.8), { p: [0, 8.4, 0], s: [1, 0.7, 1], color: '#4b8a34' }),
      B(ico(4.6), { p: [4, 7, 1.5], color: '#3f7a2e' }),
      B(ico(4.4), { p: [-3.8, 7.2, -1.8], color: '#549a3a' }),
    ]),
    mergeParts([B(cyl(0.55, 0.75, 4.4, 5), { p: [0, 2.2, 0], color: '#5f4430' }), B(ico(7.2, 0), { p: [0, 8, 0], s: [1.1, 0.7, 1.1], color: '#4b8a34' })]),
    mergeParts([B(cyl(0.6, 0.8, 4, 3), { p: [0, 2, 0], color: '#5f4430' }), B(new THREE.OctahedronGeometry(7, 0), { p: [0, 7.6, 0], s: [1.1, 0.7, 1.1], color: '#457f31' })]),
  ]
}

function spruce() {
  const c = ['#2f6b3d', '#28603a']
  const tiers = [[4.2, 5.6, 5.4], [3.6, 5.0, 8.6], [3.0, 4.6, 11.6], [2.3, 4.2, 14.4], [1.5, 3.6, 17]]
  return [
    mergeParts([B(cyl(0.25, 0.42, 3.2, 5), { p: [0, 1.6, 0], color: '#5b4030' }), ...tiers.map(([r, h, y], i) => B(cone(r, h, 7), { p: [0, y, 0], color: c[i % 2] }))]),
    mergeParts([B(cyl(0.3, 0.42, 3, 4), { p: [0, 1.5, 0], color: '#5b4030' }), ...[tiers[0], tiers[2], tiers[4]].map(([r, h, y], i) => B(cone(r * 1.1, h * 1.25, 5), { p: [0, y, 0], color: c[i % 2] }))]),
    mergeParts([B(cone(4, 18, 4), { p: [0, 9.5, 0], color: '#2c663b' })]),
  ]
}

function poplar() {
  return [
    mergeParts([B(cyl(0.3, 0.42, 4.5, 6), { p: [0, 2.25, 0], color: TRUNK }), B(ico(1, 1), { p: [0, 10.5, 0], s: [2.7, 6.4, 2.7], color: '#6fb04a' })]),
    mergeParts([B(cyl(0.3, 0.42, 4.5, 4), { p: [0, 2.25, 0], color: TRUNK }), B(ico(1, 0), { p: [0, 10.5, 0], s: [2.8, 6.4, 2.8], color: '#6fb04a' })]),
    mergeParts([B(new THREE.OctahedronGeometry(1, 0), { p: [0, 10, 0], s: [2.6, 7.5, 2.6], color: '#6cae48' })]),
  ]
}

export function buildVegetationGeometries() {
  return {
    trees: [beech(), oak(), spruce(), poplar()],
    bush: [mergeParts([B(ico(1.1, 0), { p: [0, 0.7, 0], s: [1.4, 0.9, 1.4], color: '#4c8f3a' }), B(ico(0.8, 0), { p: [0.9, 0.5, 0.4], color: '#5aa043' })])],
    rock: [mergeParts([B(new THREE.DodecahedronGeometry(1, 0), { p: [0, 0.35, 0], s: [1.3, 0.8, 1], color: '#8c867a' })])],
    tuft: [mergeParts([
      B(cone(0.12, 0.7, 3), { p: [0, 0.35, 0], color: '#7fbf4a' }),
      B(cone(0.1, 0.55, 3), { p: [0.15, 0.27, 0.1], r: [0.2, 0, -0.25], color: '#6fb03e' }),
      B(cone(0.1, 0.5, 3), { p: [-0.14, 0.25, -0.08], r: [-0.2, 0, 0.25], color: '#8acb52' }),
    ])],
  }
}
