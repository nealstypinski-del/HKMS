/**
 * Grafikeinstellungen: Typen, Voreinstellungen und die Auswertung des Performance Modus.
 * Reine Daten, ohne Store und ohne Three.js, damit Validierung und Speicher sie ohne Zyklus nutzen können.
 * Betrifft nur die Grafikleistung (GPU), nicht die KI Rechenleistung.
 */
export type Quality = 'low' | 'medium' | 'high'
export type TimeMode = 'auto' | 'day' | 'evening' | 'night'
export type WallModeSetting = 'high' | 'half' | 'none'

export const QUALITIES: readonly Quality[] = ['low', 'medium', 'high']
export const TIME_MODES: readonly TimeMode[] = ['auto', 'day', 'evening', 'night']
export const WALL_MODES: readonly WallModeSetting[] = ['high', 'half', 'none']

export interface Graphics {
  quality: Quality
  shadows: boolean
  ao: boolean
  bloom: boolean
  labels: boolean
  activityFx: boolean
  reflections: boolean
  hqLighting: boolean
  background: boolean
  performanceMode: boolean
}

export const QUALITY_PRESETS: Record<Quality, Omit<Graphics, 'quality' | 'labels' | 'performanceMode'>> = {
  low: { shadows: false, ao: false, bloom: false, activityFx: false, reflections: false, hqLighting: false, background: true },
  medium: { shadows: true, ao: false, bloom: true, activityFx: true, reflections: false, hqLighting: false, background: true },
  high: { shadows: true, ao: true, bloom: true, activityFx: true, reflections: true, hqLighting: true, background: true },
}

export const DEFAULT_GRAPHICS: Graphics = { quality: 'high', labels: true, performanceMode: false, ...QUALITY_PRESETS.high }
export const DEFAULT_TIME_MODE: TimeMode = 'auto'

/** Wirksame Einstellungen: der Performance Modus schaltet alle teuren Effekte ab. */
const effCache = new WeakMap<Graphics, Graphics>()
export function effectiveGraphics(g: Graphics): Graphics {
  if (!g.performanceMode) return g
  // Gecacht, damit Zustand Selektoren eine stabile Referenz bekommen (sonst Endlosschleife im Rendering).
  let e = effCache.get(g)
  if (!e) { e = { ...g, shadows: false, ao: false, bloom: false, reflections: false, hqLighting: false, activityFx: false }; effCache.set(g, e) }
  return e
}
