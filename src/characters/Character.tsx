import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAgentStore } from '../agents/agent.store'
import { STATUS_META } from '../agents/agent.types'
import { FLOOR_HEIGHT } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { GEO, mat } from '../world/primitives'
import { LIFT_DISTANCE, characterRegistry, floorLift } from '../world/runtime'
import { Figure, Plumbob, type RigRefs } from './Figure'
import { advancePhase, gaitPose } from './gait'
import { spawnRuntime, stepCharacter, type CharacterRuntime } from './CharacterController'

const STAND_HIP = 0.62

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
  const clock = useRef({ walk: 0, lastX: 0, lastZ: 0, amount: 0, init: false, seed: (agentId.charCodeAt(agentId.length - 1) % 7) * 0.9 })

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
    const c = clock.current
    if (!c.init) {
      c.init = true
      c.lastX = rt.x
      c.lastZ = rt.z
    }
    const dist = rt.riding ? 0 : Math.hypot(rt.x - c.lastX, rt.z - c.lastZ)
    c.lastX = rt.x
    c.lastZ = rt.z
    c.walk = advancePhase(c.walk, dist)
    // weiches Ein und Ausblenden des Gehens, Geschwindigkeit in m/s bestimmt die Stärke
    c.amount += ((rt.moving ? 1 : 0) - c.amount) * Math.min(1, 10 * dt)
    const walkK = c.amount
    const gait = gaitPose(c.walk, c.amount)
    const phase = rt.phase

    // Körperhöhe: stehend auf Hüfthöhe, sitzend auf Sitzhöhe
    const bob = gait.bob * (1 - sit) + Math.sin(t * 1.8) * 0.006 * (1 - walkK)
    b.position.y = STAND_HIP + (rt.seatY + 0.05 - STAND_HIP) * sit + bob
    b.rotation.y = gait.pelvisYaw
    b.rotation.x = gait.lean * (1 - sit)

    const setX = (o: THREE.Object3D | null, v: number) => {
      if (o) o.rotation.x = v
    }
    // Beine
    setX(legL.current, (-Math.PI / 2) * sit + gait.hipL * (1 - sit))
    setX(legR.current, (-Math.PI / 2) * sit + gait.hipR * (1 - sit))
    setX(shinL.current, (Math.PI / 2) * sit + gait.kneeL * (1 - sit))
    setX(shinR.current, (Math.PI / 2) * sit + gait.kneeR * (1 - sit))

    // Arme je nach Phase
    let aL = 0
    let aR = 0
    let zR = 0
    if (walkK > 0.3) {
      aL = gait.armL
      aR = gait.armR
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
      icon.current.rotation.y = t * 1.6
      icon.current.scale.setScalar(phase === 'WAITING' ? 1 + Math.sin(t * 6) * 0.12 : 1)
    }
    if (selRing.current) selRing.current.scale.setScalar(0.62 + Math.sin(t * 4) * 0.03)
  })

  if (!avatar || !status) return null
  const statusColor = STATUS_META[status].color
  const rig: RigRefs = { body, head, legL, legR, shinL, shinR, armL, armR, cup }

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
      <mesh ref={ring} geometry={GEO.torus} material={mat(statusColor, statusColor, 0.9)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={0.42} />
      {selected && <mesh ref={selRing} geometry={GEO.torus} material={mat('#ffffff', '#ffffff', 1.4)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={0.62} />}
      <group ref={icon} position={[0, 2.1, 0]}>
        <Plumbob color={statusColor} />
      </group>
      <Figure avatar={avatar} rig={rig} hip={STAND_HIP} />
    </group>
  )
}

export const Character = memo(CharacterInner, (a, b) => a.agentId === b.agentId)
