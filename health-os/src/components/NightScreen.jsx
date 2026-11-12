import { useEffect, useState } from 'react'
import { COLORS } from '../lib/constants.js'
import { fmt, pad } from '../lib/calc.js'

/** Nachtruhe-Anzeige (22:00–05:30): nur Schlaf-Infos und Countdown bis zum Wecken; Berühren zeigt das Dashboard 30 s. */
export function NightScreen({ os }) {
  const [peekUntil, setPeekUntil] = useState(0)
  useEffect(() => {
    const wake = () => setPeekUntil(Date.now() + 30000)
    addEventListener('pointerdown', wake)
    return () => removeEventListener('pointerdown', wake)
  }, [])
  if (os.now.getTime() < peekUntil && !new URLSearchParams(location.search).get('mode')) return null
  const { now, bio, sleepH } = os
  const wake = new Date(now); wake.setHours(5, 30, 0, 0)
  if (wake <= now) wake.setDate(wake.getDate() + 1)
  const s = Math.max(0, Math.floor((wake - now) / 1000))
  const before = now.getHours() >= 22
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black text-center" role="dialog" aria-label="Nachtruhe">
      <div className="mono flex flex-col items-center gap-6 px-6" style={{ color: '#ff9a6b' }}>
        <div className="text-sm tracking-[.4em] opacity-70">CURFEW LOCKOUT · NACHTRUHE</div>
        <div className="text-7xl font-bold" style={{ textShadow: '0 0 30px rgba(255,120,60,.45)' }}>{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-sm opacity-80">{before ? 'Licht aus. STH-Peak.' : 'Noch Ruhe.'} Ignition in <b>{pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</b></div>
        <div className="flex gap-8 text-xs opacity-70">
          <span>ERHOLUNG {Math.round(bio.score)} %</span><span>HRV {Math.round(bio.hrv)} ms</span><span>LETZTE NACHT {fmt(sleepH, 1)} Std</span>
        </div>
        <div className="text-[11px] tracking-widest opacity-40" style={{ color: COLORS.dim }}>Bildschirm berühren → Dashboard für 30 Sekunden</div>
      </div>
    </div>
  )
}
