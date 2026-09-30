import { useMemo } from 'react'
import * as THREE from 'three'
import { WORLD } from '../config/bergpark.config.js'
import { stoneTexture } from '../common/textures.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'

// Plaza und Vorplatz: geflicktes Steinpflaster mit Lichtringen in den Farben der beiden Marken (Orange, Türkis).
// Der Übergang zwischen Gebäude und Park ist bewusst offen (keine Ladegrenze).
export default function OutdoorGround() {
  const { x0, x1, z0, z1 } = WORLD.plaza
  const tex = useMemo(() => {
    const t = stoneTexture().clone()
    t.repeat.set(1, 1)
    t.needsUpdate = true
    return t
  }, [])
  const plazaTex = useMemo(() => { const t = tex.clone(); t.repeat.set((x1 - x0) / 4, (z1 - z0) / 4); t.needsUpdate = true; return t }, [tex, x0, x1, z0, z1])
  const fore = useMemo(() => { const t = tex.clone(); t.repeat.set(9, 9); t.needsUpdate = true; return t }, [tex])
  const ringA = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: '#ff8a3d', emissive: '#ff8a3d', emissiveIntensity: 0.3 }); registerNightMaterial(m, { base: 1.5, min: 0.2 }); return m }, [])
  const ringB = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: '#2fd6c0', emissive: '#2fd6c0', emissiveIntensity: 0.3 }); registerNightMaterial(m, { base: 1.4, min: 0.2 }); return m }, [])
  const paving = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }
  return (
    <group name="outdoor-ground">
      {/* Vorplatz rund um das HQ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -2]} receiveShadow>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial map={fore} color="#e6dfcf" roughness={0.95} {...paving} />
      </mesh>
      {/* Plaza Richtung Park */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.035, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={plazaTex} color="#e6dfcf" roughness={0.95} {...paving} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -2]}>
        <ringGeometry args={[14.6, 15, 64]} />
        <primitive object={ringA} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -2]}>
        <ringGeometry args={[13.2, 13.5, 64]} />
        <primitive object={ringB} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -30]}>
        <ringGeometry args={[6.4, 6.8, 48]} />
        <primitive object={ringB} attach="material" />
      </mesh>
    </group>
  )
}
