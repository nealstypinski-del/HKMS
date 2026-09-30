import { useEffect, useRef, useState } from 'react'
import { getFloor } from '../world/generate'
import { nearElevator } from '../world/elevatorUse'
import { player } from '../world/player'
import { useWorld } from '../world/store'
import { clampStick, resetVirtualInput, setVirtualRun, setVirtualStick } from '../world/virtualInput'
import { isTouchDevice } from './device'

const RADIUS = 52

/** Joystick, Renn und Aufzugsknopf für Touchgeräte. Nur in den Laufansichten und nur auf Geräten ohne Maus sichtbar. */
export function TouchControls() {
  const mode = useWorld((s) => s.cameraMode)
  const [touch] = useState(isTouchDevice)
  const [run, setRun] = useState(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)

  // Beim Verlassen der Laufansicht oder des Bauteils bleibt keine Bewegung hängen.
  useEffect(() => () => resetVirtualInput(), [])
  useEffect(() => { if (mode !== 'thirdPerson' && mode !== 'firstPerson') { resetVirtualInput(); setKnob({ x: 0, y: 0 }); setRun(false) } }, [mode])

  if (!touch || (mode !== 'thirdPerson' && mode !== 'firstPerson')) return null

  const end = () => { origin.current = null; setKnob({ x: 0, y: 0 }); setVirtualStick(0, 0) }
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* nicht unterstützt */ }
    onMove(e)
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const o = origin.current
    if (!o || o.id !== e.pointerId) return
    const v = clampStick(e.clientX - o.x, e.clientY - o.y, RADIUS)
    setKnob({ x: v.x * RADIUS, y: -v.y * RADIUS })
    setVirtualStick(v.x, v.y)
  }
  const openElevator = () => {
    const st = useWorld.getState()
    if (nearElevator(st.floorId, player.x, player.z)) { st.setElevator(true); st.select({ type: 'elevator', id: st.floorId }) }
    else st.setNotice(`Der Aufzug ist zu weit weg. Er steht bei ${getFloor(st.floorId).config.short}, nördlich der Mitte.`)
  }

  return (
    <div className="touch" aria-label="Touch Steuerung">
      <div className="stick" role="application" aria-label="Joystick zum Laufen" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
        <i style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="tbtns">
        <button className={run ? 'on' : ''} onClick={() => { const n = !run; setRun(n); setVirtualRun(n) }}>Rennen</button>
        <button onClick={openElevator}>Aufzug</button>
      </div>
    </div>
  )
}
