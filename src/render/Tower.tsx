import { useFrame } from '@react-three/fiber'
import { memo, useMemo } from 'react'
import { BackSide, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, RepeatWrapping } from 'three'
import { BUILDING } from '../world/buildingConfig'
import { FLOOR_H, HALF_D, HALF_W, ROOM_H, SLAB_H, floorBaseY } from '../world/constants'
import { useWorld } from '../world/store'
import { ENTRANCE_HALF } from '../world/walk'
import { slabHoles } from '../world/connectors'
import { Connectors } from './Connectors'
import { env, envColors } from './env'
import { FloorView } from './FloorView'
import { getGlassFacadeTexture, getWindowTexture, labelMaterial } from './materials'

const slabMat = new MeshLambertMaterial({ color: '#2b2f38' })
const trimMats = new Map<string, MeshBasicMaterial>()
const trim = (c: string) => { let m = trimMats.get(c); if (!m) { m = new MeshBasicMaterial({ color: c, toneMapped: false }); trimMats.set(c, m) } return m }

let shellMat: MeshStandardMaterial | null = null
function getShellMat() {
  if (!shellMat) {
    const lit = getWindowTexture().clone()
    lit.wrapS = lit.wrapT = RepeatWrapping
    lit.repeat.set(3, 1)
    lit.needsUpdate = true
    const glass = getGlassFacadeTexture().clone()
    glass.repeat.set(5, 1)
    glass.needsUpdate = true
    // Spiegelglas Vorhangfassade: Scheibenraster als Diffusfarbe, leuchtende Fenster nur als Emission (nachts stark, tags kaum)
    shellMat = new MeshStandardMaterial({ map: glass, color: '#ffffff', roughness: 0.18, metalness: 0.3, emissive: '#ffd9a0', emissiveMap: lit, emissiveIntensity: 0.05 })
  }
  return shellMat
}
const glassFacade = new MeshStandardMaterial({ color: '#7fb6d6', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, depthWrite: false })
const frameMat = new MeshLambertMaterial({ color: '#20242d' })

/** Glasfassade: vier nach außen sehende Scheiben, von innen dank Backface Culling unsichtbar. */
function Facade({ y, accent, entrance }: { y: number; accent: string; entrance?: boolean }) {
  const W = HALF_W * 2 + 0.4, D = HALF_D * 2 + 0.4
  const gap = 2 * ENTRANCE_HALF
  const side = (W - gap) / 2
  return (
    <group position={[0, y, 0]}>
      {entrance ? (
        <>
          <mesh position={[-(gap / 2 + side / 2), ROOM_H / 2, D / 2]}><planeGeometry args={[side, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
          <mesh position={[gap / 2 + side / 2, ROOM_H / 2, D / 2]}><planeGeometry args={[side, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
          <mesh position={[0, 3.6 + (ROOM_H - 3.6) / 2, D / 2]}><planeGeometry args={[gap, ROOM_H - 3.6]} /><primitive object={glassFacade} attach="material" /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * ENTRANCE_HALF, 1.8, D / 2]}><boxGeometry args={[0.25, 3.6, 0.3]} /><primitive object={frameMat} attach="material" /></mesh>)}
        </>
      ) : (
        <mesh position={[0, ROOM_H / 2, D / 2]}><planeGeometry args={[W, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
      )}
      <mesh position={[0, ROOM_H / 2, -D / 2]} rotation-y={Math.PI}><planeGeometry args={[W, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
      <mesh position={[W / 2, ROOM_H / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[D, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
      <mesh position={[-W / 2, ROOM_H / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[D, ROOM_H]} /><primitive object={glassFacade} attach="material" /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * W / 2, ROOM_H / 2, sz * D / 2]}><boxGeometry args={[0.5, ROOM_H, 0.5]} /><primitive object={frameMat} attach="material" /></mesh>
      ))}
      <mesh position={[0, ROOM_H - 0.05, D / 2]}><boxGeometry args={[W, 0.12, 0.12]} /><primitive object={trim(accent)} attach="material" /></mesh>
    </group>
  )
}

/** Bodenplatte, bei Etagen mit Treppe oder Rolltreppe mit Öffnung. */
function Slab({ y, id, onPick }: { y: number; id: string; onPick?: () => void }) {
  const holes = slabHoles(id)
  const pick = onPick ? (e: { delta: number; stopPropagation: () => void }) => { if (e.delta > 4) return; e.stopPropagation(); onPick() } : undefined
  // Plattenstücke: die Öffnungen liegen jeweils am Rand des Korridors, das Schneiden erfolgt streifenweise in x
  const xs = [-HALF_W, ...holes.flatMap((h) => [h.x0, h.x1]), HALF_W].sort((a, b) => a - b)
  const uniq = xs.filter((v, i) => i === 0 || v !== xs[i - 1])
  const parts: { x0: number; x1: number; z0: number; z1: number }[] = []
  for (let i = 0; i < uniq.length - 1; i++) {
    const x0 = uniq[i], x1 = uniq[i + 1], mx = (x0 + x1) / 2
    const hs = holes.filter((h) => mx > h.x0 && mx < h.x1).sort((a, b) => a.z0 - b.z0)
    let z = -HALF_D
    for (const h of hs) { if (h.z0 > z) parts.push({ x0, x1, z0: z, z1: h.z0 }); z = Math.max(z, h.z1) }
    if (z < HALF_D) parts.push({ x0, x1, z0: z, z1: HALF_D })
  }
  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} position={[(p.x0 + p.x1) / 2, y + SLAB_H / 2, (p.z0 + p.z1) / 2]} receiveShadow onClick={pick as never}>
          <boxGeometry args={[p.x1 - p.x0, SLAB_H, p.z1 - p.z0]} /><primitive object={slabMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

type Detail = 'full' | 'low' | 'shell'

const FloorBlock = memo(function FloorBlock({ id, level, accent, short, detail, facade, selected, onPick, ego }: {
  id: string; level: number; accent: string; short: string; detail: Detail; facade: boolean; selected: boolean; onPick?: () => void; ego: boolean
}) {
  const y0 = level * FLOOR_H
  const yb = floorBaseY(level)
  const shell = getShellMat()
  return (
    <group>
      <Slab y={y0} id={id} onPick={onPick} />
      {/* Akzentkante */}
      <mesh position={[0, y0 + SLAB_H, HALF_D + 0.15]}><boxGeometry args={[HALF_W * 2 + 0.3, 0.12, 0.12]} /><primitive object={trim(accent)} attach="material" /></mesh>
      {detail === 'shell' && (
        <mesh
          position={[0, yb + ROOM_H / 2, 0]}
          onClick={onPick ? (e) => { if (e.delta > 4) return; e.stopPropagation(); onPick() } : undefined}
        >
          <boxGeometry args={[HALF_W * 2 + 0.4, ROOM_H, HALF_D * 2 + 0.4]} /><primitive object={shell} attach="material" />
        </mesh>
      )}
      {detail === 'shell' && (
        <mesh position={[0, yb + ROOM_H - 1.0, HALF_D + 0.25]}>
          <planeGeometry args={[10, 1.4]} />
          <primitive object={labelMaterial(short, accent, { w: 512, h: 72, panel: true })} attach="material" />
        </mesh>
      )}
      {(detail === 'low' || detail === 'full') && <FloorView floorId={id} lod={detail === 'full' ? 'full' : 'low'} ceiling={ego && detail === 'full'} />}
      {(detail === 'low' || detail === 'full') && facade && <Facade y={yb} accent={accent} entrance={level === 0} />}
      {selected && (
        <group position={[0, yb, 0]}>
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[HALF_W * 2, HALF_D * 2]} /><meshBasicMaterial color={accent} transparent opacity={0.2} depthWrite={false} toneMapped={false} /></mesh>
        </group>
      )}
    </group>
  )
})

function Roof({ visible }: { visible: boolean }) {
  const top = BUILDING.floors.length
  const y = top * FLOOR_H
  if (!visible) return null
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, SLAB_H / 2, 0]}><boxGeometry args={[HALF_W * 2 + 1, SLAB_H, HALF_D * 2 + 1]} /><primitive object={slabMat} attach="material" /></mesh>
      {/* Executive Pavillon (Platzhalter für künftige Erweiterung), Rücksprung gibt dem Turm eine Hochhaus Silhouette */}
      <mesh position={[0, SLAB_H + 2.4, -2]}><boxGeometry args={[30, 4.8, 18]} /><primitive object={getShellMat()} attach="material" /></mesh>
      <mesh position={[0, SLAB_H + 4.85, -2]}><boxGeometry args={[30.6, 0.3, 18.6]} /><primitive object={slabMat} attach="material" /></mesh>
      <mesh position={[0, SLAB_H + 4.95, 7.4]}><boxGeometry args={[30.6, 0.12, 0.12]} /><primitive object={trim('#8b7bd8')} attach="material" /></mesh>
      <mesh position={[0, SLAB_H + 3.6, 7.05]}>
        <planeGeometry args={[11, 1.1]} />
        <primitive object={labelMaterial('GESCHÄFTSFÜHRUNG · ERWEITERUNG', '#8b7bd8', { w: 768, h: 96 })} attach="material" />
      </mesh>
      <mesh position={[-16.5, 1.4, 6]}><boxGeometry args={[6, 2.4, 6]} /><meshLambertMaterial color="#3a4050" /></mesh>
      <mesh position={[0, 11, -8]}><cylinderGeometry args={[0.1, 0.25, 12, 8]} /><meshLambertMaterial color="#8a93a3" /></mesh>
      <mesh position={[0, 17.1, -8]}><sphereGeometry args={[0.35, 10, 8]} /><primitive object={trim('#ff5a4a')} attach="material" /></mesh>
      {/* Schriftzug */}
      <mesh position={[0, 2.6, HALF_D + 0.3]} visible={true}>
        <planeGeometry args={[26, 3.4]} />
        <primitive object={labelMaterial('HERKULES AI HQ', '#e8a33d', { w: 1024, h: 132 })} attach="material" />
      </mesh>
      <mesh position={[0, 2.6, -HALF_D - 0.3]} rotation-y={Math.PI}>
        <planeGeometry args={[26, 3.4]} />
        <primitive object={labelMaterial('HERKULES AI HQ', '#e8a33d', { w: 1024, h: 132 })} attach="material" />
      </mesh>
    </group>
  )
}

/** Der Turm. Detailstufen pro Etage, abhängig von Kameramodus und aktiver Etage. */
export function Tower() {
  const mode = useWorld((s) => s.cameraMode)
  const floorId = useWorld((s) => s.floorId)
  const setFloor = useWorld((s) => s.setFloor)
  const setMode = useWorld((s) => s.setMode)
  const active = BUILDING.floors.find((f) => f.id === floorId)!.level
  const outside = useWorld((s) => s.outside)
  const climbing = useWorld((s) => s.climbing)

  // Fenster leuchten nachts stärker
  useFrame((_, dt) => {
    env.tod += (env.target - env.tod) * Math.min(1, dt * 1.5)
    const m = getShellMat()
    m.emissiveIntensity = Math.max(0.02, (envColors(env.tod).win - 0.2) * 1.1)
  })

  const floors = useMemo(() => [...BUILDING.floors].sort((a, b) => a.level - b.level), [])
  const building = mode === 'building'
  const ego = mode === 'firstPerson'
  return (
    <group>
      {floors.map((f) => {
        // Geschosse oberhalb der aktiven werden ausgeblendet (Schnittmodell), außer in der Gebäudeansicht.
        if (!building && !outside && f.level > active + (climbing ? 1 : 0)) return null
        let detail: Detail = 'shell'
        if (f.level === active || (climbing && f.level === active + 1)) detail = building ? 'low' : 'full'
        return (
          <FloorBlock
            key={f.id} id={f.id} level={f.level} accent={f.accent} short={f.short} detail={detail}
            facade={building || ego || mode === 'follow'} selected={building && f.level === active}
            ego={ego}
            onPick={building ? () => { if (f.level === active) setMode('tycoon'); else setFloor(f.id) } : undefined}
          />
        )
      })}
      {(building || outside || active <= 1 || climbing) && (active <= 1 || building || outside) && <Connectors lowerId="floor-lobby" upperId="floor-shared" />}
      <Roof visible={building || outside} />
    </group>
  )
}

export { BackSide, DoubleSide }
