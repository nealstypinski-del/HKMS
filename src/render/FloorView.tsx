import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { Color, DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry } from 'three'
import { DOOR_W, ROOM_H, WALL_H, floorBaseY } from '../world/constants'
import { getFloor, type GeneratedFloor } from '../world/generate'
import { lastSpawn, sim } from '../world/sim'
import { useWorld } from '../world/store'
import { PROVIDER_COLOR, PROVIDER_LABEL } from '../world/mockAgents'
import type { ComputerState, Provider } from '../world/types'
import { collectSources, collectWallSources, PAL, partMatrix, type BatchSource, type WallMode } from './kit'
import { GEO, MATS, initScreenMaterial, labelMaterial } from './materials'

export type FloorLod = 'full' | 'low'

const PROVIDERS: Provider[] = ['claude-code', 'codex', 'chatgpt', 'gemini']
const plateGeo = new PlaneGeometry(0.68, 0.17)
const _o = new Object3D()

/** Je Anbieter zwei Instanz Meshes (Vorder und Rückseite), damit der Text von beiden Seiten nie gespiegelt ist. */
function makePlates(capacity: number) {
  const out = {} as Record<Provider, InstancedMesh[]>
  for (const p of PROVIDERS) {
    const mat = labelMaterial(PROVIDER_LABEL[p].toUpperCase(), PROVIDER_COLOR[p], { w: 256, h: 64 })
    out[p] = [0, 1].map(() => { const m = new InstancedMesh(plateGeo, mat, Math.max(1, capacity)); m.count = 0; m.frustumCulled = false; return m })
  }
  return out
}

interface Built {
  furniture: InstancedMesh[]
  structure: InstancedMesh[]
  screenMesh: InstancedMesh | null
  /** Rechner-ID → Instanzindizes im Bildschirm-Mesh */
  screens: { computerId: string; deskId: string; indices: number[] }[]
  deskPick: InstancedMesh
  deskIds: string[]
  zonePick: InstancedMesh
  zoneIds: { zoneId: string; departmentId: string }[]
  computerPick: Map<number, string>
  plates: Record<Provider, InstancedMesh[]>
}

const invisible = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
const built = new Map<string, Built>()
const wallCache = new Map<string, InstancedMesh[]>()

/** Wandmeshes je Etage und Modus, gemerkt. */
export function getWalls(floorId: string, mode: WallMode): InstancedMesh[] {
  const key = `${floorId}|${mode}`
  let w = wallCache.get(key)
  if (!w) { w = makeMeshes(collectWallSources(getFloor(floorId), mode), false).map((m) => m.mesh); wallCache.set(key, w) }
  return w
}

const SCREEN_COLORS: Record<ComputerState, string> = {
  offline: '#10141b', idle: '#3d4e66', working: '#38d6b4', waiting: '#f0b23d', error: '#ee4b4b', done: '#5f9bff',
}
const _c = new Color()

function makeMeshes(sources: BatchSource[], shadow: boolean) {
  const groups = new Map<string, BatchSource[]>()
  for (const s of sources) {
    const k = `${s.part.mat}|${s.part.shape}`
    ;(groups.get(k) ?? groups.set(k, []).get(k)!).push(s)
  }
  const meshes: { mesh: InstancedMesh; list: BatchSource[]; key: string }[] = []
  for (const [key, list] of groups) {
    const [mat, shape] = key.split('|') as [keyof typeof MATS, keyof typeof GEO]
    const mesh = new InstancedMesh(GEO[shape], MATS[mat], list.length)
    list.forEach((s, i) => {
      mesh.setMatrixAt(i, s.matrix)
      mesh.setColorAt(i, _c.set(s.part.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.castShadow = shadow && (mat === 'matte' || mat === 'metal')
    mesh.receiveShadow = mat !== 'screen' && mat !== 'glass'
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
    mesh.matrixAutoUpdate = false
    meshes.push({ mesh, list, key })
  }
  return meshes
}

function build(f: GeneratedFloor): Built {
  initScreenMaterial()
  const { sources } = collectSources(f)
  const furn = makeMeshes(sources.filter((s) => !s.structure), true)
  const struc = makeMeshes(sources.filter((s) => s.structure), false)

  // Bildschirm-Mesh und Zuordnung
  let screenMesh: InstancedMesh | null = null
  const screens: Built['screens'] = []
  const computerPick = new Map<number, string>()
  const sm = furn.find((m) => m.key === 'screen|box')
  if (sm) {
    screenMesh = sm.mesh
    const byComputer = new Map<string, number[]>()
    sm.list.forEach((s, i) => { if (s.screenOf) (byComputer.get(s.screenOf) ?? byComputer.set(s.screenOf, []).get(s.screenOf)!).push(i) })
    for (const d of f.desks) {
      const idx = byComputer.get(d.computerId)
      if (idx) { screens.push({ computerId: d.computerId, deskId: d.id, indices: idx }); idx.forEach((i) => computerPick.set(i, d.computerId)) }
    }
  }

  const desks = f.placements.filter((p) => p.kind === 'desk')
  const deskPick = new InstancedMesh(GEO.box, invisible, Math.max(1, desks.length))
  desks.forEach((d, i) => {
    const m = partMatrix({ shape: 'box', mat: 'matte', pos: [0, 0.6, 0.1], size: [(d.w ?? 1.6) + 0.1, 1.2, 1.5], color: '#fff' }, d.x, 0, d.z, d.yaw)
    deskPick.setMatrixAt(i, m)
  })
  deskPick.count = desks.length
  deskPick.computeBoundingSphere()

  const zones = f.zones.filter((z) => z.config.type !== 'core')
  const zonePick = new InstancedMesh(GEO.box, invisible, Math.max(1, zones.length))
  zones.forEach((z, i) => {
    const r = z.config.rect
    const m = new Matrix4().makeScale(r.x1 - r.x0 - 0.2, 0.02, r.z1 - r.z0 - 0.2).setPosition((r.x0 + r.x1) / 2, 0.06, (r.z0 + r.z1) / 2)
    zonePick.setMatrixAt(i, m)
  })
  zonePick.count = zones.length
  zonePick.computeBoundingSphere()

  return {
    furniture: furn.map((m) => m.mesh), structure: struc.map((m) => m.mesh), screenMesh, screens,
    deskPick, deskIds: desks.map((d) => d.id), zonePick,
    zoneIds: zones.map((z) => ({ zoneId: z.config.id, departmentId: z.departmentId })), computerPick,
    plates: makePlates(f.desks.length),
  }
}

export function getBuilt(floorId: string): Built {
  let b = built.get(floorId)
  if (!b) { b = build(getFloor(floorId)); built.set(floorId, b) }
  return b
}

const ceilingMat = new MeshLambertMaterial({ color: '#dcd9d2', side: DoubleSide })
const lightMat = new MeshBasicMaterial({ color: '#fff4dc', toneMapped: false })
const lightGeo = GEO.box

function Ceiling() {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(lightGeo, lightMat, 12 * 8)
    const o = new Object3D()
    let i = 0
    for (let x = 0; x < 12; x++) for (let z = 0; z < 8; z++) {
      o.position.set(-19.8 + x * 3.6, ROOM_H - 0.06, -13.1 + z * 3.75)
      o.scale.set(1.6, 0.05, 0.5)
      o.updateMatrix()
      m.setMatrixAt(i++, o.matrix)
    }
    m.frustumCulled = false
    return m
  }, [])
  return (
    <group>
      <mesh position={[0, ROOM_H, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[44, 30]} /><primitive object={ceilingMat} attach="material" /></mesh>
      <primitive object={mesh} />
    </group>
  )
}

const doorMat = new MeshBasicMaterial({ color: '#b9c0cc' })
function ElevatorDoors({ f }: { f: GeneratedFloor }) {
  const l = useRef<Object3D>(null), r = useRef<Object3D>(null)
  const open = useRef(0)
  const cam = useThree((s) => s.camera)
  const w = DOOR_W / 2 - 0.05
  useFrame((_, dt) => {
    const dx = cam.position.x - f.elevatorDoor.x, dz = cam.position.z - f.elevatorDoor.z
    const near = Math.hypot(dx, dz) < 6 && cam.position.y < 20 + (f.config.level * 5.2 + 8)
    const want = near || sim.time - (lastSpawn.get(f.config.id) ?? -99) < 2 ? 1 : 0
    open.current += (want - open.current) * Math.min(1, dt * 4)
    const o = open.current * (w - 0.05)
    if (l.current) l.current.position.x = -w / 2 - o
    if (r.current) r.current.position.x = w / 2 + o
  })
  const select = useWorld((s) => s.select)
  const setElevator = useWorld((s) => s.setElevator)
  return (
    <group position={[f.elevatorDoor.x, 0, f.elevatorDoor.z - 0.08]}>
      <group ref={l}><mesh position={[0, 1.3, 0]}><boxGeometry args={[w, 2.6, 0.06]} /><primitive object={doorMat} attach="material" /></mesh></group>
      <group ref={r}><mesh position={[0, 1.3, 0]}><boxGeometry args={[w, 2.6, 0.06]} /><primitive object={doorMat} attach="material" /></mesh></group>
      <mesh position={[0, 2.75, 0.02]}><boxGeometry args={[DOOR_W + 0.2, 0.2, 0.12]} /><meshLambertMaterial color={PAL.dark} /></mesh>
      <mesh position={[0, 1.3, -1.5]}><planeGeometry args={[DOOR_W - 0.1, 2.6]} /><meshBasicMaterial color="#f6efe2" toneMapped={false} /></mesh>
      <mesh
        position={[0, 1.3, 0.3]}
        onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); select({ type: 'elevator', id: f.config.id }); setElevator(true) }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <boxGeometry args={[DOOR_W + 0.4, 2.8, 1.2]} /><primitive object={invisible} attach="material" />
      </mesh>
    </group>
  )
}

function Signs({ f }: { f: GeneratedFloor }) {
  return (
    <group>
      {f.zones.filter((z) => z.config.type !== 'core' && z.config.type !== 'elevatorLobby').map((z) => {
        const r = z.config.rect
        const cx = (r.x0 + r.x1) / 2
        const walled = z.config.walled && z.config.door
        const zz = walled ? (z.config.door === 'S' ? r.z1 : r.z0) : (r.z0 + r.z1) / 2
        const y = walled ? WALL_H + 0.45 : 3.5
        const mat = labelMaterial(z.config.title.toUpperCase(), z.accent, { w: 512, h: 112 })
        // Zwei Flächen Rücken an Rücken, damit der Text von beiden Seiten lesbar und nie gespiegelt ist.
        return (
          <group key={z.config.id} position={[cx, y, zz]}>
            <mesh position-z={0.02}><planeGeometry args={[3.4, 0.75]} /><primitive object={mat} attach="material" /></mesh>
            <mesh position-z={-0.02} rotation-y={Math.PI}><planeGeometry args={[3.4, 0.75]} /><primitive object={mat} attach="material" /></mesh>
          </group>
        )
      })}
      {f.placements.filter((p) => (p.kind === 'wallDisplay' || p.kind === 'bigScreen' || p.kind === 'reception') && p.label).map((p) => {
        const w = p.w ?? 3, h = p.h ?? 1.6
        const zone = f.zones.find((z) => z.config.id === p.zoneId)
        const accent = zone?.accent ?? '#e8a33d'
        if (p.kind === 'reception') {
          return (
            <group key={p.id} position={[p.x, 0, p.z]} rotation-y={p.yaw}>
              <mesh position={[0, 0.6, -0.525]} rotation-y={Math.PI}>
                <planeGeometry args={[w - 0.6, 0.7]} />
                <primitive object={labelMaterial(p.label!, accent, { w: 512, h: 128 })} attach="material" />
              </mesh>
            </group>
          )
        }
        return (
          <group key={p.id} position={[p.x, 0, p.z]} rotation-y={p.yaw}>
            <mesh position={[0, p.y ?? 1.9 + h / 2 - 0.4, 0.035]}>
              <planeGeometry args={[w, h]} />
              <primitive object={labelMaterial(p.label!, accent, { w: 512, h: Math.round(512 * (h / w)) })} attach="material" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

interface Props { floorId: string; lod: FloorLod; ceiling?: boolean }

export const FloorView = memo(function FloorView({ floorId, lod, ceiling }: Props) {
  const f = getFloor(floorId)
  const b = getBuilt(floorId)
  const select = useWorld((s) => s.select)
  const setHover = useWorld((s) => s.setHover)
  const shadows = useWorld((s) => s.graphics.shadows && !s.graphics.performanceMode)
  const wallMode = useWorld((s) => s.wallMode)
  const walls = getWalls(floorId, wallMode)
  const acc = useRef(0)

  // Bildschirmzustände alle 0,2 s aus dem Sim-Zustand ableiten.
  useFrame((_, dt) => {
    if (lod !== 'full' || !b.screenMesh) return
    acc.current += dt
    if (acc.current < 0.2) return
    acc.current = 0
    const t = sim.time
    const mesh = b.screenMesh
    for (const s of b.screens) {
      const st = sim.computerState(s.computerId, s.deskId)
      const flick = st === 'working' ? 0.8 + 0.2 * Math.sin(t * 4 + s.indices[0]) : 1
      _c.set(SCREEN_COLORS[st]).multiplyScalar(flick)
      for (const i of s.indices) mesh.setColorAt(i, _c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    // Anbieter Schilder über besetzten Monitoren
    const agents = useWorld.getState().agents
    const counts: Record<string, number> = {}
    for (const d of f.desks) {
      const oid = sim.owner.get(d.id)
      const r = oid ? sim.rt.get(oid) : undefined
      const a = oid ? agents[oid] : undefined
      if (!r || !a || r.phase !== 'seated') continue
      const i = (counts[a.provider] = (counts[a.provider] ?? -1) + 1)
      const yaw = d.yaw - Math.PI
      const c = Math.cos(yaw), sn = Math.sin(yaw)
      const lz = -0.2
      const wx = d.pos.x + lz * sn, wz = d.pos.z + lz * c
      const pair = b.plates[a.provider]
      _o.position.set(wx, 1.52, wz); _o.rotation.set(0, yaw, 0); _o.scale.set(1, 1, 1); _o.updateMatrix()
      pair[0].setMatrixAt(i, _o.matrix)
      _o.position.set(wx - 0.004 * sn, 1.52, wz - 0.004 * c); _o.rotation.set(0, yaw + Math.PI, 0); _o.updateMatrix()
      pair[1].setMatrixAt(i, _o.matrix)
    }
    for (const p of PROVIDERS) for (const m of b.plates[p]) { m.count = (counts[p] ?? -1) + 1; m.instanceMatrix.needsUpdate = true }
  })

  useMemo(() => {
    for (const m of b.furniture) m.castShadow = shadows && (m.material === MATS.matte || m.material === MATS.metal)
  }, [b, shadows])

  const onOutside = () => { setHover(null); document.body.style.cursor = '' }

  return (
    <group position={[0, floorBaseY(f.config.level), 0]}>
      {b.structure.map((m, i) => <primitive key={`s${i}`} object={m} />)}
      {walls.map((m, i) => <primitive key={`w${wallMode}${i}`} object={m} />)}
      {lod === 'full' && (
        <>
          {b.furniture.map((m, i) => <primitive key={`f${i}`} object={m} />)}
          <Signs f={f} />
          {PROVIDERS.flatMap((p) => b.plates[p].map((m, i) => <primitive key={`${p}${i}`} object={m} />))}
          <ElevatorDoors f={f} />
          {/* Rechner anklicken */}
          {b.screenMesh && (
            <primitive
              object={b.screenMesh}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (e.delta > 4 || e.instanceId === undefined) return
                const id = b.computerPick.get(e.instanceId)
                if (!id) return
                e.stopPropagation()
                select({ type: 'computer', id })
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                if (e.instanceId === undefined || !b.computerPick.has(e.instanceId)) return
                e.stopPropagation(); document.body.style.cursor = 'pointer'
              }}
              onPointerOut={onOutside}
            />
          )}
          <primitive
            object={b.deskPick}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (e.delta > 4 || e.instanceId === undefined) return
              e.stopPropagation()
              const deskId = b.deskIds[e.instanceId]
              const comp = f.desks.find((d) => d.id === deskId)
              // Treffer auf dem Bildschirmbereich zählt als Rechner, sonst als Schreibtisch
              const hitY = e.point.y - floorBaseY(f.config.level)
              if (comp && hitY > 0.85) select({ type: 'computer', id: comp.computerId })
              else select({ type: 'desk', id: deskId })
            }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              if (e.instanceId === undefined) return
              e.stopPropagation()
              setHover({ type: 'desk', id: b.deskIds[e.instanceId] }); document.body.style.cursor = 'pointer'
            }}
            onPointerOut={onOutside}
          />
          <primitive
            object={b.zonePick}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (e.delta > 4 || e.instanceId === undefined) return
              e.stopPropagation()
              select({ type: 'department', id: b.zoneIds[e.instanceId].departmentId })
            }}
          />
          {ceiling && <Ceiling />}
        </>
      )}
    </group>
  )
})
