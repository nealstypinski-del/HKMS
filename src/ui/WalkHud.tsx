import { Footprints, LogOut } from 'lucide-react'
import { FLOORS } from '../config/office.config'
import { useOfficeStore } from '../store/office.store'
import { player } from '../walk/playerRuntime'

export const exitWalkMode = (): void => useOfficeStore.getState().exitWalk(player.level)

export function WalkHud() {
  const level = useOfficeStore((s) => s.walkLevel)
  const floor = FLOORS[level]
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="glass pointer-events-auto flex items-center gap-4 rounded-xl px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <Footprints size={16} className="text-km" /> Rundgang
        </span>
        <span className="text-sm text-slate-200">
          Etage <b style={{ color: floor?.accent }}>{level}</b> · {floor?.name}
        </span>
        <button onClick={exitWalkMode} className="flex items-center gap-1.5 rounded-lg bg-panel-2 px-2.5 py-1 text-xs font-semibold text-white hover:brightness-125">
          <LogOut size={13} /> Beenden (Esc)
        </button>
      </div>
      <div className="text-[11px] text-slate-300">WASD oder Pfeiltasten: gehen · Shift: rennen · Maus ziehen: Kamera · Mausrad: Abstand · Agenten und Arbeitsplätze anklicken</div>
    </div>
  )
}
