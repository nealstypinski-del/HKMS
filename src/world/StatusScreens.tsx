import { useDepartmentSummary, useAgentStats, useOpenTaskCount } from '../agents/agent.hooks'
import { BRAND } from '../config/office.config'
import { LOBBY_LAYOUT } from '../config/floorLayouts'
import { WallScreen } from '../furniture/Decor'
import { fillRound } from './TextPanel'

/** Zentrale Anzeige im Erdgeschoss mit dem Live Zustand aus dem Agent Store. */
export function HQDisplay() {
  const stats = useAgentStats()
  const tasks = useOpenTaskCount()
  const { x, z } = LOBBY_LAYOUT.hqDisplay
  return (
    <WallScreen
      pos={[x, 3.15, z]}
      size={[6.6, 2.5]}
      px={[1024, 388]}
      deps={[stats.online, stats.working, stats.idle, stats.waiting, stats.break, stats.meeting, tasks]}
      draw={(ctx, w, h) => {
        ctx.fillStyle = '#0d1428'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#ff8a3d'
        ctx.fillRect(0, 0, w * 0.5, 8)
        ctx.fillStyle = '#2fd6c0'
        ctx.fillRect(w * 0.5, 0, w * 0.5, 8)
        ctx.fillStyle = '#e8ecf8'
        ctx.font = '800 66px system-ui, sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(BRAND.displayTitle, 40, 78)
        ctx.fillStyle = '#7f8ab3'
        ctx.font = '500 28px system-ui, sans-serif'
        ctx.fillText('HerkulesJobs  ·  KasselMemes', 42, 130)
        const items: Array<[string, number, string]> = [
          ['Agents Online', stats.online, '#e8ecf8'],
          ['Working', stats.working, '#3ddc84'],
          ['Idle', stats.idle, '#c9d3ea'],
          ['Waiting', stats.waiting, '#ffc94d'],
          ['Tasks', tasks, '#6ea8ff'],
        ]
        items.forEach(([label, value, color], i) => {
          const cw = (w - 80 - 4 * 16) / 5
          const cx = 40 + i * (cw + 16)
          fillRound(ctx, cx, 170, cw, 150, 16, '#162044')
          ctx.fillStyle = color
          ctx.font = '800 72px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(String(value), cx + cw / 2, 235)
          ctx.fillStyle = '#9aa6c9'
          ctx.font = '600 24px system-ui, sans-serif'
          ctx.fillText(label, cx + cw / 2, 290)
          ctx.textAlign = 'left'
        })
        ctx.fillStyle = '#ffc94d'
        ctx.font = '700 22px system-ui, sans-serif'
        ctx.fillText(BRAND.providerBadge.toUpperCase() + ' · simulierte Agenten, keine echte KI', 42, h - 30)
      }}
    />
  )
}

/** Abteilungsschild an der Rückwand einer Etage. */
export function DeptScreen({ deptId, name, accent, x }: { deptId: string; name: string; accent: string; x: number }) {
  const s = useDepartmentSummary(deptId)
  return (
    <WallScreen
      pos={[x, 4.25, -7.8]}
      size={[3.6, 0.85]}
      px={[512, 121]}
      deps={[s.total, s.working, s.waiting, name, accent]}
      draw={(ctx, w, h) => {
        ctx.fillStyle = '#0d1428'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = accent
        ctx.fillRect(0, 0, 10, h)
        ctx.fillStyle = '#e8ecf8'
        ctx.font = '700 40px system-ui, sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(name, 28, 42)
        ctx.font = '500 26px system-ui, sans-serif'
        ctx.fillStyle = '#3ddc84'
        ctx.fillText(`${s.working} arbeiten`, 28, 90)
        ctx.fillStyle = '#ffc94d'
        ctx.fillText(`${s.waiting} warten`, 210, 90)
        ctx.fillStyle = '#7f8ab3'
        ctx.fillText(`${s.total} Agenten`, 350, 90)
      }}
    />
  )
}
