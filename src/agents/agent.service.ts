// Agent Service: der einzige Ort, an dem Agent Status, Arbeitsplatz, Task und Provider Session zusammenlaufen.
// Die 3D Welt liest nur den Zustand und ruft diese Funktionen nie direkt auf. Fluss:
//   Provider Ereignis oder Befehl -> Service -> Stores -> 3D Welt

import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { pickTaskTitle } from '../data/taskTemplates'
import { getProvider, listProviders, mockProvider } from '../providers/provider.registry'
import type { SessionEvent, SessionState } from '../providers/provider.types'
import { useTaskStore } from '../tasks/task.store'
import { useAgentStore } from './agent.store'
import type { Agent, AgentStatus, ComputerState, Desk } from './agent.types'

const agents = () => useAgentStore.getState().agents
const desks = () => useAgentStore.getState().desks
const store = () => useAgentStore.getState()
const tasks = () => useTaskStore.getState()

const isSeated = (s: AgentStatus): s is 'working' | 'waiting' => s === 'working' || s === 'waiting'

const computerStateFor = (state: SessionState): ComputerState => {
  switch (state) {
    case 'working':
      return 'working'
    case 'waiting':
      return 'waiting'
    default:
      return 'idle'
  }
}

/** Sucht einen freien Arbeitsplatz: erst der aktuelle, dann der Wunschplatz, dann Abteilung, dann gleiche Etage. */
export function findDeskFor(agent: Agent): Desk | undefined {
  const all = Object.values(desks())
  const free = (d: Desk | undefined): d is Desk => !!d && (!d.assignedAgentId || d.assignedAgentId === agent.id)
  if (agent.deskId && free(desks()[agent.deskId])) return desks()[agent.deskId]
  if (agent.homeDeskId && free(desks()[agent.homeDeskId])) return desks()[agent.homeDeskId]
  const inDept = all.find((d) => d.departmentId === agent.department && free(d))
  if (inDept) return inDept
  const floor = INITIAL_DEPARTMENTS.find((d) => d.id === agent.department)?.floor
  return all.find((d) => INITIAL_DEPARTMENTS.find((x) => x.id === d.departmentId)?.floor === floor && free(d))
}

function releaseDesk(deskId: string | undefined): void {
  if (!deskId) return
  const desk = desks()[deskId]
  if (!desk) return
  const sessionId = desk.computer.terminalSessionId
  if (sessionId) void getProvider(desk.computer.provider ?? 'mock').stopSession(sessionId).catch(() => undefined)
  store().patchDesk(deskId, { assignedAgentId: undefined, computer: { state: 'offline', terminalSessionId: undefined } })
}

async function openSession(agentId: string, deskId: string, taskId: string, desired: 'working' | 'waiting'): Promise<void> {
  const agent = agents()[agentId]
  if (!agent) return
  const provider = getProvider(agent.provider)
  const task = tasks().tasks[taskId]
  try {
    const session = await provider.startSession({ agentId, role: agent.role, taskId, taskTitle: task?.title })
    const current = agents()[agentId]
    // Der Agent hat den Platz inzwischen verlassen: Session sofort wieder schließen.
    if (!current || current.deskId !== deskId || !isSeated(current.status)) {
      await provider.stopSession(session.id)
      return
    }
    store().patchDesk(deskId, { computer: { state: 'idle', provider: provider.id, terminalSessionId: session.id } })
    if (desired === 'waiting' && provider === mockProvider) mockProvider.simulateState(session.id, 'waiting')
  } catch {
    // Provider nicht erreichbar: Computer bleibt sichtbar offline, Agent Status bleibt gültig.
    store().patchDesk(deskId, { computer: { state: 'offline', terminalSessionId: undefined } })
  }
}

function ensureTask(agent: Agent): string {
  const existing = agent.currentTaskId ? tasks().tasks[agent.currentTaskId] : undefined
  if (existing) return existing.id
  const n = tasks().counter
  const task = tasks().createTask({ title: pickTaskTitle(agent.role, n + agent.id.length), departmentId: agent.department, agentId: agent.id, providerId: agent.provider })
  return task.id
}

function finishTask(agent: Agent, status: 'done' | 'failed' | 'paused'): void {
  if (agent.currentTaskId) tasks().updateTask(agent.currentTaskId, { status })
}

/** Setzt den Status eines Agenten und zieht Arbeitsplatz, Aufgabe und Session konsistent nach. */
export function setStatus(agentId: string, next: AgentStatus): boolean {
  const agent = agents()[agentId]
  if (!agent || agent.status === next) return !!agent

  if (isSeated(next)) {
    const desk = findDeskFor(agent)
    if (!desk) return false
    const taskId = ensureTask(agent)
    tasks().updateTask(taskId, { status: next === 'working' ? 'running' : 'waiting', agentId })
    const hadSession = desk.assignedAgentId === agent.id && !!desk.computer.terminalSessionId
    store().patchDesk(desk.id, { assignedAgentId: agent.id, computer: { provider: agent.provider } })
    store().patchAgent(agentId, { status: next, deskId: desk.id, currentTaskId: taskId })
    if (hadSession) {
      const sid = desk.computer.terminalSessionId as string
      if (getProvider(agent.provider) === mockProvider) mockProvider.simulateState(sid, next === 'working' ? 'working' : 'waiting')
    } else {
      void openSession(agentId, desk.id, taskId, next)
    }
    return true
  }

  releaseDesk(agent.deskId)
  if (next === 'idle') {
    finishTask(agent, 'done')
    store().patchAgent(agentId, { status: next, deskId: undefined, currentTaskId: undefined })
  } else {
    finishTask(agent, 'paused')
    store().patchAgent(agentId, { status: next, deskId: undefined })
  }
  return true
}

/** Reagiert auf Statusmeldungen des Providers. Später steuern echte Sessions damit den Charakter. */
export function handleSessionEvent(event: SessionEvent): void {
  const agent = agents()[event.agentId]
  if (!agent?.deskId) return
  const desk = desks()[agent.deskId]
  if (!desk || desk.computer.terminalSessionId !== event.sessionId) return
  store().patchDesk(desk.id, { computer: { state: computerStateFor(event.state) } })
  if (event.state === 'working' && agent.status === 'waiting') setStatus(agent.id, 'working')
  else if (event.state === 'waiting' && agent.status === 'working') setStatus(agent.id, 'waiting')
  else if (event.state === 'completed' && isSeated(agent.status)) setStatus(agent.id, 'idle')
  else if (event.state === 'failed' && isSeated(agent.status)) {
    finishTask(agent, 'failed')
    store().patchAgent(agent.id, { currentTaskId: undefined })
    setStatus(agent.id, 'idle')
  }
}

let unsubscribers: Array<() => void> = []

/** Startet Sessions für Agenten, die beim Laden bereits am Arbeitsplatz sitzen, und hängt sich an Provider Ereignisse. */
export function bootstrap(): void {
  unsubscribers.forEach((u) => u())
  unsubscribers = listProviders().flatMap((p) => (p.onSessionEvent ? [p.onSessionEvent(handleSessionEvent)] : []))
  tasks().clear()
  for (const agent of Object.values(agents())) {
    if (!isSeated(agent.status)) continue
    const desk = agent.deskId ? desks()[agent.deskId] : undefined
    if (!desk) {
      store().patchAgent(agent.id, { status: 'idle' })
      continue
    }
    const taskId = ensureTask(agent)
    tasks().updateTask(taskId, { status: agent.status === 'working' ? 'running' : 'waiting' })
    store().patchAgent(agent.id, { currentTaskId: taskId })
    void openSession(agent.id, desk.id, taskId, agent.status === 'waiting' ? 'waiting' : 'working')
  }
}

/** Demo Daten zurücksetzen: Sessions schließen, Stores auf Standard, Sessions neu starten. */
export function resetDemo(): void {
  for (const desk of Object.values(desks())) releaseDesk(desk.id)
  store().resetToDefaults()
  bootstrap()
}
