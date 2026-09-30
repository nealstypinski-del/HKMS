// Zonenstreaming: Jede Zone hat Grenzen, Priorität, Assets und eine LOD Richtlinie.
// Zustände: UNLOADED, LOW_DETAIL, LOADED, HIGH_DETAIL. Kein MMO Streaming, nur klare Grenzen und Hysterese.
import { MONUMENT } from '../config/bergpark.config.js'

export const ZONE_STATES = ['UNLOADED', 'LOW_DETAIL', 'LOADED', 'HIGH_DETAIL']

const rect = (x0, x1, z0, z1) => ({ type: 'rect', x0, x1, z0, z1 })
const circ = (x, z, r) => ({ type: 'circle', x, z, r })

export const ZONES = [
  {
    id: 'HQ_INTERIOR', priority: 5, shapes: [rect(-22, 22, -14, 14)], thresholds: [0, 110, 240],
    assets: ['hq-interior-ground-floor', 'agent-labels'],
    lodPolicy: { HIGH_DETAIL: 'Innenraum voll', LOADED: 'Innenraum voll', LOW_DETAIL: 'Glasproxy ohne Innenraum', UNLOADED: 'Glasproxy ohne Innenraum' },
  },
  {
    id: 'HQ_EXTERIOR', priority: 4, shapes: [circ(0, -30, 60)], thresholds: [0, 120, 400],
    assets: ['hq-tower', 'plaza', 'paths', 'lamps', 'kiosk'],
    lodPolicy: { HIGH_DETAIL: 'volle Ausstattung', LOADED: 'volle Ausstattung', LOW_DETAIL: 'Gebäude und Boden', UNLOADED: 'Gebäude und Boden' },
  },
  {
    id: 'PARK_LOWER', priority: 3, shapes: [rect(-40, 40, -132, -58)], thresholds: [0, 100, 300],
    assets: ['result-pool', 'benches', 'park-trees'],
    lodPolicy: { HIGH_DETAIL: 'Gras und Büsche', LOADED: 'Bäume mittel', LOW_DETAIL: 'Bäume fern', UNLOADED: 'Bäume fern' },
  },
  {
    id: 'CASCADE', priority: 3, shapes: [rect(-40, 40, -340, -124)], thresholds: [0, 100, 300],
    assets: ['cascade-segments', 'stairs', 'water', 'stage-gates'],
    lodPolicy: { HIGH_DETAIL: 'volle Segmente', LOADED: 'volle Segmente', LOW_DETAIL: 'Segmente ohne Feinheiten', UNLOADED: 'Segmente ohne Feinheiten' },
  },
  {
    id: 'HERKULES_UPPER', priority: 4, shapes: [circ(MONUMENT.x, MONUMENT.z, 70)], thresholds: [0, 140, 400],
    assets: ['monument', 'figure-lod0', 'terrace'],
    lodPolicy: { HIGH_DETAIL: 'Figur LOD0', LOADED: 'Figur LOD1', LOW_DETAIL: 'Figur LOD2', UNLOADED: 'Figur LOD2' },
  },
  {
    id: 'FOREST', priority: 2, shapes: [rect(-220, -34, -520, 90), rect(34, 220, -520, 90)], thresholds: [0, 90, 300],
    assets: ['tree-instances', 'bushes', 'rocks', 'forest-paths'],
    lodPolicy: { HIGH_DETAIL: 'Bäume LOD0', LOADED: 'Bäume LOD1', LOW_DETAIL: 'Bäume LOD2', UNLOADED: 'Bäume LOD2' },
  },
]

function distToShape(s, x, z) {
  if (s.type === 'circle') return Math.max(0, Math.hypot(x - s.x, z - s.z) - s.r)
  const dx = Math.max(s.x0 - x, 0, x - s.x1)
  const dz = Math.max(s.z0 - z, 0, z - s.z1)
  return Math.hypot(dx, dz)
}
export const zoneDistance = (zone, x, z) => Math.min(...zone.shapes.map((s) => distToShape(s, x, z)))

const HYST = 8

class WorldZoneManagerImpl {
  constructor() {
    this.states = Object.fromEntries(ZONES.map((z) => [z.id, 'UNLOADED']))
    this.listeners = new Set()
  }

  get(id) { return this.states[id] }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }

  // Fokuspunkt (Kamera oder Spieler) aktualisieren
  update(x, z) {
    let changed = false
    for (const zone of ZONES) {
      const d = zoneDistance(zone, x, z)
      const [hi, lo, far] = zone.thresholds
      const B = [Infinity, far, lo, hi]
      const cur = ZONE_STATES.indexOf(this.states[zone.id])
      let next = cur
      // Hysterese: Aufwärts erst kurz hinter der Grenze, abwärts erst kurz davor
      while (next < 3 && d <= B[next + 1] - (B[next + 1] === 0 ? 0 : HYST)) next++
      while (next > 0 && d > B[next] + HYST) next--
      if (next !== cur) { this.states[zone.id] = ZONE_STATES[next]; changed = true }
    }
    if (changed) this.listeners.forEach((f) => f(this.states))
    return changed
  }
}

export const worldZones = new WorldZoneManagerImpl()
