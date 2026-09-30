import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '../agents/agent.store'
import { STATUS_META } from '../agents/agent.types'
import { COMPANIES, type CompanyId } from '../config/office.config'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { useOfficeStore } from '../store/office.store'

const GROUPS: CompanyId[] = ['herkulesjobs', 'kasselmemes', 'shared']

function DepartmentRow({ id }: { id: string }) {
  const dept = INITIAL_DEPARTMENTS.find((d) => d.id === id)
  const agents = useAgentStore(useShallow((s) => s.order.map((a) => s.agents[a]).filter((a) => a && a.department === id).map((a) => `${a!.id}|${a!.status}|${a!.displayName}`)))
  const [open, setOpen] = useState(false)
  const focusDepartment = useOfficeStore((s) => s.focusDepartment)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  if (!dept) return null
  const parsed = agents.map((a) => a.split('|') as [string, keyof typeof STATUS_META, string])
  const working = parsed.filter((p) => p[1] === 'working').length
  return (
    <div>
      <div className="flex items-center rounded-lg hover:bg-white/5">
        <button onClick={() => setOpen((o) => !o)} className="p-1.5 text-slate-400 hover:text-white" aria-label="Agenten anzeigen">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button onClick={() => focusDepartment(id)} className="flex flex-1 items-center justify-between py-1.5 pr-2 text-left text-sm text-slate-200">
          <span>{dept.name}</span>
          <span className="text-xs tabular-nums text-slate-400">
            {working}/{parsed.length}
          </span>
        </button>
      </div>
      {open && (
        <div className="mb-1 ml-6 flex flex-col">
          {parsed.map(([aid, status, name]) => (
            <button key={aid} onClick={() => focusAgent(aid)} className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs text-slate-300 hover:bg-white/5">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[status].color }} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DepartmentPanel() {
  return (
    <section className="glass pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-xl p-2 scroll-thin">
      <div className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</div>
      {GROUPS.map((g) => {
        const depts = INITIAL_DEPARTMENTS.filter((d) => d.company === g && d.id !== 'hq')
        if (depts.length === 0) return null
        return (
          <div key={g} className="mb-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold" style={{ color: COMPANIES[g].accent }}>
              <span className="h-2.5 w-1 rounded-sm" style={{ background: COMPANIES[g].accent }} />
              {COMPANIES[g].name}
            </div>
            {depts.map((d) => (
              <DepartmentRow key={d.id} id={d.id} />
            ))}
          </div>
        )
      })}
    </section>
  )
}
