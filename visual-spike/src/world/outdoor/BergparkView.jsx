import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { QUALITY } from './config/bergpark.config.js'
import DigitalBergpark from './DigitalBergpark.jsx'
import CameraController from './camera/CameraController.jsx'
import PerfProbe from './ui/PerfProbe.jsx'
import BergparkHUD from './ui/BergparkHUD.jsx'
import { labelRoot } from '../../labelRoot.js'
import { setTimeOfDay } from './environment/outdoorEnvironment.js'
import { startMockWorkflow, stopMockWorkflow } from './cascades/mockWorkflow.js'
import { outdoorStats } from './runtime/stats.js'
import { runSweep } from './ui/perfSweep.js'
import { escalatorState } from '../indoor/render/Escalators.jsx'
import { setView } from './runtime/viewState.js'
import { setSpeed } from '../sim/simClock.js'
import { worldZones } from './streaming/WorldZoneManager.js'

const DEFAULTS = { quality: 'HIGH', effects: true, labels: true, camBob: true, smoothing: true, fov: 70, interior: true }

export default function BergparkView({ onBack }) {
  const [mode, setModeRaw] = useState(() => new URLSearchParams(window.location.search).get('mode') || import.meta.env.VITE_DEFAULT_MODE || 'tp')
  // Sims Ansicht startet mit Etagenschnitt (Etage 1, Wände halb) wie im Sims Baumodus, andere Ansichten zeigen wieder das ganze Haus
  const setMode = (m) => { setModeRaw(m); setView(m === 'sims' ? { cutLevel: 1, wallMode: 'half' } : { cutLevel: 'all', wallMode: 'up' }) }
  const [settings, setSettings] = useState(DEFAULTS)
  const api = useRef({})
  const agentApi = useRef({})
  const q = QUALITY[settings.quality]
  useEffect(() => {
    startMockWorkflow()
    if (mode === 'sims') setView({ cutLevel: 1, wallMode: 'half' })
    if (typeof window !== 'undefined') window.__bergpark = { api: api.current, agentApi: agentApi.current, stats: outdoorStats, zones: worldZones, setMode: (m) => setMode(m), setSettings, setTimeOfDay, setView, setSpeed, escalator: () => ({ ...escalatorState }), sweep: (o) => runSweep({ api: api.current, setMode, setSettings, agentApi: agentApi.current }, o) }
    return () => stopMockWorkflow()
  }, [])
  // Automatische Grafikreduktion: fällt die Bildrate mehrere Sekunden unter 22 FPS, wird eine Stufe heruntergeschaltet (nicht bei automatisierten Tests)
  const [notice, setNotice] = useState(null)
  useEffect(() => {
    if (navigator.webdriver) return undefined
    let low = 0
    const t = setInterval(() => {
      const f = outdoorStats.fps
      low = f > 0 && f < 22 ? low + 1 : 0
      if (low >= 4) {
        low = 0
        setSettings((s) => {
          const next = s.quality === 'HIGH' ? 'MEDIUM' : s.quality === 'MEDIUM' ? 'LOW' : null
          if (!next) return s
          setNotice(`Grafik automatisch auf „${QUALITY[next].label}“ reduziert (unter 22 FPS)`)
          setTimeout(() => setNotice(null), 6000)
          return { ...s, quality: next }
        })
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      {notice && <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9, background: 'rgba(24,18,12,.9)', color: '#fff7e6', padding: '8px 14px', borderRadius: 10, font: '13px system-ui', border: '1px solid #d9b26a' }}>{notice}</div>}
      <div ref={(el) => { labelRoot.current = el }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }} />
      <Canvas
        shadows={q.shadows}
        dpr={[1, q.dpr]}
        camera={{ position: [0, 3, -8], fov: 70, near: 0.15, far: 1600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <DigitalBergpark settings={settings} agentApi={agentApi.current} mode={mode} />
        <CameraController mode={mode} settings={settings} api={api.current} />
        <PerfProbe />
      </Canvas>
      <BergparkHUD mode={mode} setMode={setMode} settings={settings} setSettings={setSettings} api={api.current} agentApi={agentApi.current} onBack={onBack} />
    </>
  )
}
