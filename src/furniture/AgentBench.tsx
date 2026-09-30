import { LOBBY_LAYOUT } from '../config/floorLayouts'
import { Box } from '../world/primitives'
import { TextPanel, fillRound } from '../world/TextPanel'

/** Agentenbank: hier warten Agenten ohne Aufgabe. */
export function AgentBench() {
  const { x, z, seats } = LOBBY_LAYOUT.bench
  const length = seats + 0.4
  const rug = '#2fd6c0'
  return (
    <group>
      <Box pos={[x, 0.006, z + 0.2]} size={[length + 1.2, 0.012, 3.1]} color="#233a48" cast={false} />
      <Box pos={[x, 0.014, z - 1.25]} size={[length + 1.2, 0.012, 0.06]} color={rug} emissive={rug} ei={1} cast={false} />
      <Box pos={[x, 0.2, z]} size={[length, 0.34, 0.9]} color="#33405e" />
      {Array.from({ length: seats }, (_, i) => (
        <Box key={i} pos={[x - (seats - 1) / 2 + i, 0.4, z]} size={[0.86, 0.1, 0.8]} color="#2a8f86" />
      ))}
      <Box pos={[x, 0.62, z + 0.5]} size={[length, 0.4, 0.12]} color="#33405e" />
      <Box pos={[x - length / 2, 0.4, z + 0.1]} size={[0.12, 0.8, 1.1]} color="#26304a" />
      <Box pos={[x + length / 2, 0.4, z + 0.1]} size={[0.12, 0.8, 1.1]} color="#26304a" />
      <Box pos={[x - 3.4, 1.6, z + 0.5]} size={[0.07, 3.2, 0.07]} color="#26304a" />
      <Box pos={[x + 3.4, 1.6, z + 0.5]} size={[0.07, 3.2, 0.07]} color="#26304a" />
      <Box pos={[x, 3.0, z + 0.5]} size={[7.0, 0.9, 0.1]} color="#161d33" />
      <TextPanel
        pos={[x, 3.0, z + 0.56]}
        size={[6.8, 0.8]}
        px={[1024, 118]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#0f1730'
          ctx.fillRect(0, 0, w, h)
          fillRound(ctx, 14, 14, 90, h - 28, 12, '#2fd6c0')
          ctx.fillStyle = '#e8ecf8'
          ctx.font = '700 60px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText('AGENTENBANK', 130, h / 2 + 2)
          ctx.fillStyle = '#7f8ab3'
          ctx.font = '500 30px system-ui, sans-serif'
          ctx.fillText('verfügbare Agenten', 640, h / 2 + 4)
        }}
      />
    </group>
  )
}
