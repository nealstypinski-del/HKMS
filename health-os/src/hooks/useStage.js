import { useEffect, useState } from 'react'

// Entwurfshöhe je Ansicht in CSS-px; die Breite füllt den Rest. Skalierung per zoom = Fensterhöhe / Entwurfshöhe.
export const DESIGN_H = { hq: 1100, analyse: 1250, history: 1000, week: 1000, pharma: 1000, training: 1000 }
const wide = () => innerWidth >= 1500 && innerWidth / innerHeight >= 1.9

/** Ab 2:1 wird die Oberfläche auf die Bildschirmhöhe skaliert – kein Seiten-Scroll. */
export function useStage(view = 'hq') {
  const h = DESIGN_H[view] ?? DESIGN_H.hq
  const calc = () => (wide() ? { on: true, s: innerHeight / h, w: innerWidth / (innerHeight / h), h } : { on: false, s: 1, w: 0, h })
  const [st, setSt] = useState(calc)
  useEffect(() => {
    const f = () => setSt(calc())
    f()
    addEventListener('resize', f)
    return () => removeEventListener('resize', f)
  }, [h])
  return st
}
