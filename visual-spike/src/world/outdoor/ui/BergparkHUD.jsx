import { useEffect, useState } from 'react'
import { QUALITY } from '../config/bergpark.config.js'
import { outdoorStats } from '../runtime/stats.js'
import { worldZones } from '../streaming/WorldZoneManager.js'
import { setTimeOfDay, setWeather, envState } from '../environment/outdoorEnvironment.js'
import { audioSettings, startWaterAudio } from '../environment/audioAnchors.js'
import { triggerCompletionPulse } from '../water/CompletionPulse.js'
import { setCascadeVisualizationState } from '../cascades/cascadeVisualizationState.js'
import MiniMap from './MiniMap.jsx'
import { runSweep } from './perfSweep.js'
import { TOUR_STOPS } from '../camera/outdoorTour.js'

const panel = { background: 'rgba(11,16,32,.86)', border: '1px solid rgba(47,214,192,.5)', borderRadius: 10, padding: 8, color: '#fff', font: '12px system-ui' }
const B = ({ on, children, ...p }) => (
  <button {...p} style={{ background: on ? '#2fd6c0' : 'rgba(255,255,255,.08)', color: on ? '#111' : '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', font: '12px system-ui', ...p.style }}>{children}</button>
)

const PLACES = [
  ['HQ Eingang', () => [0, -18, Math.PI, -0.1, null]],
  ['Lobby', () => [0, -11, 0, -0.1, 0]],
  ['Etage 1 Redaktion', () => [-13, 4.5, -Math.PI / 2, -0.1, 4.5]],
  ['Konferenz Herkules', () => [-9, -8, Math.PI, -0.15, 0]],
  ['Ergebnisbecken', () => [-31, -131, 0.7, -0.1, null]],
  ['Kaskade unten', () => [-9.5, -131, Math.PI, -0.05, null]],
  ['Herkules', () => [0, -372, Math.PI, 0.3, null]],
]

export default function BergparkHUD({ mode, setMode, settings, setSettings, api, agentApi, onBack }) {
  const [dbg, setDbg] = useState(true)
  const [hud, setHud] = useState(true)
  useEffect(() => { const f = (e) => { if (e.code === 'KeyH') setHud((v) => !v) }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [])
  const [, tick] = useState(0)
  const [tour, setTour] = useState(null)
  const [sweep, setSweep] = useState(null)
  const [outCount, setOutCount] = useState(5)
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }))
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t) }, [])
  useEffect(() => {
    api.onTourStart = () => setTour(TOUR_STOPS[0].label)
    api.onTourStep = (stop) => setTour(stop.label)
    api.onTourStop = () => setTour(null)
  }, [api])
  const q = QUALITY[settings.quality]
  const s = outdoorStats
  const z = worldZones.states
  const goto = (fn) => { const a = fn(); if (mode === 'tycoon') setMode('tp'); api.teleport(...a) }

  if (!hud) return <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5 }}><B onClick={() => setHud(true)}>Menü (H)</B></div>
  return (
    <>
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5, maxWidth: 210 }}>
        <div style={{ ...panel, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <B onClick={() => setHud(false)}>Menü ausblenden (H)</B>
          <B onClick={onBack}>Etagenansicht</B>
          <B on={mode === 'tp'} onClick={() => setMode('tp')}>Third Person</B>
          <B on={mode === 'fp'} onClick={() => setMode('fp')}>First Person</B>
          <B on={mode === 'tycoon'} onClick={() => setMode('tycoon')}>Übersicht</B>
        </div>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <b>Teleport</b>
          {PLACES.map(([n, f]) => <B key={n} onClick={() => goto(f)}>{n}</B>)}
          <B on={!!tour} onClick={() => (tour ? api.stopTour() : (setMode('tp'), api.startTour()))}>{tour ? `Tour: ${tour} (Stopp)` : 'RUN OUTDOOR TOUR'}</B>
        </div>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <b>Sportdemo und Agenten</b>
          <div style={{ display: 'flex', gap: 3 }}>{[5, 10, 25, 50].map((c) => <B key={c} on={outCount === c} onClick={() => { setOutCount(c); agentApi.spawn?.(c) }}>{c}</B>)}</div>
          <B onClick={() => agentApi.simulateTask?.()}>Aufgabe trifft ein (unterbricht Lauf)</B>
          <B onClick={() => { triggerCompletionPulse(`DEMO-${Date.now()}`, 'workflow') }}>Abschlusspuls (Demo)</B>
          <B onClick={() => setCascadeVisualizationState({ stages: { approval: { activity: 0.3, status: 'blocked', queued: 4 } } })}>Freigabe staut (Demo)</B>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5 }}>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>Darstellung</b>
          <div style={{ display: 'flex', gap: 3 }}>{Object.keys(QUALITY).map((k) => <B key={k} on={settings.quality === k} onClick={() => set('quality', k)}>{QUALITY[k].label}</B>)}</div>
          <div style={{ display: 'flex', gap: 3 }}>{[['DAY', 'Tag'], ['EVENING', 'Abend'], ['NIGHT', 'Nacht']].map(([k, l]) => <B key={k} on={envState.target === k} onClick={() => { setTimeOfDay(k); tick((n) => n + 1) }}>{l}</B>)}</div>
          <div style={{ display: 'flex', gap: 3 }}>{[['CLEAR', 'Klar'], ['CLOUDY', 'Wolken'], ['FOG', 'Nebel']].map(([k, l]) => <B key={k} on={envState.weather === k} onClick={() => { setWeather(k); tick((n) => n + 1) }}>{l}</B>)}</div>
          <label><input type="checkbox" checked={settings.effects} onChange={(e) => set('effects', e.target.checked)} /> Effekte (Schweiß)</label>
          <label><input type="checkbox" checked={settings.labels} onChange={(e) => set('labels', e.target.checked)} /> Namensschilder</label>
          <label><input type="checkbox" checked={settings.camBob} onChange={(e) => set('camBob', e.target.checked)} /> Kamerawippen</label>
          <label><input type="checkbox" checked={settings.smoothing} onChange={(e) => set('smoothing', e.target.checked)} /> Bewegungsglättung</label>
          <label><input type="checkbox" checked={settings.interior} onChange={(e) => set('interior', e.target.checked)} /> Innenwelt laden</label>
          <label><input type="checkbox" checked={audioSettings.enabled} onChange={(e) => { audioSettings.enabled = e.target.checked; if (e.target.checked) startWaterAudio(); tick((n) => n + 1) }} /> Wasserton (Platzhalter)</label>
          <label>Sichtfeld {settings.fov}° <input type="range" min={55} max={95} value={settings.fov} onChange={(e) => set('fov', Number(e.target.value))} /></label>
        </div>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <B on={dbg} onClick={() => setDbg(!dbg)}>Leistungsanzeige</B>
          <B onClick={async () => { setSweep([]); const rows = await runSweep({ api, setMode, setSettings, agentApi }, {}); window.__bergparkSweep = rows; setSweep(rows) }}>{sweep && sweep.length === 0 ? 'Messlauf läuft …' : 'Messlauf starten'}</B>
        </div>
      </div>

      {dbg && (
        <div style={{ ...panel, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 10, zIndex: 5, lineHeight: 1.5, maxWidth: 430 }}>
          <b>Leistung ({q.label})</b><br />
          FPS {s.fps.toFixed(1)} · Drawcalls {s.calls} · Dreiecke {s.triangles.toLocaleString('de-DE')}<br />
          Bäume sichtbar {s.visibleTrees} von {s.totalTrees} · Büsche {s.visibleBushes}<br />
          Agenten sichtbar {s.visibleAgents} von {s.totalAgents}<br />
          Kaskadensegmente aktiv {s.activeSegments} von {s.totalSegments}<br />
          <span style={{ opacity: 0.8 }}>{Object.entries(z).map(([k, v]) => `${k} ${v}`).join(' · ')}</span>
        </div>
      )}

      {sweep && sweep.length > 0 && (
        <div style={{ ...panel, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 150, zIndex: 6, maxHeight: '60vh', overflow: 'auto', font: '11px system-ui' }}>
          <b>Messlauf ({sweep.length} Messungen)</b> <span style={{ cursor: 'pointer' }} onClick={() => setSweep(null)}>schließen</span>
          <table><tbody>{sweep.map((r, i) => <tr key={i}><td>{r.preset}</td><td>{r.view}</td><td>{r.fps.toFixed(1)} FPS</td><td>{r.calls} Calls</td><td>{r.triangles} Tri</td><td>{r.agents} Ag.</td></tr>)}</tbody></table>
        </div>
      )}

      <MiniMap agents={agentApi.agents} onTeleport={(x, zz) => { if (mode === 'tycoon') setMode('tp'); api.teleport(x, zz, Math.PI, -0.1, null) }} />
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', color: '#dbe6ff', font: '12px system-ui', background: 'rgba(11,16,32,.6)', padding: '4px 10px', borderRadius: 8, zIndex: 4 }}>
        WASD gehen · Umschalt rennen · Maus ziehen umsehen · Q E drehen · Mausrad Kameraabstand · Rolltreppe und Treppe im Empfang
      </div>
    </>
  )
}
