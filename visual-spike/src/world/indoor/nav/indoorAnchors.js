// Sitzplätze und Arbeitsplätze der Innenwelt als semantische Anker für Agenten (Terminal 4 entscheidet, wer wann wohin geht).
import { buildFurniture, ROOMS, HQ, STATIONS } from '../config/hq.layout.js'
import { nearestNode } from '../../outdoor/routes/OutdoorRouteSystem.js'

const ROOM_NODE = {
  lobby: 'in-lobby', herkules: 'r-herkules', kaskade: 'r-kaskade', cafe: 'r-cafe', showroom: 'r-showroom', oktogon: 'r-oktogon', wilhelmshoehe: 'r-wilhelm',
  hj: 'r-hj', vertrieb: 'r-vertrieb', ai: 'r-ai', loewenburg: 'r-loewenburg',
}
const nodeFor = (room, z) => (room === 'km' ? (z < 4.5 ? 'r-km-a' : 'r-km-b') : ROOM_NODE[room])
const roomName = Object.fromEntries(ROOMS.map((r) => [r.id, r.name]))

const f = buildFurniture()

export const DESK_ANCHORS = f.desks.map((d) => ({
  id: d.id, kind: 'desk', room: d.room, roomName: roomName[d.room], team: d.team, level: d.level,
  x: d.seat.x, z: d.seat.z, y: d.seat.y, yaw: d.seat.yaw, node: nodeFor(d.room, d.z),
}))
export const MEETING_ANCHORS = f.chairs.map((c) => ({
  id: c.id, kind: 'seat', room: c.room, roomName: roomName[c.room], team: 'Meeting', level: c.level,
  x: c.seat.x, z: c.seat.z, y: c.seat.y, yaw: c.seat.yaw, node: nodeFor(c.room, c.z),
}))
export const INDOOR_ANCHORS = [...DESK_ANCHORS, ...MEETING_ANCHORS]
export const getIndoorAnchor = (id) => INDOOR_ANCHORS.find((a) => a.id === id)
export const indoorAnchorsByRoom = (room, kind) => INDOOR_ANCHORS.filter((a) => a.room === room && (!kind || a.kind === kind))

// Sofaplätze (zwei je Sofa) zum Ausruhen
export const SOFA_ANCHORS = f.sofas.flatMap((sf, i) => [-0.5, 0.5].map((off, j) => {
  const c = Math.cos(sf.ry); const sn = Math.sin(sf.ry)
  const x = sf.x + off * sf.w * 0.5 * c + 0.05 * sn
  const z = sf.z - off * sf.w * 0.5 * sn + 0.05 * c
  const y = HQ.levels[sf.level]
  return { id: `sofa-${i}-${j}`, kind: 'sofa', room: sf.level ? 'lounge1' : 'hall0', roomName: 'Sofa', team: 'Pause', level: sf.level, x, z, y, yaw: sf.ry, node: nearestNode(sf.x, sf.z, sf.level) }
}))

// Stehplätze an Geräten
export const STATION_ANCHORS = Object.fromEntries(Object.entries(STATIONS).map(([k, st]) => [k, { ...st, level: st.y > 2 ? 1 : 0 }]))
