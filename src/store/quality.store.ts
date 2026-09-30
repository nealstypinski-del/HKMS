import { create } from 'zustand'

export type Quality = 'high' | 'medium' | 'low'

interface QualityState {
  quality: Quality
  set: (q: Quality) => void
}

const initial = (): Quality => {
  try {
    const v = window.localStorage.getItem('herkules-hq:quality')
    return v === 'high' || v === 'low' || v === 'medium' ? v : 'medium'
  } catch {
    return 'medium'
  }
}

/** Grafikstufe: low ohne Nachbearbeitung, medium mit Bloom, high zusätzlich mit Kantenglättung. */
export const useQualityStore = create<QualityState>((set) => ({
  quality: initial(),
  set: (quality) => {
    try {
      window.localStorage.setItem('herkules-hq:quality', quality)
    } catch {
      /* ignorieren */
    }
    set({ quality })
  },
}))
