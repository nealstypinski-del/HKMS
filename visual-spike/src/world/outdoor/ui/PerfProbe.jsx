import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { outdoorStats } from '../runtime/stats.js'

// Misst FPS, Drawcalls und Dreiecke des Renderers (gl.info) und schreibt sie in outdoorStats.
export default function PerfProbe() {
  const acc = useRef({ t: 0, n: 0 })
  // Bei Nachbearbeitung rendert der Composer mehrfach pro Bild: Zähler manuell zurücksetzen, damit alle Durchgänge gezählt werden
  useFrame(({ gl }, dt) => {
    gl.info.autoReset = false
    const a = acc.current
    a.t += dt
    a.n++
    if (gl.info.render.calls > 0) {
      outdoorStats.calls = gl.info.render.calls
      outdoorStats.triangles = gl.info.render.triangles
    }
    gl.info.reset()
    if (a.t >= 0.5) {
      outdoorStats.fps = a.n / a.t
      a.t = 0
      a.n = 0
    }
  })
  return null
}
