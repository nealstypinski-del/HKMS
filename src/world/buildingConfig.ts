import type { BuildingConfig, DepartmentConfig, FloorConfig, ZoneConfig, Rect } from './types'

// Rasterplätze, gleich für alle Geschosse. Aisle (Korridor) liegt bei z = -3..3.
const NW: Rect = { x0: -22, z0: -15, x1: -3, z1: -3 }
const NE: Rect = { x0: 3, z0: -15, x1: 22, z1: -3 }
const SW: Rect = { x0: -22, z0: 3, x1: -7.5, z1: 15 }
const SC: Rect = { x0: -7.5, z0: 3, x1: 7.5, z1: 15 }
const SE: Rect = { x0: 7.5, z0: 3, x1: 22, z1: 15 }
const WEST_NOOK: Rect = { x0: -22, z0: -3, x1: -16, z1: 3 }
const EAST_NOOK: Rect = { x0: 16, z0: -3, x1: 22, z1: 3 }
const CORE: Rect = { x0: -3, z0: -15, x1: 3, z1: -11 }
const ELEV_LOBBY: Rect = { x0: -3, z0: -11, x1: 3, z1: -3 }

const coreZone = (floor: string): ZoneConfig => ({
  id: `zone-${floor}-core`, title: 'Aufzüge', type: 'core', rect: CORE, door: 'S', walled: true,
})
const lobbyZone = (floor: string): ZoneConfig => ({
  id: `zone-${floor}-elevator-lobby`, title: 'Aufzugsfoyer', type: 'elevatorLobby', rect: ELEV_LOBBY,
})

const ws = (
  id: string, title: string, rect: Rect, door: 'N' | 'S', cols: number, rows: number,
  variant: ZoneConfig['workstationVariant'], screens?: string[],
): ZoneConfig => ({
  id, title, type: 'workstations', rect, door, walled: true, grid: { cols, rows }, workstationVariant: variant, screens,
})

const zn = (id: string, title: string, type: ZoneConfig['type'], rect: Rect, door?: 'N' | 'S', walled = true, screens?: string[]): ZoneConfig =>
  ({ id, title, type, rect, door, walled, screens })

const dept = (id: string, title: string, accent: string, zones: ZoneConfig[]): DepartmentConfig => ({ id, title, accent, zones })

const ground: FloorConfig = {
  id: 'floor-lobby', level: 0, title: 'Empfang / Agenten-Bank / Lounge', short: 'EMPFANG', accent: '#d9c7a0',
  departments: [
    dept('dept-shared', 'Empfang', '#d9c7a0', [
      coreZone('lobby'),
      lobbyZone('lobby'),
      zn('zone-lobby-reception', 'Empfang', 'lobby', SC, 'N', false),
      zn('zone-lobby-kitchen', 'Küche', 'kitchen', NW, 'S'),
      zn('zone-lobby-lounge', 'Lounge', 'lounge', NE, 'S'),
      zn('zone-lobby-meeting', 'Besprechung', 'meeting', SW, 'N', true, ['BESPRECHUNG']),
      zn('zone-lobby-bench', 'Agenten-Bank', 'bench', SE, 'N', true, ['AGENTEN-BANK', 'FREIE KAPAZITÄT']),
    ]),
  ],
}

const shared: FloorConfig = {
  id: 'floor-shared', level: 1, title: 'Gemeinsamer Betrieb / Besprechungszentrum', short: 'BETRIEB', accent: '#5fbf8a',
  departments: [
    dept('dept-shared-ops', 'Gemeinsamer Betrieb', '#5fbf8a', [
      coreZone('shared'),
      lobbyZone('shared'),
      ws('zone-shared-ops', 'Gemeinsamer Betrieb', NE, 'S', 6, 3, 'ops', ['AUFGABEN', 'FREIGABEN']),
      zn('zone-shared-meeting-a', 'Besprechungszentrum', 'meeting', NW, 'S', true, ['BESPRECHUNGSZENTRUM']),
      zn('zone-shared-booths', 'Ruhekabinen', 'booths', SW, 'N'),
      zn('zone-shared-meeting-b', 'Konferenzraum', 'meeting', SC, 'N', true, ['KONFERENZ']),
      zn('zone-shared-lounge', 'Lounge', 'lounge', SE, 'N'),
    ]),
  ],
}

const hj: FloorConfig = {
  id: 'floor-herkulesjobs', level: 2, title: 'HerkulesJobs', short: 'HERKULESJOBS', accent: '#e8a33d',
  departments: [
    dept('dept-sales', 'Vertrieb & Produkte', '#e8a33d', [
      coreZone('hj'), lobbyZone('hj'),
      ws('zone-hj-sales', 'Vertrieb & Produkte', NW, 'S', 6, 3, 'sales', ['PRODUKTE', 'LEADS']),
    ]),
    dept('dept-employer-research', 'Arbeitgeber- & Lead-Recherche', '#d98a2b', [
      ws('zone-hj-employers', 'Arbeitgeber- & Lead-Recherche', NE, 'S', 6, 3, 'research', ['ARBEITGEBER', 'LEADS']),
    ]),
    dept('dept-recruiting', 'Recruiting-Betrieb', '#c7772a', [
      ws('zone-hj-recruiting', 'Recruiting-Betrieb', SW, 'N', 4, 3, 'ops', ['AUFGABEN']),
    ]),
    dept('dept-hj-conference', 'Konferenzraum HerkulesJobs', '#f0c070', [
      zn('zone-hj-conference', 'Konferenzraum HerkulesJobs', 'meeting', SC, 'N', true, ['TAGESORDNUNG', 'ANGEBOTE']),
    ]),
    dept('dept-customer-success', 'Kundenerfolg', '#e6b25a', [
      ws('zone-hj-cs', 'Kundenerfolg', SE, 'N', 5, 3, 'sales', ['WARTET AUF FREIGABE']),
      zn('zone-hj-lounge', 'Pausenecke', 'lounge', WEST_NOOK, undefined, false),
      zn('zone-hj-coffee', 'Kaffeebar', 'kitchen', EAST_NOOK, undefined, false),
    ]),
  ],
}

const km: FloorConfig = {
  id: 'floor-kasselmemes', level: 3, title: 'KasselMemes', short: 'KASSELMEMES', accent: '#e0508b',
  departments: [
    dept('dept-trend-lab', 'Trend-Labor', '#e0508b', [
      coreZone('km'), lobbyZone('km'),
      ws('zone-km-trend', 'Trend-Labor', NW, 'S', 6, 3, 'creative', ['TRENDS', 'MEME-RADAR']),
    ]),
    dept('dept-editorial', 'Nachrichtenbeiträge', '#d0407a', [
      ws('zone-km-editorial', 'Nachrichtenbeiträge', NE, 'S', 6, 3, 'creative', ['REDAKTIONSPLAN', 'NACHRICHTEN']),
    ]),
    dept('dept-creative-studio', 'Infobeiträge', '#f06aa0', [
      { id: 'zone-km-studio', title: 'Infobeiträge', type: 'creative', rect: SW, door: 'N', walled: true, grid: { cols: 4, rows: 3 }, workstationVariant: 'creative', screens: ['INFOBEITRÄGE'] },
    ]),
    dept('dept-km-conference', 'Konferenzraum KasselMemes', '#ff7ab0', [
      zn('zone-km-conference', 'Konferenzraum KasselMemes', 'meeting', SC, 'N', true, ['THEMENPLAN', 'REICHWEITE']),
    ]),
    dept('dept-community', 'Gewinnspiele & Community', '#c94a8a', [
      ws('zone-km-community', 'Gewinnspiele & Community', SE, 'N', 5, 3, 'sales', ['GEWINNSPIELE', 'COMMUNITY']),
      zn('zone-km-partnerships', 'Partnerschaften', 'lounge', EAST_NOOK, undefined, false),
      zn('zone-km-lounge', 'Ideen-Lounge', 'lounge', WEST_NOOK, undefined, false),
    ]),
  ],
}

const dev: FloorConfig = {
  id: 'floor-ai-dev', level: 4, title: 'KI + Entwicklung', short: 'KI / ENTWICKLUNG', accent: '#3fb6c4',
  departments: [
    dept('dept-codex', 'Codex', '#3fb6c4', [
      coreZone('dev'), lobbyZone('dev'),
      ws('zone-dev-codex', 'Codex', NW, 'S', 6, 3, 'developer', ['CODEX BEREIT']),
    ]),
    dept('dept-claude-code', 'Claude Code', '#e07a4f', [
      ws('zone-dev-claude', 'Claude Code', NE, 'S', 6, 3, 'developer', ['CLAUDE CODE BEREIT']),
    ]),
    dept('dept-development', 'Entwicklung', '#4f8fd6', [
      ws('zone-dev-development', 'Entwicklung', SW, 'N', 4, 3, 'developer', ['BUILDS']),
    ]),
    dept('dept-automation', 'Automatisierung', '#5fb98a', [
      ws('zone-dev-automation', 'Automatisierung', SC, 'N', 5, 3, 'developer', ['ABLÄUFE']),
    ]),
    dept('dept-qa', 'Qualitätssicherung', '#b58ad6', [
      ws('zone-dev-qa', 'Qualitätssicherung', SE, 'N', 5, 3, 'developer', ['TESTS']),
    ]),
    dept('dept-research-infra', 'Forschung / Infrastruktur', '#7aa0b0', [
      zn('zone-dev-research', 'Forschung', 'lounge', WEST_NOOK, undefined, false),
      zn('zone-dev-infra', 'Infrastruktur', 'servers', EAST_NOOK, undefined, false),
    ]),
  ],
}

const mgmt: FloorConfig = {
  id: 'floor-management', level: 5, title: 'Geschäftsleitung / Betrieb', short: 'GESCHÄFTSLEITUNG', accent: '#8b7bd8',
  departments: [
    dept('dept-management', 'Geschäftsleitung', '#8b7bd8', [
      coreZone('mgmt'), lobbyZone('mgmt'),
      zn('zone-mgmt-ceo', 'Geschäftsführung', 'ceo', NW, 'S'),
      zn('zone-mgmt-overview', 'Unternehmensübersicht', 'display', WEST_NOOK, undefined, false, ['UNTERNEHMENSÜBERSICHT']),
    ]),
    dept('dept-operations', 'Betriebszentrale', '#7a6bc8', [
      ws('zone-mgmt-ops', 'Betriebszentrale', NE, 'S', 6, 3, 'ops', ['BETRIEB']),
    ]),
    dept('dept-approval', 'Freigabezentrum', '#a08ae0', [
      ws('zone-mgmt-approval', 'Freigabezentrum', SW, 'N', 4, 2, 'ops', ['WARTET AUF FREIGABE']),
    ]),
    dept('dept-strategy', 'Strategieraum', '#6f63b8', [
      zn('zone-mgmt-strategy', 'Strategieraum', 'strategy', SC, 'N', true, ['STRATEGIE']),
    ]),
    dept('dept-boardroom', 'Großer Besprechungsraum', '#9a8ce0', [
      zn('zone-mgmt-board', 'Großer Besprechungsraum', 'meeting', SE, 'N', true, ['SITZUNG']),
    ]),
  ],
}

/**
 * Das Gebäude ist reine Konfiguration. Ein neues Geschoss entsteht durch einen
 * weiteren Eintrag, es gibt keine handgeschriebene Komponente pro Etage.
 */
export const BUILDING: BuildingConfig = {
  name: 'HERKULES AI HQ',
  floors: [ground, shared, hj, km, dev, mgmt],
}

export const floorById = (id: string) => BUILDING.floors.find((f) => f.id === id)
