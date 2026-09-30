import { ListChecks } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '../agents/agent.store'
import { useOfficeStore } from '../store/office.store'
import { TASK_STATUS_LABEL } from '../tasks/task.types'
import { isActiveTask, useTaskStore } from '../tasks/task.store'

export function TaskPanel() {
  const tasks = useTaskStore(useShallow((s) => Object.values(s.tasks).filter(isActiveTask).map((t) => `${t.id}|${t.status}|${t.agentId ?? ''}|${t.title}`)))
  const names = useAgentStore(useShallow((s) => Object.fromEntries(Object.values(s.agents).map((a) => [a.id, a.displayName]))))
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const [open, setOpen] = useState(false)
  return (
    <section className="glass pointer-events-auto rounded-xl p-2">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-2"><ListChecks size={13} /> Aufgaben</span>
        <span className="tabular-nums text-white">{tasks.length}</span>
      </button>
      {open && (
        <div className="scroll-thin mt-1 max-h-56 overflow-y-auto">
          {tasks.length === 0 && <div className="px-2 py-2 text-xs text-slate-500">Keine offenen Aufgaben.</div>}
          {tasks.map((raw) => {
            const [id, status, agentId, title] = raw.split('|') as [string, keyof typeof TASK_STATUS_LABEL, string, string]
            return (
              <button key={id} disabled={!agentId} onClick={() => focusAgent(agentId)} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/5">
                <div className="truncate text-xs text-slate-100">{title}</div>
                <div className="text-[11px] text-slate-400">{names[agentId] ?? '–'} · {TASK_STATUS_LABEL[status]}</div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
