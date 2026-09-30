import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { WORLD } from '../config/bergpark.config.js'
import { resolveCollisions, setIndoorColliders, getAllRects } from './collision.js'
import { walkY, conveyorAt, buildIndoorColliders, boomLimit } from '../../indoor/nav/indoorWalk.js'
import { heightAt } from '../terrain/heightField.js'
import { insideHQ } from '../../indoor/config/hq.layout.js'
import { samplePolyline, SURFACE_SPEED } from '../routes/OutdoorRouteSystem.js'
import { TOUR_STOPS, legBetween, lookTarget, stopPosition } from './outdoorTour.js'
import { focus } from '../runtime/focus.js'
import { worldZones } from '../streaming/WorldZoneManager.js'
import { updateWaterAudio } from '../environment/audioAnchors.js'
import OutdoorAvatar from '../agents/OutdoorAvatar.jsx'

const EYE = WORLD.eyeHeight
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const lerpAng = (a, b, t) => a + angDiff(a, b) * t

// Innenkollider einmal registrieren (Wände, Möbel, Treppen, Rolltreppen)
setIndoorColliders(buildIndoorColliders())

export const player = { x: 0, y: 0, z: -12, yaw: Math.PI, activity: 'IDLE', speed: 0, visible: true }

// Kamerasteuerung mit drei Ansichten:
//  tp      Third Person hinter dem Avatar (WASD, Shift = Rennen, Mausziehen = umschauen)
//  fp      First Person auf Augenhöhe
//  tycoon  Übersicht aus der Höhe (OrbitControls)
// Zusätzlich läuft die Begehung (RUN OUTDOOR TOUR) über `api.startTour()`.
export default function CameraController({ mode, settings, api }) {
  const { camera, gl } = useThree()
  const controls = useRef()
  const keys = useRef({})
  const st = useRef({
    heading: Math.PI, pitch: -0.12, vx: 0, vz: 0, y: 0, surf: 0, bob: 0, dist: 5.5,
    savedTycoon: null, prevMode: null, tour: null, camPos: new THREE.Vector3(), init: false,
  })

  const tycoonDefault = useMemo(() => ({ pos: new THREE.Vector3(-250, 190, 130), target: new THREE.Vector3(0, 28, -200) }), [])

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true; if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault() }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    let drag = null
    const el = gl.domElement
    const pd = (e) => { drag = { x: e.clientX, y: e.clientY } }
    const pm = (e) => {
      if (!drag) return
      const s = st.current
      s.heading -= (e.clientX - drag.x) * 0.006
      s.pitch = Math.max(-1.2, Math.min(0.9, s.pitch - (e.clientY - drag.y) * 0.004))
      drag = { x: e.clientX, y: e.clientY }
    }
    const pu = () => { drag = null }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    const wheel = (e) => { st.current.dist = Math.max(2.2, Math.min(14, st.current.dist + e.deltaY * 0.005)) }
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up)
      el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  // API für UI, Tests und Terminal Anbindung
  useEffect(() => {
    api.teleport = (x, z, heading = st.current.heading, pitch = -0.1, y = null) => {
      const s = st.current
      player.x = x; player.z = z; player.yaw = heading
      s.surf = y !== null ? y : heightAt(x, z)
      s.heading = heading; s.pitch = pitch; s.y = s.surf
      s.vx = s.vz = 0
      s.init = true
    }
    api.setTycoonView = (pos, target) => {
      st.current.savedTycoon = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target) }
      if (controls.current && api.mode === 'tycoon') {
        camera.position.set(...pos); controls.current.target.set(...target); controls.current.update()
      }
    }
    api.setView = (pos, target) => { camera.position.set(...pos); camera.lookAt(...target) }
    api.startTour = () => {
      const s = st.current
      const first = TOUR_STOPS[0]
      api.teleport(first.at.x, first.at.z, Math.PI)
      s.tour = { i: 0, phase: 'dwell', t: 0, poly: null, s: 0 }
      api.onTourStart?.()
    }
    api.stopTour = () => { st.current.tour = null; api.onTourStop?.() }
  }, [api, camera])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const s = st.current
    const k = keys.current
    api.mode = mode
    if (!s.init) { s.y = heightAt(player.x, player.z); s.surf = s.y; s.init = true }

    // Moduswechsel: Tycoon Ansicht sichern und wiederherstellen
    if (s.prevMode !== mode) {
      if (s.prevMode === 'tycoon' && controls.current) s.savedTycoon = { pos: camera.position.clone(), target: controls.current.target.clone() }
      if (mode === 'tycoon') {
        const v = s.savedTycoon || tycoonDefault
        camera.position.copy(v.pos)
        camera.up.set(0, 1, 0)
        if (controls.current) { controls.current.target.copy(v.target); controls.current.update() }
        camera.rotation.order = 'XYZ'
      }
      if (mode !== 'tycoon') camera.rotation.order = 'YXZ'
      s.prevMode = mode
    }

    if (mode === 'tycoon') {
      const t = controls.current?.target
      focus.x = t?.x ?? 0; focus.z = t?.z ?? -200; focus.y = t?.y ?? 20; focus.mode = 'tycoon'
      camera.fov = 50
      camera.updateProjectionMatrix()
      worldZones.update(focus.x, focus.z)
      return
    }

    // Begehung (Tour)
    if (s.tour) stepTour(s, dt)
    else stepPlayer(s, dt, k, settings)

    // Kamera setzen
    const eyeY = s.y + EYE + (settings.camBob && !s.tour ? Math.sin(s.bob) * 0.035 * Math.min(1, player.speed / 4) : 0)
    let camHeading = s.heading
    let camPitch = s.pitch
    if (mode === 'fp' || s.tour) {
      camera.position.set(player.x, eyeY, player.z)
      player.visible = false
    } else {
      // Third Person: Kamera hinter dem Avatar, Kollision mit dem Boden verhindert Eintauchen
      player.visible = true
      const indoors = insideHQ(player.x, player.z, 0.5)
      const dxk = -Math.sin(camHeading) * Math.cos(camPitch)
      const dzk = -Math.cos(camHeading) * Math.cos(camPitch)
      const d = indoors ? boomLimit(getAllRects(), player.x, player.z, s.surf, dxk, dzk, s.dist) : s.dist
      const cx = player.x + dxk * d
      const cz = player.z + dzk * d
      let cy = s.y + 1.55 - Math.sin(camPitch) * d
      const g = (insideHQ(cx, cz, 0.2) ? walkY(cx, cz, s.surf) : heightAt(cx, cz)) + 0.5
      if (cy < g) cy = g
      if (indoors && insideHQ(cx, cz, 0.2)) cy = Math.min(cy, (s.surf > 2.2 ? 4.5 : 0) + 4.0)
      const kk = settings.smoothing ? 1 - Math.exp(-dt * 14) : 1
      s.camPos.lerp(new THREE.Vector3(cx, cy, cz), s.camPos.lengthSq() === 0 ? 1 : kk)
      camera.position.copy(s.camPos)
      const ty = s.y + 1.5
      camera.lookAt(player.x, ty, player.z)
      camHeading = null
    }
    if (camHeading !== null) {
      camera.rotation.set(camPitch, camHeading + Math.PI, 0, 'YXZ')
    }
    if (camera.fov !== settings.fov) { camera.fov = settings.fov; camera.updateProjectionMatrix() }
    focus.x = player.x; focus.z = player.z; focus.y = s.y + EYE; focus.heading = s.heading; focus.mode = mode
    worldZones.update(player.x, player.z)
    updateWaterAudio({ x: player.x, y: s.y + EYE, z: player.z }, s.heading)
  })

  function stepPlayer(s, dt, k, set) {
    const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const side = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0)
    const turn = (k.ArrowLeft || k.KeyQ ? 1 : 0) - (k.ArrowRight || k.KeyE ? 1 : 0)
    s.heading += turn * dt * 1.8
    const run = k.ShiftLeft || k.ShiftRight
    const target = (run ? 9.5 : 4.6) * (fwd || side ? 1 : 0)
    const fx = Math.sin(s.heading)
    const fz = Math.cos(s.heading)
    // rechts = (-fz, fx) wie im Routensystem
    let dx = fx * fwd + -fz * side
    let dz = fz * fwd + fx * side
    const l = Math.hypot(dx, dz)
    if (l > 0) { dx /= l; dz /= l }
    const a = set.smoothing ? 1 - Math.exp(-dt * 10) : 1
    s.vx += (dx * target - s.vx) * a
    s.vz += (dz * target - s.vz) * a
    player.x += s.vx * dt
    player.z += s.vz * dt
    const belt = conveyorAt(player.x, player.z, s.surf)
    if (belt) player.z += belt.dz * dt
    resolveCollisions(player, 0.4, s.surf)
    const sp = Math.hypot(s.vx, s.vz)
    player.speed = sp
    // Ausrichtung des Avatars: in Laufrichtung, bei Stillstand beibehalten
    if (sp > 0.4) player.yaw = lerpAng(player.yaw, Math.atan2(s.vx, s.vz), 1 - Math.exp(-dt * 12))
    player.activity = belt && sp < 1 ? 'IDLE' : sp > 6.5 ? 'RUN' : sp > 0.4 ? 'WALK' : 'IDLE'
    s.bob += dt * sp * 2.2
    s.surf = walkY(player.x, player.z, s.surf)
    s.y += (s.surf - s.y) * (1 - Math.exp(-dt * 16))
    player.y = s.y
  }

  function stepTour(s, dt) {
    const T = s.tour
    const stop = TOUR_STOPS[T.i]
    const look = lookTarget(stop)
    const eye = s.y + EYE
    const wantH = Math.atan2(look.x - player.x, look.z - player.z)
    const wantP = Math.atan2(look.y - eye, Math.hypot(look.x - player.x, look.z - player.z))
    if (T.phase === 'dwell') {
      T.t += dt
      s.heading = lerpAng(s.heading, wantH, 1 - Math.exp(-dt * 2.5))
      s.pitch += (Math.max(-0.4, Math.min(1.1, wantP)) - s.pitch) * (1 - Math.exp(-dt * 2.5))
      player.speed = 0
      if (T.t >= stop.dwell) {
        if (T.i >= TOUR_STOPS.length - 1) { s.tour = null; api.onTourStop?.(); return }
        T.i++
        T.poly = legBetween({ x: player.x, z: player.z }, TOUR_STOPS[T.i])
        T.s = 0
        T.phase = 'walk'
        T.t = 0
        api.onTourStep?.(TOUR_STOPS[T.i], T.i)
      }
      return
    }
    // gehen
    const p = samplePolyline(T.poly, T.s)
    const sp = 17 * (SURFACE_SPEED[p.surface] || 1)
    T.s += sp * dt
    const rem = T.poly.length - T.s
    const q = samplePolyline(T.poly, Math.min(T.s, T.poly.length))
    player.x = q.x; player.z = q.z
    s.surf = heightAt(q.x, q.z)
    s.y += (s.surf - s.y) * (1 - Math.exp(-dt * 12))
    player.y = s.y
    player.speed = sp
    player.yaw = q.yaw
    const w = Math.min(1, Math.max(0, 1 - rem / 28))
    s.heading = lerpAng(s.heading, lerpAng(q.yaw, wantH, w * w * (3 - 2 * w)), 1 - Math.exp(-dt * 4))
    s.pitch += (Math.max(-0.4, Math.min(1.1, wantP)) * w - s.pitch) * (1 - Math.exp(-dt * 2))
    if (rem <= 0.05) { T.phase = 'dwell'; T.t = 0 }
  }

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={mode === 'tycoon'}
        enablePan
        minDistance={25}
        maxDistance={900}
        maxPolarAngle={1.5}
        target={[0, 28, -200]}
      />
      <OutdoorAvatar state={player} shirt="#ff8a3d" hair="#2b2118" skin={1} />
    </>
  )
}

export { stopPosition }
