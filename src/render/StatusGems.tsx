import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry } from 'three'
import { floorBaseY } from '../world/constants'
import { getFloor } from '../world/generate'
import { sim } from '../world/sim'
import { effectiveGraphics, useWorld } from '../world/store'

const CAP = 256
const COLORS: Record<string, string> = { working: '#38d6b4', meeting: '#7a8cff', idle: '#9aa3b2', break: '#f0b23d', waiting: '#f08a3d', offline: '#555b66' }
const _o = new Object3D(), _c = new Color()
const geo = new OctahedronGeometry(0.5, 0)
const mat = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })

/**
 * Statusdiamanten über den Köpfen (ein Draw Call für alle Figuren der Etage).
 * Eigenes Design: schwebender, sich drehender Rhombus, die Farbe zeigt den Status.
 */
export function StatusGems() {
  const mesh = useMemo(() => { const m = new InstancedMesh(geo, mat, CAP); m.count = 0; m.frustumCulled = false; return m }, [])
  useFrame(({ clock }) => {
    const st = useWorld.getState()
    const g = effectiveGraphics(st.graphics)
    if (!g.activityFx || st.cameraMode === 'building') { mesh.count = 0; return }
    const t = clock.elapsedTime
    const base = floorBaseY(getFloor(st.floorId).config.level)
    let n = 0
    for (const r of sim.rt.values()) {
      if (r.hidden || r.floorId !== st.floorId || n >= CAP) continue
      const a = st.agents[r.id]
      if (!a) continue
      _o.position.set(r.x, base + 2.05 - r.sit * 0.22 + Math.sin(t * 2 + n) * 0.05, r.z)
      _o.rotation.set(0, t * 1.6 + n, 0)
      _o.scale.set(0.15, 0.26, 0.15)
      _o.updateMatrix()
      mesh.setMatrixAt(n, _o.matrix)
      mesh.setColorAt(n, _c.set(COLORS[a.status] ?? '#ffffff'))
      n++
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <primitive object={mesh} />
}
