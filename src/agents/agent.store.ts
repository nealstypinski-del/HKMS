import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { INITIAL_AGENTS } from '../data/initialAgents'
import { INITIAL_DESKS } from '../data/initialDesks'
import { persistenceAdapter } from '../storage/storage'
import { AGENT_STATUSES, type Agent, type AgentAvatar, type AgentStatus, type Desk } from './agent.types'

interface AgentData {
  agents: Record<string, Agent>
  desks: Record<string, Desk>
}

interface AgentState extends AgentData {
  order: string[]
  patchAgent: (id: string, patch: Partial<Agent>) => void
  patchDesk: (id: string, patch: Partial<Omit<Desk, 'computer'>> & { computer?: Partial<Desk['computer']> }) => void
  resetToDefaults: () => void
}

const isSeated = (s: AgentStatus): boolean => s === 'working' || s === 'waiting'

/** Baut aus einer Agentenliste ein konsistentes Paar aus Agenten und Arbeitsplätzen. */
export function buildAgentData(list: readonly Agent[]): AgentData {
  const desks: Record<string, Desk> = Object.fromEntries(INITIAL_DESKS.map((d) => [d.id, { ...d, assignedAgentId: undefined, computer: { state: 'offline' as const, provider: 'mock' } }]))
  const agents: Record<string, Agent> = {}
  for (const src of list) {
    const agent: Agent = { ...src, avatar: { ...src.avatar } }
    const wanted = agent.deskId && desks[agent.deskId] ? agent.deskId : agent.homeDeskId
    const desk = wanted ? desks[wanted] : undefined
    if (isSeated(agent.status) && desk && !desk.assignedAgentId) {
      agent.deskId = desk.id
      desk.assignedAgentId = agent.id
      desk.computer = { state: agent.status === 'working' ? 'working' : 'waiting', provider: agent.provider }
    } else {
      agent.deskId = undefined
    }
    agent.currentTaskId = undefined
    agents[agent.id] = agent
  }
  return { agents, desks }
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function sanitizeAvatar(raw: unknown, fallback: AgentAvatar): AgentAvatar {
  if (typeof raw !== 'object' || raw === null) return fallback
  const r = raw as Record<string, unknown>
  const s = (k: keyof AgentAvatar): string => (isString(r[k]) ? (r[k] as string) : (fallback[k] ?? ''))
  return {
    skinVariant: s('skinVariant'), hairStyle: s('hairStyle'), hairVariant: s('hairVariant'), shirtStyle: s('shirtStyle'),
    shirtVariant: s('shirtVariant'), pantsVariant: s('pantsVariant'), accessory: isString(r.accessory) ? r.accessory : fallback.accessory,
  }
}

/** Übernimmt gespeicherte Werte nur, wenn sie gültig sind. Fehlende oder kaputte Daten fallen auf die Defaults zurück. */
export function sanitizePersisted(raw: unknown): AgentData {
  const stored = typeof raw === 'object' && raw !== null ? ((raw as { agents?: unknown }).agents as Record<string, unknown> | undefined) : undefined
  const merged = INITIAL_AGENTS.map((def): Agent => {
    const p = stored?.[def.id]
    if (typeof p !== 'object' || p === null) return def
    const r = p as Record<string, unknown>
    return {
      ...def,
      displayName: isString(r.displayName) ? r.displayName : def.displayName,
      role: isString(r.role) ? r.role : def.role,
      status: AGENT_STATUSES.includes(r.status as AgentStatus) ? (r.status as AgentStatus) : def.status,
      deskId: isString(r.deskId) ? r.deskId : undefined,
      avatar: sanitizeAvatar(r.avatar, def.avatar),
    }
  })
  return buildAgentData(merged)
}

const defaults = buildAgentData(INITIAL_AGENTS)

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      ...defaults,
      order: INITIAL_AGENTS.map((a) => a.id),
      patchAgent: (id, patch) =>
        set((s) => {
          const a = s.agents[id]
          return a ? { agents: { ...s.agents, [id]: { ...a, ...patch } } } : s
        }),
      patchDesk: (id, patch) =>
        set((s) => {
          const d = s.desks[id]
          if (!d) return s
          const { computer, ...rest } = patch
          return { desks: { ...s.desks, [id]: { ...d, ...rest, computer: { ...d.computer, ...computer } } } }
        }),
      resetToDefaults: () => set(buildAgentData(INITIAL_AGENTS)),
    }),
    {
      name: 'agents',
      version: 1,
      storage: createJSONStorage(() => persistenceAdapter),
      partialize: (s) => ({ agents: s.agents }),
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
    },
  ),
)

export interface AgentStats {
  total: number
  online: number
  working: number
  idle: number
  waiting: number
  break: number
  meeting: number
  offline: number
}

export function computeAgentStats(agents: Record<string, Agent>): AgentStats {
  const stats: AgentStats = { total: 0, online: 0, working: 0, idle: 0, waiting: 0, break: 0, meeting: 0, offline: 0 }
  for (const a of Object.values(agents)) {
    stats.total++
    stats[a.status]++
    if (a.status !== 'offline') stats.online++
  }
  return stats
}
