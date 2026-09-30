import { WallScreen } from '../furniture/Decor'
import { fillRound } from './TextPanel'
import type { V3 } from './primitives'

interface ThemeWallProps {
  pos: V3
  title: string
  tiles: readonly string[]
  accent: string
}

/** Themenwand an der linken Wand. Die Kacheln sind ausdrücklich Platzhalter, echte Inhalte fehlen noch. */
export function ThemeWall({ pos, title, tiles, accent }: ThemeWallProps) {
  return (
    <group position={pos} rotation={[0, Math.PI / 2, 0]}>
      <WallScreen
        pos={[0, 0, 0]}
        size={[3.6, 1.5]}
        px={[720, 300]}
        deps={[title, accent, tiles.join('|')]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#0d1428'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = accent
          ctx.fillRect(0, 0, w, 8)
          ctx.fillStyle = '#e8ecf8'
          ctx.font = '700 40px system-ui, sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(title, 28, 52)
          const cw = (w - 56 - (tiles.length - 1) * 14) / tiles.length
          tiles.forEach((t, i) => {
            const x = 28 + i * (cw + 14)
            fillRound(ctx, x, 92, cw, 130, 14, '#162044')
            ctx.fillStyle = accent
            ctx.fillRect(x, 92, 6, 130)
            ctx.fillStyle = '#e8ecf8'
            ctx.font = '600 26px system-ui, sans-serif'
            ctx.fillText(t, x + 20, 140)
            ctx.fillStyle = '#7f8ab3'
            ctx.font = '500 20px system-ui, sans-serif'
            ctx.fillText('Platzhalter', x + 20, 184)
          })
          ctx.fillStyle = '#ffc94d'
          ctx.font = '600 19px system-ui, sans-serif'
          ctx.fillText('Inhalte folgen aus euren echten Unterlagen', 28, h - 22)
        }}
      />
    </group>
  )
}
