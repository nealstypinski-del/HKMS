import { useEffect, useState } from 'react'
import { MONUMENT, POOL, CASCADE, WORLD } from '../config/bergpark.config.js'
import { routes } from '../routes/OutdoorRouteSystem.js'
import { player } from '../camera/CameraController.jsx'
import { HQ, ROOMS, VOIDS, WALLS, wallSegments, STAIRS, ESCALATORS, ESC, insideHQ } from '../../indoor/config/hq.layout.js'
import { DESK_ANCHORS } from '../../indoor/nav/indoorAnchors.js'

const X0 = -110; const X1 = 110; const Z0 = -430; const Z1 = 40
const outdoorPolylines = ['cascade-training-loop', 'forest-training-loop'].map((id) => routes[id].pts.filter((p) => p.y === undefined))

// Karte: Außenwelt (Wahrzeichen, Routen, Agenten) und automatisch der Grundriss des HQ, sobald man im Gebäude ist
export default function MiniMap({ agents, onTeleport }) {
  const [, tick] = useState(0)
  const [open, setOpen] = useState(true)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(t) }, [])
  const inside = insideHQ(player.x, player.z)
  const level = player.y > 2.2 ? 1 : 0
  const list = agents?.() || []
  if (!open) return <button onClick={() => setOpen(true)} style={btn}>Karte</button>
  return (
    <div style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(11,16,32,.86)', border: '1px solid #2fd6c0', borderRadius: 10, padding: 8, color: '#fff', font: '11px system-ui', zIndex: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <b>{inside ? `Grundriss Etage ${level}` : 'Karte Bergpark'}</b>
        <span style={{ cursor: 'pointer' }} onClick={() => setOpen(false)}>schließen</span>
      </div>
      {inside ? <PlanSvg level={level} list={list} /> : (
        <svg width={150} height={320} viewBox={`${X0} ${Z0} ${X1 - X0} ${Z1 - Z0}`} style={{ background: '#20361f', borderRadius: 6, cursor: 'crosshair' }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            onTeleport?.(X0 + ((e.clientX - r.left) / r.width) * (X1 - X0), Z0 + ((e.clientY - r.top) / r.height) * (Z1 - Z0))
          }}>
          {outdoorPolylines.map((pts, i) => <polyline key={i} points={pts.map((p) => `${p.x},${p.z}`).join(' ')} fill="none" stroke={i ? '#c9a24a' : '#ff8a3d'} strokeWidth={2} opacity={0.8} />)}
          <rect x={-CASCADE.railX} y={CASCADE.zTop} width={CASCADE.railX * 2} height={CASCADE.length} fill="#5fd8d0" opacity={0.85} />
          <ellipse cx={POOL.x} cy={POOL.z} rx={POOL.a} ry={POOL.b} fill="#2fd6c0" />
          <polygon points={Array.from({ length: 8 }, (_, k) => `${MONUMENT.x + Math.sin(((k + 0.5) * Math.PI) / 4) * 21},${MONUMENT.z + Math.cos(((k + 0.5) * Math.PI) / 4) * 21}`).join(' ')} fill="#c2b8a2" />
          <rect x={-WORLD.hq.halfW} y={-WORLD.hq.halfD} width={WORLD.hq.halfW * 2} height={WORLD.hq.halfD * 2} fill="#ff8a3d" />
          {list.filter((a) => a.visible && !insideHQ(a.x, a.z)).map((a) => <circle key={a.id} cx={a.x} cy={a.z} r={4.5} fill={a.shirt} stroke="#000" strokeWidth={1} />)}
          <polygon transform={`translate(${player.x} ${player.z}) rotate(${(-player.yaw * 180) / Math.PI + 180})`} points="0,-9 6,7 -6,7" fill="#fff" stroke="#000" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  )
}

function PlanSvg({ level, list }) {
  const W = HQ.halfW; const D = HQ.halfD
  return (
    <svg width={260} height={170} viewBox={`${-W - 1} ${-D - 1} ${2 * W + 2} ${2 * D + 2}`} style={{ background: '#111a2c', borderRadius: 6 }}>
      {ROOMS.filter((r) => r.level === level).map((r) => <rect key={r.id} x={r.rect[0]} y={r.rect[1]} width={r.rect[2] - r.rect[0]} height={r.rect[3] - r.rect[1]} fill={r.accent} opacity={0.22} stroke="#000" strokeWidth={0.1} />)}
      {ROOMS.filter((r) => r.level === level).map((r) => <text key={`t${r.id}`} x={(r.rect[0] + r.rect[2]) / 2} y={(r.rect[1] + r.rect[3]) / 2} fontSize={1.5} fill="#fff" textAnchor="middle">{r.name.replace('Konferenzraum ', '').replace('Meetingraum ', '')}</text>)}
      {WALLS.filter((w) => w.level === level).flatMap((w, i) => wallSegments(w).map(([a, b], j) => (w.ax === 'z'
        ? <line key={`${i}-${j}`} x1={w.c} y1={a} x2={w.c} y2={b} stroke="#fff" strokeWidth={0.25} />
        : <line key={`${i}-${j}`} x1={a} y1={w.c} x2={b} y2={w.c} stroke="#fff" strokeWidth={0.25} />)))}
      {VOIDS.map((v) => <rect key={v.id} x={v.x0} y={v.z0} width={v.x1 - v.x0} height={v.z1 - v.z0} fill="#000" opacity={0.6} />)}
      <rect x={STAIRS.x - 1} y={STAIRS.z0} width={2} height={STAIRS.z1 - STAIRS.z0} fill="none" stroke="#7ff2df" strokeWidth={0.2} strokeDasharray="0.4 0.3" />
      {ESCALATORS.map((e) => <rect key={e.id} x={e.x - 0.5} y={ESC.z0} width={1} height={ESC.z1 - ESC.z0} fill="none" stroke={e.dir > 0 ? '#ffd27d' : '#ff8a8a'} strokeWidth={0.2} />)}
      {DESK_ANCHORS.filter((d) => d.level === level).map((d) => <rect key={d.id} x={d.x - 0.5} y={d.z - 0.9} width={1} height={0.6} fill="#c99b6b" />)}
      {list.filter((a) => a.visible && insideHQ(a.x, a.z) && (a.y > 2.2 ? 1 : 0) === level).map((a) => <circle key={a.id} cx={a.x} cy={a.z} r={0.55} fill={a.shirt} stroke="#000" strokeWidth={0.1} />)}
      <polygon transform={`translate(${player.x} ${player.z}) rotate(${(-player.yaw * 180) / Math.PI + 180}) scale(0.16)`} points="0,-9 6,7 -6,7" fill="#fff" stroke="#000" strokeWidth={1.5} />
    </svg>
  )
}

const btn = { position: 'absolute', right: 12, bottom: 12, zIndex: 5 }
