import { useEffect, useRef, useState } from 'react'
import { FX } from '../lib/hubConfig.js'

/** Dezente Ebenen auf dem Artwork (reines CSS): Sterne, Dampf, Pool-Schimmer, Raumlicht. */
export function HubFx() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ mixBlendMode: 'screen' }}>
      {FX.stars.map((s, i) => <i key={i} className="fx-star absolute rounded-full bg-amber-100" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.d}s` }} />)}
      {FX.steam.map((s, i) => <i key={i} className="fx-steam absolute rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }} />)}
      {FX.glows.map((g, i) => <i key={i} className="fx-glow absolute rounded-full" style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.w}%`, aspectRatio: '1', background: `radial-gradient(circle, ${g.c}55 0%, transparent 70%)`, animationDelay: `${g.d}s` }} />)}
    </div>
  )
}

/** Ereignis-Bursts: Ring am passenden Raum, wenn etwas erledigt wurde (Block, Swim, CrossFit, Mahlzeit, Wasserziel). */
export function useBursts(os) {
  const { daily, blocks } = os
  const cur = {
    training: blocks.filter((b) => b.done && !b.swim).length + (daily.crossfit ? 1 : 0),
    pool: daily.swimDone ? 1 : 0,
    ernaehrung: daily.meals.length,
    regeneration: daily.water >= 5 ? 1 : 0,
  }
  const prev = useRef(null)
  const [bursts, setBursts] = useState([])
  const key = JSON.stringify(cur)
  useEffect(() => {
    if (prev.current) {
      const fresh = Object.keys(cur).filter((k) => cur[k] > prev.current[k])
      if (fresh.length) {
        const id = Date.now()
        setBursts((b) => [...b, ...fresh.map((room) => ({ id: `${id}${room}`, room }))])
        setTimeout(() => setBursts((b) => b.filter((x) => !String(x.id).startsWith(String(id)))), 1800)
      }
    }
    prev.current = cur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return bursts
}

export function Bursts({ bursts, rooms, color }) {
  return bursts.map((b) => {
    const r = rooms.find((x) => x.id === b.room)
    return r ? <i key={b.id} className="fx-burst pointer-events-none absolute z-30 rounded-full border-2" style={{ left: `${r.x}%`, top: `${r.y}%`, borderColor: color(b.room) }} /> : null
  })
}
