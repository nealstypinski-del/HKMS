import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { effectiveGraphics, useWorld } from '../world/store'

/** Nachbearbeitung nur, wenn wirklich etwas aktiv ist. Sonst rendert die Szene direkt (billiger). */
export function Effects() {
  const g = useWorld((s) => effectiveGraphics(s.graphics))
  if (!g.bloom && !g.ao) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {g.ao ? <N8AO aoRadius={1.6} distanceFalloff={1.2} intensity={2.2} quality={g.quality === 'high' ? 'medium' : 'low'} halfRes /> : <></>}
      {g.bloom ? <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.6} luminanceSmoothing={0.25} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
