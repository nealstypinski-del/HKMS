import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import CrowdAvatars, { statusColor } from '../crowd/CrowdAvatars.jsx'
import { player } from '../camera/CameraController.jsx'
import { outdoorStats } from '../runtime/stats.js'
import { select, selection } from '../runtime/selection.js'
import { assignIntent, interrupt, stepAgent } from './outdoorAgentSim.js'
import { buildPopulation } from '../../sim/population.js'
import { stepBrain, command, bubbleFor } from '../../sim/simBrain.js'
import { mult } from '../../sim/simClock.js'
import { stepWorld } from '../../sim/simLoop.js'
import { insideHQ } from '../../indoor/config/hq.layout.js'

const MAX_LABELS = 8

// ---------------------------------------------------------------- Blasen und Beschriftungen
const bubbleCache = new Map()
function bubbleTexture(type) {
  if (bubbleCache.has(type)) return bubbleCache.get(type)
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const g = cv.getContext('2d')
  const col = { question: '#ffc94d', excl: '#ff5c5c', check: '#3ddc84', coffee: '#c98a5a', chat: '#7ab6ff', zzz: '#b8a2ff', task: '#2fd6c0' }[type] || '#ffffff'
  g.fillStyle = 'rgba(255,255,255,0.96)'
  g.beginPath(); g.arc(64, 56, 46, 0, Math.PI * 2); g.fill()
  g.beginPath(); g.moveTo(50, 96); g.lineTo(64, 118); g.lineTo(78, 96); g.fill()
  g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(64, 56, 46, 0, Math.PI * 2); g.stroke()
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 8
  g.font = '800 68px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  if (type === 'question') g.fillText('?', 64, 60)
  else if (type === 'excl') g.fillText('!', 64, 60)
  else if (type === 'check') { g.beginPath(); g.moveTo(40, 58); g.lineTo(58, 76); g.lineTo(90, 38); g.stroke() }
  else if (type === 'coffee') { g.fillRect(42, 44, 34, 34); g.strokeRect(74, 50, 14, 20); g.beginPath(); g.moveTo(52, 36); g.lineTo(52, 28); g.moveTo(64, 36); g.lineTo(64, 26); g.stroke() }
  else if (type === 'chat') { for (const x of [42, 64, 86]) { g.beginPath(); g.arc(x, 58, 7, 0, Math.PI * 2); g.fill() } }
  else if (type === 'zzz') { g.font = '800 44px system-ui'; g.fillText('z', 46, 72); g.font = '800 54px system-ui'; g.fillText('Z', 78, 48) }
  else if (type === 'task') { g.fillRect(40, 38, 48, 36); g.clearRect(46, 44, 36, 4); g.fillStyle = '#fff'; g.fillRect(46, 52, 36, 3); g.fillRect(46, 60, 28, 3) }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  bubbleCache.set(type, t)
  return t
}

const labelCache = new Map()
function labelTexture(name, role, text) {
  const key = `${name}|${role}|${text}`
  if (labelCache.has(key)) return labelCache.get(key)
  const cv = document.createElement('canvas')
  cv.width = 320; cv.height = 96
  const g = cv.getContext('2d')
  g.fillStyle = 'rgba(11,16,32,0.82)'
  g.beginPath(); g.roundRect(4, 4, 312, 88, 18); g.fill()
  g.fillStyle = '#ffffff'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'
  g.fillText(`${name} · ${role}`.slice(0, 24), 160, 38)
  g.fillStyle = '#7ff2df'; g.font = '600 26px system-ui, sans-serif'
  g.fillText(text.slice(0, 26), 160, 74)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  labelCache.set(key, t)
  return t
}

function Overlay({ agent, settings, quality }) {
  const label = useRef()
  const bub = useRef()
  const lm = useMemo(() => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  const bm = useMemo(() => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  const last = useRef('')
  const lastB = useRef('')
  useFrame(() => {
    const ok = agent.visible && !agent.cull && agent.showLabel
    if (label.current) {
      label.current.visible = ok && settings.labels
      if (label.current.visible) {
        label.current.position.set(agent.x, agent.y + 2.55 * (agent.height || 1), agent.z)
        const k = `${agent.label}`
        if (k !== last.current) { last.current = k; lm.map = labelTexture(agent.name, agent.role, agent.label); lm.needsUpdate = true }
      }
    }
    if (bub.current) {
      const b = bubbleFor(agent)
      bub.current.visible = ok && !!b
      if (bub.current.visible) {
        bub.current.position.set(agent.x + 0.35, agent.y + 2.85 * (agent.height || 1), agent.z)
        if (b !== lastB.current) { lastB.current = b; bm.map = bubbleTexture(b); bm.needsUpdate = true }
      }
    }
  })
  void quality
  return (
    <>
      <sprite ref={label} material={lm} scale={[2.4, 0.72, 1]} />
      <sprite ref={bub} material={bm} scale={[0.75, 0.75, 1]} />
    </>
  )
}

// Fernsicht: Agenten als Marker (ein Drawcall)
function FarMarkers({ agents }) {
  const ref = useRef()
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ camera }) => {
    const mesh = ref.current
    if (!mesh) return
    let n = 0
    const c = new THREE.Color()
    for (const a of agents) {
      if (!a.visible || insideHQ(a.x, a.z)) continue
      const d = Math.hypot(camera.position.x - a.x, camera.position.y - a.y, camera.position.z - a.z)
      if (d < 110) continue
      const sc = Math.max(1, d / 55)
      m.position.set(a.x, a.y + 0.9 * sc, a.z)
      m.scale.set(sc, sc, sc)
      m.updateMatrix()
      mesh.setMatrixAt(n, m.matrix)
      mesh.setColorAt(n, c.set(a.look.shirt))
      n++
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 160]} frustumCulled={false}>
      <capsuleGeometry args={[0.35, 1.1, 3, 6]} />
      <meshStandardMaterial roughness={0.7} emissive="#ffffff" emissiveIntensity={0.15} />
    </instancedMesh>
  )
}

// Schweiß: ein Points Objekt für alle laufenden Agenten
function Sweat({ agents, perAgent }) {
  const ref = useRef()
  const cap = 160 * perAgent
  const pos = useMemo(() => new Float32Array(cap * 3), [cap])
  useFrame(({ clock: c, camera }) => {
    const t = c.elapsedTime
    let n = 0
    for (const a of agents) {
      if (!a.visible || a.activity !== 'RUN') continue
      if (Math.hypot(camera.position.x - a.x, camera.position.z - a.z) > 30) continue
      for (let j = 0; j < perAgent && n < cap; j++) {
        const ph = (t * 0.9 + j * 0.37 + a.id.length * 0.11) % 1
        pos[n * 3] = a.x + Math.sin(a.yaw + 1.5 + j) * 0.2
        pos[n * 3 + 1] = a.y + 1.75 - ph * 0.5
        pos[n * 3 + 2] = a.z + Math.cos(a.yaw + 1.5 + j) * 0.2
        n++
      }
    }
    const g = ref.current.geometry
    g.setDrawRange(0, n)
    g.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial color="#bfe8ff" size={0.07} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

// Plumbob wie in den Sims: rotierender Diamant über dem Kopf, Farbe nach Status (theme.js). Ein Drawcall.
function Plumbobs({ agents }) {
  const ref = useRef()
  const o = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock: c }) => {
    const mesh = ref.current
    if (!mesh) return
    let n = 0
    const t = c.elapsedTime
    for (const a of agents) {
      if (!a.visible || a.cull || n >= 200) continue
      const sel = selection.agent === a
      o.position.set(a.x, a.y + 2.15 * (a.height || 1) + Math.sin(t * 2 + a.seed * 9) * 0.06, a.z)
      o.rotation.set(0, t * 1.6 + a.seed * 6, 0)
      o.scale.set(sel ? 0.2 : 0.13, sel ? 0.34 : 0.22, sel ? 0.2 : 0.13)
      o.updateMatrix()
      mesh.setMatrixAt(n, o.matrix)
      mesh.setColorAt(n, col.set(statusColor(a.status)))
      n++
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 200]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

// Auswahlring unter dem gewählten Agenten
function SelectionRing() {
  const ref = useRef()
  useFrame(({ clock: c }) => {
    const a = selection.agent
    const m = ref.current
    if (!m) return
    m.visible = !!a && a.visible && !a.cull
    if (m.visible) { m.position.set(a.x, a.y + 0.05, a.z); m.rotation.z = c.elapsedTime }
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.55, 0.72, 32]} />
      <meshBasicMaterial color="#3ddc84" toneMapped={false} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  )
}

// Auswahl per Mausklick: Strahl gegen Kapseln der Agenten
function Picker({ agents, mode }) {
  const { gl, camera } = useThree()
  const down = useRef(null)
  useEffect(() => {
    const el = gl.domElement
    const pd = (e) => { down.current = { x: e.clientX, y: e.clientY } }
    const pu = (e) => {
      const d = down.current
      down.current = null
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return
      const r = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      let best = null; let bd = Infinity
      const p1 = new THREE.Vector3(); const p2 = new THREE.Vector3(); const seg = new THREE.Line3()
      for (const a of agents) {
        if (!a.visible || a.cull) continue
        seg.set(new THREE.Vector3(a.x, a.y + 0.25, a.z), new THREE.Vector3(a.x, a.y + 1.75 * (a.height || 1), a.z))
        // kürzester Abstand zwischen Strahl und Strecke
        const ro = ray.ray.origin; const rd = ray.ray.direction
        const w0 = ro.clone().sub(seg.start); const u = rd; const v = seg.delta(p1)
        const A = u.dot(u); const B = u.dot(v); const C = v.dot(v); const D = u.dot(w0); const E = v.dot(w0)
        const den = A * C - B * B
        let s = den > 1e-8 ? (B * E - C * D) / den : 0
        let t = den > 1e-8 ? (A * E - B * D) / den : E / C
        t = Math.min(1, Math.max(0, t)); s = Math.max(0, s)
        const ptR = ro.clone().addScaledVector(u, s); const ptS = seg.start.clone().addScaledVector(v, t)
        const dist = ptR.distanceTo(ptS)
        void p2
        if (dist < 0.65 && s < bd) { bd = s; best = a }
      }
      select(best, best && mode === 'sims' ? selection.follow : false)
    }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointerup', pu)
    return () => { el.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu) }
  }, [gl, camera, agents, mode])
  return null
}

export default function OutdoorAgents({ settings, quality, api, mode }) {
  const agents = useMemo(() => [], [])
  const [n, setN] = useState(0)
  const tick = useRef(0)
  const ctx = useMemo(() => ({ events: [], outdoor: 0 }), [])
  const log = useRef([])

  // Besetzung aus den Etagendaten des Visual Spikes (sim/population.js), optional mit Gästen für Kapazitätstests
  function spawn(total = 47) {
    agents.length = 0
    agents.push(...buildPopulation(total))
    outdoorStats.totalAgents = agents.length
    setN(agents.length)
  }

  useEffect(() => {
    spawn(47)
    api.spawn = spawn
    api.agents = () => agents
    api.command = (id, cmd) => { const a = agents.find((x) => x.id === id); if (a) command(a, cmd) }
    api.assign = (id, intent, opts) => { const a = agents.find((x) => x.id === id); if (a) assignIntent(a, intent, opts) }
    api.interrupt = (id) => { const a = agents.find((x) => x.id === id); if (a) { interrupt(a); a.brain.action = 'Rückweg' } }
    // Demo: Aufgabe trifft ein, ein laufender Agent bricht ab und geht zurück an seinen Platz
    api.simulateTask = () => {
      const a = agents.find((x) => x.mode === 'route' && x.brain.action === 'Sport' && x.intent !== 'RETURN_TO_HQ' && x.homeSeat)
      if (!a) return null
      a.bubble = { type: 'task', ttl: 6 }
      interrupt(a); a.brain.action = 'Rückweg'; a.label = 'Aufgabe eingegangen'
      log.current.unshift({ t: performance.now(), text: `${a.name}: Aufgabe eingegangen, Lauf abgebrochen` })
      return a.id
    }
    api.events = () => log.current
    api.select = (id) => select(agents.find((x) => x.id === id) || null, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = (dtReal) => {
    const dt = dtReal * mult()
    stepWorld(agents, dt, ctx)
    for (const e of ctx.events) {
      const text = e.type === 'done' ? `${e.agent.name} hat „${e.title}“ abgeschlossen` : `${e.agent.name}: neue Aufgabe „${e.agent.task?.title}“`
      log.current.unshift({ t: performance.now(), text })
    }
    if (log.current.length > 30) log.current.length = 30
  }
  useEffect(() => { api.advance = (sec) => { for (let t = 0; t < sec; t += 0.1) advance(0.1) } }, [])

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    advance(dt)
    const camIn = insideHQ(camera.position.x, camera.position.z, 1)
    const showAll = mode === 'sims'
    for (const a of agents) {
      const d = Math.hypot(camera.position.x - a.x, camera.position.z - a.z)
      a.cull = (!showAll && d > 70) || (showAll && d > 140) || (camIn && insideHQ(a.x, a.z) && Math.abs(a.y - camera.position.y) > 3.6 && !showAll) || (camIn !== insideHQ(a.x, a.z, 1) && d > 30 && !showAll)
      a._d = d
      a.timeScale = Math.max(1, Math.min(3, mult() || 1))
    }
    if (++tick.current % 10 === 0) {
      const near = agents.filter((a) => a.visible && !a.cull && a._d < quality.agentLabelDist * (showAll ? 2 : 1)).sort((p, q) => p._d - q._d).slice(0, MAX_LABELS)
      for (const a of agents) a.showLabel = false
      for (const a of near) a.showLabel = true
      if (selection.agent) selection.agent.showLabel = true
    }
    outdoorStats.visibleAgents = agents.filter((a) => a.visible && !a.cull).length
    outdoorStats.totalAgents = agents.length
  })

  const perAgent = settings.effects ? { none: 0, minimal: 3, particles: 8 }[quality.sweat] : 0
  const crowd = useMemo(() => [player, ...agents], [agents, n])
  return (
    <>
      <Suspense fallback={null}><CrowdAvatars list={crowd} shadows={quality.shadows} capacity={200} /></Suspense>
      <Plumbobs agents={agents} />
      <SelectionRing />
      <Picker agents={agents} mode={mode} />
      {agents.slice(0, n).map((a) => <Overlay key={a.id} agent={a} settings={settings} quality={quality} />)}
      <FarMarkers agents={agents} />
      {perAgent > 0 && <Sweat key={perAgent} agents={agents} perAgent={perAgent} />}
    </>
  )
}
