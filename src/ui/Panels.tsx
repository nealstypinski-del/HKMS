import { useMemo, useState } from 'react'
import { ACCESSORIES, HAIR_COLORS, HAIR_STYLES, HEADWEAR, SHIRTS, SHOES, SKIN, TROUSERS } from '../world/avatar'
import { BUILDING } from '../world/buildingConfig'
import { getFloor } from '../world/generate'
import { deptsWithDesks } from '../world/mockAgents'
import { sim } from '../world/sim'
import { useWorld, QUALITY_PRESETS, type Quality, type TimeMode } from '../world/store'
import type { Avatar } from '../world/types'
import { useTick } from './hooks'
import { bench, onBench, perf, runBenchmark } from './perf'
import { useEffect } from 'react'

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  )
}
function Toggle({ label, hint, on, onChange, disabled }: { label: string; hint?: string; on: boolean; onChange: (b: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`toggle${disabled ? ' dis' : ''}`}>
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  )
}
const Panel = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) => (
  <div className={`panel${wide ? ' wide' : ''}`}>
    <div className="panel-h"><b>{title}</b><button className="x" onClick={onClose} aria-label="Schließen">×</button></div>
    <div className="panel-b">{children}</div>
  </div>
)

// --- Etagenliste (Panel und Aufzug) --------------------------------------------------------

export function FloorList({ onPick }: { onPick: () => void }) {
  useTick()
  const floorId = useWorld((s) => s.floorId)
  const setFloor = useWorld((s) => s.setFloor)
  const agents = useWorld((s) => s.agents)
  const rows = [...BUILDING.floors].sort((a, b) => b.level - a.level)
  return (
    <div className="floors">
      {rows.map((f) => {
        const n = Object.values(agents).filter((a) => a.floorId === f.id && a.status !== 'offline').length
        const occ = sim.deskOccupancy(f.id)
        return (
          <button key={f.id} className={`floor-row${f.id === floorId ? ' on' : ''}`} style={{ '--ac': f.accent } as React.CSSProperties} onClick={() => { setFloor(f.id); onPick() }}>
            <span className="lvl">{f.level === 0 ? 'EG' : f.level}</span>
            <span className="ft"><b>{f.short}</b><small>{f.title}</small></span>
            <span className="fs"><b>{n}</b><small>Agenten</small></span>
            <span className="fs"><b>{occ.seated}/{occ.total}</b><small>Plätze</small></span>
          </button>
        )
      })}
    </div>
  )
}

export function ElevatorModal() {
  const open = useWorld((s) => s.elevatorOpen)
  const set = useWorld((s) => s.setElevator)
  if (!open) return null
  return (
    <div className="modal" onClick={() => set(false)}>
      <div className="panel elevator" onClick={(e) => e.stopPropagation()}>
        <div className="panel-h"><b>AUFZUG · Etage wählen</b><button className="x" onClick={() => set(false)}>×</button></div>
        <div className="panel-b"><FloorList onPick={() => set(false)} /></div>
      </div>
    </div>
  )
}

// --- Grafik ---------------------------------------------------------------------------------

export function GraphicsPanel({ onClose }: { onClose: () => void }) {
  const g = useWorld((s) => s.graphics)
  const setG = useWorld((s) => s.setGraphics)
  const setQ = useWorld((s) => s.setQuality)
  const timeMode = useWorld((s) => s.timeMode)
  const setTime = useWorld((s) => s.setTimeMode)
  const stress = useWorld((s) => s.stress)
  const sim_ = useWorld((s) => s.simulateActivity)
  const setSim = useWorld((s) => s.setSimulate)
  const [, force] = useState(0)
  useEffect(() => onBench(() => force((x) => x + 1)), [])
  const perfMode = g.performanceMode
  return (
    <Panel title="GRAFIK" onClose={onClose} wide>
      <p className="note">Diese Einstellungen betreffen nur die Grafikleistung (GPU). Sie haben nichts mit der KI Rechenleistung der Agenten zu tun. Aufwendige Effekte können die Bildrate senken.</p>
      <div className="row"><span>Qualität</span><Seg<Quality> value={g.quality} onChange={setQ} options={[{ v: 'low', label: 'LOW' }, { v: 'medium', label: 'MEDIUM' }, { v: 'high', label: 'HIGH' }]} /></div>
      <Toggle label="Performance Modus" hint="Schaltet alle teuren Effekte ab, reduziert Auflösung und Labels" on={perfMode} onChange={(b) => setG({ performanceMode: b })} />
      <div className={perfMode ? 'dim' : ''}>
        <Toggle label="Schatten" hint="GPU: mittel" on={g.shadows} disabled={perfMode} onChange={(b) => setG({ shadows: b })} />
        <Toggle label="Ambient Occlusion" hint="GPU: hoch" on={g.ao} disabled={perfMode} onChange={(b) => setG({ ao: b })} />
        <Toggle label="Bloom" hint="GPU: mittel" on={g.bloom} disabled={perfMode} onChange={(b) => setG({ bloom: b })} />
        <Toggle label="Reflexionen" hint="GPU: mittel" on={g.reflections} disabled={perfMode} onChange={(b) => setG({ reflections: b })} />
        <Toggle label="Hohe Lichtqualität" hint="Zusätzliche Punktlichter, größere Schattenkarte" on={g.hqLighting} disabled={perfMode} onChange={(b) => setG({ hqLighting: b })} />
        <Toggle label="Agenten Aktivitätseffekte" hint="Statusringe um arbeitende Figuren" on={g.activityFx} disabled={perfMode} onChange={(b) => setG({ activityFx: b })} />
      </div>
      <Toggle label="Figurenlabels" on={g.labels} onChange={(b) => setG({ labels: b })} />
      <Toggle label="Hintergrundumgebung" hint="Himmel, Sterne, Stadt, Plattform" on={g.background} onChange={(b) => setG({ background: b })} />
      <div className="row"><span>Tageszeit</span><Seg<TimeMode> value={timeMode} onChange={setTime} options={[{ v: 'auto', label: 'AUTO' }, { v: 'day', label: 'TAG' }, { v: 'evening', label: 'ABEND' }, { v: 'night', label: 'NACHT' }]} /></div>
      <Toggle label="Visuelle Simulation" hint="SIMULIERT: Agenten wechseln zufällig zwischen Arbeit, Pause und Warten. Keine echte Agentenaktivität." on={sim_} onChange={setSim} />
      <h4>Stresstest</h4>
      <div className="chips">
        {[10, 25, 50, 100].map((n) => <button key={n} onClick={() => stress(n)}>{n} Agenten</button>)}
        <button onClick={() => stress(0)}>Zurücksetzen</button>
        <button className="hot" disabled={bench.running} onClick={() => runBenchmark(() => perf.calls)}>{bench.running ? 'Benchmark läuft…' : 'Benchmark starten'}</button>
      </div>
      {bench.rows.length > 0 && (
        <table className="bench">
          <thead><tr><th>Agenten</th><th>FPS</th><th>ms Ø</th><th>ms p95</th><th>Draw Calls</th></tr></thead>
          <tbody>{bench.rows.map((r) => <tr key={r.agents}><td>{r.agents}</td><td>{r.fps}</td><td>{r.avgMs}</td><td>{r.p95Ms}</td><td>{r.calls}</td></tr>)}</tbody>
        </table>
      )}
      <p className="note small">Preset LOW/MEDIUM/HIGH setzt: {Object.keys(QUALITY_PRESETS.low).length} Einzeleinstellungen, die du danach einzeln ändern kannst.</p>
    </Panel>
  )
}

// --- Charaktereditor -----------------------------------------------------------------------

const Swatches = ({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) => (
  <div className="sw">{colors.map((c, i) => <button key={c + i} className={i === value ? 'on' : ''} style={{ background: c }} onClick={() => onPick(i)} aria-label={c} />)}</div>
)
const Chips = <T extends string>({ items, value, onPick, label }: { items: readonly T[]; value: T; onPick: (v: T) => void; label: (v: T) => string }) => (
  <div className="chips">{items.map((i) => <button key={i} className={i === value ? 'on' : ''} onClick={() => onPick(i)}>{label(i)}</button>)}</div>
)
const HAIR_LABEL: Record<string, string> = { short: 'Kurz', long: 'Lang', bun: 'Dutt', mohawk: 'Mohawk', spiky: 'Stachelig', bald: 'Glatze', ponytail: 'Zopf', curly: 'Locken' }
const HW_LABEL: Record<string, string> = { none: 'Keine', cap: 'Cap', beanie: 'Beanie', crown: 'Krone' }
const AC_LABEL: Record<string, string> = { none: 'Keine', glasses: 'Brille', headphones: 'Kopfhörer' }

export function CharacterPanel({ onClose }: { onClose: () => void }) {
  const p = useWorld((s) => s.player)
  const set = useWorld((s) => s.setPlayer)
  const tabs = ['HAIR', 'SHIRT', 'TROUSERS', 'SHOES', 'HEADWEAR', 'ACCESSORIES', 'SKIN'] as const
  const [tab, setTab] = useState<(typeof tabs)[number]>('HAIR')
  return (
    <Panel title="CHARAKTER" onClose={onClose}>
      <div className="tabs">{tabs.map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'HAIR' && <>
        <Chips items={HAIR_STYLES} value={p.hairStyle} onPick={(v) => set({ hairStyle: v })} label={(v) => HAIR_LABEL[v]} />
        <Swatches colors={HAIR_COLORS} value={p.hairVariant} onPick={(i) => set({ hairVariant: i })} />
      </>}
      {tab === 'SHIRT' && <Swatches colors={SHIRTS} value={p.shirtVariant} onPick={(i) => set({ shirtVariant: i })} />}
      {tab === 'TROUSERS' && <Swatches colors={TROUSERS} value={p.trousersVariant} onPick={(i) => set({ trousersVariant: i })} />}
      {tab === 'SHOES' && <Swatches colors={SHOES} value={p.shoesVariant} onPick={(i) => set({ shoesVariant: i })} />}
      {tab === 'HEADWEAR' && <Chips<Avatar['headwear']> items={HEADWEAR} value={p.headwear} onPick={(v) => set({ headwear: v })} label={(v) => HW_LABEL[v]} />}
      {tab === 'ACCESSORIES' && <Chips<Avatar['accessory']> items={ACCESSORIES} value={p.accessory} onPick={(v) => set({ accessory: v })} label={(v) => AC_LABEL[v]} />}
      {tab === 'SKIN' && <Swatches colors={SKIN} value={p.skinVariant} onPick={(i) => set({ skinVariant: i })} />}
      <p className="note small">Änderungen erscheinen sofort an der Spielerfigur und werden lokal gespeichert. Ziehen dreht die Vorschau.</p>
    </Panel>
  )
}

// --- Start von Agenten --------------------------------------------------------------------

export function LaunchPanel({ onClose }: { onClose: () => void }) {
  useTick(500)
  const floorId = useWorld((s) => s.floorId)
  const launch = useWorld((s) => s.launchAgents)
  const remove = useWorld((s) => s.removeAgents)
  const setFloor = useWorld((s) => s.setFloor)
  const agents = useWorld((s) => s.agents)
  const [dept, setDept] = useState('')
  const [count, setCount] = useState(10)
  const floor = getFloor(floorId)
  const depts = useMemo(() => deptsWithDesks(floorId), [floorId])
  const occ = sim.deskOccupancy(floorId)
  const onFloor = Object.values(agents).filter((a) => a.floorId === floorId && a.status !== 'offline').length
  const free = Math.max(0, occ.total - onFloor)
  return (
    <Panel title="AGENTEN STARTEN" onClose={onClose}>
      <p className="note">SIMULIERT: Es werden visuelle Mock Agenten erzeugt. Sie laufen aus dem Aufzug, gehen zu einem freien Schreibtisch und setzen sich. Es wird kein echter Agent gestartet.</p>
      <div className="row"><span>Etage</span>
        <select value={floorId} onChange={(e) => { setFloor(e.target.value); setDept('') }}>
          {[...BUILDING.floors].sort((a, b) => b.level - a.level).map((f) => <option key={f.id} value={f.id}>{f.short}</option>)}
        </select>
      </div>
      <div className="row"><span>Abteilung</span>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">Alle Arbeitsbereiche</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>
      <div className="row"><span>Anzahl</span><Seg<string> value={String(count)} onChange={(v) => setCount(+v)} options={[1, 5, 10, 25, 50].map((n) => ({ v: String(n), label: String(n) }))} /></div>
      <div className="cap">
        <div><b>{floor.desks.length}</b><small>Schreibtische</small></div>
        <div><b>{occ.seated}</b><small>besetzt</small></div>
        <div><b>{free}</b><small>frei (grob)</small></div>
      </div>
      {count > free && <p className="note warn">Es sind nur ungefähr {free} Plätze frei. Der Rest wartet im Aufzugsfoyer und rückt nach, sobald ein Platz frei wird.</p>}
      <div className="chips">
        <button className="hot" onClick={() => { launch({ floorId, departmentId: dept || undefined, count }) }}>{count} Agenten starten</button>
        <button onClick={() => remove((a) => a.floorId === floorId)}>Etage leeren</button>
      </div>
    </Panel>
  )
}

export function ViewPanel({ onClose }: { onClose: () => void }) {
  const mode = useWorld((s) => s.cameraMode)
  const setMode = useWorld((s) => s.setMode)
  const sel = useWorld((s) => s.selection)
  const follow = useWorld((s) => s.followAgent)
  const walkOutside = useWorld((s) => s.walkOutside)
  const enterBuilding = useWorld((s) => s.enterBuilding)
  const wallMode = useWorld((s) => s.wallMode)
  const setWallMode = useWorld((s) => s.setWallMode)
  const rotateView = useWorld((s) => s.rotateView)
  return (
    <Panel title="ANSICHT" onClose={onClose}>
      <div className="chips col">
        <button className={mode === 'thirdPerson' ? 'on' : ''} onClick={() => { setMode('thirdPerson'); onClose() }}>Dritte Person<small>Mit deiner Figur laufen, Kamera folgt</small></button>
        <button className={mode === 'firstPerson' ? 'on' : ''} onClick={() => { setMode('firstPerson'); onClose() }}>Ego<small>WASD, Maus, Shift schneller, E am Aufzug</small></button>
        <button className={mode === 'tycoon' ? 'on' : ''} onClick={() => setMode('tycoon')}>Übersicht<small>Schräge Draufsicht auf die Etage</small></button>
        <button className={mode === 'building' ? 'on' : ''} onClick={() => setMode('building')}>Gebäude<small>Ganzer Turm, Etage anklicken</small></button>
        <button className={mode === 'follow' ? 'on' : ''} disabled={sel?.type !== 'agent'} onClick={() => sel?.type === 'agent' && follow(sel.id)}>Agent folgen<small>{sel?.type === 'agent' ? 'Ausgewählten Agenten begleiten' : 'Erst einen Agenten anklicken'}</small></button>
      </div>
      <h4>Wände (wie bei den Sims)</h4>
      <Seg<'high' | 'half' | 'none'> value={wallMode} onChange={setWallMode} options={[{ v: 'high', label: 'HOCH' }, { v: 'half', label: 'HALB' }, { v: 'none', label: 'WEG' }]} />
      <div className="chips"><button onClick={() => rotateView(-1)}>↺ Drehen</button><button onClick={() => rotateView(1)}>Drehen ↻</button></div>
      <h4>Orte</h4>
      <div className="chips">
        <button onClick={() => { walkOutside(); onClose() }}>Vor das Gebäude</button>
        <button onClick={() => { enterBuilding(); onClose() }}>In den Empfang</button>
      </div>
    </Panel>
  )
}
