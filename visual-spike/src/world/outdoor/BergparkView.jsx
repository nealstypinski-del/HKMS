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
import { worldZones } from './streaming/WorldZoneManager.js'

const DEFAULTS = { quality: 'HIGH', effects: true, labels: true, camBob: true, smoothing: true, fov: 70, interior: true }

export default function BergparkView({ onBack }) {
  const [mode, setMode] = useState('tp')
  const [settings, setSettings] = useState(DEFAULTS)
  const api = useRef({})
  const agentApi = useRef({})
  const q = QUALITY[settings.quality]
  useEffect(() => {
    startMockWorkflow()
    if (typeof window !== 'undefined') window.__bergpark = { api: api.current, agentApi: agentApi.current, stats: outdoorStats, zones: worldZones, setMode, setSettings, setTimeOfDay }
    return () => stopMockWorkflow()
  }, [])
  return (
    <>
      <div ref={(el) => { labelRoot.current = el }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }} />
      <Canvas
        shadows={q.shadows}
        dpr={[1, q.dpr]}
        camera={{ position: [0, 3, -8], fov: 70, near: 0.15, far: 1600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <DigitalBergpark settings={settings} agentApi={agentApi.current} />
        <CameraController mode={mode} settings={settings} api={api.current} />
        <PerfProbe />
      </Canvas>
      <BergparkHUD mode={mode} setMode={setMode} settings={settings} setSettings={setSettings} api={api.current} agentApi={agentApi.current} onBack={onBack} />
    </>
  )
}
