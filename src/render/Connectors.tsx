import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { CanvasTexture, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, RepeatWrapping, SRGBColorSpace } from 'three'
import { ESC_SPEED, escalatorSink, escalatorStepPositions } from '../world/escalator'
import { connectors, laneLength, type Connector } from '../world/connectors'
import { FLOOR_H, floorBaseY } from '../world/constants'
import { BUILDING } from '../world/buildingConfig'
import { GEO } from './materials'

const stepMat = new MeshLambertMaterial({ color: '#c9c4b8' })
const treadMat = new MeshLambertMaterial({ color: '#2b2f38' })
const metalMat = new MeshStandardMaterial({ color: '#8b93a3', metalness: 0.7, roughness: 0.35 })
const darkMat = new MeshLambertMaterial({ color: '#20242d' })
const glassMat = new MeshStandardMaterial({ color: '#bfe4f0', transparent: true, opacity: 0.22, roughness: 0.06, metalness: 0.2, depthWrite: false })
const _o = new Object3D()

const levelOf = (id: string) => BUILDING.floors.find((f) => f.id === id)!.level

/** Geometrie einer Steigung in Weltkoordinaten */
function geom(c: Connector) {
  const y0 = floorBaseY(levelOf(c.lower)), y1 = floorBaseY(levelOf(c.upper))
  const L = laneLength(c)
  const H = y1 - y0
  const dir = Math.sign(c.xHigh - c.xLow)
  const angle = Math.atan2(H, L) * dir // Drehung um z, damit die lokale x Achse der Steigung folgt
  const len = Math.hypot(L, H)
  return { y0, y1, L, H, dir, angle, len, cx: (c.xLow + c.xHigh) / 2, cy: (y0 + y1) / 2, cz: (c.lane.z0 + c.lane.z1) / 2, w: c.lane.z1 - c.lane.z0 }
}

/** Massive Treppe: Stufen als volle Blöcke vom Boden bis zur Trittfläche, dazu Brüstung und Handlauf. */
function Stairs({ c }: { c: Connector }) {
  const g = geom(c)
  const N = 26
  const mesh = useMemo(() => {
    const m = new InstancedMesh(GEO.box, stepMat, N)
    const tread = g.L / N, rise = g.H / N
    for (let i = 0; i < N; i++) {
      const h = rise * (i + 1)
      _o.position.set(c.xLow + g.dir * (i + 0.5) * tread, g.y0 + h / 2, g.cz)
      _o.rotation.set(0, 0, 0)
      _o.scale.set(tread, h, g.w - 0.1)
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    }
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false
    return m
  }, [c, g.L, g.H, g.dir, g.cz, g.w, g.y0])
  return (
    <group>
      <primitive object={mesh} />
      {[-1, 1].map((s) => (
        <group key={s} position={[g.cx, g.cy, g.cz + s * (g.w / 2 - 0.04)]} rotation-z={g.angle}>
          <mesh position={[0, 1.0, 0]}><boxGeometry args={[g.len, 0.9, 0.04]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[g.len, 0.06, 0.08]} /><primitive object={metalMat} attach="material" /></mesh>
        </group>
      ))}
      <mesh position={[g.cx, g.cy + 0.02, g.cz]} rotation-z={g.angle}>
        <boxGeometry args={[g.len, 0.02, g.w - 0.1]} /><primitive object={treadMat} attach="material" />
      </mesh>
    </group>
  )
}

// --- Rolltreppe ------------------------------------------------------------------------------

/** Trittfläche: dunkle Rillen längs der Fahrtrichtung, damit man die Bewegung sieht. */
let grooveTex: CanvasTexture | null = null
function getGrooveTexture() {
  if (grooveTex) return grooveTex
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#4a4f5a'; g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#1d2027'
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 4, 64)
  grooveTex = new CanvasTexture(c)
  grooveTex.wrapS = grooveTex.wrapT = RepeatWrapping
  grooveTex.colorSpace = SRGBColorSpace
  return grooveTex
}
/** Handlauf: schwarzer Gummi mit hellen Marken, die mitlaufen. */
function makeRailTexture() {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 16
  const g = c.getContext('2d')!
  g.fillStyle = '#15171d'; g.fillRect(0, 0, 128, 16)
  g.fillStyle = '#5b6070'
  for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 8, 16)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}
const edgeMat = new MeshBasicMaterial({ color: '#f2c400' })
const riserMat = new MeshLambertMaterial({ color: '#2a2d35' })
const combMat = new MeshStandardMaterial({ color: '#b8bfcc', metalness: 0.6, roughness: 0.4 })
const N_STEPS = 26

/**
 * Rolltreppe als Endlosband: waagerechte Stufen mit gelber Kante und Steigung, die kontinuierlich wandern und an
 * beiden Enden unter der Kammplatte verschwinden. Der Handlauf läuft sichtbar mit.
 */
function Escalator({ c }: { c: Connector }) {
  const g = geom(c)
  const upDir: 1 | -1 = c.auto === 'down' ? -1 : 1
  const stepLen = g.L / N_STEPS
  const rise = g.H / N_STEPS
  const { treads, edges, risers, railMat } = useMemo(() => {
    const tex = getGrooveTexture().clone()
    tex.repeat.set(1, 1); tex.needsUpdate = true
    const tm = new MeshLambertMaterial({ color: '#ffffff', map: tex })
    const mk = (mat: MeshLambertMaterial | MeshBasicMaterial) => { const m = new InstancedMesh(GEO.box, mat, N_STEPS); m.castShadow = true; m.frustumCulled = false; return m }
    const rt = makeRailTexture()
    rt.repeat.set(g.len / 0.6, 1)
    const rm = new MeshLambertMaterial({ color: '#ffffff', map: rt })
    return { treads: mk(tm), edges: mk(edgeMat), risers: mk(riserMat), railMat: rm }
  }, [g.len])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = escalatorStepPositions(N_STEPS, g.L, t, upDir)
    for (let i = 0; i < N_STEPS; i++) {
      const s = pos[i]
      const sink = escalatorSink(s)
      const x = c.xLow + (c.xHigh - c.xLow) * s
      const y = g.y0 + s * g.H - sink * 0.32
      const back = -g.dir * (stepLen / 2 - 0.02) // hintere (untere) Kante der Stufe
      _o.rotation.set(0, 0, 0)
      _o.position.set(x, y - 0.025, g.cz); _o.scale.set(stepLen * 0.97, 0.05, g.w - 0.16); _o.updateMatrix(); treads.setMatrixAt(i, _o.matrix)
      _o.position.set(x + back, y + 0.002, g.cz); _o.scale.set(0.045, 0.012, g.w - 0.16); _o.updateMatrix(); edges.setMatrixAt(i, _o.matrix)
      _o.position.set(x + back, y - rise / 2 - 0.05, g.cz); _o.scale.set(0.025, rise, g.w - 0.16); _o.updateMatrix(); risers.setMatrixAt(i, _o.matrix)
    }
    treads.instanceMatrix.needsUpdate = edges.instanceMatrix.needsUpdate = risers.instanceMatrix.needsUpdate = true
    // Handlauf läuft mit den Stufen: Textur wandert entlang der lokalen x Achse, die bei dir = -1 bergab zeigt
    const map = railMat.map!
    map.offset.x = (-(upDir * g.dir) * ESC_SPEED * t) / 0.6 % 1
  })
  const endX = (end: 0 | 1) => c.xLow + (c.xHigh - c.xLow) * end
  return (
    <group>
      <primitive object={treads} /><primitive object={edges} /><primitive object={risers} />
      {/* Kammplatten an beiden Enden, bündig mit dem Boden */}
      {([0, 1] as const).map((e) => (
        <mesh key={e} position={[endX(e) - g.dir * (e === 0 ? -0.22 : 0.22), (e === 0 ? g.y0 : g.y1) - 0.012, g.cz]}>
          <boxGeometry args={[0.5, 0.03, g.w - 0.06]} /><primitive object={combMat} attach="material" />
        </mesh>
      ))}
      {/* Unterbau */}
      <mesh position={[g.cx, g.cy - 0.42, g.cz]} rotation-z={g.angle}><boxGeometry args={[g.len, 0.34, g.w - 0.06]} /><primitive object={darkMat} attach="material" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[g.cx, g.cy, g.cz + s * (g.w / 2 - 0.03)]} rotation-z={g.angle}>
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[g.len, 0.7, 0.05]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, 0.8, 0]}><boxGeometry args={[g.len + 0.5, 0.09, 0.12]} /><primitive object={railMat} attach="material" /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[g.len, 0.08, 0.09]} /><primitive object={metalMat} attach="material" /></mesh>
        </group>
      ))}
    </group>
  )
}

/** Alle Verbinder zwischen zwei Etagen. Wird nur gerendert, wenn beide Etagen sichtbar sind. */
export function Connectors({ lowerId, upperId }: { lowerId: string; upperId: string }) {
  return (
    <group>
      {connectors.filter((c) => c.lower === lowerId && c.upper === upperId).map((c) => (
        c.kind === 'stairs' ? <Stairs key={c.id} c={c} /> : <Escalator key={c.id} c={c} />
      ))}
    </group>
  )
}
export { FLOOR_H }
