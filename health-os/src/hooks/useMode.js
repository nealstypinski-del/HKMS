import { useEffect, useRef, useState } from 'react'

/**
 * Tageszeit-Modus: 'day' | 'dim' (21:30–22:00, warm gedimmt) | 'night' (22:00–05:30, fast schwarz).
 * `?mode=night|dim|day` erzwingt einen Modus (Test).
 */
export function modeFor(now, force) {
  if (force === 'night' || force === 'dim' || force === 'day') return force
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= 22 * 60 || m < 5 * 60 + 30) return 'night'
  if (m >= 21 * 60 + 30) return 'dim'
  return 'day'
}

/** Leerlauf-Erkennung (Burn-in-Schutz): nach `ms` ohne Eingabe true. `?idle=1` erzwingt. */
export function useIdle(ms = 5 * 60 * 1000) {
  const forced = new URLSearchParams(location.search).get('idle') === '1'
  const [idle, setIdle] = useState(forced)
  const timer = useRef(null)
  useEffect(() => {
    if (forced) return
    const reset = () => { setIdle(false); clearTimeout(timer.current); timer.current = setTimeout(() => setIdle(true), ms) }
    reset()
    const ev = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel']
    ev.forEach((e) => addEventListener(e, reset, { passive: true }))
    return () => { ev.forEach((e) => removeEventListener(e, reset)); clearTimeout(timer.current) }
  }, [ms, forced])
  return idle
}

/** Im Leerlauf wandert das Bild jede Minute um bis zu ±8 px (gegen Einbrennen). */
export function useDrift(active, now) {
  const minute = Math.floor(now.getTime() / 60000)
  if (!active) return { x: 0, y: 0 }
  const h = (n) => { const s = Math.sin(minute * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s) }
  return { x: Math.round((h(1) - 0.5) * 16), y: Math.round((h(2) - 0.5) * 16) }
}
