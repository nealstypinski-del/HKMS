import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_H, HALF_X, HALF_Z, DOOR_HALF } from './world.js'
import { Pod } from './Furniture.jsx'

const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#8fc4ff', transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0.15, side: THREE.DoubleSide, depthWrite: false,
})
const frameMat = new THREE.MeshStandardMaterial({ color: '#56617e', roughness: 0.5, metalness: 0.5 })
const bandMat = new THREE.MeshStandardMaterial({ color: '#1c2234', roughness: 0.6, metalness: 0.4 })

function textTexture(text, color = '#fff', bg = null) {
  const cv = document.createElement('canvas')
  cv.width = 1024
  cv.height = 160
  const g = cv.getContext('2d')
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 1024, 160) }
  g.fillStyle = color
  g.font = '800 96px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 512, 84)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Glasfassade eines Hochhauses. `top` = sichtbare Höhe, `door` = Eingang an der Vorderseite im Erdgeschoss.
export function Facade({ top, hideFront = false }) {
  const W = HALF_X * 2 + 0.3
  const D = HALF_Z * 2 + 0.3
  const cols = useMemo(() => {
    const out = []
    for (let x = -HALF_X; x <= HALF_X + 0.01; x += 1.5) out.push([x, HALF_Z + 0.1], [x, -HALF_Z - 0.1])
    for (let z = -HALF_Z + 1.5; z < HALF_Z - 0.1; z += 1.5) out.push([HALF_X + 0.1, z], [-HALF_X - 0.1, z])
    return out.filter(([x, z]) => !(z > 0 && (hideFront || (Math.abs(x) < DOOR_HALF + 0.05 && Math.abs(x) > 0.01))))
  }, [top, hideFront])
  const bands = Math.round(top / FLOOR_H)
  const doorTop = 3.3
  const sideW = HALF_X - DOOR_HALF
  return (
    <group>
      {/* Glasflächen */}
      <mesh position={[0, top / 2, -HALF_Z - 0.1]} material={glassMat}><planeGeometry args={[W, top]} /></mesh>
      <mesh position={[-HALF_X - 0.1, top / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={glassMat}><planeGeometry args={[D, top]} /></mesh>
      <mesh position={[HALF_X + 0.1, top / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={glassMat}><planeGeometry args={[D, top]} /></mesh>
      {!hideFront && [-1, 1].map((k) => (
        <mesh key={k} position={[k * (DOOR_HALF + sideW / 2 + 0.05), top / 2, HALF_Z + 0.1]} material={glassMat}>
          <planeGeometry args={[sideW + 0.1, top]} />
        </mesh>
      ))}
      {!hideFront && top > doorTop && (
        <mesh position={[0, doorTop + (top - doorTop) / 2, HALF_Z + 0.1]} material={glassMat}>
          <planeGeometry args={[DOOR_HALF * 2, top - doorTop]} />
        </mesh>
      )}
      {/* Fensterpfosten */}
      {cols.map(([x, z], i) => (
        <mesh key={i} position={[x, top / 2, z]} material={frameMat}><boxGeometry args={[0.06, top, 0.06]} /></mesh>
      ))}
      {/* Deckenbänder auf jeder Etage */}
      {Array.from({ length: bands }, (_, i) => (i + 1) * FLOOR_H - 0.3).map((y) => (
        <group key={y}>
          {!hideFront && <mesh position={[0, y, HALF_Z + 0.12]} material={bandMat}><boxGeometry args={[W, 0.5, 0.14]} /></mesh>}
          <mesh position={[0, y, -HALF_Z - 0.12]} material={bandMat}><boxGeometry args={[W, 0.5, 0.14]} /></mesh>
          <mesh position={[HALF_X + 0.12, y, 0]} material={bandMat}><boxGeometry args={[0.14, 0.5, D]} /></mesh>
          <mesh position={[-HALF_X - 0.12, y, 0]} material={bandMat}><boxGeometry args={[0.14, 0.5, D]} /></mesh>
        </group>
      ))}
      {/* Türrahmen */}
      {!hideFront && <mesh position={[0, doorTop, HALF_Z + 0.12]} material={frameMat}><boxGeometry args={[DOOR_HALF * 2 + 0.2, 0.15, 0.14]} /></mesh>}
      {!hideFront && [-1, 1].map((k) => (
        <mesh key={k} position={[k * DOOR_HALF, doorTop / 2, HALF_Z + 0.12]} material={frameMat}><boxGeometry args={[0.12, doorTop, 0.14]} /></mesh>
      ))}
    </group>
  )
}

// Beschriftungen am Haus: Schild über dem Eingang und Schrift auf dem Dach
export function Signs({ showRoof, topY, showDoor = true }) {
  const door = useMemo(() => textTexture('HERKULES HQ', '#ffd9a8'), [])
  const roof = useMemo(() => textTexture('HERKULES HQ · KI-ZENTRALE', '#ffffff'), [])
  return (
    <group>
      {showDoor && (
        <>
          <mesh position={[0, 3.85, HALF_Z + 0.3]}>
            <planeGeometry args={[6, 0.94]} />
            <meshBasicMaterial map={door} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, 3.85, HALF_Z + 0.25]}>
            <boxGeometry args={[6.2, 1.0, 0.1]} />
            <meshStandardMaterial color="#0b0d12" />
          </mesh>
        </>
      )}
      {showRoof && (
        <mesh position={[0, topY + 1.2, HALF_Z - 0.4]}>
          <planeGeometry args={[14, 2.2]} />
          <meshBasicMaterial map={roof} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

const STATUS_COL = { working: '#3ddc84', waiting: '#ffc94d', error: '#ff5c5c', available: '#dfe6f2', meeting: '#4da3ff' }

// Vereinfachte Etage für die Sicht durch die Glasfassade (ohne Figuren-Modelle und Beschriftungen)
export function LiteFloor({ floor }) {
  const pal = floor.palette
  return (
    <group>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[HALF_X * 2, 0.2, HALF_Z * 2]} />
        <meshStandardMaterial color={pal.floor} />
      </mesh>
      {(floor.pods || []).filter((p) => p.type === 'wall').map((p, i) => <Pod key={i} {...p} />)}
      {floor.desks.map((d, i) => (
        <group key={i} position={[d.x, 0, d.z]}>
          <mesh position={[0, 0.72, 0]}><boxGeometry args={[1.7, 0.06, 0.85]} /><meshStandardMaterial color="#efe7d8" /></mesh>
          <mesh position={[0, 1.1, -0.2]}><boxGeometry args={[0.8, 0.4, 0.04]} /><meshBasicMaterial color={pal.screen} toneMapped={false} /></mesh>
          <mesh position={[0, 0.7, 0.95]}><capsuleGeometry args={[0.2, 0.5, 3, 6]} /><meshStandardMaterial color={STATUS_COL[d.agent[2]]} /></mesh>
        </group>
      ))}
      <pointLight position={[0, 3.6, 0]} intensity={18} distance={16} color="#ffe6c4" />
    </group>
  )
}
