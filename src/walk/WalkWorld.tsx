import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HALF_D, HALF_W } from '../config/walkWorld'
import { useOfficeStore } from '../store/office.store'
import { PlayerAvatar } from './PlayerAvatar'
import { stepPlayer } from './playerPhysics'
import { player, resetPlayer, walkCamera } from './playerRuntime'

const KEYS: Record<string, string> = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run',
}

/** Third Person Rundgang: Tastatursteuerung, Kamera hinter der Figur, Kollision und Höhenlogik aus walkWorld. */
export function WalkWorld() {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const controls = useThree((s) => s.controls) as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null
  const down = useRef(new Set<string>())
  const lastLevel = useRef(-1)

  useEffect(() => {
    resetPlayer()
    const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
    const kd = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (k && !editable(e.target)) {
        down.current.add(k)
        e.preventDefault()
      }
    }
    const ku = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (k) down.current.delete(k)
    }
    let dragging = false
    const pd = (e: PointerEvent) => {
      dragging = true
      dom.setPointerCapture?.(e.pointerId)
    }
    const pm = (e: PointerEvent) => {
      if (!dragging) return
      walkCamera.yaw -= e.movementX * 0.005
      walkCamera.pitch = Math.max(0.05, Math.min(1.15, walkCamera.pitch + e.movementY * 0.004))
    }
    const pu = () => {
      dragging = false
    }
    const wheel = (e: WheelEvent) => {
      walkCamera.dist = Math.max(2.5, Math.min(10, walkCamera.dist + e.deltaY * 0.005))
    }
    const blur = () => down.current.clear()
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)
    dom.addEventListener('pointerdown', pd)
    dom.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    dom.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
      dom.removeEventListener('pointerdown', pd)
      dom.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      dom.removeEventListener('wheel', wheel)
      // Orbit Steuerung übernimmt an der Position der Figur
      controls?.target?.set(player.x, player.y + 1.4, player.z)
      controls?.update?.()
    }
  }, [dom, controls])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = down.current
    const f = (k.has('f') ? 1 : 0) - (k.has('b') ? 1 : 0)
    const r = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0)
    // Bewegung relativ zur Kamera: vorwärts = weg von der Kamera
    const sin = Math.sin(walkCamera.yaw)
    const cos = Math.cos(walkCamera.yaw)
    const dirX = -sin * f + cos * r
    const dirZ = -cos * f - sin * r
    stepPlayer(player, dirX, dirZ, k.has('run'), dt)

    if (player.level !== lastLevel.current) {
      lastLevel.current = player.level
      useOfficeStore.getState().setWalkLevel(player.level)
    }

    const cp = Math.cos(walkCamera.pitch)
    const tx = player.x
    const ty = player.y + 1.35
    const tz = player.z
    let cx = tx + Math.sin(walkCamera.yaw) * cp * walkCamera.dist
    let cy = ty + Math.sin(walkCamera.pitch) * walkCamera.dist
    let cz = tz + Math.cos(walkCamera.yaw) * cp * walkCamera.dist
    cx = Math.max(-HALF_W + 0.3, Math.min(HALF_W - 0.3, cx))
    cz = Math.max(-HALF_D + 0.3, Math.min(HALF_D - 0.3, cz))
    cy = Math.max(player.y + 0.5, Math.min(player.y + 4.4, cy))
    const a = 1 - Math.exp(-12 * dt)
    camera.position.x += (cx - camera.position.x) * a
    camera.position.y += (cy - camera.position.y) * a
    camera.position.z += (cz - camera.position.z) * a
    camera.lookAt(tx, ty, tz)
  })

  return <PlayerAvatar />
}
