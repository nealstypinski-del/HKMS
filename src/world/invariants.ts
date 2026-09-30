import { BUILDING } from './buildingConfig'
import { sanitizeAvatar, sanitizeGraphics } from './persist'
import type { WorldSnapshot } from './worldGuards'

/** JSON mit sortierten Schlüsseln, damit die Reihenfolge der Felder keine Rolle spielt. */
const stable = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val))

/**
 * Bedingungen, die im Weltzustand immer gelten müssen, egal was der Nutzer klickt.
 * Liefert die Liste der Verstöße (leer = alles in Ordnung). Wird von Tests und Fuzzing genutzt.
 */
export function checkInvariants(s: WorldSnapshot): string[] {
  const v: string[] = []
  const floors = new Set(BUILDING.floors.map((f) => f.id))
  if (!floors.has(s.floorId)) v.push(`floorId ungültig: ${String(s.floorId)}`)
  if (!['tycoon', 'firstPerson', 'thirdPerson', 'building', 'follow'].includes(s.cameraMode)) v.push(`cameraMode ungültig: ${String(s.cameraMode)}`)
  if (typeof s.agents !== 'object' || s.agents === null) { v.push('agents ist kein Objekt'); return v }
  if (s.cameraMode === 'follow' && (!s.followId || !s.agents[s.followId])) v.push('follow ohne vorhandenen Agenten')
  if (s.followId && !s.agents[s.followId]) v.push('followId zeigt auf gelöschten Agenten')
  if (s.selection?.type === 'agent' && !s.agents[s.selection.id]) v.push('Auswahl zeigt auf gelöschten Agenten')
  if (s.hover?.type === 'agent' && !s.agents[s.hover.id]) v.push('Hover zeigt auf gelöschten Agenten')
  for (const a of Object.values(s.agents)) {
    if (!floors.has(a.floorId)) v.push(`Agent ${a.id} auf unbekannter Etage`)
    if (!['working', 'idle', 'break', 'waiting', 'meeting', 'offline'].includes(a.status)) v.push(`Agent ${a.id} Status ungültig: ${String(a.status)}`)
  }
  if (stable(sanitizeAvatar(s.player)) !== stable(s.player)) v.push('Spielerfigur enthält ungültige Werte')
  if (stable(sanitizeGraphics(s.graphics)) !== stable(s.graphics)) v.push('Grafikeinstellungen enthalten ungültige Werte')
  if (!['high', 'half', 'none'].includes(s.wallMode)) v.push(`wallMode ungültig: ${String(s.wallMode)}`)
  if (!['auto', 'day', 'evening', 'night'].includes(s.timeMode)) v.push(`timeMode ungültig: ${String(s.timeMode)}`)
  if (Object.keys(s.agents).length > 300) v.push('mehr als 300 Agenten')
  return v
}
