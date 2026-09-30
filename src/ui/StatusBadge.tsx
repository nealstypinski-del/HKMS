import { STATUS_META, type AgentStatus } from '../agents/agent.types'

export function StatusBadge({ status, className = '' }: { status: AgentStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`} style={{ background: meta.color + '22', color: meta.color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

export function ProviderBadge({ provider = 'mock' }: { provider?: string }) {
  return (
    <span className="inline-flex items-center rounded border border-amber-300/50 bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300" title="Simulierter Provider: keine echte KI">
      {provider.toUpperCase()}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="min-w-0 text-right text-slate-100">{children}</span>
    </div>
  )
}
