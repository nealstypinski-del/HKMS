import { useEffect } from 'react'
import { COLORS } from '../lib/constants.js'

/** Level-Up-Overlay: einmalig bei Anstieg; klick oder nach 4,5 s weg. Respektiert prefers-reduced-motion. */
export function LevelUp({ info, onDone }) {
  useEffect(() => {
    if (!info) return
    const t = setTimeout(onDone, 4500)
    return () => clearTimeout(t)
  }, [info, onDone])
  if (!info) return null
  return (
    <div className="levelup fixed inset-0 z-[70] grid cursor-pointer place-items-center" onClick={onDone} role="status" aria-live="polite">
      <div className="levelup-rays absolute inset-0" />
      <div className="levelup-card relative text-center">
        <div className="mono text-sm tracking-[.5em]" style={{ color: COLORS.emerald }}>LEVEL UP</div>
        <div className="mono text-[min(22vh,18vw)] font-black leading-none text-white" style={{ textShadow: `0 0 40px ${COLORS.emerald}, 0 0 90px ${COLORS.cyan}` }}>{info.level}</div>
        <div className="mono mt-2 inline-block rounded-lg border px-4 py-1.5 text-lg font-bold tracking-[.2em]" style={{ color: COLORS.emerald, borderColor: `${COLORS.emerald}88`, background: 'rgba(0,255,102,.1)' }}>{info.title}</div>
      </div>
    </div>
  )
}
