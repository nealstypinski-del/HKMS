import { useMemo } from 'react'
import * as THREE from 'three'
import { WORLD } from '../config/bergpark.config.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'
import { sharedMaterials } from '../common/materials.js'
import { textTexture } from '../common/textures.js'
import HQInterior from '../../indoor/render/HQInterior.jsx'
import { buildInterior } from '../../indoor/render/interiorGeometry.js'
import { HQ } from '../../indoor/config/hq.layout.js'
import { useView } from '../runtime/viewState.js'

const H = WORLD.hq
const FH = HQ.floorH
const W = H.halfW * 2 + 0.6
const D = H.halfD * 2 + 0.6

// HQ Außenhülle: Glasfassade um Etage 0 und 1 (Innenwelt sichtbar), darüber Massing der Etagen 2 und 3 (noch nicht begehbar).
// detail steuert die Innenwelt über die Zone HQ_INTERIOR: 'full' in der Nähe, sonst 'shell' (nur Boden, Wände, Decken).
export default function HQExterior({ detail = 'shell', shadows = false }) {
  const M = sharedMaterials()
  const G = useMemo(buildInterior, [])
  const view = useView()
  const cm = (level) => {
    const base = HQ.levels[level]
    const plane = view.wallMode === 'half' ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), base + 1.3)] : []
    return {
      glass: new THREE.MeshStandardMaterial({ color: '#a9dcf5', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.4, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: plane }),
      mull: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5, clippingPlanes: plane }),
      spandrel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, clippingPlanes: plane }),
    }
  }
  const cm0 = useMemo(() => cm(0), [view.wallMode])
  const cm1 = useMemo(() => cm(1), [view.wallMode])
  const mats = useMemo(() => {
    const glass = new THREE.MeshStandardMaterial({ color: '#a9dcf5', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.4, depthWrite: false, side: THREE.DoubleSide })
    const mull = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 })
    const spandrel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
    const dark = new THREE.MeshStandardMaterial({ color: '#25324a', roughness: 0.5, metalness: 0.3 })
    const window_ = new THREE.MeshStandardMaterial({ color: '#8fd3ee', emissive: '#ffe7b0', emissiveIntensity: 0.08, roughness: 0.15, metalness: 0.5 })
    registerNightMaterial(window_, { base: 1.1, min: 0.05 })
    const trim = (c) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.5 }); registerNightMaterial(m, { base: 1.6, min: 0.15 }); return m }
    return { glass, mull, spandrel, dark, window_, orange: trim('#ff8a3d'), teal: trim('#2fd6c0'), slab: new THREE.MeshStandardMaterial({ color: '#f6f1e7', roughness: 0.8 }) }
  }, [])
  const sign = useMemo(() => textTexture('HERKULES AI HQ', { w: 2048, h: 256, font: '800 170px system-ui, sans-serif', color: '#fff4e6' }), [])
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false }), [sign])

  return (
    <group name="hq-tower" userData={{ entityId: 'hq-tower' }}>
      {/* Innenwelt: Boden, Decken, Wände, ab 'full' Möbel, Treppe, Rolltreppen */}
      <HQInterior detail={detail} shadows={shadows} />

      {/* Glasfassade Etage 0 und 1 */}
      {[0, 1].map((lv) => (lv === 1 && !(view.cutLevel === 'all' || view.cutLevel === 1) ? null : (
        <group key={lv} visible={view.wallMode !== 'down'}>
          <mesh geometry={G.levels[lv].curtainGlass} material={lv ? cm1.glass : cm0.glass} renderOrder={4} />
          <mesh geometry={G.levels[lv].curtainMull} material={lv ? cm1.mull : cm0.mull} castShadow={shadows} />
          <mesh geometry={G.levels[lv].curtainSpandrel} material={lv ? cm1.spandrel : cm0.spandrel} castShadow={shadows} />
        </group>
      )))}

      {/* Etagen 2 und 3: Massing mit Fensterbändern (noch nicht begehbar) */}
      {view.cutLevel === 'all' && [2, 3].map((i) => (
        <group key={i} position={[0, i * FH, 0]}>
          <mesh position={[0, 0.15, 0]} material={mats.slab} castShadow={shadows}>
            <boxGeometry args={[W + 0.4, 0.3, D + 0.4]} />
          </mesh>
          <mesh position={[0, 0.3 + (FH - 0.3) / 2, 0]} material={mats.dark} castShadow={shadows}>
            <boxGeometry args={[W, FH - 0.3, D]} />
          </mesh>
          {[[0, -D / 2 - 0.02, W - 1.6, 0.06], [0, D / 2 + 0.02, W - 1.6, 0.06], [-W / 2 - 0.02, 0, 0.06, D - 1.6], [W / 2 + 0.02, 0, 0.06, D - 1.6]].map(([x, z, w, d], k) => (
            <mesh key={k} position={[x, FH * 0.55, z]} material={mats.window_}>
              <boxGeometry args={[w, 1.9, d]} />
            </mesh>
          ))}
          <mesh position={[0, 0.34, 0]} material={i === 2 ? mats.teal : mats.orange}>
            <boxGeometry args={[W + 0.5, 0.1, D + 0.5]} />
          </mesh>
        </group>
      ))}
      {/* Dach mit Markenband */}
      {view.cutLevel === 'all' && <group>
      <mesh position={[0, 4 * FH + 0.15, 0]} material={mats.slab} castShadow={shadows}>
        <boxGeometry args={[W + 0.6, 0.3, D + 0.6]} />
      </mesh>
      <mesh position={[0, 4 * FH + 0.4, 0]} material={mats.orange}>
        <boxGeometry args={[W + 0.8, 0.2, D + 0.8]} />
      </mesh>
      <mesh position={[0, 4 * FH + 0.85, 0]} material={M.copper}>
        <boxGeometry args={[W - 6, 0.6, D - 6]} />
      </mesh>
      {/* Schriftzug an der Nordfassade (zum Park) */}
      <mesh position={[0, 2 * FH + 2.4, -D / 2 - 0.08]} material={signMat}>
        <planeGeometry args={[17, 2.1]} />
      </mesh>
      <mesh position={[0, 2 * FH + 2.4, -D / 2 - 0.03]} material={mats.dark}>
        <boxGeometry args={[17.6, 2.5, 0.1]} />
      </mesh>
      </group>}
    </group>
  )
}
