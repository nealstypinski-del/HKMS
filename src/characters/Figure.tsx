import type { RefObject } from 'react'
import type * as THREE from 'three'
import type { AgentAvatar } from '../agents/agent.types'
import { Ball, Box, Cyl, GEO, RBox, mat } from '../world/primitives'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS, SKIN_COLORS, pick } from './character.types'

type G = RefObject<THREE.Group | null>

export interface RigRefs {
  body: G
  head: G
  legL: G
  legR: G
  shinL: G
  shinR: G
  armL: G
  armR: G
  cup?: G
}

function Hair({ style, color, accessory }: { style: string; color: string; accessory?: string }) {
  const c = mat(color)
  const beanie = accessory === 'beanie'
  const hat = accessory === 'cap'
  const covered = beanie || hat
  return (
    <group>
      {!covered && style !== 'bald' && <mesh geometry={GEO.sphere} material={c} position={[0, 0.06, -0.015]} scale={[0.222, 0.17, 0.225]} castShadow />}
      {!covered && style !== 'bald' && <RBox pos={[0, 0.12, 0.13]} size={[0.3, 0.06, 0.1]} color={color} />}
      {style === 'long' && !covered && <RBox pos={[0, -0.1, -0.15]} size={[0.4, 0.44, 0.1]} color={color} />}
      {style === 'long' && !covered && [-0.2, 0.2].map((x) => <RBox key={x} pos={[x, -0.06, -0.06]} size={[0.06, 0.34, 0.16]} color={color} />)}
      {style === 'bun' && !covered && <Ball pos={[0, 0.26, -0.08]} size={0.095} color={color} />}
      {style === 'curly' && !covered && [[-0.14, 0.15], [0.14, 0.15], [0, 0.22], [-0.18, 0.03], [0.18, 0.03], [0, 0.12]].map(([x, y], i) => <Ball key={i} pos={[x as number, y as number, -0.02]} size={0.09} color={color} />)}
      {style === 'fauxhawk' && !covered && <RBox pos={[0, 0.235, 0]} size={[0.07, 0.12, 0.32]} color={color} />}
      {beanie && <mesh geometry={GEO.sphere} material={mat('#ff8a3d')} position={[0, 0.09, -0.01]} scale={[0.235, 0.18, 0.235]} castShadow />}
      {hat && (
        <group>
          <mesh geometry={GEO.sphere} material={mat('#e15b7a')} position={[0, 0.1, -0.01]} scale={[0.225, 0.15, 0.225]} castShadow />
          <RBox pos={[0, 0.07, 0.21]} size={[0.3, 0.03, 0.17]} color="#e15b7a" />
        </group>
      )}
    </group>
  )
}

function Accessory({ kind }: { kind?: string }) {
  if (kind === 'glasses') {
    return (
      <group position={[0, 0.03, 0.196]}>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} geometry={GEO.torus} material={mat('#161b2b')} position={[x, 0, 0]} scale={0.055} />
        ))}
        <Box size={[0.05, 0.012, 0.012]} color="#161b2b" cast={false} />
      </group>
    )
  }
  if (kind === 'headset') {
    return (
      <group>
        <RBox pos={[0, 0.16, -0.02]} size={[0.46, 0.04, 0.05]} color="#20263a" />
        {[-0.225, 0.225].map((x) => <RBox key={x} pos={[x, 0.0, 0]} size={[0.06, 0.13, 0.11]} color="#20263a" />)}
        <Box pos={[0.17, -0.09, 0.15]} size={[0.03, 0.03, 0.14]} color="#20263a" />
      </group>
    )
  }
  return null
}

function Face({ skin }: { skin: string }) {
  return (
    <group>
      {[-0.072, 0.072].map((x) => (
        <group key={x} position={[x, 0.02, 0.178]}>
          <Ball size={0.036} color="#ffffff" cast={false} />
          <Ball pos={[0, 0, 0.026]} size={0.02} color="#1b2233" cast={false} />
          <Box pos={[0, 0.055, 0.005]} size={[0.06, 0.012, 0.016]} color="#3b2a20" cast={false} />
        </group>
      ))}
      <Ball pos={[0, -0.02, 0.2]} size={0.024} color={skin} cast={false} />
      <Box pos={[0, -0.075, 0.185]} size={[0.06, 0.012, 0.012]} color="#8a3b3b" cast={false} />
      {[-0.2, 0.2].map((x) => <Ball key={x} pos={[x, 0, 0]} size={0.04} color={skin} />)}
    </group>
  )
}

function Torso({ avatar, shirt }: { avatar: AgentAvatar; shirt: string }) {
  const style = avatar.shirtStyle
  const body = style === 'vest' ? '#e9ecf4' : shirt
  return (
    <group>
      <RBox pos={[0, 0.25, 0]} size={[0.42, 0.5, 0.25]} color={body} />
      <RBox pos={[0, 0.45, 0]} size={[0.46, 0.14, 0.27]} color={body} />
      {style === 'hoodie' && (
        <>
          <RBox pos={[0, 0.5, -0.1]} size={[0.32, 0.14, 0.12]} color={shirt} />
          <RBox pos={[0, 0.1, 0.13]} size={[0.3, 0.1, 0.03]} color={shirt} />
          <Box pos={[-0.04, 0.4, 0.13]} size={[0.012, 0.16, 0.012]} color="#f6f6fb" cast={false} />
          <Box pos={[0.04, 0.4, 0.13]} size={[0.012, 0.16, 0.012]} color="#f6f6fb" cast={false} />
        </>
      )}
      {style === 'collar' && (
        <>
          <RBox pos={[-0.05, 0.5, 0.11]} size={[0.09, 0.05, 0.06]} color="#f6f6fb" />
          <RBox pos={[0.05, 0.5, 0.11]} size={[0.09, 0.05, 0.06]} color="#f6f6fb" />
          <Box pos={[0, 0.33, 0.13]} size={[0.05, 0.28, 0.02]} color="#20263a" />
        </>
      )}
      {style === 'vest' && (
        <>
          <RBox pos={[-0.125, 0.25, 0.005]} size={[0.16, 0.5, 0.27]} color={shirt} />
          <RBox pos={[0.125, 0.25, 0.005]} size={[0.16, 0.5, 0.27]} color={shirt} />
        </>
      )}
      {avatar.accessory === 'badge' && <RBox pos={[0.12, 0.34, 0.135]} size={[0.08, 0.1, 0.02]} color="#f2c94c" emissive="#f2c94c" ei={0.4} cast={false} />}
    </group>
  )
}

/** Gemeinsamer Körperbau für Agenten und Spieler. Alle Gelenke hängen an Refs, die der Aufrufer animiert. */
export function Figure({ avatar, rig, hip = 0.62 }: { avatar: AgentAvatar; rig: RigRefs; hip?: number }) {
  const skin = pick(SKIN_COLORS, avatar.skinVariant, '#e8b48d')
  const hair = pick(HAIR_COLORS, avatar.hairVariant, '#2b2118')
  const pants = pick(PANTS_COLORS, avatar.pantsVariant, '#2c3550')
  const shirt = pick(SHIRT_COLORS, avatar.shirtVariant, '#5b6ee1')
  const longSleeve = avatar.shirtStyle !== 'tee'
  const sleeve = avatar.shirtStyle === 'vest' ? '#e9ecf4' : shirt
  return (
    <group ref={rig.body} position={[0, hip, 0]}>
      <Torso avatar={avatar} shirt={shirt} />
      <RBox pos={[0, 0.03, 0]} size={[0.4, 0.16, 0.24]} color={pants} />
      <group ref={rig.head} position={[0, 0.78, 0]}>
        <Cyl pos={[0, -0.16, 0]} size={[0.06, 0.1, 0.06]} color={skin} />
        <Ball size={0.2} color={skin} />
        <Face skin={skin} />
        <Hair style={avatar.hairStyle} color={hair} accessory={avatar.accessory} />
        <Accessory kind={avatar.accessory} />
      </group>
      {([[rig.armL, -0.28], [rig.armR, 0.28]] as const).map(([ref, x]) => (
        <group key={x} ref={ref} position={[x, 0.47, 0]}>
          <Ball size={0.075} color={sleeve} />
          <RBox pos={[0, -0.17, 0]} size={[0.12, 0.34, 0.12]} color={sleeve} />
          <RBox pos={[0, -0.42, 0]} size={[0.1, 0.2, 0.1]} color={longSleeve ? sleeve : skin} />
          <Ball pos={[0, -0.54, 0.01]} size={0.065} color={skin} />
          {x > 0 && rig.cup && (
            <group ref={rig.cup} position={[0, -0.57, 0.07]} visible={false}>
              <Cyl size={[0.055, 0.1, 0.055]} color="#f6f1e7" />
              <Box pos={[0.07, 0, 0]} size={[0.04, 0.05, 0.02]} color="#f6f1e7" />
            </group>
          )}
        </group>
      ))}
      {([[rig.legL, rig.shinL, -0.11], [rig.legR, rig.shinR, 0.11]] as const).map(([thigh, shin, x]) => (
        <group key={x} ref={thigh} position={[x, 0, 0]}>
          <RBox pos={[0, -0.13, 0]} size={[0.165, 0.28, 0.165]} color={pants} />
          <group ref={shin} position={[0, -0.26, 0]}>
            <RBox pos={[0, -0.15, 0]} size={[0.15, 0.3, 0.15]} color={pants} />
            <RBox pos={[0, -0.335, 0.035]} size={[0.165, 0.08, 0.25]} color="#20263a" />
          </group>
        </group>
      ))}
    </group>
  )
}

/** Sims Plumbob: schwebender Doppelkegel, Farbe zeigt den Zustand. */
export function Plumbob({ color }: { color: string }) {
  return <mesh geometry={GEO.octa} material={mat(color, color, 1.1)} scale={[0.085, 0.15, 0.085]} castShadow={false} />
}
