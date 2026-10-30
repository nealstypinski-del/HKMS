import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { sharedMaterials } from '../common/materials.js'
import { cascadeRuntime } from './cascadeVisualizationState.js'
import { envState } from '../environment/outdoorEnvironment.js'

const COL_OK = new THREE.Color('#2fd6c0')
const COL_BLOCKED = new THREE.Color('#ffc94d')
const COL_IDLE = new THREE.Color('#4d6d78')
const tmp = new THREE.Color()

const pylonGeo = new THREE.BoxGeometry(0.9, 3.6, 0.9)
const capGeo = new THREE.BoxGeometry(0.55, 0.28, 0.55)
const barGeo = new THREE.BoxGeometry(10, 0.12, 0.12)
const HALF = 5.0

// Stufentor: zwei Steinpfeiler mit Lichtbalken. Trägt die ID der Stufe (cascade-stage-*) und zeigt deren Zustand.
export default function CascadeStage({ index, stage, y, z }) {
  const M = sharedMaterials()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: COL_OK, toneMapped: false }), [])
  const grp = useRef()
  useFrame(() => {
    const b = cascadeRuntime.stageBlocked[index]
    const idle = cascadeRuntime.stageIdle[index]
    tmp.copy(COL_OK).lerp(COL_BLOCKED, b).lerp(COL_IDLE, idle * (1 - b))
    // Nachts etwas heller, tags dezent
    const k = 0.75 + 0.25 * envState.night + 0.25 * cascadeRuntime.stageAct[index]
    mat.color.copy(tmp).multiplyScalar(k)
  })
  return (
    <group ref={grp} position={[0, y, z]} name={stage.entityId} userData={{ entityId: stage.entityId, stageId: stage.stageId }}>
      {[-HALF, HALF].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={pylonGeo} material={M.stone} position={[0, 1.6, 0]} castShadow receiveShadow />
          <mesh geometry={capGeo} material={mat} position={[0, 3.55, 0]} />
        </group>
      ))}
      <mesh geometry={barGeo} material={mat} position={[0, 3.3, 0]} />
    </group>
  )
}
