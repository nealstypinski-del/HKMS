import { angleDiff } from './angles'
import { getFloor } from './generate'
import { getNav } from './nav'
import type { Agent, ComputerState, Vec2 } from './types'

export type LocoState = 'idle' | 'walking' | 'sitting' | 'working' | 'break' | 'waiting' | 'meeting'

type GoalKind = 'desk' | 'seat' | 'spot'
interface Goal {
  kind: GoalKind
  id: string
  approach: Vec2
  seat?: Vec2
  yaw: number
  arrive: LocoState
}

type Phase = 'hidden' | 'walk' | 'glide' | 'seated' | 'standup' | 'standing'

/** Rein visueller Laufzeitzustand einer Figur. Business-Zustand bleibt im Store. */
export interface Runtime {
  id: string
  floorId: string
  x: number
  z: number
  yaw: number
  state: LocoState
  /** 0 = steht, 1 = sitzt */
  sit: number
  walkClock: number
  hidden: boolean
  phase: Phase
  path: Vec2[]
  pi: number
  goal: Goal | null
  wantKey: string
  deskId: string | null
  ownedKey: string | null
  glideT: number
  glideFrom: Vec2
  stuckT: number
  stuckFails: number
  lastX: number
  lastZ: number
  walkTime: number
  spawnAt: number
  retryAt: number
  doneUntil: number
  speed: number
}

const SPEED = 1.9
const TURN = 9

export class WorldSim {
  time = 0
  readonly rt = new Map<string, Runtime>()
  /** Belegung: Desk-, Sitz- und Standpunkt-IDs → Agent-ID */
  readonly owner = new Map<string, string>()
  private overrides = new Map<string, ComputerState>()
  /** Zähler für Diagnose */
  stats = { repaths: 0, teleports: 0 }

  get(id: string) { return this.rt.get(id) }

  setComputerOverride(computerId: string, s: ComputerState | null) {
    if (s) this.overrides.set(computerId, s)
    else this.overrides.delete(computerId)
  }

  /** Abgleich mit dem Store: neue Agenten anlegen, entfernte löschen, Statuswechsel erkennen. */
  sync(agents: Record<string, Agent>, spawnStagger = 0.35) {
    let newIdx = 0
    for (const a of Object.values(agents)) {
      let r = this.rt.get(a.id)
      if (!r) {
        r = this.createRuntime(a)
        r.spawnAt = this.time + newIdx++ * spawnStagger
        this.rt.set(a.id, r)
      }
    }
    for (const id of [...this.rt.keys()]) {
      if (!agents[id]) { this.release(this.rt.get(id)!); this.rt.delete(id) }
    }
  }

  private createRuntime(a: Agent): Runtime {
    const f = getFloor(a.floorId)
    const nav = getNav(a.floorId)
    const p = nav.nearestFree(f.elevatorExit.x + (Math.random() - 0.5) * 1.2, f.elevatorExit.z) ?? f.elevatorExit
    return {
      id: a.id, floorId: a.floorId, x: p.x, z: p.z, yaw: 0, state: 'idle', sit: 0, walkClock: Math.random() * 6,
      hidden: true, phase: 'hidden', path: [], pi: 0, goal: null, wantKey: '', deskId: null, ownedKey: null,
      glideT: 0, glideFrom: { x: p.x, z: p.z }, stuckT: 0, stuckFails: 0, lastX: p.x, lastZ: p.z, walkTime: 0,
      spawnAt: 0, retryAt: 0, doneUntil: 0, speed: SPEED * (0.9 + Math.random() * 0.2),
    }
  }

  private release(r: Runtime) {
    if (r.ownedKey && this.owner.get(r.ownedKey) === r.id) this.owner.delete(r.ownedKey)
    r.ownedKey = null
  }

  private claim(r: Runtime, key: string) {
    this.release(r)
    this.owner.set(key, r.id)
    r.ownedKey = key
  }

  private isFree = (key: string, self: string) => {
    const o = this.owner.get(key)
    return !o || o === self
  }

  private chooseGoal(r: Runtime, a: Agent): Goal | null {
    const f = getFloor(a.floorId)
    const free = (id: string) => this.isFree(id, r.id)
    const near = <T extends { pos?: Vec2; seat?: Vec2; approach?: Vec2 }>(list: T[]) =>
      list.reduce<T | null>((best, c) => {
        const p = c.approach ?? c.pos!
        const d = (p.x - r.x) ** 2 + (p.z - r.z) ** 2
        const bp = best ? (best.approach ?? best.pos!) : null
        return !best || d < (bp!.x - r.x) ** 2 + (bp!.z - r.z) ** 2 ? c : best
      }, null)
    const spotGoal = (s: { id: string; pos: Vec2; yaw: number }, arrive: LocoState): Goal =>
      ({ kind: 'spot', id: s.id, approach: s.pos, yaw: s.yaw, arrive })

    switch (a.status) {
      case 'working': {
        // Erst freie Tische der eigenen Abteilung, dann jeder freie Tisch im Geschoss.
        const own = f.desks.filter((d) => d.departmentId === a.departmentId && free(d.id))
        const any = f.desks.filter((d) => free(d.id))
        const d = own[0] ?? any[0]
        if (d) return { kind: 'desk', id: d.id, approach: d.approach, seat: d.seat, yaw: d.yaw, arrive: 'working' }
        const w = near(f.lobbySpots.filter((s) => free(s.id)))
        return w ? spotGoal(w, 'waiting') : null
      }
      case 'idle': {
        const seats = f.seats.filter((s) => (s.kind === 'bench' || s.kind === 'sofa') && free(s.id))
        const s = near(seats.map((x) => ({ ...x, approach: x.approach })))
        if (s) return { kind: 'seat', id: s.id, approach: s.approach, seat: s.seat, yaw: s.yaw, arrive: 'sitting' }
        const w = near(f.lobbySpots.filter((x) => free(x.id)))
        return w ? spotGoal(w, 'idle') : null
      }
      case 'break': {
        const stools = f.seats.filter((s) => s.kind === 'stool' && free(s.id))
        const s = near(stools)
        if (s) return { kind: 'seat', id: s.id, approach: s.approach, seat: s.seat, yaw: s.yaw, arrive: 'break' }
        const k = near(f.spots.filter((x) => x.kind === 'kitchen' && free(x.id)))
        if (k) return spotGoal(k, 'break')
        const sofa = near(f.seats.filter((x) => x.kind === 'sofa' && free(x.id)))
        if (sofa) return { kind: 'seat', id: sofa.id, approach: sofa.approach, seat: sofa.seat, yaw: sofa.yaw, arrive: 'break' }
        return null
      }
      case 'meeting': {
        const chairs = f.seats.filter((x) => x.kind === 'chair' && free(x.id))
        const c = near(chairs)
        if (c) return { kind: 'seat', id: c.id, approach: c.approach, seat: c.seat, yaw: c.yaw, arrive: 'meeting' }
        const m = near(f.spots.filter((x) => x.kind === 'meeting' && free(x.id)))
        if (m) return spotGoal(m, 'meeting')
        return null
      }
      case 'waiting': {
        const d = r.deskId ? f.desks.find((x) => x.id === r.deskId) : undefined
        if (d) return { kind: 'spot', id: `wait-${d.id}`, approach: d.approach, yaw: d.yaw, arrive: 'waiting' }
        const w = near(f.lobbySpots.filter((s) => free(s.id)))
        return w ? spotGoal(w, 'waiting') : null
      }
      default: return null
    }
  }

  private plan(r: Runtime, a: Agent) {
    const keepDesk = a.status === 'waiting' ? r.deskId : null
    this.release(r)
    if (a.status === 'offline') { r.hidden = true; r.phase = 'hidden'; r.state = 'idle'; r.deskId = null; return }
    if (!keepDesk) r.deskId = null
    if (r.hidden) lastSpawn.set(r.floorId, this.time)
    r.hidden = false
    const goal = this.chooseGoal(r, a)
    r.goal = goal
    r.glideT = 0
    if (!goal) { r.phase = 'standing'; r.state = 'idle'; r.sit = 0; return }
    if (goal.kind === 'desk') { this.claim(r, goal.id); r.deskId = goal.id }
    else if (goal.kind === 'seat') this.claim(r, goal.id)
    else if (goal.id.startsWith('wait-')) { /* Tisch bleibt reserviert */ }
    else this.claim(r, goal.id)
    this.startWalk(r, goal.approach)
  }

  private startWalk(r: Runtime, to: Vec2) {
    const nav = getNav(r.floorId)
    const path = nav.findPath({ x: r.x, z: r.z }, to)
    this.stats.repaths++
    if (!path) {
      // Unerreichbar: nicht hängen bleiben, sondern direkt am Ziel platzieren.
      this.stats.teleports++
      r.x = to.x; r.z = to.z; r.path = []; r.pi = 0
    } else { r.path = path; r.pi = 0 }
    r.phase = 'walk'; r.state = 'walking'; r.stuckT = 0; r.stuckFails = 0; r.walkTime = 0
    r.lastX = r.x; r.lastZ = r.z
  }

  update(dt: number, agents: Record<string, Agent>) {
    dt = Math.min(dt, 0.1)
    this.time += dt
    for (const r of this.rt.values()) {
      const a = agents[r.id]
      if (!a) continue
      if (this.time < r.spawnAt) continue

      const key = `${a.status}|${a.floorId}|${a.departmentId}`
      if (key !== r.wantKey) {
        const was = r.wantKey
        r.wantKey = key
        if (was && r.phase === 'seated') {
          // Erst aufstehen, dann neu planen.
          r.phase = 'standup'; r.glideT = 0
          if (r.goal?.seat) r.glideFrom = { x: r.x, z: r.z }
          if (was.startsWith('working|')) r.doneUntil = this.time + 3
          continue
        }
        if (r.phase !== 'standup') this.plan(r, a)
      }

      switch (r.phase) {
        case 'walk': this.stepWalk(r, dt); break
        case 'glide': this.stepGlide(r, dt); break
        case 'standup': this.stepStandup(r, dt, a); break
        case 'seated': case 'standing': this.stepIdle(r, dt, a); break
      }
      r.state = r.phase === 'walk' ? 'walking' : r.state
    }
  }

  private stepWalk(r: Runtime, dt: number) {
    r.walkTime += dt
    r.sit = Math.max(0, r.sit - dt * 4)
    let budget = r.speed * dt
    let moved = 0
    while (budget > 0 && r.pi < r.path.length) {
      const t = r.path[r.pi]
      const dx = t.x - r.x, dz = t.z - r.z
      const d = Math.hypot(dx, dz)
      if (d <= 0.06) { r.pi++; continue }
      const step = Math.min(budget, d)
      r.x += (dx / d) * step; r.z += (dz / d) * step
      budget -= step; moved += step
      const want = Math.atan2(dx, dz)
      r.yaw += angleDiff(r.yaw, want) * Math.min(1, TURN * dt)
      if (step >= d - 1e-6) r.pi++
    }
    if (moved > 0) r.walkClock += moved * 3.2

    // Hängenbleiben erkennen: kaum Fortschritt über 0.8 s → neu planen, nach drei Versuchen direkt ans Ziel.
    r.stuckT += dt
    if (r.stuckT >= 0.8) {
      const prog = Math.hypot(r.x - r.lastX, r.z - r.lastZ)
      r.stuckT = 0; r.lastX = r.x; r.lastZ = r.z
      if (prog < 0.25 && r.pi < r.path.length && r.goal) {
        r.stuckFails++
        if (r.stuckFails >= 3) this.snapToApproach(r)
        else this.startWalkKeep(r)
        return
      }
    }
    if (r.walkTime > 90 && r.goal) { this.snapToApproach(r); return }

    if (r.pi >= r.path.length) this.arrive(r)
  }

  private startWalkKeep(r: Runtime) {
    const fails = r.stuckFails
    this.startWalk(r, r.goal!.approach)
    r.stuckFails = fails
  }

  private snapToApproach(r: Runtime) {
    this.stats.teleports++
    r.x = r.goal!.approach.x; r.z = r.goal!.approach.z
    r.path = []; r.pi = 0
    this.arrive(r)
  }

  private arrive(r: Runtime) {
    const g = r.goal
    if (!g) { r.phase = 'standing'; r.state = 'idle'; return }
    if (g.seat) {
      r.phase = 'glide'; r.glideT = 0; r.glideFrom = { x: r.x, z: r.z }
    } else {
      r.phase = 'standing'; r.state = g.arrive; r.yaw = g.yaw
    }
  }

  private stepGlide(r: Runtime, dt: number) {
    const g = r.goal!
    r.glideT = Math.min(1, r.glideT + dt / 0.8)
    const t = r.glideT
    const e = t * t * (3 - 2 * t)
    r.x = r.glideFrom.x + (g.seat!.x - r.glideFrom.x) * e
    r.z = r.glideFrom.z + (g.seat!.z - r.glideFrom.z) * e
    r.yaw += angleDiff(r.yaw, g.yaw) * Math.min(1, 8 * dt)
    r.sit = e
    r.state = 'walking'
    if (t >= 1) { r.phase = 'seated'; r.state = g.arrive; r.yaw = g.yaw; r.sit = 1 }
  }

  private stepStandup(r: Runtime, dt: number, a: Agent) {
    const g = r.goal
    r.glideT = Math.min(1, r.glideT + dt / 0.6)
    const e = r.glideT * r.glideT * (3 - 2 * r.glideT)
    if (g?.seat) {
      r.x = g.seat.x + (g.approach.x - g.seat.x) * e
      r.z = g.seat.z + (g.approach.z - g.seat.z) * e
    }
    r.sit = 1 - e
    r.state = 'walking'
    if (r.glideT >= 1) { r.sit = 0; r.phase = 'standing'; this.plan(r, a) }
  }

  private stepIdle(r: Runtime, dt: number, a: Agent) {
    // Wartende ohne Ziel versuchen regelmäßig, doch noch einen Platz zu bekommen.
    if (a.status === 'working' && r.phase === 'standing' && r.state !== 'working' && this.time >= r.retryAt) {
      r.retryAt = this.time + 1.5
      const f = getFloor(a.floorId)
      if (f.desks.some((d) => this.isFree(d.id, r.id))) this.plan(r, a)
    }
    if (a.status === 'idle' && r.phase === 'standing' && !r.goal && this.time >= r.retryAt) {
      r.retryAt = this.time + 3
      this.plan(r, a)
    }
    void dt
  }

  /** Zustand des Bildschirms an einem Rechner, abgeleitet aus dem Sim-Zustand. */
  computerState(computerId: string, deskId: string): ComputerState {
    const ov = this.overrides.get(computerId)
    if (ov) return ov
    const oid = this.owner.get(deskId)
    if (!oid) return 'offline'
    const r = this.rt.get(oid)
    if (!r) return 'offline'
    if (r.phase === 'seated') return r.state === 'working' ? 'working' : 'idle'
    if (this.time < r.doneUntil) return 'done'
    return 'idle'
  }

  deskOccupancy(floorId: string) {
    const f = getFloor(floorId)
    let seated = 0
    for (const d of f.desks) {
      const o = this.owner.get(d.id)
      const r = o ? this.rt.get(o) : null
      if (r && r.phase === 'seated') seated++
    }
    return { seated, total: f.desks.length }
  }
}

export const sim = new WorldSim()
/** Wann zuletzt ein Agent aus dem Aufzug einer Etage trat (Aufzugstüren öffnen dann kurz). */
export const lastSpawn = new Map<string, number>()
