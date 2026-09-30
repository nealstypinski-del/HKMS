import { X } from 'lucide-react'
import { useAgentStore } from '../agents/agent.store'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { useOfficeStore } from '../store/office.store'
import { TASK_STATUS_LABEL } from '../tasks/task.types'
import { useTaskStore } from '../tasks/task.store'
import { Field, ProviderBadge, StatusBadge } from './StatusBadge'
import { TerminalView } from './TerminalView'

const COMPUTER_LABEL = { offline: 'Offline', idle: 'Bereit', working: 'Working', waiting: 'Waiting' } as const

export function WorkstationPanel({ deskId }: { deskId: string }) {
  const desk = useAgentStore((s) => s.desks[deskId])
  const agent = useAgentStore((s) => (s.desks[deskId]?.assignedAgentId ? s.agents[s.desks[deskId]!.assignedAgentId!] : undefined))
  const task = useTaskStore((s) => (agent?.currentTaskId ? s.tasks[agent.currentTaskId] : undefined))
  const select = useOfficeStore((s) => s.select)
  if (!desk) return null
  const dept = INITIAL_DEPARTMENTS.find((d) => d.id === desk.departmentId)
  return (
    <section className="glass pointer-events-auto rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Workstation</div>
          <div className="text-lg font-bold text-white">{desk.label}</div>
          <div className="text-xs text-slate-400">{desk.id}</div>
        </div>
        <button onClick={() => select(null)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Schließen">
          <X size={16} />
        </button>
      </div>
      <div className="mt-2">
        <Field label="Department">{dept?.name ?? desk.departmentId}</Field>
        <Field label="Assigned Agent">
          {agent ? (
            <button className="text-km hover:underline" onClick={() => select({ kind: 'agent', id: agent.id })}>
              {agent.displayName}
            </button>
          ) : (
            'Frei'
          )}
        </Field>
        <Field label="Status">{agent ? <StatusBadge status={agent.status} /> : 'Frei'}</Field>
        <Field label="Provider"><ProviderBadge provider={desk.computer.provider ?? 'mock'} /></Field>
        <Field label="Current Task">{task ? `${task.title} (${TASK_STATUS_LABEL[task.status]})` : '–'}</Field>
        <Field label="Terminal Status">{COMPUTER_LABEL[desk.computer.state]}</Field>
      </div>
      <TerminalView agentName={agent?.displayName ?? '–'} providerId={desk.computer.provider ?? 'mock'} sessionId={desk.computer.terminalSessionId} />
    </section>
  )
}
