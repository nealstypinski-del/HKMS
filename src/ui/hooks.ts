import { useEffect, useState } from 'react'

/** Der Sim Zustand liegt außerhalb von React. Für Anzeigen fragen wir ihn in Intervallen ab. */
export function useTick(ms = 700) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(id) }, [ms])
  return n
}
