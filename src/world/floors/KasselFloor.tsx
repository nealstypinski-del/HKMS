import { BeanBag, Lamp, Plant, Rug } from '../../furniture/Decor'
import { Sofa } from '../../furniture/Sofa'
import { Box } from '../primitives'
import { fillRound } from '../TextPanel'
import { WallScreen } from '../../furniture/Decor'
import { DeptFloor } from './DeptFloor'

const PALETTE = ['#2fd6c0', '#e15b7a', '#f2c94c', '#5b6ee1', '#ff8a3d', '#8e6bd8']

/** Kreativere Etage: Moodboards, Social Displays, Sitzsäcke, Brainstorming Fläche. */
export function KasselFloor() {
  return (
    <DeptFloor level={2}>
      <WallScreen
        pos={[7.8, 2.4, -7.8]}
        size={[2.4, 1.3]}
        px={[512, 277]}
        frame="#e15b7a"
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#fff8ef'
          ctx.fillRect(0, 0, w, h)
          for (let i = 0; i < 9; i++) {
            fillRound(ctx, 24 + (i % 3) * 160, 22 + Math.floor(i / 3) * 84, 140 - (i % 2) * 20, 70, 8, PALETTE[i % PALETTE.length] as string)
          }
        }}
      />
      {[-11.83, -11.83].map((x, i) => (
        <WallScreen
          key={i}
          pos={[x, 2.1, 2.2 + i * 2.2]}
          size={[0.9, 1.5]}
          px={[180, 300]}
          frame="#161b2b"
          draw={(ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, w, h)
            g.addColorStop(0, i === 0 ? '#e15b7a' : '#2fd6c0')
            g.addColorStop(1, '#5b6ee1')
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)
            fillRound(ctx, 18, h - 84, w - 36, 12, 6, '#ffffffcc')
            fillRound(ctx, 18, h - 60, (w - 36) * 0.6, 12, 6, '#ffffffaa')
          }}
        />
      ))}
      {/* Brainstorming Fläche */}
      <Rug pos={[7.4, 0, 5.0]} size={[5.6, 3.4]} color="#a9e6dd" />
      <BeanBag pos={[5.8, 0, 4.6]} color="#e15b7a" />
      <BeanBag pos={[7.2, 0, 5.6]} color="#f2c94c" />
      <BeanBag pos={[8.6, 0, 4.6]} color="#5b6ee1" />
      <Sofa pos={[-1.5, 0, 6.5]} yaw={Math.PI} width={3.2} color="#2fd6c0" />
      <Box pos={[7.2, 0.5, 3.7]} size={[0.5, 0.5, 0.5]} color="#f2c94c" />
      <Plant pos={[3.6, 0, 6.8]} />
      <Lamp pos={[10.4, 0, 6.6]} color="#ffb8d0" />
    </DeptFloor>
  )
}
