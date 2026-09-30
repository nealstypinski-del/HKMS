import { useCallback, useEffect, useRef, useState } from 'react'

/** Der Sim Zustand liegt außerhalb von React. Für Anzeigen fragen wir ihn in Intervallen ab. */
export function useTick(ms = 700) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(id) }, [ms])
  return n
}

/**
 * Abklingzeit für Knöpfe, die etwas Schweres auslösen (Doppelklick startet sonst zweimal).
 * Rückgabe: ob der Knopf gerade gesperrt ist, und eine Funktion, die die Aktion nur außerhalb der Sperre ausführt.
 */
export function useCooldown(ms = 600): [boolean, (fn: () => void) => void] {
  const [busy, setBusy] = useState(false)
  const last = useRef(0)
  const run = useCallback((fn: () => void) => {
    const now = Date.now()
    if (now - last.current < ms) return
    last.current = now
    setBusy(true)
    try { fn() } finally { setTimeout(() => setBusy(false), ms) }
  }, [ms])
  return [busy, run]
}
