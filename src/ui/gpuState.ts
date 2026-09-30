import { create } from 'zustand'

/** Zustand der Grafikkarte (Kontext verloren oder da). Getrennt vom Weltzustand, weil er von außerhalb der 3D Szene gelesen wird. */
interface GpuState {
  lost: boolean
  lostSince: number
  setLost: (lost: boolean) => void
}
export const useGpu = create<GpuState>((set) => ({
  lost: false,
  lostSince: 0,
  setLost: (lost) => set((s) => (s.lost === lost ? s : { lost, lostSince: lost ? Date.now() : 0 })),
}))
