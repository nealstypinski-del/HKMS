import { useEffect, useState } from 'react'
import { isTouchDevice } from './device'
import { BUILDING } from '../world/buildingConfig'
import { getFloor } from '../world/generate'
import { PROVIDER_LABEL } from '../world/mockAgents'
import { sim } from '../world/sim'
import { useWorld } from '../world/store'
import type { AgentStatus } from '../world/types'
import { useTick } from './hooks'
import { CharacterPanel, ElevatorModal, FloorList, GraphicsPanel, LaunchPanel, ViewPanel } from './Panels'

const MODE_LABEL = { tycoon: 'ÜBERSICHT', firstPerson: 'EGO', thirdPerson: 'DRITTE PERSON', building: 'GEBÄUDE', follow: 'FOLGEN' } as const
const TOUCH_HINTS: Record<string, string> = {
  thirdPerson: 'Joystick links: laufen · Wischen: Kamera drehen · Zwei Finger: Zoom · Knöpfe: Rennen, Aufzug',
  firstPerson: 'Joystick links: laufen · Wischen: umsehen · Knöpfe: Rennen, Aufzug',
  tycoon: 'Wischen: drehen · Zwei Finger: Zoom · Antippen: auswählen',
  building: 'Wischen: drehen · Zwei Finger: Zoom · Etage antippen: wählen',
  follow: 'Wischen: Blickwinkel · Zwei Finger: Zoom',
}
const HINTS: Record<string, string> = {
  thirdPerson: 'WASD: laufen · Shift: rennen · Ziehen: Kamera drehen · Mausrad: Zoom · Treppe und Rolltreppe einfach hinauflaufen · E am Aufzug',
  tycoon: 'Ziehen: drehen · Rechts ziehen oder WASD: verschieben · Mausrad: Zoom · Klick: auswählen',
  firstPerson: 'WASD: laufen · Shift: schneller · Maus: umsehen (zum Aktivieren ins Bild klicken) · E am Aufzug · Esc: Maus lösen',
  building: 'Ziehen: drehen · Mausrad: Zoom · Klick auf Etage: wählen, nochmal klicken: betreten',
  follow: 'Ziehen: Blickwinkel · Mausrad: Zoom · Über ANSICHT zurück zu Tycoon',
}

function TopBar() {
  const panel = useWorld((s) => s.panel)
  const setPanel = useWorld((s) => s.setPanel)
  const mapOpen = useWorld((s) => s.mapOpen)
  const setMap = useWorld((s) => s.setMap)
  const mode = useWorld((s) => s.cameraMode)
  const floorId = useWorld((s) => s.floorId)
  const f = BUILDING.floors.find((x) => x.id === floorId)!
  const b = (p: NonNullable<typeof panel>, label: string) => (
    <button className={panel === p ? 'on' : ''} onClick={() => setPanel(panel === p ? null : p)}>{label}</button>
  )
  return (
    <div className="top">
      <div className="brand"><i />HERKULES <b>AI HQ</b></div>
      <div className="loc" style={{ '--ac': f.accent } as React.CSSProperties}><span>{MODE_LABEL[mode]}</span><b>{f.short}</b></div>
      <nav>
        {b('floors', 'ETAGEN')}
        <button className={mapOpen ? 'on' : ''} onClick={() => setMap(!mapOpen)}>KARTE</button>
        {b('view', 'ANSICHT')}
        {b('graphics', 'GRAFIK')}
        {b('character', 'FIGUR')}
        {b('launch', '+ STARTEN')}
      </nav>
    </div>
  )
}

/** Mock Bedürfnisse (Sims Prinzip), rein aus Status und Kennung abgeleitet. Keine echte Messung. */
function needs(a: { id: string; status: AgentStatus }) {
  let h = 0
  for (let i = 0; i < a.id.length; i++) h = (h * 31 + a.id.charCodeAt(i)) % 1000
  const j = (h % 20) / 100
  const table: Record<AgentStatus, [number, number]> = {
    working: [0.82, 0.62], meeting: [0.6, 0.66], idle: [0.2, 0.9], break: [0.12, 0.95], waiting: [0.4, 0.75], offline: [0, 0.5],
  }
  const [load, energy] = table[a.status]
  return { load: Math.min(1, load + j), energy: Math.max(0.05, energy - j / 2) }
}
const Bar = ({ label, v, c }: { label: string; v: number; c: string }) => (
  <div className="need"><span>{label}</span><i><u style={{ width: `${Math.round(v * 100)}%`, background: c }} /></i><b>{Math.round(v * 100)}%</b></div>
)

const STATUSES: AgentStatus[] = ['working', 'meeting', 'idle', 'break', 'waiting', 'offline']
const ST_DE: Record<AgentStatus, string> = { working: 'Arbeitet', meeting: 'Besprechung', idle: 'Bereit', break: 'Pause', waiting: 'Wartet', offline: 'Offline' }

function InfoPanel() {
  useTick(600)
  const sel = useWorld((s) => s.selection)
  const agents = useWorld((s) => s.agents)
  const select = useWorld((s) => s.select)
  const setStatus = useWorld((s) => s.setAgentStatus)
  const follow = useWorld((s) => s.followAgent)
  const floorId = useWorld((s) => s.floorId)
  if (!sel || sel.type === 'elevator') return null
  const close = () => select(null)
  const dept = (id: string) => BUILDING.floors.flatMap((f) => f.departments).find((d) => d.id === id)
  if (sel.type === 'agent') {
    const a = agents[sel.id]
    if (!a) return null
    const r = sim.get(a.id)
    return (
      <div className="info">
        <div className="panel-h"><b>{a.role}</b><button className="x" onClick={close}>×</button></div>
        <div className="panel-b">
          <div className="kv"><span>ID</span><code>{a.id}</code></div>
          <div className="kv"><span>Abteilung</span><b>{dept(a.departmentId)?.title}</b></div>
          <div className="kv"><span>Provider</span><b>{PROVIDER_LABEL[a.provider] || 'keiner'} <em className="mock">MOCK</em></b></div>
          <div className="kv"><span>Bewegung</span><b>{r ? r.state : '-'}</b></div>
          <Bar label="Auslastung" v={needs(a).load} c="#38d6b4" />
          <Bar label="Energie" v={needs(a).energy} c="#f0b23d" />
          <p className="note small">Balken sind Platzhalterwerte (Mock), keine echte Messung.</p>
          {a.simulated && <p className="note small">SIMULIERT: rein visuelle Figur, keine echte Agentenaktivität.</p>}
          <div className="chips">{STATUSES.map((s) => <button key={s} className={a.status === s ? 'on' : ''} onClick={() => setStatus(a.id, s)}>{ST_DE[s]}</button>)}</div>
          <div className="chips"><button className="hot" onClick={() => follow(a.id)}>Folgen</button></div>
        </div>
      </div>
    )
  }
  if (sel.type === 'desk' || sel.type === 'computer') {
    const f = getFloor(floorId)
    const d = sel.type === 'desk' ? f.desks.find((x) => x.id === sel.id) : f.desks.find((x) => x.computerId === sel.id)
    if (!d) return null
    const owner = sim.owner.get(d.id)
    return (
      <div className="info">
        <div className="panel-h"><b>{sel.type === 'desk' ? 'Schreibtisch' : 'Rechner'}</b><button className="x" onClick={close}>×</button></div>
        <div className="panel-b">
          <div className="kv"><span>Desk</span><code>{d.id}</code></div>
          <div className="kv"><span>Computer</span><code>{d.computerId}</code></div>
          <div className="kv"><span>Abteilung</span><b>{dept(d.departmentId)?.title}</b></div>
          <div className="kv"><span>Bildschirm</span><b>{sim.computerState(d.computerId, d.id).toUpperCase()}</b></div>
          <div className="kv"><span>Belegt von</span><b>{owner ? agents[owner]?.role ?? owner : 'frei'}</b></div>
          <p className="note small">Bildschirminhalt ist ein Platzhalter (Mock Zustand).</p>
        </div>
      </div>
    )
  }
  const dp = dept(sel.id)
  if (!dp) return null
  const f = BUILDING.floors.find((x) => x.departments.some((y) => y.id === sel.id))!
  const g = getFloor(f.id)
  const desks = g.desks.filter((d) => d.departmentId === sel.id)
  const n = Object.values(agents).filter((a) => a.departmentId === sel.id && a.status !== 'offline').length
  return (
    <div className="info">
      <div className="panel-h"><b>{dp.title}</b><button className="x" onClick={close}>×</button></div>
      <div className="panel-b">
        <div className="kv"><span>ID</span><code>{dp.id}</code></div>
        <div className="kv"><span>Etage</span><b>{f.short}</b></div>
        <div className="kv"><span>Schreibtische</span><b>{desks.length}</b></div>
        <div className="kv"><span>Agenten</span><b>{n}</b></div>
      </div>
    </div>
  )
}

function MapOverlay() {
  useTick(800)
  const open = useWorld((s) => s.mapOpen)
  const setMap = useWorld((s) => s.setMap)
  const setFloor = useWorld((s) => s.setFloor)
  const setMode = useWorld((s) => s.setMode)
  const agents = useWorld((s) => s.agents)
  const floorId = useWorld((s) => s.floorId)
  if (!open) return null
  const rows = [...BUILDING.floors].sort((a, b) => b.level - a.level)
  return (
    <div className="map">
      <div className="panel-h"><b>KARTE · Etagen und Auslastung</b><button className="x" onClick={() => setMap(false)}>×</button></div>
      <div className="map-b">
        {rows.map((f) => {
          const g = getFloor(f.id)
          return (
            <div key={f.id} className={`map-row${f.id === floorId ? ' on' : ''}`} style={{ '--ac': f.accent } as React.CSSProperties}>
              <button className="map-l" onClick={() => { setFloor(f.id); setMode('tycoon'); setMap(false) }}><b>{f.short}</b><small>{f.level === 0 ? 'EG' : `Etage ${f.level}`}</small></button>
              <div className="map-d">
                {f.departments.map((d) => {
                  const cap = g.desks.filter((x) => x.departmentId === d.id).length
                  const n = Object.values(agents).filter((a) => a.departmentId === d.id && a.status !== 'offline').length
                  const w = Object.values(agents).filter((a) => a.departmentId === d.id && a.status === 'working').length
                  const dens = cap ? Math.min(1, n / cap) : n ? 0.5 : 0
                  return (
                    <div key={d.id} className="dept" style={{ '--d': dens } as React.CSSProperties}>
                      <b>{d.title}</b><small>{n} Agenten · {w} arbeiten{cap ? ` · ${cap} Plätze` : ''}</small><i />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Notice() {
  const n = useWorld((s) => s.notice)
  const set = useWorld((s) => s.setNotice)
  useEffect(() => { if (!n) return; const id = setTimeout(() => set(null), 9000); return () => clearTimeout(id) }, [n, set])
  if (!n) return null
  return <div className="notice" role="status" onClick={() => set(null)}>{n}</div>
}

export function Hud() {
  const [touch] = useState(isTouchDevice)
  const panel = useWorld((s) => s.panel)
  const setPanel = useWorld((s) => s.setPanel)
  const mode = useWorld((s) => s.cameraMode)
  const transition = useWorld((s) => s.transition)
  const sim_ = useWorld((s) => s.simulateActivity)
  const close = () => setPanel(null)
  return (
    <>
      <TopBar />
      {panel === 'floors' && <div className="panel side"><div className="panel-h"><b>ETAGEN</b><button className="x" onClick={close}>×</button></div><div className="panel-b"><FloorList onPick={close} /></div></div>}
      {panel === 'graphics' && <div className="side"><GraphicsPanel onClose={close} /></div>}
      {panel === 'character' && <div className="side"><CharacterPanel onClose={close} /></div>}
      {panel === 'launch' && <div className="side"><LaunchPanel onClose={close} /></div>}
      {panel === 'view' && <div className="side"><ViewPanel onClose={close} /></div>}
      <InfoPanel />
      <MapOverlay />
      <ElevatorModal />
      {mode === 'firstPerson' && <div className="cross" />}
      <div className="hint">{touch ? TOUCH_HINTS[mode] : HINTS[mode]}</div>
      {sim_ && <div className="simbadge" title="Visuelle Simulation: Statuswechsel sind zufällig, keine echte Agentenaktivität">● SIMULIERTE AKTIVITÄT</div>}
      <Notice />
      <div className="fade" key={transition} />
    </>
  )
}
