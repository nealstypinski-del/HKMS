import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _s = new THREE.Vector3(1, 1, 1)
const _p = new THREE.Vector3()

// Einen Teil mit Position, Rotation, Skalierung und Vertexfarbe einbacken.
export function bake(geometry, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], color = '#ffffff' } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  g.deleteAttribute('uv')
  _p.set(p[0], p[1], p[2])
  _e.set(r[0], r[1], r[2])
  _q.setFromEuler(_e)
  _s.set(s[0], s[1], s[2])
  _m.compose(_p, _q, _s)
  g.applyMatrix4(_m)
  const c = new THREE.Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

// Mehrere eingebackene Teile zu einer einzigen Geometrie (ein Drawcall) verschmelzen.
export function mergeParts(parts) {
  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  merged.computeBoundingSphere()
  merged.computeBoundingBox()
  return merged
}

// Achtecke sind zur Achse ausgerichtet (Flächen zeigen nach +Z, +X, ...)
export const octGeometry = (rTop, rBottom, h) => {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, 8, 1)
  g.rotateY(Math.PI / 8)
  return g
}

export function triCount(geometry) {
  return geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
}
