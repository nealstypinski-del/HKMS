import { useEffect, useState } from 'react'
import { useGpu } from './gpuState'

/** Hinweis bei verlorenem Grafikkontext. Nach 8 Sekunden ohne Wiederkehr wird ein Neuladen angeboten. */
export function GpuLostNotice() {
  const lost = useGpu((s) => s.lost)
  const [late, setLate] = useState(false)
  useEffect(() => {
    setLate(false)
    if (!lost) return
    const id = setTimeout(() => setLate(true), 8000)
    return () => clearTimeout(id)
  }, [lost])
  if (!lost) return null
  return (
    <div className="fatal overlay" role="alert">
      <h1>Grafik unterbrochen</h1>
      <p>Die Grafikkarte hat die Darstellung verloren. Die Welt wird automatisch wiederhergestellt, sobald der Browser die Grafik zurückgibt.</p>
      {late && <button onClick={() => location.reload()}>Seite neu laden</button>}
    </div>
  )
}
