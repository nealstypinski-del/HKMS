import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { getFloor } from '../world/generate'
import { sim } from '../world/sim'
import { useWorld } from '../world/store'
import { perf, sample } from './perf'

/** Läuft im Canvas: liest Renderer Statistik und Sim Zähler. */
export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  useEffect(() => { gl.info.autoReset = false }, [gl])
  useFrame(() => {
    // Beginn eines neuen Frames: Zähler des letzten Frames sichern und zurücksetzen
    perf.calls = gl.info.render.calls
    perf.tris = gl.info.render.triangles
    gl.info.reset()
  }, -1000)
  useEffect(() => {
    const dbg = gl.getContext().getExtension('WEBGL_debug_renderer_info')
    perf.gpu = dbg ? String(gl.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unbekannt'
  }, [gl])
  return null
}

export function PerfOverlay() {
  const show = useWorld((s) => s.showPerf)
  const [, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      const s = sample()
      perf.fps = s.fps; perf.ms = s.avg; perf.p95 = s.p95
      const st = useWorld.getState()
      let a = 0
      for (const r of sim.rt.values()) if (!r.hidden && r.floorId === st.floorId) a++
      perf.agents = st.cameraMode === 'building' ? 0 : a
      perf.desks = st.cameraMode === 'building' ? 0 : getFloor(st.floorId).desks.length
      setN((x) => x + 1)
    }, 500)
    return () => clearInterval(id)
  }, [])
  if (!show) return null
  const cls = perf.fps >= 55 ? 'ok' : perf.fps >= 30 ? 'mid' : 'bad'
  return (
    <div className="perf">
      <div className={`fps ${cls}`}>{perf.fps.toFixed(0)}<small> FPS</small></div>
      <div>{perf.ms.toFixed(1)} ms · p95 {perf.p95.toFixed(1)} ms</div>
      <div>Draw Calls {perf.calls} · Dreiecke {(perf.tris / 1000).toFixed(0)}k</div>
      <div>Sichtbare Agenten {perf.agents} · Schreibtische {perf.desks}</div>
      <div className="gpu" title={perf.gpu}>{perf.gpu.slice(0, 48)}</div>
      <div className="gpu">Sim: {sim.stats.repaths} Pfade · {sim.stats.teleports} Snaps</div>
    </div>
  )
}
