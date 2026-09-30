// Sitzplätze und Arbeitsplätze der Innenwelt als semantische Anker für Agenten (Terminal 4 entscheidet, wer wann wohin geht).
import { buildFurniture, ROOMS } from '../config/hq.layout.js'

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
