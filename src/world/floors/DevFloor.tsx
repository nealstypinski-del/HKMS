import { Lamp, Plant, ServerRack, WallScreen } from '../../furniture/Decor'
import { Box } from '../primitives'
import { DeptFloor } from './DeptFloor'

/** Ruhige, technische Etage: Server, Build Anzeige, dunkle Terminal Arbeitsplätze. */
export function DevFloor() {
  return (
    <DeptFloor level={3} dev>
      <Box pos={[5.6, 0.006, -4.0]} size={[6.4, 0.012, 7.4]} color="#b9b2f0" cast={false} />
      {[3.4, 4.5, 5.6, 6.7].map((x) => (
        <ServerRack key={x} pos={[x, 0, -7.2]} />
      ))}
      <WallScreen
        pos={[5.0, 3.5, -7.8]}
        size={[3.8, 1.0]}
        px={[640, 168]}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#0d1422'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#8b7cf6'
          ctx.font = '700 36px ui-monospace, monospace'
          ctx.textBaseline = 'middle'
          ctx.fillText('BUILD STATUS', 24, 38)
          const rows = ['#3ddc84', '#3ddc84', '#ffc94d', '#3ddc84', '#3ddc84', '#59627f']
          rows.forEach((c, i) => {
            ctx.fillStyle = c
            ctx.fillRect(24 + i * 100, 84, 84, 40)
          })
          ctx.fillStyle = '#7f8ab3'
          ctx.font = '500 22px ui-monospace, monospace'
          ctx.fillText('mock · keine echte Pipeline', 24, h - 16)
        }}
      />
      <Plant pos={[11.4, 0, 3.8]} scale={1.2} />
      <Lamp pos={[9.4, 0, 3.4]} color="#c8bfff" />
    </DeptFloor>
  )
}
