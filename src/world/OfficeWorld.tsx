import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useQualityStore } from '../store/quality.store'
import { CharacterLayer } from '../characters/CharacterLayer'
import { useOfficeStore } from '../store/office.store'
import { WalkWorld } from '../walk/WalkWorld'
import { Building } from './Building'
import { CameraController, DEFAULT_POSITION } from './CameraController'

/** Die 3D Szene. Kennt nur Darstellung, keine Geschäftslogik. */
export function OfficeWorld({ onReady }: { onReady?: () => void }) {
  const walking = useOfficeStore((s) => s.mode === 'walk')
  const quality = useQualityStore((s) => s.quality)
  return (
    <Canvas
      shadows={quality === 'low' ? false : { type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: DEFAULT_POSITION.toArray(), fov: 36, near: 0.5, far: 260 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        ;(window as unknown as { __gl?: unknown }).__gl = gl
        onReady?.()
      }}
      onPointerMissed={() => useOfficeStore.getState().select(null)}
    >
      <color attach="background" args={['#0b1020']} />
      <Environment resolution={128} background={false}>
        <Lightformer form="rect" intensity={2.2} color="#fff1dc" position={[8, 12, 10]} scale={[18, 6, 1]} rotation-x={-0.9} />
        <Lightformer form="rect" intensity={1.2} color="#cfe0ff" position={[-12, 8, -6]} scale={[14, 6, 1]} rotation-y={1.2} />
        <Lightformer form="ring" intensity={1.4} color="#ffe6c4" position={[0, 14, 0]} scale={10} rotation-x={Math.PI / 2} />
      </Environment>
      <ambientLight intensity={0.35} color="#e6ecff" />
      <hemisphereLight args={['#fff4e2', '#3a4266', 0.5]} />
      <directionalLight
        position={[22, 38, 20]}
        intensity={2.1}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={30}
        shadow-camera-bottom={-16}
        shadow-camera-near={5}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-radius={3}
        shadow-normalBias={0.03}
      />
      <Building />
      <CharacterLayer />
      <CameraController />
      {walking && <WalkWorld />}
      {quality !== 'low' && (
        <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
          <Bloom intensity={0.45} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette darkness={0.4} offset={0.25} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
