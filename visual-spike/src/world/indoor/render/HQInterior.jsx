import { Suspense, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HQ } from '../config/hq.layout.js'
import { buildFurniture, buildSigns, buildPlacements } from '../config/hq.layout.js'
import GlbInstanced, { preloadModels } from './GlbInstanced.jsx'
import { useView } from '../../outdoor/runtime/viewState.js'
import { buildInterior } from './interiorGeometry.js'
import { parquetTexture, carpetTexture, concreteTexture, panelTexture } from './textures.js'
import { registerNightMaterial } from '../../outdoor/environment/outdoorEnvironment.js'
import Escalators from './Escalators.jsx'

const Y = HQ.levels

// Materialsatz je Etage (eigene Schnittebenen für die Wandmodi der Sims Ansicht)
function useLevelMaterials(level, wallMode) {
  return useMemo(() => {
    const base = HQ.levels[level]
    const plane = wallMode === 'half' ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), base + 1.3)] : []
    const fill = (m, b) => { m.emissive = new THREE.Color('#fff1d6'); m.emissiveIntensity = 0.05; registerNightMaterial(m, { base: b, min: 0.2 }); return m }
    const wallM = fill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, clippingPlanes: plane }), 0.28)
    const glass = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: plane })
    const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4, clippingPlanes: plane })
    return { wallM, glass, metal }
  }, [level, wallMode])
}

function useMaterials() {
  return useMemo(() => {
    const fill = (m, base) => { m.emissive = new THREE.Color('#fff1d6'); m.emissiveIntensity = 0.05; registerNightMaterial(m, { base, min: 0.2 }); return m }
    const furnM = fill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true }), 0.22)
    const par = fill(new THREE.MeshStandardMaterial({ map: parquetTexture(), roughness: 0.5, metalness: 0.02 }), 0.3)
    const car = fill(new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }), 0.3)
    const con = fill(new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.35, metalness: 0.08 }), 0.3)
    const slab = fill(new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.95 }), 0.4)
    const lights = new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff1d0', emissiveIntensity: 1.1 })
    registerNightMaterial(lights, { base: 2.2, min: 0.5 })
    const screens = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide })
    const glass = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide })
    const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 })
    return { furnM, par, car, con, slab, lights, screens, glass, metal }
  }, [])
}

function Panel({ x, y, z, ry, w, h, tex, frame = true }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {frame && (
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, 0.04]} />
          <meshStandardMaterial color="#1b2030" roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

// Beschriftete Flächen: Wandbildschirme, Bereichstafeln und Türschilder
function Panels({ level }) {
  const f = useMemo(buildFurniture, [])
  const signs = useMemo(buildSigns, [])
  return (
    <group>
      {f.screens.filter((s) => s.level === level).map((s, i) => (
        <Panel key={`s${i}`} x={s.x} y={Y[s.level] + 1.95} z={s.z} ry={s.ry} w={s.w} h={s.h}
          tex={panelTexture({ key: `scr-${s.title}-${s.room}`, w: 1024, h: Math.round(1024 * (s.h / s.w)), title: s.title, lines: s.lines, titleSize: 90, accent: '#2fd6c0' })} />
      ))}
      {f.banners.filter((b) => b.level === level).map((b, i) => (
        <Panel key={`b${i}`} x={b.x} y={(b.y ?? 2.2) + (b.hanging ? Y[b.level] : Y[b.level])} z={b.z} ry={b.ry} w={b.w} h={b.h} frame={!b.hanging}
          tex={panelTexture({ key: `ban-${b.text}-${b.level}`, w: 1024, h: Math.max(160, Math.round(1024 * (b.h / b.w))), bg: '#101827', accent: b.color, title: b.text, sub: b.sub, titleSize: 96 })} />
      ))}
      {signs.filter((s) => s.level === level).map((s, i) => {
        const tex = panelTexture({ key: `sign-${s.text}`, w: 768, h: 128, bg: '#f4efe4', fg: '#1c2536', accent: s.accent, title: s.text, titleSize: 46 })
        const off = 0.1
        const pos = s.ax === 'z' ? [s.c + (s.c < 0 ? off : -off), Y[s.level] + 2.72, s.at] : [s.at, Y[s.level] + 2.72, s.c + off * s.facing]
        const ry = s.ax === 'z' ? (s.c < 0 ? Math.PI / 2 : -Math.PI / 2) : s.facing > 0 ? 0 : Math.PI
        return <Panel key={`d${i}`} x={pos[0]} y={pos[1]} z={pos[2]} ry={ry} w={1.6} h={0.27} frame={false} tex={tex} />
      })}
    </group>
  )
}

const GLB_LIST = ['desk', 'desk_triple', 'chair', 'sofa', 'tree', 'bookshelf', 'lamp', 'pod_wall']
preloadModels(GLB_LIST)

function LevelGroup({ lv, G, M, full, shadows, wallMode }) {
  const L = M.levelMats
  const A = G.levels[lv]
  const P = useMemo(buildPlacements, [])
  const yb = HQ.levels[lv]
  const at = (arr) => arr.filter((i) => i.level === lv).map((i) => ({ ...i, y: yb }))
  return (
    <group name={`hq-level-${lv}`}>
      {A.floors.parquet && <mesh geometry={A.floors.parquet} material={M.par} receiveShadow />}
      {A.floors.carpet && <mesh geometry={A.floors.carpet} material={M.car} receiveShadow />}
      {A.floors.concrete && <mesh geometry={A.floors.concrete} material={M.con} receiveShadow />}
      {A.wallsSolid && <mesh geometry={A.wallsSolid} material={L.wallM} receiveShadow />}
      {A.wallsFrames && <mesh geometry={A.wallsFrames} material={L.metal} />}
      {A.wallsGlass && <mesh geometry={A.wallsGlass} material={L.glass} renderOrder={3} />}
      <mesh geometry={A.lights} material={M.lights} />
      {full && (
        <>
          {A.furniture && <mesh geometry={A.furniture} material={M.furnM} castShadow={shadows} receiveShadow />}
          {A.screens && <mesh geometry={A.screens} material={M.screens} />}
          <Suspense fallback={null}>
            <GlbInstanced name="desk" items={at(P.desks)} shadows={shadows} />
            <GlbInstanced name="desk_triple" items={at(P.desks3)} shadows={shadows} />
            <GlbInstanced name="chair" items={at(P.chairs)} tint="chair" shadows={shadows} />
            <GlbInstanced name="sofa" items={at(P.sofas)} tint="sofa" shadows={shadows} />
            <GlbInstanced name="tree" items={at(P.trees)} shadows={shadows} />
            <GlbInstanced name="bookshelf" items={at(P.shelves)} shadows={shadows} />
            <GlbInstanced name="lamp" items={at(P.lamps)} shadows={false} />
            <GlbInstanced name="pod_wall" items={at(P.pods)} shadows={shadows} />
          </Suspense>
          <Panels level={lv} />
        </>
      )}
    </group>
  )
}

// detail: 'shell' (Boden, Decken, Wände, Licht) oder 'full' (zusätzlich Möbel, Blender Assets, Treppe, Rolltreppen, Beschriftungen).
// view: Etagenschnitt und Wandmodus aus der Sims Ansicht.
export default function HQInterior({ detail = 'full', shadows = false }) {
  const G = useMemo(buildInterior, [])
  const M0 = useMaterials()
  const view = useView()
  const gl = useThree((s) => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const l0 = useLevelMaterials(0, view.wallMode === 'half' ? 'half' : 'up')
  const l1 = useLevelMaterials(1, view.wallMode === 'half' ? 'half' : 'up')
  const full = detail === 'full'
  const show1 = view.cutLevel === 'all' || view.cutLevel === 1
  const hideWalls = view.wallMode === 'down'
  return (
    <group name="hq-interior">
      <mesh geometry={G.groundPlate} material={M0.slab} receiveShadow />
      <group visible={!hideWalls || true}>
        <LevelGroup lv={0} G={G} M={{ ...M0, levelMats: l0 }} full={full} shadows={shadows} />
      </group>
      {show1 && (
        <>
          <mesh geometry={G.slab1} material={M0.slab} castShadow={shadows} receiveShadow={shadows} />
          <LevelGroup lv={1} G={G} M={{ ...M0, levelMats: l1 }} full={full} shadows={shadows} />
          <mesh geometry={G.slabRoof} material={M0.slab} castShadow={shadows} visible={view.cutLevel === 'all'} />
        </>
      )}
      {full && (
        <>
          <mesh geometry={G.stairs} material={M0.metal} castShadow={shadows} receiveShadow />
          <mesh geometry={G.stairGlass} material={M0.glass} renderOrder={3} />
          {show1 && <mesh geometry={G.voidRails} material={M0.metal} />}
          {show1 && <mesh geometry={G.voidGlass} material={M0.glass} renderOrder={3} />}
          <mesh geometry={G.escStatic} material={M0.metal} />
          <mesh geometry={G.escGlass} material={M0.glass} renderOrder={3} />
          <Escalators />
        </>
      )}
    </group>
  )
}
