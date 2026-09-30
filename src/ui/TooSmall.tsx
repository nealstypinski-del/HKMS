import { useEffect, useState } from 'react'

export const MIN_W = 320
export const MIN_H = 280
export const isTooSmall = (w: number, h: number) => w < MIN_W || h < MIN_H

/** Hinweis bei winzigem Fenster, in dem Bedienfelder nicht mehr sinnvoll passen. */
export function TooSmall() {
  const [small, setSmall] = useState(() => isTooSmall(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const f = () => setSmall(isTooSmall(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  if (!small) return null
  return <div className="fatal overlay" role="status"><h1>Fenster zu klein</h1><p>Bitte das Fenster vergrößern (mindestens {MIN_W} mal {MIN_H} Pixel).</p></div>
}
