// Simulationsuhr im Stil der Sims: Pause, 1x, 3x, 9x. Eine Simulationsminute entspricht einer Sekunde Echtzeit bei 1x.
// Die Uhr steuert Tagesablauf, Besprechungen und optional Tageszeit der Umgebung.
import { useSyncExternalStore } from 'react'
import { setTimeOfDay } from '../outdoor/environment/outdoorEnvironment.js'

export const SPEEDS = [0, 1, 3, 9]
export const clock = { minutes: 8 * 60 + 30, day: 0, speedIdx: 1, followEnv: true }
let version = 0
const listeners = new Set()
const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }
const bump = () => { version++; listeners.forEach((f) => f()) }

export const mult = () => SPEEDS[clock.speedIdx]
export function setSpeed(i) { clock.speedIdx = i; bump() }
export function setFollowEnv(v) { clock.followEnv = v; bump() }
export function setClock(minutes) { clock.minutes = minutes; bump() }
export const useClock = () => { useSyncExternalStore(subscribe, () => version); return clock }

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const dayName = () => DAYS[clock.day % 7]
export const hhmm = () => {
  const m = Math.floor(clock.minutes) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
export const hour = () => (clock.minutes % 1440) / 60

let lastEnv = ''
// dtMin: vergangene Simulationsminuten
export function stepClock(dtMin) {
  clock.minutes += dtMin
  if (clock.minutes >= 1440) { clock.minutes -= 1440; clock.day++ }
  if (clock.followEnv) {
    const h = hour()
    const t = h >= 6.5 && h < 17.5 ? 'DAY' : h >= 17.5 && h < 20 ? 'EVENING' : h >= 5 && h < 6.5 ? 'EVENING' : 'NIGHT'
    if (t !== lastEnv) { lastEnv = t; setTimeOfDay(t) }
  }
  if (Math.floor(clock.minutes) !== Math.floor(clock.minutes - dtMin)) bump()
}
