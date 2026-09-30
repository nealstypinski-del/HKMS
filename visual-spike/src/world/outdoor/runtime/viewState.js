// Sims Ansicht: Etagenschnitt und Wandmodus (wie das Wandmenü der Sims). Wird von Menü und Kamera gesetzt und von der Innenwelt gelesen.
import { useSyncExternalStore } from 'react'

let state = { cutLevel: 'all', wallMode: 'up' } // cutLevel: all | 0 | 1, wallMode: up | half | down
const listeners = new Set()
export const getView = () => state
export function setView(partial) {
  state = { ...state, ...partial }
  listeners.forEach((f) => f())
}
const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }
export const useView = () => useSyncExternalStore(subscribe, getView)
