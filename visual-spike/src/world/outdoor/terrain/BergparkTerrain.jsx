import { useMemo } from 'react'
import * as THREE from 'three'
import { CASCADE } from '../config/bergpark.config.js'
import { heightAt } from './heightField.js'
import { fbm, smoothstep } from '../common/noise.js'
import { grassTexture } from '../common/textures.js'

const STEP = 3
// Terrain reicht weit über die Spielgrenzen hinaus, damit der Horizont in der Übersicht geschlossen bleibt
const EXTENT = { minX: -520, maxX: 520, minZ: -760, maxZ: 320 }

const C = {
  lawn: new THREE.Color('#86c05a'),
  lawnDark: new THREE.Color('#6da645'),
  park: new THREE.Color('#8cc65f'),
  forest: new THREE.Color('#4d8a3c'),
  forestDark: new THREE.Color('#3d7431'),
  high: new THREE.Color('#5d9440'),
  rock: new THREE.Color('#8c8578'),
}

// Ein Netz für die gesamte Welt: HQ Plateau, Parkrasen, Kaskadenhang, Herkulesplateau, Waldhänge, Ergebnismulde.
export function buildTerrainGeometry() {
  const { minX, maxX, minZ, maxZ } = EXTENT
  const stepX = 6
  const nx = Math.round((maxX - minX) / stepX)
  const nz = Math.round((maxZ - minZ) / stepX)
  const geo = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, nx, nz)
  geo.rotateX(-Math.PI / 2)
  geo.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = heightAt(x, z)
    pos.setY(i, h)
    const ax = Math.abs(x)
    const forestMix = smoothstep(CASCADE.stairOuter + 22, 44, ax) * (z < 40 ? 1 : 0.6)
    const n = fbm(x * 0.03, z * 0.03, 3, 5)
    c.copy(z > -60 ? C.park : C.lawn).lerp(C.lawnDark, n)
    c.lerp(C.forest, forestMix).lerp(C.forestDark, forestMix * fbm(x * 0.08, z * 0.08, 2, 8))
    const dx = heightAt(x + STEP, z) - heightAt(x - STEP, z)
    const dz = heightAt(x, z + STEP) - heightAt(x, z - STEP)
    const slope = Math.hypot(dx, dz) / (2 * STEP)
    c.lerp(C.rock, smoothstep(0.55, 0.95, slope) * 0.8)
    c.lerp(C.high, smoothstep(70, 110, h) * 0.4)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    uv.setXY(i, x / 9, z / 9)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

export default function BergparkTerrain({ receiveShadow = true }) {
  const geo = useMemo(buildTerrainGeometry, [])
  const map = useMemo(grassTexture, [])
  return (
    <mesh geometry={geo} receiveShadow={receiveShadow} name="terrain">
      <meshStandardMaterial vertexColors map={map} roughness={1} metalness={0} />
    </mesh>
  )
}
