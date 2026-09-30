import { useMemo } from 'react'
import * as THREE from 'three'
import { HQ } from '../config/hq.layout.js'
import { buildFurniture, buildSigns } from '../config/hq.layout.js'
import { buildInterior } from './interiorGeometry.js'
import { parquetTexture, carpetTexture, concreteTexture, panelTexture } from './textures.js'
import { registerNightMaterial } from '../../outdoor/environment/outdoorEnvironment.js'
import Escalators from './Escalators.jsx'

const Y = HQ.levels

function useMaterials() {
  return useMemo(() => {
    // Innenmaterialien bekommen nachts eine leichte Eigenleuchtung (Deckenpaneele, Grundhelligkeit), damit der Innenraum lesbar bleibt
    const fill = (m, base) => { m.emissive = new THREE.Color('#fff1d6'); m.emissiveIntensity = 0.05; registerNightMaterial(m, { base, min: 0.55 }); return m }
    const wallM = fill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), 0.28)
    const furnM = fill(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true }), 0.22)
    const par = fill(new THREE.MeshStandardMaterial({ map: parquetTexture(), roughness: 0.5, metalness: 0.02 }), 0.3)
    const car = fill(new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }), 0.3)
    const con = fill(new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.35, metalness: 0.08 }), 0.3)
    const slab = fill(new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.95 }), 0.4)
    const glass = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide })
    const lights = new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff1d0', emissiveIntensity: 1.1 })
    registerNightMaterial(lights, { base: 2.2, min: 0.5 })
    const screens = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide })
    const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 })
    return { wallM, furnM, par, car, con, slab, glass, lights, screens, metal }
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
function Panels() {
  const f = useMemo(buildFurniture, [])
  const signs = useMemo(buildSigns, [])
  return (
    <group>
      {f.screens.map((s, i) => (
        <Panel key={`s${i}`} x={s.x} y={Y[s.level] + 1.95} z={s.z} ry={s.ry} w={s.w} h={s.h}
          tex={panelTexture({ key: `scr-${s.title}-${s.room}`, w: 1024, h: Math.round(1024 * (s.h / s.w)), title: s.title, lines: s.lines, titleSize: 90, accent: '#2fd6c0' })} />
      ))}
      {f.banners.map((b, i) => (
        <Panel key={`b${i}`} x={b.x} y={(b.y ?? 2.2) + (b.hanging ? Y[b.level] : Y[b.level])} z={b.z} ry={b.ry} w={b.w} h={b.h} frame={!b.hanging}
          tex={panelTexture({ key: `ban-${b.text}-${b.level}`, w: 1024, h: Math.max(160, Math.round(1024 * (b.h / b.w))), bg: '#101827', accent: b.color, title: b.text, sub: b.sub, titleSize: 96 })} />
      ))}
      {signs.map((s, i) => {
        const tex = panelTexture({ key: `sign-${s.text}`, w: 768, h: 128, bg: '#f4efe4', fg: '#1c2536', accent: s.accent, title: s.text, titleSize: 46 })
        const off = 0.1
        const pos = s.ax === 'z' ? [s.c + (s.c < 0 ? off : -off), Y[s.level] + 2.72, s.at] : [s.at, Y[s.level] + 2.72, s.c + off * s.facing]
        const ry = s.ax === 'z' ? (s.c < 0 ? Math.PI / 2 : -Math.PI / 2) : s.facing > 0 ? 0 : Math.PI
        return <Panel key={`d${i}`} x={pos[0]} y={pos[1]} z={pos[2]} ry={ry} w={1.6} h={0.27} frame={false} tex={tex} />
      })}
    </group>
  )
}

// detail: 'shell' (Boden, Decken, Wände, Licht) oder 'full' (zusätzlich Möbel, Treppe, Rolltreppen, Beschriftungen)
export default function HQInterior({ detail = 'full', shadows = false }) {
  const G = useMemo(buildInterior, [])
  const M = useMaterials()
  const full = detail === 'full'
  return (
    <group name="hq-interior">
      <mesh geometry={G.groundPlate} material={M.slab} receiveShadow />
      {G.floors.parquet && <mesh geometry={G.floors.parquet} material={M.par} receiveShadow />}
      {G.floors.carpet && <mesh geometry={G.floors.carpet} material={M.car} receiveShadow />}
      {G.floors.concrete && <mesh geometry={G.floors.concrete} material={M.con} receiveShadow />}
      <mesh geometry={G.slab1} material={M.slab} castShadow={shadows} receiveShadow={shadows} />
      <mesh geometry={G.slabRoof} material={M.slab} castShadow={shadows} />
      <mesh geometry={G.wallsSolid} material={M.wallM} receiveShadow />
      <mesh geometry={G.wallsFrames} material={M.metal} />
      <mesh geometry={G.wallsGlass} material={M.glass} renderOrder={3} />
      <mesh geometry={G.lights} material={M.lights} />
      {full && (
        <>
          <mesh geometry={G.furniture} material={M.furnM} castShadow={shadows} receiveShadow />
          <mesh geometry={G.screens} material={M.screens} />
          <mesh geometry={G.stairs} material={M.metal} castShadow={shadows} receiveShadow />
          <mesh geometry={G.stairGlass} material={M.glass} renderOrder={3} />
          <mesh geometry={G.voidRails} material={M.metal} />
          <mesh geometry={G.voidGlass} material={M.glass} renderOrder={3} />
          <mesh geometry={G.escStatic} material={M.metal} />
          <mesh geometry={G.escGlass} material={M.glass} renderOrder={3} />
          <Escalators />
          <Panels />
        </>
      )}
    </group>
  )
}
