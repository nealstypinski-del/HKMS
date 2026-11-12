import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getForestPlacement } from './forestPlacement.js'
import { buildVegetationGeometries } from './treeGeometry.js'
import VegetationLOD from './VegetationLOD.jsx'
import { outdoorStats } from '../runtime/stats.js'
import { setTreeColliders } from '../camera/collision.js'

// Wald: 4 Baumarten x 3 LOD, Büsche, Felsen und Gras als InstancedMesh. Anzahl und Reichweiten kommen aus der Qualitätsstufe.
export default function ForestSystem({ quality }) {
  const place = useMemo(getForestPlacement, [])
  const geos = useMemo(buildVegetationGeometries, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1, flatShading: true }), [])
  const byVariant = useMemo(() => {
    const v = [[], [], [], []]
    place.trees.forEach((t) => v[t.variant].push(t))
    return v
  }, [place])
  const counts = useRef({ trees: [0, 0, 0, 0], bush: 0 })

  // Kollisionsdaten der sichtbaren Bäume (Stämme) aktualisieren, wenn sich die Qualität ändert
  useEffect(() => {
    setTreeColliders(place.trees.filter((t) => t.rank <= quality.treeFraction || t.variant === 3))
    outdoorStats.totalTrees = place.trees.filter((t) => t.rank <= quality.treeFraction).length
  }, [place, quality])

  useFrame(() => {
    outdoorStats.visibleTrees = counts.current.trees.reduce((a, b) => a + b, 0)
    outdoorStats.visibleBushes = counts.current.bush
  })

  const treeLods = (i) => [
    { geometry: geos.trees[i][0], maxDist: quality.treeNear },
    { geometry: geos.trees[i][1], maxDist: quality.treeMid },
    { geometry: geos.trees[i][2], maxDist: quality.drawDistance },
  ]
  const radii = [9, 9, 8, 7]
  const bushItems = useMemo(() => place.bushes, [place])
  const rockItems = useMemo(() => place.rocks, [place])
  const tuftItems = useMemo(() => place.tufts, [place])
  const rockFrac = quality.rocks / Math.max(1, rockItems.length)
  const bushFrac = quality.bushes / Math.max(1, bushItems.length)
  const tuftFrac = quality.tufts / Math.max(1, tuftItems.length)

  return (
    <group name="forest-system">
      {byVariant.map((items, i) => (
        <VegetationLOD
          key={`${i}-${quality.treeNear}-${quality.drawDistance}`}
          items={items}
          lods={treeLods(i)}
          material={mat}
          fraction={i === 3 ? 1 : quality.treeFraction}
          radius={radii[i]}
          castShadowLod0={quality.shadows}
          onCount={(n) => { counts.current.trees[i] = n }}
        />
      ))}
      {quality.bushes > 0 && (
        <VegetationLOD items={bushItems} lods={[{ geometry: geos.bush[0], maxDist: Math.min(150, quality.drawDistance * 0.4) }]} material={mat} fraction={bushFrac} radius={1.6} onCount={(n) => { counts.current.bush = n }} />
      )}
      <VegetationLOD items={rockItems} lods={[{ geometry: geos.rock[0], maxDist: Math.min(220, quality.drawDistance * 0.6) }]} material={mat} fraction={rockFrac} radius={1.8} />
      {quality.tufts > 0 && (
        <VegetationLOD items={tuftItems} lods={[{ geometry: geos.tuft[0], maxDist: 42 }]} material={mat} fraction={tuftFrac} radius={0.8} />
      )}
    </group>
  )
}
