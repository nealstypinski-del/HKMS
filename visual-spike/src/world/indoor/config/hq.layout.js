// Grundriss und Ausstattung der HQ Innenwelt (Etage 0 und Etage 1). Reine Daten und Generatoren, kein Rendering.
// Einheiten Meter, HQ Mitte im Ursprung, Eingang Nordseite (z = -14, Richtung Park und Herkules), Blick nach Süden ist +Z.
// Die Raumnamen und Beschriftungen sind PLATZHALTER aus den Angaben "HerkulesJobs, KasselMemes, Infobeiträge, Nachrichtenbeiträge,
// Gewinnspiele, Vertrieb". Echte Pläne oder Fotos liegen dem Projekt noch nicht vor und sollten hier eingepflegt werden.

export const HQ = { halfW: 22, halfD: 14, floorH: 4.5, ceilH: 4.2, slab: 0.3, wallT: 0.14, levels: [0, 4.5], doorW: 1.8 }
export const levelOf = (y) => (y > 2.2 ? 1 : 0)
export const insideHQ = (x, z, m = 0) => Math.abs(x) < HQ.halfW + m && Math.abs(z) < HQ.halfD + m

// Öffnungen in der Decke von Etage 0 (Treppenhaus und Rolltreppen)
export const VOIDS = [
  { id: 'stairs', x0: -6.2, x1: -3.8, z0: -5.4, z1: 2.8 },
  { id: 'escalators', x0: 0.8, x1: 4.2, z0: -5.4, z1: 2.8 },
]

// Treppe: 27 Stufen, Steigung 0,1667 m, Auftritt 0,28 m
export const STAIRS = { x: -5.0, width: 2.0, z0: -5.0, count: 27, rise: HQ.floorH, tread: 0.28 }
STAIRS.riser = STAIRS.rise / STAIRS.count
STAIRS.z1 = STAIRS.z0 + STAIRS.count * STAIRS.tread

// Rolltreppen: 30 Grad Neigung, Fördergeschwindigkeit 0,5 m/s. "down" fährt von Etage 1 nach Etage 0.
export const ESCALATORS = [
  { id: 'up', x: 1.6, dir: 1 },
  { id: 'down', x: 3.4, dir: -1 },
]
export const ESC = { angle: Math.PI / 6, width: 1.0, speed: 0.5, z0: -5.0 }
ESC.run = HQ.floorH / Math.tan(ESC.angle)
ESC.z1 = ESC.z0 + ESC.run
ESC.length = HQ.floorH / Math.sin(ESC.angle)

export const ROOMS = [
  { id: 'lobby', level: 0, rect: [-7, -14, 7, -5.4], name: 'Empfang', floor: 'concrete', accent: '#ff8a3d' },
  { id: 'hall0', level: 0, rect: [-7, -5.4, 7, 14], name: 'Halle', floor: 'concrete', accent: '#2fd6c0' },
  { id: 'herkules', level: 0, rect: [-22, -14, -7, -2], name: 'Konferenzraum Herkules', floor: 'parquet', accent: '#ff8a3d' },
  { id: 'kaskade', level: 0, rect: [-22, -2, -7, 6], name: 'Meetingraum Kaskade', floor: 'parquet', accent: '#2fd6c0' },
  { id: 'cafe', level: 0, rect: [-22, 6, -7, 14], name: 'Café Bergpark', floor: 'concrete', accent: '#c9a24a' },
  { id: 'showroom', level: 0, rect: [7, -14, 22, -2], name: 'Showroom Produkte', floor: 'concrete', accent: '#ff8a3d' },
  { id: 'oktogon', level: 0, rect: [7, -2, 22, 6], name: 'Konferenzraum Oktogon', floor: 'parquet', accent: '#ff8a3d' },
  { id: 'wilhelmshoehe', level: 0, rect: [7, 6, 22, 14], name: 'Meetingraum Wilhelmshöhe', floor: 'parquet', accent: '#2fd6c0' },
  { id: 'lounge1', level: 1, rect: [-7, -14, 7, -5.4], name: 'Lounge', floor: 'carpet', accent: '#5b6ee1' },
  { id: 'gallery1', level: 1, rect: [-7, -5.4, 7, 14], name: 'Galerie', floor: 'carpet', accent: '#5b6ee1' },
  { id: 'hj', level: 1, rect: [-22, -14, -7, -2], name: 'HerkulesJobs', floor: 'carpet', accent: '#ff8a3d' },
  { id: 'km', level: 1, rect: [-22, -2, -7, 14], name: 'KasselMemes Redaktion', floor: 'carpet', accent: '#2fd6c0' },
  { id: 'vertrieb', level: 1, rect: [7, -14, 22, -2], name: 'Vertrieb', floor: 'carpet', accent: '#ff8a3d' },
  { id: 'ai', level: 1, rect: [7, -2, 22, 6], name: 'AI Agents Hub', floor: 'carpet', accent: '#4da3ff' },
  { id: 'loewenburg', level: 1, rect: [7, 6, 22, 14], name: 'Konferenzraum Löwenburg', floor: 'parquet', accent: '#ff8a3d' },
]

// Wände. kind: solid oder glass. doors: Mittelpunkte der Türöffnungen entlang der Wand.
const W = (level, ax, c, a, b, kind, doors = [], doorW = HQ.doorW) => ({ level, ax, c, a, b, kind, doors, doorW })
export const WALLS = [
  // Etage 0: Trennwände zur Halle (x = -7 und x = 7)
  W(0, 'z', -7, -14, -2, 'glass', [-8]), W(0, 'z', -7, -2, 6, 'glass', [4.5]),
  W(0, 'z', 7, -14, -2, 'glass', [-8], 2.6), W(0, 'z', 7, -2, 6, 'glass', [4.5]), W(0, 'z', 7, 6, 14, 'glass', [10]),
  W(0, 'x', -2, -22, -7, 'solid'), W(0, 'x', -2, 7, 22, 'solid'),
  W(0, 'x', 6, -22, -7, 'solid'), W(0, 'x', 6, 7, 22, 'solid'),
  // Etage 1
  W(1, 'z', -7, -14, -2, 'glass', [-8]), W(1, 'z', -7, -2, 14, 'glass', [4.5, 10]),
  W(1, 'z', 7, -14, -2, 'glass', [-8]), W(1, 'z', 7, -2, 6, 'glass', [4.5]), W(1, 'z', 7, 6, 14, 'glass', [10]),
  W(1, 'x', -2, -22, -7, 'glass', [-14.5], 2.4),
  W(1, 'x', -2, 7, 22, 'solid'), W(1, 'x', 6, 7, 22, 'solid'),
]

// Aufteilung einer Wand in Segmente ohne Türöffnungen
export function wallSegments(w) {
  const gaps = w.doors.map((d) => [d - w.doorW / 2, d + w.doorW / 2]).sort((p, q) => p[0] - q[0])
  const segs = []
  let cur = w.a
  for (const [g0, g1] of gaps) {
    if (g0 > cur) segs.push([cur, g0])
    cur = g1
  }
  if (cur < w.b) segs.push([cur, w.b])
  return segs
}

// Rechteck minus Rechtecke (achsenparallel), liefert Teilrechtecke [x0,z0,x1,z1]
export function subtractRects(rect, holes) {
  let pieces = [rect]
  for (const h of holes) {
    const next = []
    for (const [x0, z0, x1, z1] of pieces) {
      const ix0 = Math.max(x0, h.x0); const ix1 = Math.min(x1, h.x1)
      const iz0 = Math.max(z0, h.z0); const iz1 = Math.min(z1, h.z1)
      if (ix0 >= ix1 || iz0 >= iz1) { next.push([x0, z0, x1, z1]); continue }
      if (z0 < iz0) next.push([x0, z0, x1, iz0])
      if (iz1 < z1) next.push([x0, iz1, x1, z1])
      if (x0 < ix0) next.push([x0, iz0, ix0, iz1])
      if (ix1 < x1) next.push([ix1, iz0, x1, iz1])
    }
    pieces = next
  }
  return pieces
}

// ---------------------------------------------------------------- Ausstattung
const rot = (lx, lz, ry) => [lx * Math.cos(ry) + lz * Math.sin(ry), -lx * Math.sin(ry) + lz * Math.cos(ry)]

let deskCounter = 0
// Arbeitsplatz: Sitzplatz des Agenten liegt bei lokal (0, 0.85), Blick nach lokal -Z (Yaw des Agenten = ry + PI)
function desk(level, room, team, x, z, ry, monitors = 1) {
  const y = HQ.levels[level]
  const [sx, sz] = rot(0, 0.85, ry)
  const id = `desk-${room}-${String(++deskCounter).padStart(2, '0')}`
  return { id, room, team, level, x, z, ry, y, monitors, seat: { x: x + sx, z: z + sz, y, yaw: ry + Math.PI } }
}

// Stuhl mit Sitzplatz in seiner Mitte, Blick nach lokal -Z
let seatCounter = 0
function chairAt(level, room, x, z, ry) {
  const y = HQ.levels[level]
  return { id: `seat-${room}-${String(++seatCounter).padStart(2, '0')}`, room, level, x, z, ry, y, seat: { x, z, y, yaw: ry + Math.PI } }
}

// Tisch mit Stühlen an den Längsseiten (Tischlänge entlang X)
function conferenceTable(level, room, cx, cz, len, wid, perSide, head = false) {
  const chairs = []
  const pitch = (len - 0.6) / perSide
  for (let i = 0; i < perSide; i++) {
    const x = cx - len / 2 + 0.3 + pitch * (i + 0.5)
    chairs.push(chairAt(level, room, x, cz + wid / 2 + 0.55, 0)) // Südseite, Blick nach Norden
    chairs.push(chairAt(level, room, x, cz - wid / 2 - 0.55, Math.PI)) // Nordseite, Blick nach Süden
  }
  if (head) {
    chairs.push(chairAt(level, room, cx - len / 2 - 0.6, cz, -Math.PI / 2))
    chairs.push(chairAt(level, room, cx + len / 2 + 0.6, cz, Math.PI / 2))
  }
  return { table: { level, room, x: cx, z: cz, w: len, d: wid, y: HQ.levels[level] }, chairs }
}

export function buildFurniture() {
  deskCounter = 0
  seatCounter = 0
  const desks = []
  const tables = []
  const chairs = []
  const sofas = []
  const plants = []
  const screens = [] // Wandbildschirme
  const banners = [] // beschriftete Wandtafeln
  const racks = []
  const counters = []

  const addTable = (t) => { tables.push(t.table); chairs.push(...t.chairs) }
  // Etage 0
  addTable(conferenceTable(0, 'herkules', -14.5, -8, 8, 2.2, 5, true))
  addTable(conferenceTable(0, 'kaskade', -14.5, 2, 3.6, 1.6, 3))
  addTable(conferenceTable(0, 'oktogon', 14.5, 2, 6.4, 2, 4, true))
  addTable(conferenceTable(0, 'wilhelmshoehe', 14.5, 10, 2.4, 1.4, 2))
  // Café: kleine Tische
  for (const [x, z] of [[-18, 9], [-13, 9], [-18, 12], [-13, 12]]) {
    tables.push({ level: 0, room: 'cafe', x, z, w: 1.0, d: 1.0, y: 0, round: true })
    chairs.push(chairAt(0, 'cafe', x - 0.8, z, Math.PI / 2), chairAt(0, 'cafe', x + 0.8, z, -Math.PI / 2))
  }
  counters.push({ level: 0, x: -14.5, z: 13.2, w: 9, d: 0.8, h: 1.05, color: '#3a4256', top: '#f2e8d5' })
  counters.push({ level: 0, x: 4.5, z: -11.0, w: 3.6, d: 0.9, h: 1.05, color: '#3a4256', top: '#ff8a3d' }) // Empfangstresen
  desks.push(desk(0, 'lobby', 'Empfang', 4.5, -9.4, 0)) // Empfangsmitarbeitende stehen hinter dem Tresen und blicken zur Tür
  // Sofas
  sofas.push({ level: 0, x: -3.6, z: -11.6, ry: Math.PI / 2, w: 2.2, color: '#5b6ee1' })
  sofas.push({ level: 0, x: -5.6, z: -10.2, ry: 0, w: 1.8, color: '#e15b7a' })
  sofas.push({ level: 0, x: -20, z: 11.6, ry: 0, w: 2, color: '#c9a24a' })
  sofas.push({ level: 0, x: 20, z: 12.6, ry: Math.PI, w: 2, color: '#5b6ee1' })
  // Etage 1: Arbeitsbereiche
  const xs = [-19.5, -16.5, -13.5, -10.5]
  xs.forEach((x) => desks.push(desk(1, 'hj', 'HerkulesJobs', x, -11.5, 0)))
  xs.forEach((x) => desks.push(desk(1, 'hj', 'HerkulesJobs', x, -6.5, 0)))
  ;[[1.5, 'Infobeiträge'], [6.5, 'Nachrichtenbeiträge'], [11.5, 'Gewinnspiele']].forEach(([z, team]) => xs.forEach((x) => desks.push(desk(1, 'km', team, x, z, 0))))
  const xe = [10.5, 14.5, 18.5, 21]
  ;[-11.5, -6.5].forEach((z) => xe.slice(0, 3).forEach((x) => desks.push(desk(1, 'vertrieb', 'Vertrieb', x, z, 0))))
  ;[0.5, 3.5].forEach((z) => xe.slice(0, 3).forEach((x) => desks.push(desk(1, 'ai', 'AI Agents', x, z, 0, 2))))
  addTable(conferenceTable(1, 'loewenburg', 14.5, 10, 9, 2.4, 5, true))
  sofas.push({ level: 1, x: 0, z: -11.5, ry: 0, w: 3, color: '#5b6ee1' })
  sofas.push({ level: 1, x: -3.5, z: -8, ry: Math.PI / 2, w: 2, color: '#e15b7a' })
  sofas.push({ level: 1, x: 3.5, z: -8, ry: -Math.PI / 2, w: 2, color: '#2fd6c0' })
  // Pflanzen
  ;[[-6.4, -13], [6.4, -13], [-6.4, 13], [6.4, 13], [-21, -13], [21, -13], [21, 13], [-21, 13]].forEach(([x, z]) => {
    plants.push({ level: 0, x, z }); plants.push({ level: 1, x, z })
  })
  plants.push({ level: 1, x: -1.5, z: 0, s: 1.3 }, { level: 0, x: -1.5, z: 11.5, s: 1.3 })
  // Wandbildschirme und Tafeln
  screens.push({ level: 0, room: 'herkules', x: -21.85, z: -8, ry: Math.PI / 2, w: 4.6, h: 2.4, title: 'HERKULES', lines: ['Wochenplanung', 'Recruiting · Redaktion · Vertrieb'] })
  screens.push({ level: 0, room: 'kaskade', x: -21.85, z: 2, ry: Math.PI / 2, w: 3.2, h: 1.8, title: 'KASKADE', lines: ['Abstimmung Tagesgeschäft'] })
  screens.push({ level: 0, room: 'oktogon', x: 21.85, z: 2, ry: -Math.PI / 2, w: 3.8, h: 2.0, title: 'OKTOGON', lines: ['Kundentermin'] })
  screens.push({ level: 1, room: 'loewenburg', x: 21.85, z: 10, ry: -Math.PI / 2, w: 5.2, h: 2.6, title: 'LÖWENBURG', lines: ['Strategie und Freigaben'] })
  screens.push({ level: 0, room: 'hall0', x: 0, z: 13.85, ry: Math.PI, w: 6.4, h: 3.0, title: 'HERKULES AI HQ', lines: ['Agenten online', 'Heute: Aufgaben und Freigaben'] })
  screens.push({ level: 1, room: 'ai', x: 21.85, z: 2, ry: -Math.PI / 2, w: 3.6, h: 2.0, title: 'AI AGENTS', lines: ['Terminals und Läufe'] })
  banners.push(
    { level: 1, x: -21.88, z: -8, ry: Math.PI / 2, w: 5, h: 1.6, text: 'HERKULESJOBS', sub: 'Jobs · Berufsvideos · Recruiting', color: '#ff8a3d' },
    { level: 1, x: -21.88, z: 1.5, ry: Math.PI / 2, w: 3.6, h: 1.2, text: 'INFOBEITRÄGE', sub: 'KasselMemes', color: '#2fd6c0' },
    { level: 1, x: -21.88, z: 6.5, ry: Math.PI / 2, w: 3.6, h: 1.2, text: 'NACHRICHTEN', sub: 'KasselMemes', color: '#2fd6c0' },
    { level: 1, x: -21.88, z: 11.5, ry: Math.PI / 2, w: 3.6, h: 1.2, text: 'GEWINNSPIELE', sub: 'KasselMemes', color: '#2fd6c0' },
    { level: 1, x: 21.88, z: -8, ry: -Math.PI / 2, w: 6, h: 2.2, text: 'VERTRIEB', sub: 'Angebote · Produkte · Partner', color: '#ff8a3d' },
    { level: 0, x: 21.88, z: -8, ry: -Math.PI / 2, w: 6, h: 2.2, text: 'SHOWROOM', sub: 'Unsere Produkte', color: '#ff8a3d' },
    { level: 0, x: -21.88, z: 10, ry: Math.PI / 2, w: 5, h: 1.4, text: 'CAFÉ BERGPARK', sub: 'Pause im Grünen', color: '#c9a24a' },
    { level: 0, x: 4.5, z: -11.0, y: 3.2, ry: Math.PI, w: 4.2, h: 0.9, text: 'HERKULES AI HQ', sub: 'Empfang', color: '#ff8a3d', hanging: true },
  )
  racks.push({ level: 1, x: 21.3, z: 5, ry: -Math.PI / 2 }, { level: 1, x: 21.3, z: 3.6, ry: -Math.PI / 2 })
  return { desks, tables, chairs, sofas, plants, screens, banners: banners.filter((b) => b.w > 0), racks, counters }
}

// Türschilder (über den Türen)
export function buildSigns() {
  const s = []
  for (const w of WALLS) {
    for (const d of w.doors) {
      const rooms = ROOMS.filter((r) => r.level === w.level)
      // Raum auf der Flügelseite der Tür bestimmen
      const probe = w.ax === 'z' ? [w.c + (w.c < 0 ? -3 : 3), d] : [d, w.c + 3]
      const room = rooms.find((r) => probe[0] > r.rect[0] && probe[0] < r.rect[2] && probe[1] > r.rect[1] && probe[1] < r.rect[3])
      if (room && !['hall0', 'lobby', 'gallery1', 'lounge1'].includes(room.id)) {
        s.push({ level: w.level, ax: w.ax, c: w.c, at: d, text: room.name, accent: room.accent, facing: w.ax === 'z' ? (w.c < 0 ? 1 : -1) : 1 })
      }
    }
  }
  return s
}
