import { useEffect, useState } from 'react'
import { useClock, setSpeed, dayName, hhmm, SPEEDS, setFollowEnv } from '../../sim/simClock.js'
import { useSelection, select, setFollow } from '../runtime/selection.js'
import { NEEDS } from '../../sim/simBrain.js'
import { statusColor } from '../crowd/CrowdAvatars.jsx'
import { STATUS } from '../../../theme.js'
import { setView, useView } from '../runtime/viewState.js'

const panel = { background: 'rgba(24,18,12,.88)', border: '2px solid #d9b26a', borderRadius: 12, color: '#fff7e6', font: '12px system-ui' }
const btn = (on) => ({ background: on ? '#d9b26a' : 'rgba(255,255,255,.08)', color: on ? '#2a1c08' : '#fff7e6', border: '1px solid rgba(217,178,106,.6)', borderRadius: 8, padding: '4px 9px', cursor: 'pointer', font: '12px system-ui', fontWeight: 700 })

const CMDS = [['desk', 'An den Platz'], ['coffee', 'Kaffee holen'], ['cooler', 'Wasserspender'], ['sofa', 'Sofa'], ['sport', 'Kaskadenlauf'], ['task', 'Neue Aufgabe']]
const barColor = (v) => (v > 0.6 ? '#3ddc84' : v > 0.3 ? '#ffc94d' : '#ff5c5c')

// Sims Leiste: Uhr, Geschwindigkeit, Ansicht (Etagenschnitt, Wände) und Bedürfnisse des gewählten Agenten
export function SimBar({ mode, setMode, agentApi }) {
  const c = useClock()
  const v = useView()
  const sel = useSelection()
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 400); return () => clearInterval(t) }, [])
  const a = sel.agent
  return (
    <>
      <div style={{ ...panel, position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', padding: '6px 10px', display: 'flex', gap: 10, alignItems: 'center', zIndex: 6 }}>
        <div style={{ font: '800 16px system-ui', minWidth: 96, textAlign: 'center' }}>{dayName()} {hhmm()}</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {SPEEDS.map((s, i) => <button key={i} style={btn(c.speedIdx === i)} onClick={() => setSpeed(i)}>{s === 0 ? 'Pause' : `${s}x`}</button>)}
        </div>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={c.followEnv} onChange={(e) => setFollowEnv(e.target.checked)} />Tageszeit folgt Uhr</label>
        <span style={{ opacity: 0.6 }}>|</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <button style={btn(mode === 'sims')} onClick={() => setMode('sims')}>Sims Ansicht</button>
          <button style={btn(mode === 'tp')} onClick={() => setMode('tp')}>Third Person</button>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          Etage
          {[['all', 'Alle'], [1, '1'], [0, '0']].map(([k, l]) => <button key={l} style={btn(v.cutLevel === k)} onClick={() => setView({ cutLevel: k })}>{l}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          Wände
          {[['up', 'Hoch'], ['half', 'Halb'], ['down', 'Weg']].map(([k, l]) => <button key={k} style={btn(v.wallMode === k)} onClick={() => setView({ wallMode: k })}>{l}</button>)}
        </div>
      </div>

      {a && (
        <div style={{ ...panel, position: 'absolute', bottom: 62, left: 10, width: 290, padding: 10, zIndex: 6 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 46, background: a.look.skin, border: `4px solid ${statusColor(a.status)}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ width: 34, height: 20, background: a.look.shirt, borderRadius: '14px 14px 0 0' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '800 15px system-ui' }}>{a.name}</div>
              <div style={{ opacity: 0.8 }}>{a.role} · {a.dept === 'hj' ? 'HerkulesJobs' : a.dept === 'km' ? 'KasselMemes' : a.dept === 'ai' ? 'AI Agents' : 'Vertrieb'}</div>
            </div>
            <button style={{ ...btn(false), padding: '2px 8px' }} onClick={() => select(null)}>x</button>
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: statusColor(a.status) }} />
            <b>{STATUS[a.status]?.label || a.status}</b><span style={{ opacity: 0.8 }}>· {a.label}</span>
          </div>
          {a.task && (
            <div style={{ marginTop: 6 }}>
              Aufgabe: <b>{a.task.title}</b>
              <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 4, marginTop: 3 }}><div style={{ height: 6, width: `${Math.min(100, a.task.progress * 100)}%`, background: '#2fd6c0', borderRadius: 4 }} /></div>
            </div>
          )}
          <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
            {NEEDS.map(([k, l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 62 }}>{l}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 4 }}><div style={{ height: 8, width: `${a.needs[k] * 100}%`, background: barColor(a.needs[k]), borderRadius: 4 }} /></div>
                <span style={{ width: 28, textAlign: 'right' }}>{Math.round(a.needs[k] * 100)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 62 }}>Stimmung</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 4 }}><div style={{ height: 8, width: `${a.mood * 100}%`, background: barColor(a.mood), borderRadius: 4 }} /></div>
              <span style={{ width: 28, textAlign: 'right' }}>{Math.round(a.mood * 100)}</span>
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {CMDS.map(([k, l]) => <button key={k} style={btn(false)} onClick={() => agentApi.command?.(a.id, k)}>{l}</button>)}
            <button style={btn(sel.follow)} onClick={() => { setFollow(!sel.follow); if (!sel.follow) setMode('sims') }}>Verfolgen</button>
          </div>
        </div>
      )}
    </>
  )
}

// Meldungen wie die Benachrichtigungen der Sims (Aufgaben, Abschlüsse)
export function EventTicker({ agentApi }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 700); return () => clearInterval(t) }, [])
  const ev = (agentApi.events?.() || []).slice(0, 4)
  if (!ev.length) return null
  return (
    <div style={{ position: 'absolute', top: 190, left: '50%', transform: 'translateX(-50%)', width: 320, zIndex: 5, display: 'grid', gap: 3, pointerEvents: 'none' }}>
      {ev.map((e, i) => <div key={e.t + i} style={{ ...panel, padding: '4px 8px', opacity: 1 - i * 0.2, font: '12px system-ui' }}>{e.text}</div>)}
    </div>
  )
}
