// Auswahl eines Agenten (Sims Auswahl): gewählter Agent, Verfolgen Modus. Wird vom Picker gesetzt und vom Panel gelesen.
import { useSyncExternalStore } from 'react'

export const selection = { agent: null, follow: false }
const listeners = new Set()
let version = 0
export function select(agent, follow = false) {
  selection.agent = agent
  selection.follow = follow
  version++
  listeners.forEach((f) => f())
}
export const setFollow = (v) => { selection.follow = v; version++; listeners.forEach((f) => f()) }
const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }
export const useSelection = () => { useSyncExternalStore(subscribe, () => version); return selection }
