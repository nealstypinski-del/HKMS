import { EffectComposer, Bloom, Vignette, SMAA, ToneMapping, SSAO } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import { Environment, Lightformer } from '@react-three/drei'

// Bildqualität: Umgebungslicht für Reflexionen, Umgebungsverdeckung, Bloom, Filmton, Vignette
export default function Effects({ ssao = true }) {
  return (
    <>
      <Environment resolution={128} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} color="#9fb8ff" position={[0, 12, 8]} scale={[30, 14, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color="#ffd9a8" position={[-14, 5, 6]} scale={[10, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.0} color="#6f8cff" position={[14, 5, -6]} scale={[10, 8, 1]} rotation-y={-Math.PI / 2} />
      </Environment>
      <EffectComposer multisampling={0} enableNormalPass={ssao}>
        {ssao ? <SSAO samples={14} rings={4} radius={0.08} intensity={9} luminanceInfluence={0.55} bias={0.04} worldDistanceThreshold={40} worldDistanceFalloff={10} worldProximityThreshold={0.5} worldProximityFalloff={0.3} /> : <></>}
        <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
        <SMAA />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.25} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </>
  )
}
