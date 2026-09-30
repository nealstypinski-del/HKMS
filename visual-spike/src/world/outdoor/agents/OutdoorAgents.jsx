import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import OutdoorAvatar from './OutdoorAvatar.jsx'
import { createAgent, assignIntent, interrupt, stepAgent } from './outdoorAgentSim.js'
import { outdoorStats } from '../runtime/stats.js'

const SHIRTS = ['#ff8a3d', '#2fd6c0', '#5b6ee1', '#e15b7a', '#f2c94c', '#8e6bd8', '#3aa76d', '#e8e8e8']
const HAIR = ['#2b2118', '#6b4423', '#c9a24a', '#1c1c1c', '#a33b2a', '#5a5a5a']
const NAMES = ['Lena', 'Tom', 'Mira', 'Jan', 'Sofia', 'Ali', 'Nora', 'Ben', 'Kai', 'Ida', 'Paul', 'Emma', 'Max', 'Zoe', 'Leo', 'Yara', 'Clara', 'Dio', 'Sam']
const ROLES = ['Research', 'Sales', 'Developer', 'Reviewer', 'Redaktion', 'QA', 'Design', 'Strategie']
const RANDOM_INTENTS = ['RUN_CASCADES', 'RUN_FOREST', 'WALK_CASCADES', 'REST_OUTSIDE', 'STRETCH', 'WALK_TO_HERKULES']

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
  g.fillText(`${name} · ${role}`, 160, 38)
  g.fillStyle = '#7ff2df'; g.font = '600 26px system-ui, sans-serif'
  g.fillText(text, 160, 74)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  labelCache.set(key, t)
  return t
}

function AgentRig({ agent, settings, quality }) {
  const sprite = useRef()
  const spriteMat = useMemo(() => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  const last = useRef('')
  useFrame(({ camera }) => {
    const s = sprite.current
    if (!s) return
    const d = Math.hypot(camera.position.x - agent.x, camera.position.z - agent.z)
    const show = settings.labels && agent.visible && d < quality.agentLabelDist
    s.visible = show
    if (!show) return
    s.position.set(agent.x, agent.y + 2.35, agent.z)
    const key = agent.label
    if (key !== last.current) { last.current = key; spriteMat.map = labelTexture(agent.name, agent.role, agent.label); spriteMat.needsUpdate = true }
  })
  return (
    <>
      <OutdoorAvatar state={agent} shirt={agent.shirt} hair={agent.hair} skin={agent.skin} />
      <sprite ref={sprite} material={spriteMat} scale={[2.6, 0.78, 1]} />
    </>
  )
}

// Fernsicht: Agenten als kleine Marker (ein Drawcall), damit die Bewegung auch in der Übersicht lesbar bleibt
function FarMarkers({ agents }) {
  const ref = useRef()
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ camera }) => {
    const mesh = ref.current
    if (!mesh) return
    let n = 0
    const c = new THREE.Color()
    for (const a of agents) {
      if (!a.visible) continue
      const d = Math.hypot(camera.position.x - a.x, camera.position.y - a.y, camera.position.z - a.z)
      if (d < 110) continue
      const sc = Math.max(1, d / 55)
      m.position.set(a.x, a.y + 0.9 * sc, a.z)
      m.scale.set(sc, sc, sc)
      m.updateMatrix()
      mesh.setMatrixAt(n, m.matrix)
      mesh.setColorAt(n, c.set(a.shirt))
      n++
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 96]} frustumCulled={false}>
      <capsuleGeometry args={[0.35, 1.1, 3, 6]} />
      <meshStandardMaterial roughness={0.7} emissive="#ffffff" emissiveIntensity={0.15} />
    </instancedMesh>
  )
}

// Schweiß: ein einziges Points Objekt für alle laufenden Agenten. Qualität und Effektschalter steuern die Menge.
function Sweat({ agents, perAgent }) {
  const ref = useRef()
  const cap = 96 * perAgent
  const pos = useMemo(() => new Float32Array(cap * 3), [cap])
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
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

const DEMO = [
  ['RUN_CASCADES', 0], ['RUN_FOREST', 4], ['REST_OUTSIDE', 8], ['WALK_TO_HERKULES', 12], ['STRETCH', 16],
]

export default function OutdoorAgents({ settings, quality, api }) {
  const agents = useMemo(() => [], [])
  const timers = useRef(new Map())
  const [n, setN] = useState(0)

  // Demo erzeugen: 5 Agenten mit festen Aufgaben, weitere mit zufälligen
  function spawn(count) {
    agents.length = 0
    for (let i = 0; i < count; i++) {
      const a = createAgent(`agent-${i + 1}`, NAMES[i % NAMES.length], {
        role: ROLES[i % ROLES.length], shirt: SHIRTS[i % SHIRTS.length], hair: HAIR[i % HAIR.length], skin: i,
      })
      a.lane = ((i % 5) - 2) / 2 * 0.9
      const [intent, delay] = i < DEMO.length ? DEMO[i] : [RANDOM_INTENTS[i % RANDOM_INTENTS.length], 3 + i * 1.7]
      a.spawnDelay = delay
      a.nextIntent = intent
      timers.current.set(a.id, 20 + Math.random() * 40)
      agents.push(a)
    }
    outdoorStats.totalAgents = agents.length
    setN(count)
  }

  useEffect(() => {
    spawn(5)
    api.spawn = spawn
    api.agents = () => agents
    api.assign = (id, intent, opts) => { const a = agents.find((x) => x.id === id); if (a) assignIntent(a, intent, opts) }
    api.interrupt = (id) => { const a = agents.find((x) => x.id === id); if (a) interrupt(a) }
    // Demo: Aufgabe trifft ein, Agent 1 bricht den Lauf ab
    api.simulateTask = () => { const a = agents.find((x) => x.activity === 'RUN' && x.mode === 'route' && x.intent !== 'RETURN_TO_HQ') || agents[0]; if (a) { a.label = 'Aufgabe eingegangen'; interrupt(a); return a.id } return null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const built = useRef(0)
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    let vis = 0
    for (const a of agents) {
      if (a.spawnDelay > 0) { a.spawnDelay -= dt; if (a.spawnDelay <= 0 && a.nextIntent) { assignIntent(a, a.nextIntent); a.nextIntent = null } continue }
      stepAgent(a, dt)
      if (a.visible) vis++
      // zufällige Agenten wechseln gelegentlich die Absicht (nur Demo)
      if (a.id.replace('agent-', '') > DEMO.length && a.mode === 'anchor') {
        const t = (timers.current.get(a.id) ?? 30) - dt
        timers.current.set(a.id, t)
        if (t < 0) { assignIntent(a, RANDOM_INTENTS[Math.floor(Math.random() * RANDOM_INTENTS.length)]); timers.current.set(a.id, 30 + Math.random() * 40) }
      }
    }
    outdoorStats.visibleAgents = vis
    outdoorStats.totalAgents = agents.length
    built.current++
  })

  const perAgent = settings.effects ? { none: 0, minimal: 3, particles: 8 }[quality.sweat] : 0
  return (
    <>
      {agents.slice(0, n).map((a) => <AgentRig key={a.id} agent={a} settings={settings} quality={quality} />)}
      <FarMarkers agents={agents} />
      {perAgent > 0 && <Sweat key={perAgent} agents={agents} perAgent={perAgent} />}
    </>
  )
}
