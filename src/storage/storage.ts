// Persistenz Abstraktion. Loop 1 nutzt LocalStorage, spätere Loops können einen SQLite Adapter
// (z. B. über Tauri) mit derselben Schnittstelle einsetzen, ohne Stores oder UI zu ändern.

import type { StateStorage } from 'zustand/middleware'

export type PersistenceAdapter = StateStorage

const PREFIX = 'herkules-hq:'

export const localStorageAdapter: PersistenceAdapter = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(PREFIX + name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(PREFIX + name, value)
    } catch {
      /* Speicher voll oder gesperrt: App läuft ohne Persistenz weiter */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(PREFIX + name)
    } catch {
      /* ignorieren */
    }
  },
}

/** Einziger Austauschpunkt für den Speicher. */
export const persistenceAdapter: PersistenceAdapter = localStorageAdapter
