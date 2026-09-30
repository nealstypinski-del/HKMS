import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { AgentAvatar } from '../agents/agent.types'
import { Accessory, Hair, Torso } from '../characters/Character'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS, SKIN_COLORS, pick } from '../characters/character.types'
import { Ball, Box, GEO, mat } from '../world/primitives'
import { player } from './playerRuntime'

const AVATAR: AgentAvatar = { skinVariant: 's3', hairStyle: 'short', hairVariant: 'h2', shirtStyle: 'hoodie', shirtVariant: 'c1', pantsVariant: 'p1', accessory: 'glasses' }
const HIP = 0.62

/** Spielerfigur im Stil der Agenten, mit Geh und Laufanimation. */
export function PlayerAvatar() {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const phase = useRef(0)
  const skin = pick(SKIN_COLORS, AVATAR.skinVariant, '#e8b48d')
  const hair = pick(HAIR_COLORS, AVATAR.hairVariant, '#2b2118')
  const pants = pick(PANTS_COLORS, AVATAR.pantsVariant, '#2c3550')
  const shirt = pick(SHIRT_COLORS, AVATAR.shirtVariant, '#ff8a3d')

  useFrame((state, rawDt) => {
    const g = root.current
    const b = body.current
    if (!g || !b) return
    const dt = Math.min(rawDt, 0.05)
    g.position.set(player.x, player.y, player.z)
    g.rotation.y = player.yaw
    const speed = Math.hypot(player.vx, player.vz)
    const k = player.carried ? 0 : Math.min(1, speed / 2.6)
    phase.current += dt * (player.running ? 11 : 8) * (k > 0.05 ? 1 : 0)
    const swing = Math.sin(phase.current) * (player.running ? 1 : 0.7) * k
    const t = state.clock.elapsedTime
    b.position.y = HIP + (k > 0.05 ? Math.abs(Math.sin(phase.current)) * 0.04 : Math.sin(t * 1.8) * 0.006)
    const set = (o: THREE.Object3D | null, v: number) => {
      if (o) o.rotation.x = v
    }
    set(legL.current, swing)
    set(legR.current, -swing)
    set(shinL.current, Math.max(0, -swing) * 0.6)
    set(shinR.current, Math.max(0, swing) * 0.6)
    set(armL.current, -swing * 0.9)
    set(armR.current, swing * 0.9)
  })

  return (
    <group ref={root}>
      <mesh geometry={GEO.torus} material={mat('#ffffff', '#ffffff', 1.1)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={0.4} />
      <group ref={body} position={[0, HIP, 0]}>
        <Torso avatar={AVATAR} />
        <group position={[0, 0.78, 0]}>
          <Ball size={0.2} color={skin} />
          <Box pos={[-0.07, 0.02, 0.185]} size={[0.035, 0.045, 0.02]} color="#161b2b" cast={false} />
          <Box pos={[0.07, 0.02, 0.185]} size={[0.035, 0.045, 0.02]} color="#161b2b" cast={false} />
          <Hair style={AVATAR.hairStyle} color={hair} accessory={AVATAR.accessory} />
          <Accessory kind={AVATAR.accessory} />
        </group>
        {([[armL, -0.27], [armR, 0.27]] as const).map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.47, 0]}>
            <Box pos={[0, -0.17, 0]} size={[0.12, 0.34, 0.12]} color={shirt} />
            <Box pos={[0, -0.42, 0]} size={[0.1, 0.18, 0.1]} color={shirt} />
            <Ball pos={[0, -0.53, 0]} size={0.065} color={skin} />
          </group>
        ))}
        {([[legL, shinL, -0.11], [legR, shinR, 0.11]] as const).map(([thigh, shin, x]) => (
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
