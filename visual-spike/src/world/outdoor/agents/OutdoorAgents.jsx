import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import OutdoorAvatar from './OutdoorAvatar.jsx'
import { createAgent, assignIntent, interrupt, stepAgent, placeAtSeat } from './outdoorAgentSim.js'
import { outdoorStats } from '../runtime/stats.js'
import { DESK_ANCHORS, MEETING_ANCHORS } from '../../indoor/nav/indoorAnchors.js'
import { insideHQ } from '../../indoor/config/hq.layout.js'

const SHIRTS = ['#ff8a3d', '#2fd6c0', '#5b6ee1', '#e15b7a', '#f2c94c', '#8e6bd8', '#3aa76d', '#e8e8e8']
const HAIR = ['#2b2118', '#6b4423', '#c9a24a', '#1c1c1c', '#a33b2a', '#5a5a5a']
const NAMES = ['Lena', 'Tom', 'Mira', 'Jan', 'Sofia', 'Ali', 'Nora', 'Ben', 'Kai', 'Ida', 'Paul', 'Emma', 'Max', 'Zoe', 'Leo', 'Yara', 'Clara', 'Dio', 'Sam', 'Finn', 'Mia', 'Noah', 'Eva', 'Luca', 'Hanna', 'Elias', 'Lotte', 'Jonas', 'Emil', 'Ronja']
const ROLES = ['Research', 'Sales', 'Developer', 'Reviewer', 'Redaktion', 'QA', 'Design', 'Strategie']
const RANDOM_INTENTS = ['RUN_CASCADES', 'RUN_FOREST', 'WALK_CASCADES', 'REST_OUTSIDE', 'STRETCH', 'WALK_TO_HERKULES']
const MAX_LABELS = 8
const DEMO = [['RUN_CASCADES', 2], ['RUN_FOREST', 6], ['REST_OUTSIDE', 10], ['WALK_TO_HERKULES', 14], ['STRETCH', 18]]

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
  g.fillText(text.slice(0, 26), 160, 74)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  labelCache.set(key, t)
  return t
}

function AgentRig({ agent, settings, quality }) {
  const sprite = useRef()
  const spriteMat = useMemo(() => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  const last = useRef('')
  useFrame(() => {
    const s = sprite.current
    if (!s) return
    const show = settings.labels && agent.visible && !agent.cull && agent.showLabel
    s.visible = show
    if (!show) return
    s.position.set(agent.x, agent.y + 2.25, agent.z)
    if (agent.label !== last.current) { last.current = agent.label; spriteMat.map = labelTexture(agent.name, agent.role, agent.label); spriteMat.needsUpdate = true }
  })
  void quality
  return (
    <>
      <OutdoorAvatar state={agent} shirt={agent.shirt} hair={agent.hair} skin={agent.skin} />
      <sprite ref={sprite} material={spriteMat} scale={[2.4, 0.72, 1]} />
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
      if (!a.visible || insideHQ(a.x, a.z)) continue
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
    <instancedMesh ref={ref} args={[undefined, undefined, 128]} frustumCulled={false}>
      <capsuleGeometry args={[0.35, 1.1, 3, 6]} />
      <meshStandardMaterial roughness={0.7} emissive="#ffffff" emissiveIntensity={0.15} />
    </instancedMesh>
  )
}

// Schweiß: ein einziges Points Objekt für alle laufenden Agenten. Qualität und Effektschalter steuern die Menge.
function Sweat({ agents, perAgent }) {
  const ref = useRef()
  const cap = 128 * perAgent
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

const mk = (i, home, seatLabel) => {
  const a = createAgent(`agent-${i + 1}`, NAMES[i % NAMES.length], { role: ROLES[i % ROLES.length], shirt: SHIRTS[i % SHIRTS.length], hair: HAIR[i % HAIR.length], skin: i })
  a.lane = ((i % 5) - 2) / 2 * 0.9
  a.homeSeat = home
  placeAtSeat(a, home, seatLabel || `arbeitet · ${home.team}`)
  return a
}

export default function OutdoorAgents({ settings, quality, api }) {
  const agents = useMemo(() => [], [])
  const timers = useRef(new Map())
  const [n, setN] = useState(0)
  const tick = useRef(0)

  // Bevölkerung: outdoorCount Agenten starten am Schreibtisch auf Etage 1 und gehen später hinaus (5 mit festen Aufgaben, weitere zufällig).
  // Zusätzlich sitzen Agenten in Meetings und an weiteren Schreibtischen (statisch), einige laufen Rundgänge im Gebäude.
  function spawn(outdoorCount = 5, indoor = true) {
    agents.length = 0
    const used = new Set()
    const homes = DESK_ANCHORS.filter((d) => d.level === 1)
    for (let i = 0; i < outdoorCount; i++) {
      const home = homes[(i * 5) % homes.length]
      const seat = used.has(home.id) ? homes.find((h) => !used.has(h.id)) : home
      used.add(seat.id)
      const a = mk(i, seat)
      const [intent, delay] = i < DEMO.length ? DEMO[i] : [RANDOM_INTENTS[i % RANDOM_INTENTS.length], 6 + i * 2.3]
      a.spawnDelay = delay
      a.nextIntent = intent
      a.demo = true
      timers.current.set(a.id, 25 + Math.random() * 40)
      agents.push(a)
    }
    if (indoor) {
      let i = agents.length
      for (const d of DESK_ANCHORS) {
        if (used.has(d.id) || (i % 4 === 3)) { i++; continue }
        used.add(d.id)
        agents.push(mk(i++, d))
      }
      const meet = { herkules: 6, loewenburg: 8, oktogon: 4, kaskade: 3 }
      for (const [room, cnt] of Object.entries(meet)) {
        MEETING_ANCHORS.filter((s) => s.room === room).slice(0, cnt).forEach((s) => agents.push(mk(i++, s, `Meeting · ${s.roomName.replace('Konferenzraum ', '').replace('Meetingraum ', '')}`)))
      }
      // Rundgänger: Rolltreppe hoch, Treppe runter und umgekehrt
      for (let k = 0; k < 3; k++) {
        const a = createAgent(`agent-${i + 1}`, NAMES[i % NAMES.length], { role: 'Rundgang', shirt: SHIRTS[(i + 2) % 8], hair: HAIR[i % 6], skin: i })
        a.lane = (k - 1) * 0.5; a.x = 0; a.z = -9; a.y = 0; a.mode = 'anchor'; a.visible = false
        a.spawnDelay = 1 + k * 7; a.nextIntent = 'PATROL_INDOOR'; a.routeId = k % 2 ? 'indoor-loop-b' : 'indoor-loop-a'
        agents.push(a)
        i++
      }
    }
    outdoorStats.totalAgents = agents.length
    setN(agents.length)
  }

  useEffect(() => {
    spawn(5)
    api.spawn = spawn
    api.agents = () => agents
    api.assign = (id, intent, opts) => { const a = agents.find((x) => x.id === id); if (a) assignIntent(a, intent, opts) }
    api.interrupt = (id) => { const a = agents.find((x) => x.id === id); if (a) interrupt(a) }
    // Demo: eine Aufgabe trifft ein, der laufende Agent bricht ab und geht zurück an seinen Platz
    api.simulateTask = () => {
      const a = agents.find((x) => x.demo && x.mode === 'route' && x.baseActivity === 'RUN' && x.intent !== 'RETURN_TO_HQ') || agents.find((x) => x.demo && x.mode === 'route' && x.intent !== 'RETURN_TO_HQ')
      if (!a) return null
      interrupt(a)
      a.label = 'Aufgabe eingegangen'
      return a.id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ein Simulationsschritt für alle Agenten (auch für Tests und schnelles Vorspulen nutzbar)
  const advance = (dt) => {
    for (const a of agents) {
      if (a.spawnDelay > 0) {
        a.spawnDelay -= dt
        if (a.spawnDelay <= 0 && a.nextIntent) {
          if (a.nextIntent === 'PATROL_INDOOR') { a.mode = 'inside'; a.x = 0; a.z = -9; assignIntent(a, 'PATROL_INDOOR', { routeId: a.routeId }) }
          else assignIntent(a, a.nextIntent)
          a.nextIntent = null
        }
        continue
      }
      stepAgent(a, dt)
      if (a.demo && a.mode === 'anchor' && a.intent && a.intent !== 'RETURN_TO_HQ' && a.intent !== 'WORK_AT_DESK' && Number(a.id.replace('agent-', '')) > DEMO.length) {
        const t = (timers.current.get(a.id) ?? 30) - dt
        timers.current.set(a.id, t)
        if (t < 0) { assignIntent(a, RANDOM_INTENTS[Math.floor(Math.random() * RANDOM_INTENTS.length)]); timers.current.set(a.id, 30 + Math.random() * 40) }
      }
    }
  }
  useEffect(() => { api.advance = (sec) => { for (let t = 0; t < sec; t += 0.1) advance(0.1) } }, [])

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const camIn = insideHQ(camera.position.x, camera.position.z, 1)
    advance(dt)
    for (const a of agents) {
      const d = Math.hypot(camera.position.x - a.x, camera.position.z - a.z)
      a.cull = d > 70 || (camIn && insideHQ(a.x, a.z) && Math.abs(a.y - camera.position.y) > 3.6) || (camIn !== insideHQ(a.x, a.z, 1) && d > 30)
      a._d = d
    }
    // Beschriftung nur für die nächsten Agenten (jede Beschriftung ist ein Drawcall)
    if (++tick.current % 10 === 0) {
      const near = agents.filter((a) => a.visible && !a.cull && a._d < quality.agentLabelDist).sort((p, q) => p._d - q._d).slice(0, MAX_LABELS)
      for (const a of agents) a.showLabel = false
      for (const a of near) a.showLabel = true
    }
    outdoorStats.visibleAgents = agents.filter((a) => a.visible && !a.cull).length
    outdoorStats.totalAgents = agents.length
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
