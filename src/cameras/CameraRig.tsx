import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { BUILDING } from '../world/buildingConfig'
import { FLOOR_H, HALF_D, HALF_W, floorBaseY } from '../world/constants'
import { getFloor } from '../world/generate'
import { getNav } from '../world/nav'
import { player } from '../world/player'
import { sim } from '../world/sim'
import { useWorld, type CameraMode } from '../world/store'
import { movePlayerStep, type MoveHooks } from '../world/playerMove'
import { angleDiff } from '../world/angles'
import { nearElevator } from '../world/elevatorUse'
import { virtualInput } from '../world/virtualInput'
import { isOutside, walkable } from '../world/walk'
import { cameraWallClamp, WALL_TOP } from '../world/cameraClamp'

/**
 * Ein Rig für alle Kameramodi. Jeder Modus liefert nur eine Zielpose (Ziel, Abstand, Winkel),
 * die Übergänge dämpft der Rig einheitlich. Ego ist der Sonderfall mit direkter Steuerung.
 * Third Person und Ego teilen sich dieselbe Spielerbewegung (Kollision, Treppe, Rolltreppe).
 */
interface Orbit { yaw: number; pitch: number; dist: number }
type OrbitMode = Exclude<CameraMode, 'firstPerson'>
const LIMITS: Record<OrbitMode, { dMin: number; dMax: number; pMin: number; pMax: number }> = {
  building: { dMin: 45, dMax: 260, pMin: 0.04, pMax: 1.4 },
  tycoon: { dMin: 8, dMax: 62, pMin: 0.3, pMax: 1.35 },
  follow: { dMin: 2.6, dMax: 16, pMin: 0.05, pMax: 1.3 },
  thirdPerson: { dMin: 2.2, dMax: 14, pMin: -0.05, pMax: 1.3 },
}
const DEFAULTS: Record<OrbitMode, Orbit> = {
  building: { yaw: 0.7, pitch: 0.32, dist: 118 },
  tycoon: { yaw: 0.0, pitch: 0.95, dist: 54 },
  follow: { yaw: 0, pitch: 0.42, dist: 6 },
  thirdPerson: { yaw: 0, pitch: 0.3, dist: 5.6 },
}
const EYE = 1.62
const _t = new Vector3(), _p = new Vector3(), _look = new Vector3()

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const orbits = useRef<Record<string, Orbit>>({
    building: { ...DEFAULTS.building }, tycoon: { ...DEFAULTS.tycoon }, follow: { ...DEFAULTS.follow },
    thirdPerson: { ...DEFAULTS.thirdPerson }, character: { yaw: 0.4, pitch: 0.12, dist: 3.4 },
  })
  const pan = useRef({ x: 0, z: 0 })
  const cur = useRef({ pos: new Vector3(0, 60, 60), look: new Vector3(0, 0, 0), init: false })
  const fp = useRef({ yaw: Math.PI, pitch: 0, enterT: 0, lastMode: '' as string })
  const keys = useRef(new Set<string>())
  const drag = useRef({ active: false, button: 0, x: 0, y: 0, moved: 0, lastUser: 0 })
  const lastFloor = useRef('')
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const lastRotate = useRef(0)

  // Eingaben ---------------------------------------------------------------------------------
  useEffect(() => {
    const el = gl.domElement
    const inField = (t: EventTarget | null) => t instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(t.tagName)
    const kd = (e: KeyboardEvent) => {
      if (inField(e.target)) return
      const k = e.key.toLowerCase()
      keys.current.add(k)
      const st = useWorld.getState()
      if (k === 'e' && (st.cameraMode === 'firstPerson' || st.cameraMode === 'thirdPerson')) {
        if (nearElevator(st.floorId, player.x, player.z)) { st.setElevator(true); st.select({ type: 'elevator', id: st.floorId }); if (document.pointerLockElement) document.exitPointerLock() }
      }
      if (k === 'escape') { st.setElevator(false); st.setPanel(null); st.setMap(false) }
    }
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const blur = () => keys.current.clear()
    const down = (e: PointerEvent) => {
      const st = useWorld.getState()
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = Math.hypot(a.x - b.x, a.y - b.y) }
      drag.current = { active: true, button: e.button, x: e.clientX, y: e.clientY, moved: 0, lastUser: performance.now() }
      if (st.cameraMode === 'firstPerson' && !document.pointerLockElement && el.requestPointerLock) {
        // Kann als Promise abgelehnt werden (z. B. ohne Nutzeraktion oder in einem Rahmen): nie unbehandelt lassen.
        try { Promise.resolve(el.requestPointerLock()).catch(() => { /* abgelehnt: Ziehen zum Umsehen bleibt möglich */ }) } catch { /* nicht verfügbar */ }
      }
    }
    const move = (e: PointerEvent) => {
      const st = useWorld.getState()
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // Zwei Finger: Zoom statt Drehen
      if (pointers.current.size >= 2 && st.cameraMode !== 'firstPerson') {
        const [a, b] = [...pointers.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch.current > 10 && dist > 10) {
          const key = st.panel === 'character' ? 'character' : st.cameraMode
          const o = orbits.current[key]
          const lim = LIMITS[st.cameraMode as OrbitMode] ?? LIMITS.follow
          const min = key === 'character' ? 1.6 : lim.dMin, max = key === 'character' ? 7 : lim.dMax
          o.dist = Math.max(min, Math.min(max, o.dist * (pinch.current / dist)))
        }
        pinch.current = dist
        return
      }
      const d = drag.current
      const locked = document.pointerLockElement === el
      if (st.cameraMode === 'firstPerson') {
        if (!locked && !d.active) return
        const mx = locked ? e.movementX : e.clientX - d.x, my = locked ? e.movementY : e.clientY - d.y
        d.x = e.clientX; d.y = e.clientY
        fp.current.yaw -= mx * 0.0025
        fp.current.pitch = Math.max(-1.3, Math.min(1.3, fp.current.pitch - my * 0.0025))
        return
      }
      if (!d.active) return
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy); d.lastUser = performance.now()
      const key = st.panel === 'character' ? 'character' : st.cameraMode
      const o = orbits.current[key]
      const lim = LIMITS[st.cameraMode as OrbitMode] ?? LIMITS.follow
      if ((d.button === 2 || d.button === 1 || e.shiftKey) && st.cameraMode === 'tycoon') {
        const s = o.dist * 0.0016
        const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw)
        pan.current.x = Math.max(-HALF_W, Math.min(HALF_W, pan.current.x - (dx * cy + dy * sy) * s))
        pan.current.z = Math.max(-HALF_D, Math.min(HALF_D, pan.current.z + (dx * sy - dy * cy) * s))
      } else {
        o.yaw -= dx * 0.006
        o.pitch = Math.max(lim.pMin, Math.min(lim.pMax, o.pitch + dy * 0.005))
      }
    }
    const up = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = 0
      drag.current.active = pointers.current.size > 0 ? drag.current.active : false
    }
    const wheel = (e: WheelEvent) => {
      const st = useWorld.getState()
      if (st.cameraMode === 'firstPerson') return
      e.preventDefault()
      if (!Number.isFinite(e.deltaY)) return
      const key = st.panel === 'character' ? 'character' : st.cameraMode
      const o = orbits.current[key]
      const lim = LIMITS[st.cameraMode as OrbitMode] ?? LIMITS.follow
      const min = key === 'character' ? 1.6 : lim.dMin, max = key === 'character' ? 7 : lim.dMax
      o.dist = Math.max(min, Math.min(max, o.dist * Math.exp(e.deltaY * 0.001)))
    }
    const ctx = (e: Event) => e.preventDefault()
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', ctx)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', blur) // Tab im Hintergrund: keine hängenden Tasten
    return () => {
      document.removeEventListener('visibilitychange', blur)
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel); el.removeEventListener('contextmenu', ctx)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur)
    }
  }, [gl])

  const mode = useWorld((s) => s.cameraMode)
  useEffect(() => { if (mode !== 'firstPerson' && document.pointerLockElement) document.exitPointerLock() }, [mode])

  /** Gemeinsame Spielerbewegung (Logik in world/playerMove.ts). dirX/dirZ: Bewegungsrichtung in Weltkoordinaten. */
  const hooks = useMemo<MoveHooks>(() => ({
    switchFloor: (id) => useWorld.getState().switchFloorSilent(id),
    setClimbing: (b) => useWorld.getState().setClimbing(b),
    isClimbing: () => useWorld.getState().climbing,
  }), [])
  const movePlayer = (dt: number, dirX: number, dirZ: number, run: boolean, faceMove: boolean) =>
    movePlayerStep(player, useWorld.getState().floorId, dt, dirX, dirZ, run, faceMove, hooks)

  useFrame((_, dtRaw) => {
    const dt = Number.isFinite(dtRaw) ? Math.min(Math.max(dtRaw, 0), 0.1) : 0
    const st = useWorld.getState()
    const floor = getFloor(st.floorId)
    const base = floorBaseY(floor.config.level)
    const c = cur.current
    const K = (k: number) => 1 - Math.exp(-dt * k)

    // Etagenwechsel: Spieler an den Aufzug setzen, Pan zurücksetzen. Stille Wechsel (Treppe) und Betreten von außen setzen selbst.
    if (lastFloor.current !== st.floorId) {
      if (player.skipSpawn) {
        player.skipSpawn = false
        player.floorId = st.floorId
        pan.current.x = 0; pan.current.z = 0
      } else if (lastFloor.current) {
        player.floorId = st.floorId
        player.x = floor.elevatorExit.x; player.z = floor.elevatorExit.z + 0.4
        player.yaw = 0; player.dy = 0; player.ride = null
        pan.current.x = 0; pan.current.z = 0
        fp.current.yaw = 0
        orbits.current.thirdPerson.yaw = 0
      }
      lastFloor.current = st.floorId
    }

    if (st.viewRotate !== lastRotate.current) {
      lastRotate.current = st.viewRotate
      orbits.current.tycoon.yaw += (Math.PI / 2) * st.viewRotateDir
    }

    let mode = st.cameraMode
    if (mode === 'follow') {
      const r = st.followId ? sim.get(st.followId) : null
      if (!r || r.hidden) mode = 'tycoon'
    }

    const kb = keys.current
    // Tastatur und virtueller Joystick (Touch) wirken zusammen, das Ergebnis bleibt im Bereich -1 bis 1
    const fwdKey = Math.max(-1, Math.min(1, (kb.has('w') || kb.has('arrowup') ? 1 : 0) - (kb.has('s') || kb.has('arrowdown') ? 1 : 0) + virtualInput.y))
    const strKey = Math.max(-1, Math.min(1, (kb.has('d') || kb.has('arrowright') ? 1 : 0) - (kb.has('a') || kb.has('arrowleft') ? 1 : 0) + virtualInput.x))
    const run = kb.has('shift') || virtualInput.run
    const pBase = () => floorBaseY(getFloor(player.floorId).config.level) + player.dy

    if (mode === 'firstPerson') {
      const f = fp.current
      if (f.lastMode !== 'firstPerson') { f.enterT = 0; f.yaw = player.yaw; f.pitch = 0; player.floorId = st.floorId }
      f.enterT += dt
      const nav = getNav(st.floorId)
      if (!player.ride && !walkable(st.floorId, player.x, player.z)) { const free = nav.nearestFree(player.x, player.z); if (free) { player.x = free.x; player.z = free.z } }
      const sx = Math.sin(f.yaw), sz = Math.cos(f.yaw)
      movePlayer(dt, sx * fwdKey + sz * -strKey, sz * fwdKey + -sx * -strKey, run, false)
      player.yaw = f.yaw
      const out = floor.config.level === 0 && isOutside(player.x, player.z)
      if (out !== st.outside) st.setOutside(out)
      _p.set(player.x, pBase() + EYE, player.z)
      const kk = f.enterT < 0.7 ? K(7) : 1
      if (!c.init) { c.pos.copy(_p); c.init = true }
      c.pos.lerp(_p, kk)
      const cp = Math.cos(f.pitch)
      _look.set(c.pos.x + Math.sin(f.yaw) * cp, c.pos.y + Math.sin(f.pitch), c.pos.z + Math.cos(f.yaw) * cp)
      c.look.copy(_look)
      camera.position.copy(c.pos)
      camera.lookAt(_look)
      f.lastMode = 'firstPerson'
      return
    }
    fp.current.lastMode = mode

    // Third Person: Bewegung relativ zur Kamera, die Figur dreht sich in Laufrichtung
    if (mode === 'thirdPerson' && st.panel !== 'character') {
      const o = orbits.current.thirdPerson
      const fx = -Math.sin(o.yaw), fz = -Math.cos(o.yaw)
      const rx = -fz, rz = fx
      if (player.floorId !== st.floorId) { player.floorId = st.floorId }
      movePlayer(dt, fx * fwdKey + rx * strKey, fz * fwdKey + rz * strKey, run, true)
      const out = floor.config.level === 0 && isOutside(player.x, player.z)
      if (out !== st.outside) st.setOutside(out)
    } else if (st.outside) st.setOutside(false)
    if (mode !== 'thirdPerson' && st.climbing && !player.ride) st.setClimbing(false)

    // Orbit Modi
    let key = mode as string
    let target: Vector3
    let o: Orbit
    if (st.panel === 'character') {
      key = 'character'
      o = orbits.current.character
      if (!drag.current.active) o.yaw += dt * 0.35
      target = _t.set(player.x, pBase() + 1.0, player.z)
    } else if (mode === 'thirdPerson') {
      o = orbits.current.thirdPerson
      target = _t.set(player.x, pBase() + 1.35, player.z)
    } else if (mode === 'follow') {
      o = orbits.current.follow
      const r = sim.get(st.followId!)!
      target = _t.set(r.x, floorBaseY(getFloor(r.floorId).config.level) + 1.0, r.z)
      if (!drag.current.active && performance.now() - drag.current.lastUser > 1500) {
        const want = r.yaw + Math.PI
        o.yaw += angleDiff(o.yaw, want) * K(1.5)
      }
    } else if (mode === 'building') {
      o = orbits.current.building
      target = _t.set(0, (BUILDING.floors.length * FLOOR_H) / 2 - 1, 0)
    } else {
      o = orbits.current.tycoon
      const fw = (kb.has('w') ? 1 : 0) - (kb.has('s') ? 1 : 0)
      const sd = (kb.has('d') ? 1 : 0) - (kb.has('a') ? 1 : 0)
      if (fw || sd) {
        const s = dt * o.dist * 0.6
        pan.current.x = Math.max(-HALF_W, Math.min(HALF_W, pan.current.x + (-Math.sin(o.yaw) * fw + Math.cos(o.yaw) * sd) * s))
        pan.current.z = Math.max(-HALF_D, Math.min(HALF_D, pan.current.z + (-Math.cos(o.yaw) * fw - Math.sin(o.yaw) * sd) * s))
      }
      target = _t.set(pan.current.x, base + 0.6, pan.current.z)
    }
    const cp = Math.cos(o.pitch)
    _p.set(target.x + Math.sin(o.yaw) * cp * o.dist, target.y + Math.sin(o.pitch) * o.dist, target.z + Math.cos(o.yaw) * cp * o.dist)
    if (mode !== 'building') _p.y = Math.max(_p.y, (mode === 'thirdPerson' ? pBase() : base) + 0.35)
    // Kamerakollision: nicht durch Trennwände fliegen (Third Person und Folgen)
    if ((mode === 'thirdPerson' || mode === 'follow') && st.panel !== 'character') {
      const fid = mode === 'thirdPerson' ? player.floorId : st.floorId
      const fb = floorBaseY(getFloor(fid).config.level)
      const t = cameraWallClamp(fid, target, _p, fb, WALL_TOP[st.wallMode])
      if (t < 1) {
        const tt = Math.max(0.12, t - 0.05)
        _p.set(target.x + (_p.x - target.x) * tt, target.y + (_p.y - target.y) * tt, target.z + (_p.z - target.z) * tt)
      }
    }
    if (!c.init) { c.pos.copy(_p); c.look.copy(target); c.init = true }
    const k = K(key === 'follow' || key === 'thirdPerson' ? 10 : 5.5)
    c.pos.lerp(_p, k)
    c.look.lerp(target, k)
    camera.position.copy(c.pos)
    camera.lookAt(c.look)
  })
  return null
}
