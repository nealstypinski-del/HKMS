import { useMemo } from 'react'
import * as THREE from 'three'
import { WORLD } from '../config/bergpark.config.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'
import { sharedMaterials } from '../common/materials.js'
import { textTexture } from '../common/textures.js'
import Floor from '../../../Floor.jsx'
import { FLOORS, floorStats } from '../../../data/floors.js'

const H = WORLD.hq
const FH = H.floorHeight
const W = H.halfW * 2 + 0.6
const D = H.halfD * 2 + 0.6

// HQ Außenhülle. Das Erdgeschoss zeigt bei Nähe den echten Innenraum aus dem Visual Spike (Zone HQ_INTERIOR),
// sonst einen billigen Glasproxy. Die Etagen darüber sind Massing (Fensterbänder in den Etagenfarben).
// Der Innenraum wird um 180 Grad gedreht, damit seine offene Seite zum Park (bergauf, -Z) zeigt.
export default function HQExterior({ interiorLoaded }) {
  const M = sharedMaterials()
  const stats = useMemo(() => floorStats(FLOORS[0]), [])
  const mats = useMemo(() => {
    const glass = new THREE.MeshStandardMaterial({ color: '#a9dcf5', transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.4, depthWrite: false })
    const wall = new THREE.MeshStandardMaterial({ color: '#f1ebdf', roughness: 0.9 })
    const slab = new THREE.MeshStandardMaterial({ color: '#f6f1e7', roughness: 0.8 })
    const dark = new THREE.MeshStandardMaterial({ color: '#25324a', roughness: 0.5, metalness: 0.3 })
    const trim = FLOORS.map((f) => {
      const m = new THREE.MeshStandardMaterial({ color: f.palette.trim, emissive: f.palette.trim, emissiveIntensity: 0.25, roughness: 0.5 })
      registerNightMaterial(m, { base: 1.6, min: 0.15 })
      return m
    })
    const window_ = new THREE.MeshStandardMaterial({ color: '#8fd3ee', emissive: '#ffe7b0', emissiveIntensity: 0.08, roughness: 0.15, metalness: 0.5 })
    registerNightMaterial(window_, { base: 1.1, min: 0.05 })
    const glowFloor = new THREE.MeshStandardMaterial({ color: '#ffe7c6', emissive: '#ffcf8a', emissiveIntensity: 0.15, roughness: 1 })
    registerNightMaterial(glowFloor, { base: 0.8, min: 0.1 })
    return { glass, wall, slab, dark, trim, window_, glowFloor }
  }, [])
  const sign = useMemo(() => textTexture('HERKULES AI HQ', { w: 1024, h: 160, font: '800 96px system-ui, sans-serif', color: '#fff4e6' }), [])
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false }), [sign])
  const gap = H.doorHalf
  const northSeg = (H.halfW - gap) / 2

  return (
    <group name="hq-tower" userData={{ entityId: 'hq-tower' }}>
      {/* Bodenplatte */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color="#e9e2d3" />
      </mesh>

      {/* Erdgeschoss: Innenraum oder Proxy */}
      {interiorLoaded ? (
        <group rotation={[0, Math.PI, 0]}>
          <Floor floor={FLOORS[0]} stats={stats} />
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[H.halfW * 2 - 0.4, 0.04, H.halfD * 2 - 0.4]} />
            <primitive object={mats.glowFloor} attach="material" />
          </mesh>
          {[-6, -2, 2, 6].map((x) => (
            <mesh key={x} position={[x, 0.8, 1]} castShadow>
              <boxGeometry args={[1.6, 1.6, 0.8]} />
              <meshStandardMaterial color="#c9b79c" />
            </mesh>
          ))}
        </group>
      )}

      {/* Glaswände Nord (mit Tür) und West; massive Wände Süd und Ost wie im Spike */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (gap + northSeg), FH / 2, -H.halfD]} material={mats.glass} renderOrder={3}>
          <boxGeometry args={[northSeg * 2, FH, 0.1]} />
        </mesh>
      ))}
      <mesh position={[-H.halfW, FH / 2, 0]} material={mats.glass} renderOrder={3}>
        <boxGeometry args={[0.1, FH, H.halfD * 2]} />
      </mesh>
      <mesh position={[H.halfW + 0.1, FH / 2, 0]} material={mats.wall} castShadow>
        <boxGeometry args={[0.3, FH, H.halfD * 2 + 0.4]} />
      </mesh>
      <mesh position={[0, FH / 2, H.halfD + 0.1]} material={mats.wall} castShadow>
        <boxGeometry args={[H.halfW * 2 + 0.4, FH, 0.3]} />
      </mesh>
      {/* Türrahmen */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * gap, FH / 2, -H.halfD]} material={mats.dark}>
          <boxGeometry args={[0.16, FH, 0.2]} />
        </mesh>
      ))}
      {/* Vordach und Pfosten */}
      <mesh position={[0, FH - 0.4, -H.halfD - 1.1]} material={mats.dark} castShadow>
        <boxGeometry args={[gap * 2 + 1.6, 0.16, 2.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (gap + 0.6), (FH - 0.4) / 2, -H.halfD - 2.1]} material={M.metal}>
          <boxGeometry args={[0.14, FH - 0.4, 0.14]} />
        </mesh>
      ))}

      {/* Obere Etagen: Massing mit Fensterbändern */}
      {[1, 2, 3].map((i) => (
        <group key={i} position={[0, i * FH, 0]}>
          <mesh position={[0, 0.15, 0]} material={mats.slab} castShadow receiveShadow>
            <boxGeometry args={[W + 0.4, 0.3, D + 0.4]} />
          </mesh>
          <mesh position={[0, 0.3 + (FH - 0.3) / 2, 0]} material={mats.dark} castShadow receiveShadow>
            <boxGeometry args={[W, FH - 0.3, D]} />
          </mesh>
          <mesh position={[0, FH * 0.55, -D / 2 - 0.02]} material={mats.window_}>
            <boxGeometry args={[W - 1.2, 1.9, 0.06]} />
          </mesh>
          <mesh position={[0, FH * 0.55, D / 2 + 0.02]} material={mats.window_}>
            <boxGeometry args={[W - 1.2, 1.9, 0.06]} />
          </mesh>
          <mesh position={[-W / 2 - 0.02, FH * 0.55, 0]} material={mats.window_}>
            <boxGeometry args={[0.06, 1.9, D - 1.2]} />
          </mesh>
          <mesh position={[W / 2 + 0.02, FH * 0.55, 0]} material={mats.window_}>
            <boxGeometry args={[0.06, 1.9, D - 1.2]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={mats.trim[i]}>
            <boxGeometry args={[W + 0.5, 0.1, D + 0.5]} />
          </mesh>
        </group>
      ))}
      {/* Dach mit Etagenfarben als Kranz */}
      <mesh position={[0, 4 * FH + 0.15, 0]} material={mats.slab} castShadow>
        <boxGeometry args={[W + 0.6, 0.3, D + 0.6]} />
      </mesh>
      <mesh position={[0, 4 * FH + 0.4, 0]} material={mats.trim[0]}>
        <boxGeometry args={[W + 0.8, 0.2, D + 0.8]} />
      </mesh>
      <mesh position={[0, 4 * FH + 0.75, 0]} material={M.copper}>
        <boxGeometry args={[W - 3, 0.5, D - 3]} />
      </mesh>
      {/* Schild über dem Eingang */}
      <mesh position={[0, FH + 1.0, -D / 2 - 0.06]} material={signMat}>
        <planeGeometry args={[8.8, 1.4]} />
      </mesh>
      <mesh position={[0, FH + 1.0, -D / 2 - 0.02]} material={mats.dark}>
        <boxGeometry args={[9.2, 1.7, 0.08]} />
      </mesh>
    </group>
  )
}
