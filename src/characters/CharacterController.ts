// Bewegungslogik der Figuren. Reine Funktionen auf einem veränderlichen Laufzeitobjekt, ohne React und ohne Three.js.
// Die Figur folgt dem Agentenstatus: Statuswechsel -> State Machine -> Ziel Slot -> Route -> weiche Bewegung.

import type { Agent, AgentStatus, Desk } from '../agents/agent.types'
import type { Slot } from '../config/floorLayouts'
import { floorY } from '../config/office.config'
import { planRoute, type RouteLeg } from '../navigation/routes'
import { overflowSlot, slotAllocator } from '../navigation/slots'
import { deskOccupancy, elevatorCar } from '../world/runtime'
import { transition, isWalking, type CharacterPhase } from './characterMachine'
import { candidateSlots, departmentFloor } from './destination'

export const WALK_SPEED = 2.3
const TURN_SPEED = 9
const SIT_SPEED = 4.5
const RIDE_SECONDS_PER_FLOOR = 1.1

export interface CharacterRuntime {
  x: number
  z: number
  /** Etage als Zahl, während der Aufzugfahrt fließend */
  level: number
  yaw: number
  phase: CharacterPhase
  target: Slot | null
  route: RouteLeg[]
  leg: number
  rideT: number
  /** 0 = steht, 1 = sitzt */
  sit: number
  seatY: number
  moving: boolean
  riding: boolean
  visible: boolean
  lastStatus: AgentStatus | null
  lastDeskId: string | undefined
  occupiedDesk: string | undefined
}

const walkingPhase = (status: AgentStatus): CharacterPhase => transition('OFFLINE', { type: 'STATUS', status })

function assignTarget(rt: CharacterRuntime, agent: Agent, desk: Desk | undefined, mode: 'spawn' | 'replan'): void {
  const candidates = candidateSlots(agent, desk)
  if (candidates.length === 0) {
    slotAllocator.release(agent.id)
    rt.target = null
    rt.route = []
    rt.visible = false
    return
  }
  rt.visible = true
  const slot = slotAllocator.claim(agent.id, candidates) ?? overflowSlot(departmentFloor(agent.department), agent.id)
  if (mode === 'spawn') {
    rt.target = slot
    rt.x = slot.x
    rt.z = slot.z
    rt.level = slot.floor
    rt.yaw = slot.yaw
    rt.sit = slot.pose === 'sit' ? 1 : 0
    rt.seatY = slot.seatY ?? 0.5
    rt.route = []
    rt.leg = 0
    return
  }
  if (rt.target?.id === slot.id && rt.route.length === 0) return
  rt.target = slot
  rt.route = planRoute({ floor: Math.round(rt.level), x: rt.x, z: rt.z }, slot)
  rt.leg = 0
  if (!isWalking(rt.phase)) rt.phase = walkingPhase(agent.status)
}

/** Erzeugt den Startzustand einer Figur direkt an ihrem Zielplatz (kein Einflug beim Laden). */
export function spawnRuntime(agent: Agent, desk: Desk | undefined): CharacterRuntime {
  const rt: CharacterRuntime = {
    x: 0, z: 0, level: 0, yaw: 0, phase: 'IDLE', target: null, route: [], leg: 0, rideT: 0, sit: 0, seatY: 0.5,
    moving: false, riding: false, visible: true, lastStatus: agent.status, lastDeskId: agent.deskId, occupiedDesk: undefined,
  }
  rt.phase = transition(transition('IDLE', { type: 'STATUS', status: agent.status }), { type: 'ARRIVED', status: agent.status })
  assignTarget(rt, agent, desk, 'spawn')
  if (rt.target?.area === 'desk' && agent.deskId) {
    rt.occupiedDesk = agent.deskId
    deskOccupancy.set(agent.deskId, true)
  }
  return rt
}

const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const smooth = (t: number): number => t * t * (3 - 2 * t)

function turnTowards(rt: CharacterRuntime, yaw: number, dt: number): void {
  rt.yaw += angleDiff(rt.yaw, yaw) * Math.min(1, TURN_SPEED * dt)
}

function leaveDesk(rt: CharacterRuntime): void {
  if (rt.occupiedDesk) {
    deskOccupancy.set(rt.occupiedDesk, false)
    rt.occupiedDesk = undefined
  }
}

/** Ein Simulationsschritt für eine Figur. */
export function stepCharacter(rt: CharacterRuntime, agent: Agent, desk: Desk | undefined, dt: number): void {
  const currentLeg = rt.route[rt.leg]
  const locked = currentLeg?.locked === true

  // Statuswechsel oder neuer Arbeitsplatz -> neu planen (nie mitten im Aufzug)
  if (!locked && (agent.status !== rt.lastStatus || (agent.deskId !== rt.lastDeskId && (agent.status === 'working' || agent.status === 'waiting')))) {
    rt.phase = transition(rt.phase, { type: 'STATUS', status: agent.status })
    rt.lastStatus = agent.status
    rt.lastDeskId = agent.deskId
    assignTarget(rt, agent, desk, 'replan')
    if (rt.route.length > 0) leaveDesk(rt)
    else if (isWalking(rt.phase)) rt.phase = transition(rt.phase, { type: 'ARRIVED', status: agent.status })
  }

  if (rt.target === null) {
    rt.moving = false
    return
  }

  const leg = rt.route[rt.leg]
  if (leg) {
    // Erst aufstehen, dann loslaufen
    if (rt.sit > 0.02 && leg.kind === 'walk' && !leg.locked) {
      rt.sit = Math.max(0, rt.sit - SIT_SPEED * dt)
      rt.moving = false
      return
    }
    if (leg.kind === 'walk') {
      rt.sit = Math.max(0, rt.sit - SIT_SPEED * dt)
      const dx = leg.x - rt.x
      const dz = leg.z - rt.z
      const dist = Math.hypot(dx, dz)
      const step = WALK_SPEED * dt
      if (dist <= step) {
        rt.x = leg.x
        rt.z = leg.z
        rt.leg += 1
      } else {
        rt.x += (dx / dist) * step
        rt.z += (dz / dist) * step
        turnTowards(rt, Math.atan2(dx, dz), dt)
      }
      rt.moving = true
      rt.riding = false
    } else {
      // Aufzugfahrt: Kabine hält die Figur, y wird weich interpoliert
      rt.riding = true
      rt.moving = false
      rt.rideT += dt / (RIDE_SECONDS_PER_FLOOR * Math.max(1, Math.abs(leg.toFloor - leg.fromFloor)))
      const t = Math.min(1, rt.rideT)
      rt.level = leg.fromFloor + (leg.toFloor - leg.fromFloor) * smooth(t)
      elevatorCar.y = floorY(rt.level)
      turnTowards(rt, 0, dt)
      if (rt.rideT >= 1) {
        rt.level = leg.toFloor
        rt.rideT = 0
        rt.leg += 1
        rt.riding = false
      }
    }
    return
  }

  // Ziel erreicht: Ausrichtung, Sitzen, Phase abschließen
  rt.moving = false
  rt.riding = false
  const slot = rt.target
  if (isWalking(rt.phase) && rt.route.length > 0) {
    rt.route = []
    rt.leg = 0
    rt.phase = transition(rt.phase, { type: 'ARRIVED', status: agent.status })
  }
  turnTowards(rt, slot.yaw, dt)
  rt.seatY = slot.seatY ?? 0.5
  const sitTarget = slot.pose === 'sit' ? 1 : 0
  rt.sit += Math.sign(sitTarget - rt.sit) * Math.min(Math.abs(sitTarget - rt.sit), SIT_SPEED * dt)
  if (slot.area === 'desk' && rt.sit > 0.8 && agent.deskId && rt.occupiedDesk !== agent.deskId) {
    rt.occupiedDesk = agent.deskId
    deskOccupancy.set(agent.deskId, true)
  }
}

/** Beim Entfernen der Figur Plätze wieder freigeben. */
export function disposeRuntime(agentId: string, rt: CharacterRuntime): void {
  leaveDesk(rt)
  slotAllocator.release(agentId)
}
