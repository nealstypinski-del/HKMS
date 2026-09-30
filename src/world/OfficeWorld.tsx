import { Canvas } from '@react-three/fiber'
import { CharacterLayer } from '../characters/CharacterLayer'
import { useOfficeStore } from '../store/office.store'
import { WalkWorld } from '../walk/WalkWorld'
import { Building } from './Building'
import { CameraController, DEFAULT_POSITION } from './CameraController'

/** Die 3D Szene. Kennt nur Darstellung, keine Geschäftslogik. */
export function OfficeWorld({ onReady }: { onReady?: () => void }) {
  const walking = useOfficeStore((s) => s.mode === 'walk')
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: DEFAULT_POSITION.toArray(), fov: 36, near: 0.5, far: 260 }}
      gl={{ antialias: true }}
      onCreated={() => onReady?.()}
      onPointerMissed={() => useOfficeStore.getState().select(null)}
    >
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.85} color="#dfe6ff" />
      <hemisphereLight args={['#f3f6ff', '#2a3357', 0.55]} />
      <directionalLight
        position={[22, 38, 20]}
        intensity={1.7}
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
      />
      <Building />
      <CharacterLayer />
      <CameraController />
      {walking && <WalkWorld />}
    </Canvas>
  )
}
