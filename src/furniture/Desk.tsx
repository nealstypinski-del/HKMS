import { memo } from 'react'
import * as THREE from 'three'
import type { Desk as DeskData } from '../agents/agent.types'
import { useAgentStore } from '../agents/agent.store'
import { SEAT_DX, SEAT_DZ } from '../config/floorLayouts'
import { useOfficeStore } from '../store/office.store'
import { Box, Plane } from '../world/primitives'
import { Chair } from './Chair'
import { Monitor } from './Computer'

interface DeskProps {
  deskId: string
  accent: string
  /** Entwickler Arbeitsplatz: zwei Terminal Monitore, dunkles Design */
  dev?: boolean
}

const LED: Record<DeskData['computer']['state'], string> = { offline: '#3a4256', idle: '#c9d3ea', working: '#3ddc84', waiting: '#ffc94d' }

function DeskInner({ deskId, accent, dev = false }: DeskProps) {
  const desk = useAgentStore((s) => s.desks[deskId])
  const selected = useOfficeStore((s) => s.selection?.kind === 'desk' && s.selection.id === deskId)
  if (!desk) return null
  const state = desk.computer.state
  const kind = dev ? 'terminal' : 'office'
  const top = dev ? '#39415a' : '#c49a68'
  return (
    <group
      position={[desk.position[0], 0, desk.position[2]]}
      onClick={(e) => {
        e.stopPropagation()
        useOfficeStore.getState().select({ kind: 'desk', id: deskId })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        useOfficeStore.getState().setHover({ kind: 'desk', id: deskId })
      }}
      onPointerOut={() => useOfficeStore.getState().setHover(null)}
    >
      {selected && <Plane pos={[0, 0.02, 0.35]} rot={[-Math.PI / 2, 0, 0]} size={[2.5, 2.4, 1]} material={selectionMaterial} cast={false} />}
      <Box pos={[0, 0.74, 0]} size={[1.7, 0.08, 0.85]} color={top} />
      <Box pos={[0, 0.79, 0.4]} size={[1.7, 0.02, 0.05]} color={accent} emissive={accent} ei={0.5} cast={false} />
      <Box pos={[-0.8, 0.36, 0]} size={[0.06, 0.72, 0.8]} color="#2b3348" />
      <Box pos={[0.8, 0.36, 0]} size={[0.06, 0.72, 0.8]} color="#2b3348" />
      <Box pos={[0, 0.5, -0.38]} size={[1.6, 0.4, 0.04]} color="#2b3348" />
      {dev ? (
        <>
          <Monitor deskId={deskId} state={state} kind={kind} pos={[-0.1, 0.78, -0.1]} rotY={0.28} scale={0.9} />
          <Monitor deskId={deskId} state={state} kind={kind} pos={[0.6, 0.78, -0.1]} rotY={-0.12} scale={0.9} />
        </>
      ) : (
        <Monitor deskId={deskId} state={state} kind={kind} pos={[0.32, 0.78, -0.08]} rotY={-0.28} />
      )}
      <Box pos={[-0.05, 0.795, 0.22]} size={[0.5, 0.025, 0.16]} color="#1c2233" />
      <Box pos={[0.5, 0.795, 0.24]} size={[0.09, 0.03, 0.14]} color="#1c2233" />
      <Box pos={[-0.72, 0.8, 0.35]} size={[0.07, 0.07, 0.07]} color={LED[state]} emissive={LED[state]} ei={1.6} cast={false} />
      <Chair pos={[SEAT_DX, 0, SEAT_DZ]} color={dev ? '#4b3f8f' : '#3a4256'} />
    </group>
  )
}

const selectionMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false })

export const Desk = memo(DeskInner)
