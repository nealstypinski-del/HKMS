import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useMemo, useRef, useState } from 'react'
import { Object3D, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { floorBaseY } from '../world/constants'
import { getFloor } from '../world/generate'
import { player } from '../world/player'
import { sim } from '../world/sim'
import { effectiveGraphics, useAgent, useWorld } from '../world/store'
import type { Avatar } from '../world/types'
import { avatarKey, figureMaterial, getFigureGeos } from './figureGeo'
import { basic } from './materials'

export interface Pose {
  sit: number
  clock: number
  walking: boolean
  working: boolean
  waiting: boolean
}
export type Lod = 'full' | 'mid' | 'far'


interface FigureProps { avatar: Avatar; lod: Lod; getPose: () => Pose }

/**
 * Eine Figur. Alle Varianten kommen aus Daten (Avatar), es gibt keine getrennte Technik für Agenten und Spieler.
 * Die Geometrie wird pro Aussehen zu wenigen Meshes verschmolzen (siehe figureGeo.ts):
 * nah 7 Meshes (Oberkörper, 2 Arme, 4 Beinteile), mittel 1 Mesh, fern 1 Mesh.
 * Die Animation läuft imperativ über Refs, damit React nicht pro Frame rendert.
 */
export const Figure = memo(function Figure({ avatar, lod, getPose }: FigureProps) {
  const key = avatarKey(avatar)
  const geos = useMemo(() => getFigureGeos(avatar), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const hips = useRef<Object3D>(null)
  const thL = useRef<Object3D>(null), thR = useRef<Object3D>(null)
  const shL = useRef<Object3D>(null), shR = useRef<Object3D>(null)
  const arL = useRef<Object3D>(null), arR = useRef<Object3D>(null)
  const standM = useRef<Object3D>(null), sitM = useRef<Object3D>(null)
  const offset = useMemo(() => Math.random() * 10, [])

  useFrame(({ clock }) => {
    const p = getPose()
    const t = clock.elapsedTime + offset
    const s = p.sit
    const w = p.walking ? 1 : 0
    const ph = p.clock
    const bob = w * Math.abs(Math.sin(ph)) * 0.03
    if (hips.current) {
      hips.current.position.y = 0.67 + (0.515 - 0.67) * s + bob + (1 - s) * (1 - w) * Math.sin(t * 1.6) * 0.004
      // Wartende drehen den Oberkörper langsam hin und her
      hips.current.rotation.y = p.waiting && s < 0.5 ? Math.sin(t * 0.9) * 0.5 : 0
    }
    if (lod === 'mid') {
      if (standM.current) standM.current.visible = s < 0.5
      if (sitM.current) sitM.current.visible = s >= 0.5
      return
    }
    if (lod !== 'full') return
    const swing = Math.sin(ph) * 0.75 * w
    const set = (o: Object3D | null, x: number) => { if (o) o.rotation.x = x }
    set(thL.current, (1 - s) * swing + s * -Math.PI / 2)
    set(thR.current, (1 - s) * -swing + s * -Math.PI / 2)
    set(shL.current, (1 - s) * Math.max(0, -Math.sin(ph)) * 0.9 * w + s * (Math.PI / 2))
    set(shR.current, (1 - s) * Math.max(0, Math.sin(ph)) * 0.9 * w + s * (Math.PI / 2))
    if (s > 0.5 && p.working) {
      const type = Math.sin(t * 13) * 0.07
      set(arL.current, -0.75 + type); set(arR.current, -0.75 - type)
    } else if (s > 0.5) {
      set(arL.current, -0.35); set(arR.current, -0.35)
    } else {
      set(arL.current, -swing * 0.9 + Math.sin(t * 1.5) * 0.03); set(arR.current, swing * 0.9 - Math.sin(t * 1.5) * 0.03)
    }
  })

  if (lod === 'far') {
    return (
      <group>
        <group ref={hips} position-y={0.67}><mesh geometry={geos.far} material={figureMaterial} /></group>
      </group>
    )
  }
  if (lod === 'mid') {
    return (
      <group>
        <group ref={hips} position-y={0.67}>
          <mesh ref={standM} geometry={geos.midStand} material={figureMaterial} castShadow />
          <mesh ref={sitM} geometry={geos.midSit} material={figureMaterial} castShadow visible={false} />
        </group>
      </group>
    )
  }
  return (
    <group>
      <group ref={hips} position-y={0.67}>
        <mesh geometry={geos.upper} material={figureMaterial} castShadow />
        <group ref={arL} position={[-0.26, 0.44, 0]}><mesh geometry={geos.arm} material={figureMaterial} castShadow /></group>
        <group ref={arR} position={[0.26, 0.44, 0]}><mesh geometry={geos.arm} material={figureMaterial} castShadow /></group>
        <group ref={thL} position={[-0.1, 0, 0]}>
          <mesh geometry={geos.thigh} material={figureMaterial} castShadow />
          <group ref={shL} position={[0, -0.3, 0]}><mesh geometry={geos.shin} material={figureMaterial} castShadow /></group>
        </group>
        <group ref={thR} position={[0.1, 0, 0]}>
          <mesh geometry={geos.thigh} material={figureMaterial} castShadow />
          <group ref={shR} position={[0, -0.3, 0]}><mesh geometry={geos.shin} material={figureMaterial} castShadow /></group>
        </group>
      </group>
    </group>
  )
})

const STATUS_COLOR: Record<string, string> = {
  working: '#38d6b4', meeting: '#7a8cff', idle: '#8a93a3', break: '#f0b23d', waiting: '#f08a3d', offline: '#555b66',
}
const _v = new Vector3()

const LOD_FULL = 10, LOD_MID = 26, LOD_HIDE = 110

export const AgentCharacter = memo(function AgentCharacter({ id }: { id: string }) {
  const agent = useAgent(id)
  const root = useRef<Object3D>(null)
  const ring = useRef<Object3D>(null)
  const [lod, setLod] = useState<Lod>('mid')
  const lodRef = useRef<Lod>('mid')
  const cam = useThree((s) => s.camera)
  const select = useWorld((s) => s.select)
  const setHover = useWorld((s) => s.setHover)
  const fx = useWorld((s) => effectiveGraphics(s.graphics).activityFx)
  const isSel = useWorld((s) => s.selection?.type === 'agent' && s.selection.id === id)
  const isHover = useWorld((s) => s.hover?.type === 'agent' && s.hover.id === id)
  const pose = useRef<Pose>({ sit: 0, clock: 0, walking: false, working: false, waiting: false })

  useFrame(({ clock }) => {
    const r = sim.get(id)
    const o = root.current
    if (!o) return
    if (!r || r.hidden || !agent) { o.visible = false; return }
    o.visible = true
    o.position.set(r.x, floorBaseY(getFloor(r.floorId).config.level), r.z)
    o.rotation.y = r.yaw
    pose.current.sit = r.sit
    pose.current.clock = r.walkClock
    pose.current.walking = r.phase === 'walk'
    pose.current.working = r.state === 'working'
    pose.current.waiting = r.state === 'waiting' || (r.state === 'meeting' && r.sit < 0.5)
    const d = cam.position.distanceTo(_v.set(r.x, o.position.y + 1, r.z))
    if (d > LOD_HIDE) { o.visible = false; return }
    // Ego: Figuren direkt an der Kamera ausblenden, sonst steckt der Kopf im Bild
    if (d < 1.1 && useWorld.getState().cameraMode === 'firstPerson') { o.visible = false; return }
    // Hysterese, damit die Stufe an der Grenze nicht flackert
    const cur = lodRef.current
    let next: Lod
    if (d < LOD_FULL * (cur === 'full' ? 1.15 : 1)) next = 'full'
    else if (d < LOD_MID * (cur === 'mid' ? 1.1 : 1)) next = 'mid'
    else next = 'far'
    if (next !== cur) { lodRef.current = next; setLod(next) }
    if (ring.current) {
      ring.current.visible = (fx && (r.state === 'working' || r.state === 'waiting') && r.phase !== 'walk') || isSel || isHover
      const s = 1 + (isSel ? 0.25 : 0) + Math.sin(clock.elapsedTime * 3) * 0.05
      ring.current.scale.set(s, s, s)
    }
  })

  if (!agent) return null
  const col = isSel ? '#ffffff' : isHover ? '#ffd27a' : STATUS_COLOR[agent.status]
  return (
    <group
      ref={root}
      onClick={(e: ThreeEvent<MouseEvent>) => { if (e.delta > 4) return; e.stopPropagation(); select({ type: 'agent', id }) }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover({ type: 'agent', id }); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(null); document.body.style.cursor = '' }}
    >
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03} visible={false}>
        <ringGeometry args={[0.36, 0.44, 24]} />
        <primitive object={basic(col, 0.9)} attach="material" />
      </mesh>
      <Figure avatar={agent.avatar} lod={lod} getPose={() => pose.current} />
    </group>
  )
})

/** Spielerfigur. Im Ego Modus unsichtbar, sonst am Spielerort sichtbar. */
export function PlayerCharacter() {
  const root = useRef<Object3D>(null)
  const avatar = useWorld((s) => s.player)
  const pose = useRef<Pose>({ sit: 0, clock: 0, walking: false, working: false, waiting: false })
  const [lod, setLod] = useState<Lod>('full')
  const lodRef = useRef<Lod>('full')
  const cam = useThree((s) => s.camera)
  useFrame(() => {
    const o = root.current
    if (!o) return
    const st = useWorld.getState()
    o.visible = st.cameraMode !== 'firstPerson' && st.cameraMode !== 'tycoon' && st.cameraMode !== 'follow' ? st.floorId === player.floorId : st.cameraMode !== 'firstPerson' && st.floorId === player.floorId
    if (!o.visible) return
    o.position.set(player.x, floorBaseY(getFloor(player.floorId).config.level) + player.dy, player.z)
    o.rotation.y = player.yaw
    pose.current.walking = player.walking
    pose.current.clock = player.walkClock
    const d = cam.position.distanceTo(o.position)
    const next: Lod = d < LOD_FULL ? 'full' : d < LOD_MID ? 'mid' : 'far'
    if (next !== lodRef.current) { lodRef.current = next; setLod(next) }
  })
  return (
    <group ref={root}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03}><ringGeometry args={[0.38, 0.46, 24]} /><primitive object={basic('#e8a33d', 0.9)} attach="material" /></mesh>
      <Figure avatar={avatar} lod={lod} getPose={() => pose.current} />
    </group>
  )
}

/** Rendert nur Agenten des aktuellen Geschosses. */
export function AgentsLayer() {
  const floorId = useWorld((s) => s.floorId)
  const ids = useWorld(useShallow((s) => Object.values(s.agents).filter((a) => a.floorId === s.floorId).map((a) => a.id)))
  return <group key={floorId}>{ids.map((id) => <AgentCharacter key={id} id={id} />)}</group>
}
