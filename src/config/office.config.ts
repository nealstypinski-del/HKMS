// Zentrale Konfiguration: Maße, Etagen und Branding Tokens.
// Branding ist bewusst rein textbasiert und farblich getrennt, damit später echte Logos, Fonts und Texturen eingesetzt werden können.

export const FLOOR_HEIGHT = 6
export const FLOOR_WIDTH = 24
export const FLOOR_DEPTH = 16
export const FLOOR_THICKNESS = 0.35
export const AISLE_Z = 0.6

export type CompanyId = 'herkulesjobs' | 'kasselmemes' | 'shared'

export interface FloorConfig {
  level: number
  id: string
  name: string
  shortName: string
  company: CompanyId
  accent: string
  floorColor: string
  zoneColor: string
  surface: 'parquet' | 'carpet' | 'tile' | 'concrete'
  surfaceColor: string
  wall: string
  panel: string
}

export const FLOORS: readonly FloorConfig[] = [
  { level: 0, id: 'lobby', name: 'Lobby / Headquarters', shortName: 'Lobby', company: 'shared', accent: '#f3f0e8', floorColor: '#e6e1d4', zoneColor: '#cfd8dc', surface: 'tile', surfaceColor: '#e2d9c6', wall: '#efe8d8', panel: '#8c6a4a' },
  { level: 1, id: 'herkulesjobs', name: 'HerkulesJobs', shortName: 'HerkulesJobs', company: 'herkulesjobs', accent: '#ff8a3d', floorColor: '#ece3d2', zoneColor: '#f4c9a0', surface: 'carpet', surfaceColor: '#cbb89a', wall: '#f3e3cf', panel: '#b5763f' },
  { level: 2, id: 'kasselmemes', name: 'KasselMemes', shortName: 'KasselMemes', company: 'kasselmemes', accent: '#2fd6c0', floorColor: '#dfe7e6', zoneColor: '#a9e6dd', surface: 'carpet', surfaceColor: '#a9cfc8', wall: '#e2f1ee', panel: '#3f8f88' },
  { level: 3, id: 'dev', name: 'AI / Development', shortName: 'AI / Dev', company: 'shared', accent: '#8b7cf6', floorColor: '#d7d9e6', zoneColor: '#b9b2f0', surface: 'carpet', surfaceColor: '#8c90b3', wall: '#e6e7f2', panel: '#4b4f7a' },
] as const

export const TOP_LEVEL = FLOORS.length - 1

export const floorY = (level: number): number => level * FLOOR_HEIGHT

export const floorByLevel = (level: number): FloorConfig => FLOORS[Math.min(Math.max(level, 0), TOP_LEVEL)] as FloorConfig

export const COMPANIES: Record<CompanyId, { name: string; accent: string }> = {
  herkulesjobs: { name: 'HerkulesJobs', accent: '#ff8a3d' },
  kasselmemes: { name: 'KasselMemes', accent: '#2fd6c0' },
  shared: { name: 'Shared / Development', accent: '#8b7cf6' },
}

export const BRAND = {
  productName: 'Herkules AI HQ',
  displayTitle: 'HERKULES AI HQ',
  providerBadge: 'Provider: MOCK',
  // Platzhalter für spätere echte Assets
  logoUrl: null as string | null,
} as const

export const PLATFORM_RADIUS = 17
