import { useEffect, useRef, useState } from 'react'
import { getProvider } from '../providers/provider.registry'
import type { SessionStatus } from '../providers/provider.types'

const STATE_LABEL: Record<string, string> = { starting: 'Startet', working: 'Working', waiting: 'Waiting', completed: 'Completed', failed: 'Failed' }

interface Props {
  agentName: string
  providerId: string
  sessionId?: string
}

/** Zeigt die Ausgabe einer Provider Session. Die Zeilen kommen vom Provider (in Loop 1 vom MockProvider). */
export function TerminalView({ agentName, providerId, sessionId }: Props) {
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const provider = getProvider(providerId)

  useEffect(() => {
    setStatus(null)
    setError(null)
    if (!sessionId) return
    let alive = true
    const poll = () => {
      provider
        .getSessionStatus(sessionId)
        .then((s) => alive && setStatus(s))
        .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Unbekannter Fehler'))
    }
    poll()
    const t = setInterval(poll, 700)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [sessionId, provider])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [status?.lines.length])

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-[#080d1a]">
      <div className="flex items-center justify-between border-b border-line bg-panel-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
        <span>Terminal</span>
        <span className="text-amber-300">{provider.simulated ? 'Mock · simuliert' : provider.name}</span>
      </div>
      <div className="space-y-0.5 px-3 py-2 font-mono text-xs text-slate-300">
        <div>Agent: <span className="text-white">{agentName}</span></div>
        <div>Provider: <span className="text-white">{provider.simulated ? 'Mock' : provider.name}</span></div>
        <div>Session: <span className="text-white">{sessionId ?? 'keine'}</span></div>
        <div>Status: <span className="text-white">{status ? STATE_LABEL[status.state] : sessionId ? '…' : 'Offline'}</span></div>
      </div>
      <div ref={box} className="scroll-thin max-h-44 overflow-y-auto border-t border-line px-3 py-2 font-mono text-xs leading-relaxed text-km">
        {error && <div className="text-red-400">{error}</div>}
        {!sessionId && <div className="text-slate-500">Keine aktive Session. Der Arbeitsplatz ist frei.</div>}
        {status?.lines.map((l, i) => (
          <div key={i}>&gt; {l.text}</div>
        ))}
      </div>
    </div>
  )
}
