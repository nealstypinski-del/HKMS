import { ACCESSORIES, DEFAULT_PLAYER, HAIR_COLORS, HAIR_STYLES, HEADWEAR, SHIRTS, SHOES, SKIN, TROUSERS } from './avatar'
import {
  DEFAULT_GRAPHICS, DEFAULT_TIME_MODE, QUALITIES, QUALITY_PRESETS, TIME_MODES,
  type Graphics, type Quality, type TimeMode,
} from './graphicsSettings'
import type { Avatar } from './types'

/**
 * Lokaler Speicher: laden mit strenger Prüfung, speichern ohne Absturz.
 * Eine Aufgabe: aus beliebigem, möglicherweise beschädigtem oder fremdem Inhalt immer gültige Einstellungen machen.
 */
export const STORAGE_KEY = 'herkules-hq-v1'
export const MAX_STORED_BYTES = 20_000

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface Persisted {
  graphics: Graphics
  player: Avatar
  timeMode: TimeMode
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback)
const index = (v: unknown, length: number, fallback: number): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < length ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

export function sanitizeGraphics(raw: unknown): Graphics {
  if (!isObj(raw)) return { ...DEFAULT_GRAPHICS }
  const quality: Quality = oneOf(raw.quality, QUALITIES, DEFAULT_GRAPHICS.quality)
  const preset = QUALITY_PRESETS[quality]
  return {
    quality,
    shadows: bool(raw.shadows, preset.shadows),
    ao: bool(raw.ao, preset.ao),
    bloom: bool(raw.bloom, preset.bloom),
    activityFx: bool(raw.activityFx, preset.activityFx),
    reflections: bool(raw.reflections, preset.reflections),
    hqLighting: bool(raw.hqLighting, preset.hqLighting),
    background: bool(raw.background, preset.background),
    labels: bool(raw.labels, DEFAULT_GRAPHICS.labels),
    performanceMode: bool(raw.performanceMode, DEFAULT_GRAPHICS.performanceMode),
  }
}

export function sanitizeAvatar(raw: unknown): Avatar {
  if (!isObj(raw)) return { ...DEFAULT_PLAYER }
  const d = DEFAULT_PLAYER
  return {
    skinVariant: index(raw.skinVariant, SKIN.length, d.skinVariant),
    hairStyle: oneOf(raw.hairStyle, HAIR_STYLES, d.hairStyle),
    hairVariant: index(raw.hairVariant, HAIR_COLORS.length, d.hairVariant),
    shirtVariant: index(raw.shirtVariant, SHIRTS.length, d.shirtVariant),
    trousersVariant: index(raw.trousersVariant, TROUSERS.length, d.trousersVariant),
    shoesVariant: index(raw.shoesVariant, SHOES.length, d.shoesVariant),
    headwear: oneOf(raw.headwear, HEADWEAR, d.headwear),
    accessory: oneOf(raw.accessory, ACCESSORIES, d.accessory),
  }
}

export const sanitizeTimeMode = (raw: unknown): TimeMode => oneOf(raw, TIME_MODES, DEFAULT_TIME_MODE)

/** Zugriff auf localStorage, der nie wirft (privater Modus, blockierte Website Daten, Sandbox). */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export function defaultPersisted(): Persisted {
  return { graphics: { ...DEFAULT_GRAPHICS }, player: { ...DEFAULT_PLAYER }, timeMode: DEFAULT_TIME_MODE }
}

/** Liefert immer vollständige, gültige Einstellungen. Unlesbares, zu großes oder falsch typisiertes Material wird verworfen. */
export function loadPersisted(storage: StorageLike | null = browserStorage()): Persisted {
  if (!storage) return defaultPersisted()
  let text: string | null = null
  try { text = storage.getItem(STORAGE_KEY) } catch { return defaultPersisted() }
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_STORED_BYTES) return defaultPersisted()
  let data: unknown
  try { data = JSON.parse(text) } catch { return defaultPersisted() }
  if (!isObj(data)) return defaultPersisted()
  // Nur bekannte Felder werden gelesen, alles andere (auch __proto__) wird ignoriert.
  return { graphics: sanitizeGraphics(data.graphics), player: sanitizeAvatar(data.player), timeMode: sanitizeTimeMode(data.timeMode) }
}

/** Speichert die bereinigten Werte. Rückgabe false, wenn der Speicher nicht verfügbar oder voll ist (kein Absturz). */
export function savePersisted(p: Persisted, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false
  try {
    const clean: Persisted = { graphics: sanitizeGraphics(p.graphics), player: sanitizeAvatar(p.player), timeMode: sanitizeTimeMode(p.timeMode) }
    storage.setItem(STORAGE_KEY, JSON.stringify(clean))
    return true
  } catch {
    return false
  }
}
