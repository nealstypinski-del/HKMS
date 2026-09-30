import { Canvas } from '@react-three/fiber'
import { CameraRig } from './cameras/CameraRig'
import { AgentsLayer, PlayerCharacter } from './render/Character'
import { Effects } from './render/Effects'
import { SceneEnvironment } from './render/Environment'
import { ContextGuard } from './render/ContextGuard'
import { LabelLayer } from './render/LabelLayer'
import { SimDriver } from './render/SimDriver'
import { StatusGems } from './render/StatusGems'
import { Tower } from './render/Tower'
import { GpuLostNotice } from './ui/GpuLostNotice'
import { Hud } from './ui/Hud'
import { TooSmall } from './ui/TooSmall'
import { TouchControls } from './ui/TouchControls'
import { PerfOverlay, PerfProbe } from './ui/PerfOverlay'
import { effectiveGraphics, useWorld } from './world/store'

export default function App() {
  const g = useWorld((s) => effectiveGraphics(s.graphics))
  const dpr: [number, number] = g.performanceMode || g.quality === 'low' ? [1, 1] : g.quality === 'high' ? [1, 2] : [1, 1.5]
  const showPerf = import.meta.env.DEV || !!import.meta.env.VITE_PERF || new URLSearchParams(location.search).has('perf')
  return (
    <div className="app">
      <Canvas
        dpr={dpr}
        camera={{ fov: 55, near: 0.1, far: 1800, position: [0, 60, 60] }}
        gl={{ antialias: !g.performanceMode, powerPreference: 'high-performance', preserveDrawingBuffer: new URLSearchParams(location.search).has('shot') }}
        onPointerMissed={() => useWorld.getState().select(null)}
      >
        <SceneEnvironment />
        <Tower />
        <AgentsLayer />
        <PlayerCharacter />
        <StatusGems />
        <SimDriver />
        <CameraRig />
        <LabelLayer />
        <PerfProbe />
        <ContextGuard />
        <Effects />
      </Canvas>
      <Hud />
      <GpuLostNotice />
      <TouchControls />
      <TooSmall />
      {showPerf && <PerfOverlay />}
    </div>
  )
}
