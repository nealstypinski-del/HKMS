import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAgentStore } from '../agents/agent.store'
import { STATUS_META, type AgentAvatar, type AgentStatus } from '../agents/agent.types'
import { FLOOR_HEIGHT } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { Ball, Box, Cyl, GEO, mat } from '../world/primitives'
import { LIFT_DISTANCE, characterRegistry, floorLift } from '../world/runtime'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS, SKIN_COLORS, pick } from './character.types'
import { spawnRuntime, stepCharacter, type CharacterRuntime } from './CharacterController'

const STAND_HIP = 0.62

/** Statussymbol über dem Kopf, pro Status eine eigene Form (nicht nur Farbe). */
function StatusIcon({ status }: { status: AgentStatus }) {
  const color = STATUS_META[status].color
  switch (status) {
    case 'working':
      return <Box size={0.17} color={color} emissive={color} ei={1.4} cast={false} />
    case 'waiting':
      return <mesh geometry={GEO.octa} material={mat(color, color, 1.4)} scale={0.15} />
    case 'break':
      return (
        <group>
          <Cyl pos={[0, 0, 0]} size={[0.09, 0.13, 0.09]} color={color} emissive={color} ei={1.2} cast={false} />
          <Box pos={[0.11, 0, 0]} size={[0.05, 0.07, 0.03]} color={color} emissive={color} ei={1.2} cast={false} />
        </group>
      )
    case 'meeting':
      return (
        <group>
          <Ball pos={[-0.07, 0, 0]} size={0.075} color={color} emissive={color} ei={1.2} cast={false} />
          <Ball pos={[0.07, 0.02, 0]} size={0.075} color={color} emissive={color} ei={1.2} cast={false} />
        </group>
      )
    default:
      return <Ball size={0.075} color={color} emissive={color} ei={0.6} cast={false} />
  }
}

export function Hair({ style, color, accessory }: { style: string; color: string; accessory?: string }) {
  const c = mat(color)
  const cap = <mesh geometry={GEO.sphere} material={c} position={[0, 0.07, -0.01]} scale={[0.215, 0.15, 0.22]} castShadow />
  const beanie = accessory === 'beanie'
  const hat = accessory === 'cap'
  return (
    <group>
      {!beanie && !hat && style !== 'bald' && cap}
      {style === 'long' && !beanie && <Box pos={[0, -0.08, -0.14]} size={[0.4, 0.42, 0.1]} color={color} />}
      {style === 'bun' && !beanie && <Ball pos={[0, 0.27, -0.06]} size={0.09} color={color} />}
      {style === 'curly' && !beanie && [[-0.13, 0.15], [0.13, 0.15], [0, 0.2], [-0.16, 0.02], [0.16, 0.02]].map(([x, y], i) => <Ball key={i} pos={[x as number, y as number, -0.02]} size={0.08} color={color} />)}
      {style === 'fauxhawk' && !beanie && !hat && <Box pos={[0, 0.21, 0]} size={[0.07, 0.11, 0.3]} color={color} />}
      {beanie && <mesh geometry={GEO.sphere} material={mat('#ff8a3d')} position={[0, 0.1, -0.01]} scale={[0.23, 0.17, 0.23]} castShadow />}
      {hat && (
        <group>
          <mesh geometry={GEO.sphere} material={mat('#e15b7a')} position={[0, 0.1, -0.01]} scale={[0.22, 0.14, 0.22]} castShadow />
          <Box pos={[0, 0.06, 0.2]} size={[0.3, 0.03, 0.16]} color="#e15b7a" />
        </group>
      )}
    </group>
  )
}

export function Accessory({ kind }: { kind?: string }) {
  if (kind === 'glasses') {
    return (
      <group position={[0, 0.01, 0.19]}>
        <Box pos={[-0.075, 0, 0]} size={[0.11, 0.08, 0.02]} color="#161b2b" cast={false} />
        <Box pos={[0.075, 0, 0]} size={[0.11, 0.08, 0.02]} color="#161b2b" cast={false} />
        <Box size={[0.05, 0.02, 0.02]} color="#161b2b" cast={false} />
      </group>
    )
  }
  if (kind === 'headset') {
    return (
      <group>
        <Box pos={[0, 0.16, -0.02]} size={[0.46, 0.04, 0.05]} color="#20263a" />
        <Box pos={[-0.22, 0.0, 0]} size={[0.06, 0.13, 0.11]} color="#20263a" />
        <Box pos={[0.22, 0.0, 0]} size={[0.06, 0.13, 0.11]} color="#20263a" />
        <Box pos={[0.17, -0.09, 0.15]} size={[0.03, 0.03, 0.14]} color="#20263a" />
      </group>
    )
  }
  return null
}

interface RigProps {
  avatar: AgentAvatar
}

export function Torso({ avatar }: RigProps) {
  const shirt = pick(SHIRT_COLORS, avatar.shirtVariant, '#5b6ee1')
  const style = avatar.shirtStyle
  const body = style === 'vest' ? '#e9ecf4' : shirt
  return (
    <group>
      <Box pos={[0, 0.25, 0]} size={[0.42, 0.5, 0.25]} color={body} />
      {style === 'hoodie' && (
        <>
          <Box pos={[0, 0.5, -0.11]} size={[0.32, 0.12, 0.1]} color={shirt} />
          <Box pos={[0, 0.12, 0.13]} size={[0.28, 0.1, 0.02]} color={shirt} emissive="#000000" ei={0.1} />
        </>
      )}
      {style === 'collar' && (
        <>
          <Box pos={[0, 0.48, 0.12]} size={[0.16, 0.06, 0.04]} color="#f6f6fb" />
          <Box pos={[0, 0.34, 0.13]} size={[0.05, 0.28, 0.02]} color="#20263a" />
        </>
      )}
      {style === 'vest' && (
        <>
          <Box pos={[-0.125, 0.25, 0.005]} size={[0.16, 0.5, 0.27]} color={shirt} />
          <Box pos={[0.125, 0.25, 0.005]} size={[0.16, 0.5, 0.27]} color={shirt} />
        </>
      )}
      {avatar.accessory === 'badge' && <Box pos={[0.12, 0.34, 0.13]} size={[0.08, 0.1, 0.02]} color="#f2c94c" emissive="#f2c94c" ei={0.4} cast={false} />}
    </group>
  )
}

function CharacterInner({ agentId }: { agentId: string }) {
  const avatar = useAgentStore((s) => s.agents[agentId]?.avatar)
  const status = useAgentStore((s) => s.agents[agentId]?.status)
  const selected = useOfficeStore((s) => s.selection?.kind === 'agent' && s.selection.id === agentId)

  const rtRef = useRef<CharacterRuntime | null>(null)
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const cup = useRef<THREE.Group>(null)
  const icon = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const selRing = useRef<THREE.Mesh>(null)
  const clock = useRef({ walk: 0, seed: (agentId.charCodeAt(agentId.length - 1) % 7) * 0.9 })

  if (rtRef.current === null) {
    const s = useAgentStore.getState()
    const agent = s.agents[agentId]
    if (agent) rtRef.current = spawnRuntime(agent, agent.deskId ? s.desks[agent.deskId] : undefined)
  }

  useFrame((state, rawDt) => {
    const rt = rtRef.current
    const g = root.current
    const b = body.current
    if (!rt || !g || !b) return
    const dt = Math.min(rawDt, 0.05)
    const s = useAgentStore.getState()
    const agent = s.agents[agentId]
    if (!agent) return
    stepCharacter(rt, agent, agent.deskId ? s.desks[agent.deskId] : undefined, dt)

    const level = Math.round(rt.level)
    const lift = floorLift[level] ?? 0
    const focus = useOfficeStore.getState().focus
    const hiddenByFloor = lift > 0.6 || (focus !== 'all' && level > focus && !rt.riding)
    const visible = rt.visible && !hiddenByFloor
    g.visible = visible
    const y = rt.level * FLOOR_HEIGHT + Math.min(lift, LIFT_DISTANCE)
    g.position.set(rt.x, y, rt.z)
    g.rotation.y = rt.yaw
    characterRegistry.set(agentId, { x: rt.x, y, z: rt.z, floor: level, visible })
    if (!visible) return

    const t = state.clock.elapsedTime + clock.current.seed
    const sit = rt.sit
    const walkK = rt.moving ? 1 : 0
    clock.current.walk += dt * 7.5 * walkK
    const swing = Math.sin(clock.current.walk)
    const phase = rt.phase

    // Körperhöhe: stehend auf Hüfthöhe, sitzend auf Sitzhöhe
    const bob = walkK ? Math.abs(Math.sin(clock.current.walk)) * 0.035 : Math.sin(t * 1.8) * 0.006
    b.position.y = STAND_HIP + (rt.seatY + 0.05 - STAND_HIP) * sit + bob

    const setX = (o: THREE.Object3D | null, v: number) => {
      if (o) o.rotation.x = v
    }
    // Beine
    setX(legL.current, -Math.PI / 2 * sit + swing * 0.7 * walkK)
    setX(legR.current, -Math.PI / 2 * sit - swing * 0.7 * walkK)
    setX(shinL.current, (Math.PI / 2) * sit + Math.max(0, -swing) * 0.5 * walkK)
    setX(shinR.current, (Math.PI / 2) * sit + Math.max(0, swing) * 0.5 * walkK)

    // Arme je nach Phase
    let aL = 0
    let aR = 0
    let zR = 0
    if (walkK) {
      aL = -swing * 0.7
      aR = swing * 0.7
    } else if (phase === 'WORKING') {
      aL = -1.15 + Math.sin(t * 13) * 0.07
      aR = -1.15 + Math.sin(t * 11 + 1) * 0.07
    } else if (phase === 'WAITING') {
      aL = -1.1
      aR = -2.7
      zR = Math.sin(t * 5) * 0.35
    } else if (phase === 'ON_BREAK') {
      aR = -1.25 + Math.sin(t * 1.6) * 0.06
      aL = sit > 0.5 ? -0.5 : Math.sin(t * 1.3) * 0.05
    } else if (phase === 'IN_MEETING') {
      aR = -0.9 + Math.sin(t * 2.6) * 0.35
      aL = -0.5 + Math.sin(t * 2.1 + 2) * 0.15
    } else if (sit > 0.5) {
      aL = -0.55
      aR = -0.55
    } else {
      aL = Math.sin(t * 1.4) * 0.04
      aR = -Math.sin(t * 1.4) * 0.04
    }
    setX(armL.current, aL)
    setX(armR.current, aR)
    if (armR.current) armR.current.rotation.z = zR
    if (cup.current) cup.current.visible = phase === 'ON_BREAK'

    // Kopf: Tippen = leicht gesenkt, sonst umschauen
    if (head.current) {
      head.current.rotation.x = phase === 'WORKING' ? 0.28 : 0
      head.current.rotation.y = !walkK && phase !== 'WORKING' && phase !== 'WAITING' ? Math.sin(t * 0.6) * 0.35 : 0
    }

    // Statussymbol und Ringe
    if (icon.current) {
      icon.current.position.y = STAND_HIP + (rt.seatY + 0.05 - STAND_HIP) * sit + 1.52 + Math.sin(t * 2.4) * 0.04
      icon.current.rotation.y = phase === 'WORKING' ? t * 2 : 0
      icon.current.scale.setScalar(phase === 'WAITING' ? 1 + Math.sin(t * 6) * 0.12 : 1)
    }
    if (selRing.current) selRing.current.scale.setScalar(0.62 + Math.sin(t * 4) * 0.03)
  })

  if (!avatar || !status) return null
  const skin = pick(SKIN_COLORS, avatar.skinVariant, '#e8b48d')
  const hair = pick(HAIR_COLORS, avatar.hairVariant, '#2b2118')
  const pants = pick(PANTS_COLORS, avatar.pantsVariant, '#2c3550')
  const shirt = pick(SHIRT_COLORS, avatar.shirtVariant, '#5b6ee1')
  const longSleeve = avatar.shirtStyle !== 'tee'
  const sleeve = avatar.shirtStyle === 'vest' ? '#e9ecf4' : shirt
  const statusColor = STATUS_META[status].color

  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation()
        useOfficeStore.getState().select({ kind: 'agent', id: agentId })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        useOfficeStore.getState().setHover({ kind: 'agent', id: agentId })
      }}
      onPointerOut={() => useOfficeStore.getState().setHover(null)}
    >
      {/* Bodenring nach Status */}
      <mesh ref={ring} geometry={GEO.torus} material={mat(statusColor, statusColor, 0.9)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={0.42} />
      {selected && <mesh ref={selRing} geometry={GEO.torus} material={mat('#ffffff', '#ffffff', 1.4)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={0.62} />}
      <group ref={icon} position={[0, 2.1, 0]}>
        <StatusIcon status={status} />
      </group>
      <group ref={body} position={[0, STAND_HIP, 0]}>
        <Torso avatar={avatar} />
        {/* Kopf */}
        <group ref={head} position={[0, 0.78, 0]}>
          <Ball size={0.2} color={skin} />
          <Box pos={[-0.07, 0.02, 0.185]} size={[0.035, 0.045, 0.02]} color="#161b2b" cast={false} />
          <Box pos={[0.07, 0.02, 0.185]} size={[0.035, 0.045, 0.02]} color="#161b2b" cast={false} />
          <Hair style={avatar.hairStyle} color={hair} accessory={avatar.accessory} />
          <Accessory kind={avatar.accessory} />
        </group>
        {/* Arme */}
        {(
          [
            [armL, -0.27],
            [armR, 0.27],
          ] as const
        ).map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.47, 0]}>
            <Box pos={[0, -0.17, 0]} size={[0.12, 0.34, 0.12]} color={sleeve} />
            <Box pos={[0, -0.42, 0]} size={[0.1, 0.18, 0.1]} color={longSleeve ? sleeve : skin} />
            <Ball pos={[0, -0.53, 0]} size={0.065} color={skin} />
            {x > 0 && (
              <group ref={cup} position={[0, -0.56, 0.06]} visible={false}>
                <Cyl size={[0.055, 0.1, 0.055]} color="#f6f1e7" />
                <Box pos={[0.07, 0, 0]} size={[0.04, 0.05, 0.02]} color="#f6f1e7" />
              </group>
            )}
          </group>
        ))}
        {/* Beine */}
        {(
          [
            [legL, shinL, -0.11],
            [legR, shinR, 0.11],
          ] as const
        ).map(([thigh, shin, x]) => (
          <group key={x} ref={thigh} position={[x, 0, 0]}>
            <Box pos={[0, -0.13, 0]} size={[0.16, 0.26, 0.16]} color={pants} />
            <group ref={shin} position={[0, -0.26, 0]}>
              <Box pos={[0, -0.15, 0]} size={[0.15, 0.3, 0.15]} color={pants} />
              <Box pos={[0, -0.33, 0.03]} size={[0.16, 0.07, 0.23]} color="#20263a" />
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

export const Character = memo(CharacterInner, (a, b) => a.agentId === b.agentId)
