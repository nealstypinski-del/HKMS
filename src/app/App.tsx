import { useEffect, useState } from 'react'
import { useOfficeStore } from '../store/office.store'
import { AgentPanel } from '../ui/AgentPanel'
import { DepartmentPanel } from '../ui/DepartmentPanel'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { FloorSelector } from '../ui/FloorSelector'
import { HoverTooltip } from '../ui/HoverTooltip'
import { TaskPanel } from '../ui/TaskPanel'
import { TopBar } from '../ui/TopBar'
import { WalkHud } from '../ui/WalkHud'
import { exitWalkMode } from '../ui/WalkHud'
import { WorkstationPanel } from '../ui/WorkstationPanel'
import { OfficeWorld } from '../world/OfficeWorld'

function ContextPanel() {
  const selection = useOfficeStore((s) => s.selection)
  if (selection?.kind === 'agent') return <AgentPanel agentId={selection.id} />
  if (selection?.kind === 'desk') return <WorkstationPanel deskId={selection.id} />
  return null
}

export function App() {
  const [ready, setReady] = useState(false)
  const mode = useOfficeStore((s) => s.mode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useOfficeStore.getState().mode === 'walk') exitWalkMode()
      else useOfficeStore.getState().select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="relative h-full w-full overflow-hidden">
      <ErrorBoundary>
        <OfficeWorld onReady={() => setReady(true)} />
      </ErrorBoundary>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-ink text-sm tracking-[0.3em] text-slate-300">3D HQ WIRD GELADEN…</div>
      )}
      <TopBar />
      {mode === 'overview' && (
        <div className="pointer-events-none absolute bottom-3 left-3 top-[76px] z-10 flex w-64 flex-col gap-3">
          <FloorSelector />
          <DepartmentPanel />
        </div>
      )}
      <div className="pointer-events-none absolute right-3 top-[76px] z-10 flex max-h-[calc(100%-90px)] w-[340px] flex-col gap-3 overflow-y-auto scroll-thin">
        <ContextPanel />
        {mode === 'overview' && <TaskPanel />}
      </div>
      {mode === 'walk' ? (
        <WalkHud />
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-[11px] text-slate-400">
          Ziehen: drehen · Rechtsklick: verschieben · Mausrad: zoomen · Esc: Auswahl aufheben
        </div>
      )}
      <HoverTooltip />
    </div>
  )
}
