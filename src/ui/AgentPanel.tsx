import { Crosshair, X } from 'lucide-react'
import { useState } from 'react'
import { setStatus } from '../agents/agent.service'
import { useAgentStore } from '../agents/agent.store'
import type { AgentStatus } from '../agents/agent.types'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { useOfficeStore } from '../store/office.store'
import { TASK_STATUS_LABEL } from '../tasks/task.types'
import { useTaskStore } from '../tasks/task.store'
import { Field, ProviderBadge, StatusBadge } from './StatusBadge'

const ACTIONS: Array<{ label: string; status: AgentStatus }> = [
  { label: 'Set Working', status: 'working' },
  { label: 'Set Idle', status: 'idle' },
  { label: 'Send to Break', status: 'break' },
  { label: 'Set Waiting', status: 'waiting' },
  { label: 'Meeting', status: 'meeting' },
  { label: 'Set Offline', status: 'offline' },
]

export function AgentPanel({ agentId }: { agentId: string }) {
  const agent = useAgentStore((s) => s.agents[agentId])
  const desk = useAgentStore((s) => (agentId && s.agents[agentId]?.deskId ? s.desks[s.agents[agentId]!.deskId!] : undefined))
  const task = useTaskStore((s) => (agent?.currentTaskId ? s.tasks[agent.currentTaskId] : undefined))
  const [message, setMessage] = useState<string | null>(null)
  const select = useOfficeStore((s) => s.select)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  if (!agent) return null
  const dept = INITIAL_DEPARTMENTS.find((d) => d.id === agent.department)
  return (
    <section className="glass pointer-events-auto rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agent</div>
          <div className="text-lg font-bold text-white">{agent.displayName}</div>
        </div>
        <button onClick={() => select(null)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Schließen">
          <X size={16} />
        </button>
      </div>
      <div className="mt-2">
        <Field label="Rolle">{agent.role}</Field>
        <Field label="Department">{dept?.name ?? agent.department}</Field>
        <Field label="Status"><StatusBadge status={agent.status} /></Field>
        <Field label="Provider"><ProviderBadge provider={agent.provider} /></Field>
        <Field label="Aufgabe">{task ? `${task.title} (${TASK_STATUS_LABEL[task.status]})` : '–'}</Field>
        <Field label="Arbeitsplatz">
          {desk ? (
            <button className="text-km underline-offset-2 hover:underline" onClick={() => select({ kind: 'desk', id: desk.id })}>
              {desk.label} · {desk.id}
            </button>
          ) : (
            '–'
          )}
        </Field>
      </div>
      <button onClick={() => focusAgent(agent.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-1.5 text-xs font-semibold text-slate-200 hover:bg-panel-2">
        <Crosshair size={14} /> Kamera auf Agent
      </button>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Demo Aktionen (Loop 1)</div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.status}
            disabled={agent.status === a.status}
            onClick={() => setMessage(setStatus(agent.id, a.status) ? null : 'Kein freier Arbeitsplatz in dieser Abteilung.')}
            className="rounded-lg bg-panel-2 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:brightness-125 disabled:cursor-default disabled:opacity-40"
          >
            {a.label}
          </button>
        ))}
      </div>
      {message && <div className="mt-2 text-xs text-red-300">{message}</div>}
    </section>
  )
}
