import { EffectComposer, N8AO, Bloom, SMAA, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Nachbearbeitung je Grafikstufe: Umgebungsverdunklung (N8AO), Bloom für Lichter und Wasser, Kantenglättung, Vignette, Filmtonwert.
// LOW rendert ohne Nachbearbeitung.
export default function PostFX({ quality }) {
  const p = quality.post
  if (!p.ao && !p.bloom && !p.smaa && !p.vignette) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {p.ao && <N8AO aoRadius={2.2} distanceFalloff={1.2} intensity={2.4} quality="medium" halfRes color="#1a1408" />}
      {p.bloom && <Bloom mipmapBlur intensity={0.4} luminanceThreshold={1.6} luminanceSmoothing={0.3} radius={0.6} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {p.vignette && <Vignette eskil={false} offset={0.25} darkness={0.55} />}
      {p.smaa && <SMAA />}
    </EffectComposer>
  )
}
