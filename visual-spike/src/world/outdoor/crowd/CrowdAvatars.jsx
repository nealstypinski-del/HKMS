import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGlb, preloadGlb } from '../common/glbLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { STATUS } from '../../../theme.js'
import { computePose } from './pose.js'

const SCALE = 1.19 // Blender Figur 1,51 m hoch, Zielgröße etwa 1,8 m

// Gelenkpunkte der Blender Figur (Modellraum). Die Figur hat starre Glieder ohne Knie, daher sind Sitz und Lauf stilisiert (wie in den Sims).
const PARTS = [
  { id: 'legL', pivot: [-0.11, 0.43, 0], nodes: { leg: 'pants', shoe: 'shoe' } },
  { id: 'legR', pivot: [0.11, 0.43, 0], nodes: { 'leg.001': 'pants', 'shoe.001': 'shoe' } },
  { id: 'armL', pivot: [-0.28, 0.83, 0], nodes: { arm: 'shirt' }, hand: [-0.28, 0.44, 0.0] },
  { id: 'armR', pivot: [0.28, 0.83, 0], nodes: { 'arm.001': 'shirt' }, hand: [0.28, 0.44, 0.0] },
  { id: 'torso', pivot: [0, 0.42, 0], nodes: { torso: 'shirt' } },
  { id: 'head', pivot: [0, 0.83, 0], nodes: { head: 'skin', hair: 'hair', 'eye.010': 'eye', 'eye.011': 'eye' } },
]
const TINT = { shirt: 'shirt', pants: 'pants', hair: 'hair', skin: 'skin' }

const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _one = new THREE.Vector3(1, 1, 1)
const _s = new THREE.Vector3()
const M = { root: new THREE.Matrix4(), torso: new THREE.Matrix4(), tmp: new THREE.Matrix4(), out: new THREE.Matrix4() }
const C = new THREE.Color()

// Lokale Transformation eines Gelenks: Position (Pivot) und Drehung x, y, z
function jointMatrix(out, px, py, pz, rx, ry, rz, s = _one) {
  _e.set(rx, ry, rz, 'YXZ')
  _q.setFromEuler(_e)
  _p.set(px, py, pz)
  return out.compose(_p, _q, s)
}

// Ein Drawcall pro Teil und Material für ALLE Figuren (Spieler und Agenten). Farben je Figur als Instanzfarbe.
export default function CrowdAvatars({ list, capacity = 160, shadows = true }) {
  const gltf = useGlb('character_rigid')
  const meshes = useRef({})
  const pose = useRef({})
  const time = useRef(0)

  const parts = useMemo(() => {
    const byName = {}
    const nk = (n) => n.replace(/[._]/g, '') // GLTFLoader entfernt Punkte aus Knotennamen
    gltf.scene.traverse((o) => { if (o.isMesh) byName[nk(o.name)] = o })
    const matByName = {}
    gltf.scene.traverse((o) => { if (o.isMesh) matByName[o.material.name] = o.material })
    const out = []
    for (const P of PARTS) {
      const byMat = {}
      for (const [node, mat] of Object.entries(P.nodes)) {
        const g = byName[nk(node)].geometry.clone()
        g.translate(-P.pivot[0], -P.pivot[1], -P.pivot[2])
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k)
        ;(byMat[mat] ||= []).push(g)
      }
      if (P.hand) {
        const h = new THREE.BoxGeometry(0.11, 0.11, 0.11).toNonIndexed()
        h.translate(P.hand[0] - P.pivot[0], P.hand[1] - P.pivot[1], P.hand[2] - P.pivot[2])
        for (const k of Object.keys(h.attributes)) if (!['position', 'normal'].includes(k)) h.deleteAttribute(k)
        ;(byMat.skin ||= []).push(h)
      }
      for (const [mat, gs] of Object.entries(byMat)) {
        const geo = gs.length > 1 ? mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g))) : gs[0]
        const base = matByName[mat] || matByName.skin
        const m = base.clone()
        m.roughness = 0.75; m.metalness = 0.0
        if (TINT[mat]) m.color.set('#ffffff')
        out.push({ key: `${P.id}-${mat}`, part: P, mat, geo, material: m, tint: TINT[mat] })
      }
    }
    return out
  }, [gltf])

  useEffect(() => { for (const k of Object.keys(meshes.current)) meshes.current[k].frustumCulled = false }, [parts])

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    time.current += dt
    const t = clock.elapsedTime
    let n = 0
    for (let i = 0; i < list.length && n < capacity; i++) {
      const a = list[i]
      if (a.visible === false || a.cull) continue
      const sp = a.speed || 0
      a.phase = (a.phase || a.seed * 6) + dt * (a.activity === 'RUN' ? Math.max(6, sp * 2.4) : a.activity === 'WALK' ? Math.max(4, sp * 3.2) : 1) * (a.timeScale || 1)
      const P = computePose(a, t * (a.timeScale || 1), pose.current)
      const sc = SCALE * (a.height || 1)
      const seatDrop = 0
      // Wurzel: Position, Blickrichtung, Größe
      _p.set(a.x, a.y + P.bob * sc + seatDrop, a.z)
      _e.set(0, a.yaw, 0)
      _q.setFromEuler(_e)
      _s.set(sc, sc, sc)
      M.root.compose(_p, _q, _s)
      // Torso mit Neigung und Drehung
      jointMatrix(M.torso, 0, 0.42, 0, P.lean, P.twist, 0)
      M.torso.premultiply(M.root)
      // Blinzeln: Augen kurz zu
      const blink = ((t * (a.timeScale || 1) + a.seed * 13) % 4.3) < 0.12 ? 0.1 : 1
      for (const R of parts) {
        const id = R.part.id
        let m
        if (id === 'legL') m = jointMatrix(M.out, -0.11, 0.43, 0, P.legL, 0, 0).premultiply(M.root)
        else if (id === 'legR') m = jointMatrix(M.out, 0.11, 0.43, 0, P.legR, 0, 0).premultiply(M.root)
        else if (id === 'torso') m = M.out.copy(M.torso)
        else if (id === 'armL') m = jointMatrix(M.out, -0.28, 0.41, 0, P.armLx, 0, P.armLz).premultiply(M.torso)
        else if (id === 'armR') m = jointMatrix(M.out, 0.28, 0.41, 0, P.armRx, 0, P.armRz).premultiply(M.torso)
        else { // head
          m = jointMatrix(M.out, 0, 0.41, 0, P.headX, P.headY, 0, R.mat === 'eye' ? _s.set(1, blink, 1) : _one).premultiply(M.torso)
        }
        const mesh = meshes.current[R.key]
        if (!mesh) continue
        mesh.setMatrixAt(n, m)
        if (R.tint) {
          C.set(a.look[R.tint])
          mesh.setColorAt(n, C)
        }
      }
      n++
    }
    for (const R of parts) {
      const mesh = meshes.current[R.key]
      if (!mesh) continue
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  })

  return (
    <group name="crowd">
      {parts.map((R) => (
        <instancedMesh key={R.key} ref={(el) => { if (el) meshes.current[R.key] = el }} args={[R.geo, R.material, capacity]} castShadow={shadows} frustumCulled={false} />
      ))}
    </group>
  )
}

preloadGlb('character_rigid')

// Stimmungsfarbe aus dem Status der Etagendaten (theme.js)
export const statusColor = (s) => (STATUS[s] ? STATUS[s].color : '#dfe6f2')
