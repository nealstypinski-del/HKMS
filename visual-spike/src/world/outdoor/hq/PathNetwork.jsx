import { useMemo } from 'react'
import * as THREE from 'three'
import { uniquePathSegments, SURFACE_WIDTH } from '../routes/OutdoorRouteSystem.js'
import { heightAt } from '../terrain/heightField.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'
import { useEffect } from 'react'

const COLORS = { path: new THREE.Color('#d2c39d'), forest: new THREE.Color('#a89373'), plaza: new THREE.Color('#d8d0be'), lawn: new THREE.Color('#9db66f') }

// Wegebänder aus dem semantischen Routennetz (Treppen ausgenommen). Ein einziges Netz, ein Drawcall.
export function buildPathGeometry() {
  const pos = []
  const col = []
  const seen = new Set()
  for (const sg of uniquePathSegments) {
    if (sg.surface === 'plaza' || sg.surface === 'lawn') continue
    const key = [sg.a.id, sg.b.id].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    const w = SURFACE_WIDTH[sg.surface] / 2
    const dx = (sg.b.x - sg.a.x) / sg.len
    const dz = (sg.b.z - sg.a.z) / sg.len
    const nx = -dz
    const nz = dx
    const n = Math.max(1, Math.ceil(sg.len / 2.5))
    const c = COLORS[sg.surface] || COLORS.path
    for (let i = 0; i < n; i++) {
      const t0 = i / n
      const t1 = (i + 1) / n
      const p = (t, s) => {
        const x = sg.a.x + (sg.b.x - sg.a.x) * t + nx * w * s
        const z = sg.a.z + (sg.b.z - sg.a.z) * t + nz * w * s
        return [x, heightAt(x, z) + 0.07, z]
      }
      const a = p(t0, -1), b = p(t0, 1), cc = p(t1, 1), d = p(t1, -1)
      for (const v of [a, b, cc, a, cc, d]) { pos.push(...v); col.push(c.r, c.g, c.b) }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

export default function PathNetwork() {
  const geo = useMemo(buildPathGeometry, [])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: '#4f7a86', emissiveIntensity: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
    registerNightMaterial(m, { base: 0.55, min: 0.02 })
    return m
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={mat} receiveShadow name="path-network" />
}
