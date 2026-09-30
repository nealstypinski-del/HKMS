import { BUILDING } from './buildingConfig'
import { DOOR_W, HALF_D, HALF_W } from './constants'
import type {
  DeskDef, FloorConfig, FurnitureKind, FurniturePlacement, Rect, SeatDef, SpotDef, WallSeg, ZoneConfig, ZoneGen,
} from './types'

/** Ergebnis der Konfigurationsauswertung für ein Geschoss. Deterministisch. */
export interface GeneratedFloor {
  config: FloorConfig
  zones: ZoneGen[]
  placements: FurniturePlacement[]
  walls: WallSeg[]
  desks: DeskDef[]
  seats: SeatDef[]
  spots: SpotDef[]
  /** Startpunkt für neu gestartete Agenten (vor der Aufzugstür). */
  elevatorExit: { x: number; z: number }
  elevatorDoor: { x: number; z: number }
  /** Punkte im Aufzugsfoyer, auf denen wartende Agenten stehen. */
  lobbySpots: SpotDef[]
}

const pad = (n: number, w = 3) => String(n).padStart(w, '0')

/** Footprints in Metern (Breite x, Tiefe z) bei yaw = 0. Nur relevant für Navigation. */
export const FOOTPRINT: Partial<Record<FurnitureKind, [number, number]>> = {
  desk: [1.6, 0.9], chair: [0.55, 0.55], sofa: [2.2, 0.95], bench: [2.4, 0.6], coffeeTable: [1.0, 0.6],
  meetingTable: [3, 1.4], kitchenCounter: [3, 0.7], fridge: [0.8, 0.8], stool: [0.4, 0.4], bookshelf: [1.6, 0.4],
  plant: [0.5, 0.5], tree: [0.8, 0.8], serverRack: [0.8, 0.9], reception: [4, 1], booth: [2.2, 2.2], roundTable: [1.6, 1.6],
  bin: [0.35, 0.35], coffeeMachine: [0.5, 0.5], divider: [1.6, 0.12],
  cabinet: [1.0, 0.5], printer: [0.7, 0.5], waterCooler: [0.4, 0.4], vending: [0.9, 0.8], coatRack: [0.4, 0.4],
  floorLamp: [0.3, 0.3], planterTall: [0.6, 0.6],
}

const rot = (dx: number, dz: number, yaw: number) => ({
  x: dx * Math.cos(yaw) + dz * Math.sin(yaw),
  z: -dx * Math.sin(yaw) + dz * Math.cos(yaw),
})

export function generateFloor(config: FloorConfig): GeneratedFloor {
  const placements: FurniturePlacement[] = []
  const walls: WallSeg[] = []
  const wallKeys = new Set<string>()
  const desks: DeskDef[] = []
  const seats: SeatDef[] = []
  const spots: SpotDef[] = []
  const lobbySpots: SpotDef[] = []
  const zones: ZoneGen[] = []
  let deskCounter = 0

  const place = (zoneId: string, kind: FurnitureKind, x: number, z: number, yaw = 0, extra: Partial<FurniturePlacement> = {}) => {
    const id = `${zoneId}-${kind}-${pad(placements.length)}`
    const fp = FOOTPRINT[kind]
    placements.push({ id, kind, x, z, yaw, zoneId, blocks: !!fp, ...extra })
    return id
  }

  const addWall = (x0: number, z0: number, x1: number, z1: number, zoneId: string, doorAt?: number, kind: WallSeg['kind'] = 'glass') => {
    const key = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)].join(',')
    if (wallKeys.has(key + (doorAt !== undefined ? 'd' : ''))) return
    wallKeys.add(key + (doorAt !== undefined ? 'd' : ''))
    const horizontal = z0 === z1
    if (doorAt === undefined) { walls.push({ x0, z0, x1, z1, kind, zoneId }); return }
    const h = DOOR_W / 2
    if (horizontal) {
      walls.push({ x0, z0, x1: doorAt - h, z1, kind, zoneId })
      walls.push({ x0: doorAt + h, z0, x1, z1, kind, zoneId })
    } else {
      walls.push({ x0, z0, x1, z1: doorAt - h, kind, zoneId })
      walls.push({ x0, z0: doorAt + h, x1, z1, kind, zoneId })
    }
  }

  const zoneWalls = (zc: ZoneConfig) => {
    if (!zc.walled) return
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2
    // Türseite
    if (zc.door === 'S') addWall(x0, z1, x1, z1, zc.id, cx)
    if (zc.door === 'N') addWall(x0, z0, x1, z0, zc.id, cx)
    // Seiten, nur wo sie nicht die Außenwand sind
    if (x1 < HALF_W) addWall(x1, z0, x1, z1, zc.id)
    if (x0 > -HALF_W) addWall(x0, z0, x0, z1, zc.id)
  }

  const cornerPlants = (zc: ZoneConfig, inset = 0.6) => {
    const { x0, z0, x1, z1 } = zc.rect
    const farZ = zc.door === 'S' ? z0 + inset : z1 - inset
    place(zc.id, 'plant', x0 + inset, farZ)
    place(zc.id, 'plant', x1 - inset, farZ)
  }

  const wallScreens = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const far = zc.door === 'S' ? z0 + 0.12 : z1 - 0.12
    const yaw = zc.door === 'S' ? 0 : Math.PI
    const titles = zc.screens ?? []
    const w = (x1 - x0) / (titles.length + 1)
    titles.forEach((t, i) => {
      place(zc.id, 'wallDisplay', x0 + w * (i + 1), far, yaw, { w: Math.min(3.6, w - 0.6), h: 1.6, label: t, blocks: false })
    })
  }

  const workstations = (zc: ZoneConfig, dept: string) => {
    const { x0, z0, x1, z1 } = zc.rect
    const { cols, rows } = zc.grid!
    const margin = 1.2
    const pitchX = (x1 - x0 - 2 * margin) / cols
    const farSouth = zc.door === 'N' // Tür im Norden, Fernwand im Süden
    const dirSign = farSouth ? -1 : 1 // Stuhl liegt auf der Türseite des Tischs
    const yaw = farSouth ? Math.PI : 0
    const variant = zc.workstationVariant ?? 'ops'
    for (let r = 0; r < rows; r++) {
      const dz = farSouth ? z1 - 1.5 - r * 3.0 : z0 + 1.5 + r * 3.0
      for (let c = 0; c < cols; c++) {
        const dx = x0 + margin + pitchX * (c + 0.5)
        deskCounter++
        const n = pad(deskCounter)
        const short = dept.replace('dept-', '')
        const deskId = `desk-${short}-${n}`
        const computerId = `computer-${short}-${n}`
        place(zc.id, 'desk', dx, dz, yaw, { id: deskId, color: variant, blocks: true })
        place(zc.id, 'computer', dx, dz, yaw, { id: computerId, blocks: false, color: variant })
        const chairZ = dz + dirSign * 0.95
        place(zc.id, 'chair', dx, chairZ, yaw, { blocks: true, color: variant })
        const seat = { x: dx, z: chairZ }
        const approach = { x: dx, z: chairZ + dirSign * 0.95 }
        desks.push({
          id: deskId, computerId, zoneId: zc.id, departmentId: dept, floorId: config.id, variant,
          seat, yaw: yaw + Math.PI, approach, pos: { x: dx, z: dz },
        })
      }
    }
    // Deko: Pflanzen, Papierkörbe, Trennwand-Regale an den Seitenrändern
    cornerPlants(zc)
    place(zc.id, 'bin', x0 + 0.5, farSouth ? z0 + 0.5 : z1 - 0.5)
    wallScreens(zc)
    // Ausstattung: Aktenschränke an der Westwand, Drucker und Wasserspender an der Ostwand, Garderobe an der Tür
    const step = farSouth ? -1 : 1
    const farWall = farSouth ? z1 : z0
    place(zc.id, 'cabinet', x0 + 0.32, farWall + step * 1.7, Math.PI / 2)
    place(zc.id, 'cabinet', x0 + 0.32, farWall + step * 2.85, Math.PI / 2)
    place(zc.id, 'printer', x1 - 0.32, farWall + step * 2.2, -Math.PI / 2)
    place(zc.id, 'waterCooler', x1 - 0.4, farWall + step * 5.6, -Math.PI / 2)
    place(zc.id, 'coatRack', x0 + 0.55, (farSouth ? z0 : z1) + (farSouth ? 0.7 : -0.7))
    place(zc.id, 'wallClock', x0 + 1.4, farWall + step * -0.06, farSouth ? Math.PI : 0, { blocks: false })
    // Große Abteilungstafel oben an der Fernwand, deutsch beschriftet
    const farZ = zc.door === 'S' ? z0 + 0.1 : z1 - 0.1
    place(zc.id, 'bigScreen', (x0 + x1) / 2, farZ, zc.door === 'S' ? 0 : Math.PI, { w: Math.min(11, x1 - x0 - 3), h: 1.05, y: 3.95, label: zc.title.toUpperCase(), blocks: false })
  }

  const desksAsCreative = (zc: ZoneConfig, dept: string) => workstations(zc, dept)

  const sofaSeat = (zoneId: string, x: number, z: number, yaw: number) => {
    const id = place(zoneId, 'sofa', x, z, yaw)
    const f = rot(0, 1.35, yaw)
    seats.push({ id, kind: 'sofa', zoneId, seat: { x, z }, yaw, approach: { x: x + f.x, z: z + f.z } })
  }
  const benchSeat = (zoneId: string, x: number, z: number, yaw: number, n = 3) => {
    const bid = place(zoneId, 'bench', x, z, yaw, { w: n * 0.8 })
    for (let i = 0; i < n; i++) {
      const off = rot((i - (n - 1) / 2) * 0.8, 0, yaw)
      const f = rot(0, 1.1, yaw)
      seats.push({
        id: `${bid}-s${i}`, kind: 'bench', zoneId, seat: { x: x + off.x, z: z + off.z }, yaw,
        approach: { x: x + off.x + f.x, z: z + off.z + f.z },
      })
    }
  }
  const stoolSeat = (zoneId: string, x: number, z: number, yaw: number) => {
    const id = place(zoneId, 'stool', x, z, yaw)
    const f = rot(0, -0.9, yaw) // Zugang von hinten, die Figur blickt zum Tisch
    seats.push({ id, kind: 'stool', zoneId, seat: { x, z }, yaw, approach: { x: x + f.x, z: z + f.z } })
  }

  const lounge = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    const w = x1 - x0, d = z1 - z0
    if (zc.walled) {
      // Große Lounge
      const rowsZ = zc.door === 'S' ? [z0 + 1.6, z0 + 5.2] : [z1 - 1.6, z1 - 5.2]
      const yaw = zc.door === 'S' ? 0 : Math.PI
      const sgn = zc.door === 'S' ? 1 : -1
      for (const rz of rowsZ) {
        for (let i = 0; i < 3; i++) sofaSeat(zc.id, x0 + 3 + i * (w - 6) / 2, rz, yaw)
        place(zc.id, 'coffeeTable', cx, rz + sgn * 2.4, 0)
      }
      place(zc.id, 'bookshelf', x0 + 1, cz, Math.PI / 2)
      cornerPlants(zc)
      place(zc.id, 'tree', x1 - 1, cz)
      for (const rz of rowsZ) {
        place(zc.id, 'rug', cx, rz + sgn * 1.2, 0, { w: w - 3.5, d: 3.2, color: '#8a4f4a', blocks: false })
        place(zc.id, 'floorLamp', x0 + 1.3, rz - sgn * 0.2)
        place(zc.id, 'floorLamp', x1 - 1.6, rz - sgn * 0.2)
      }
    } else {
      // Nische am Korridorende: Sofas zur Außenwand, Blick zum Korridor
      const west = x0 <= -HALF_W + 0.1
      const yawIn = west ? Math.PI / 2 : -Math.PI / 2
      const wallX = west ? x0 + 0.7 : x1 - 0.7
      sofaSeat(zc.id, wallX, cz - 1.6, yawIn)
      sofaSeat(zc.id, wallX, cz + 1.6, yawIn)
      place(zc.id, 'coffeeTable', wallX + (west ? 2.9 : -2.9), cz, Math.PI / 2)
      place(zc.id, 'plant', wallX + (west ? 2.9 : -2.9), z0 + 0.5)
      place(zc.id, 'plant', wallX + (west ? 2.9 : -2.9), z1 - 0.5)
      place(zc.id, 'rug', wallX + (west ? 1.6 : -1.6), cz, Math.PI / 2, { w: 3.6, d: 3.0, color: '#4a5a72', blocks: false })
      place(zc.id, 'floorLamp', wallX - (west ? -0.2 : 0.2), cz)
    }
    void d
  }

  const kitchen = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    if (zc.walled) {
      const far = zc.door === 'S' ? z0 + 0.6 : z1 - 0.6
      const yaw = zc.door === 'S' ? 0 : Math.PI
      place(zc.id, 'kitchenCounter', x0 + 3, far, yaw, { w: 4.4 })
      place(zc.id, 'coffeeMachine', x0 + 2, far, yaw, { blocks: false })
      place(zc.id, 'fridge', x0 + 6.2, far, yaw)
      const sg = zc.door === 'S' ? 1 : -1
      for (let i = 0; i < 5; i++) stoolSeat(zc.id, x0 + 1.6 + i * 1.0, far + sg * 1.5, yaw + Math.PI)
      for (let t = 0; t < 2; t++) {
        const tx = cx + 2 + t * 4.2, tz = cz + (zc.door === 'S' ? 1.6 : -1.6)
        place(zc.id, 'roundTable', tx, tz, 0)
        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2
          stoolSeat(zc.id, tx + Math.cos(a) * 1.25, tz + Math.sin(a) * 1.25, Math.atan2(-Math.cos(a), -Math.sin(a)))
        }
      }
      place(zc.id, 'vending', x1 - 1.8, far - sg * 0.15, yaw)
      place(zc.id, 'waterCooler', x1 - 3.2, far - sg * 0.1, yaw)
      for (let t = 0; t < 2; t++) place(zc.id, 'pendant', cx + 2 + t * 4.2, cz + sg * 1.6, 0, { blocks: false, color: '#c9564a' })
      place(zc.id, 'rug', cx + 4, cz + sg * 1.6, 0, { w: 9.4, d: 4.2, color: '#5a6a80', blocks: false })
      for (let i = 0; i < 3; i++) spots.push({ id: `${zc.id}-spot-${i}`, zoneId: zc.id, kind: 'kitchen', pos: { x: x0 + 3 + i * 1.3, z: far + sg * 2.9 }, yaw: zc.door === 'S' ? 0 : Math.PI })
      cornerPlants(zc)
      place(zc.id, 'bin', x1 - 0.5, far)
    } else {
      const west = x0 <= -HALF_W + 0.1
      const wallX = west ? x0 + 0.6 : x1 - 0.6
      place(zc.id, 'kitchenCounter', wallX, cz, Math.PI / 2, { w: 3.2 })
      place(zc.id, 'coffeeMachine', wallX, cz - 0.9, Math.PI / 2, { blocks: false })
      for (let i = 0; i < 2; i++) stoolSeat(zc.id, wallX + (west ? 1.5 : -1.5), cz - 0.9 + i * 1.8, west ? -Math.PI / 2 : Math.PI / 2)
      spots.push({ id: `${zc.id}-spot-0`, zoneId: zc.id, kind: 'kitchen', pos: { x: wallX + (west ? 2.6 : -2.6), z: cz + 1.0 }, yaw: west ? -Math.PI / 2 : Math.PI / 2 })
      spots.push({ id: `${zc.id}-spot-1`, zoneId: zc.id, kind: 'kitchen', pos: { x: wallX + (west ? 2.6 : -2.6), z: cz - 1.5 }, yaw: west ? -Math.PI / 2 : Math.PI / 2 })
    }
  }

  const meeting = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    const w = Math.min(9, x1 - x0 - 5)
    place(zc.id, 'meetingTable', cx, cz, 0, { w, d: 2.0 })
    const n = Math.floor(w / 1.3)
    for (let i = 0; i < n; i++) {
      const px = cx - w / 2 + 0.65 + i * (w - 1.3) / Math.max(1, n - 1)
      // Nordreihe blickt nach Süden zum Tisch (Stuhlrücken im Norden), Südreihe umgekehrt.
      const north = place(zc.id, 'chair', px, cz - 1.5, Math.PI, { blocks: true, color: 'ops' })
      const south = place(zc.id, 'chair', px, cz + 1.5, 0, { blocks: true, color: 'ops' })
      seats.push({ id: north, kind: 'chair', zoneId: zc.id, seat: { x: px, z: cz - 1.5 }, yaw: 0, approach: { x: px, z: cz - 2.45 } })
      seats.push({ id: south, kind: 'chair', zoneId: zc.id, seat: { x: px, z: cz + 1.5 }, yaw: Math.PI, approach: { x: px, z: cz + 2.45 } })
    }
    place(zc.id, 'whiteboard', x0 + 0.15, cz, Math.PI / 2, { blocks: false })
    place(zc.id, 'rug', cx, cz, 0, { w: w + 1.6, d: 4.6, color: '#3b4a63', blocks: false })
    for (let i = -1; i <= 1; i++) place(zc.id, 'pendant', cx + i * (w / 3), cz, 0, { blocks: false, color: '#e8a33d' })
    place(zc.id, 'waterCooler', x1 - 0.5, zc.door === 'S' ? z1 - 0.6 : z0 + 0.6, 0)
    place(zc.id, 'cabinet', x1 - 0.32, cz - 3.2, -Math.PI / 2)
    place(zc.id, 'wallClock', x1 - 1.6, zc.door === 'S' ? z0 + 0.06 : z1 - 0.06, zc.door === 'S' ? 0 : Math.PI, { blocks: false })
    wallScreens(zc)
    cornerPlants(zc)
    const sp = zc.door === 'S' ? z1 - 1.4 : z0 + 1.4
    for (let i = 0; i < 3; i++) spots.push({ id: `${zc.id}-spot-${i}`, zoneId: zc.id, kind: 'meeting', pos: { x: cx - 2 + i * 2, z: sp }, yaw: zc.door === 'S' ? Math.PI : 0 })
  }

  const bench = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const w = x1 - x0
    // Benches in Reihen, alle Blick Richtung Fernwand, damit die Tür frei bleibt
    const yaw = zc.door === 'N' ? Math.PI : 0
    const rowsN = 3
    for (let r = 0; r < rowsN; r++) {
      const z = zc.door === 'N' ? z1 - 1.6 - r * 3.4 : z0 + 1.6 + r * 3.4
      const cols = Math.floor((w - 2) / 3.2)
      for (let c = 0; c < cols; c++) benchSeat(zc.id, x0 + 1.8 + c * 3.2 + 0.4, z, yaw, 3)
    }
    place(zc.id, 'vending', x1 - 1.0, z1 - 0.5, Math.PI)
    place(zc.id, 'waterCooler', x1 - 2.2, z1 - 0.4, Math.PI)
    wallScreens(zc)
    cornerPlants(zc)
  }

  const lobby = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2
    place(zc.id, 'reception', cx, z1 - 3.4, Math.PI, { w: 4.6, label: 'HERKULES AI HQ' })
    sofaSeat(zc.id, x0 + 2, z1 - 1.2, Math.PI)
    sofaSeat(zc.id, x1 - 2, z1 - 1.2, Math.PI)
    place(zc.id, 'tree', x0 + 0.8, z0 + 1.4)
    place(zc.id, 'tree', x1 - 0.8, z0 + 1.4)
    place(zc.id, 'rug', cx, z1 - 6.6, 0, { w: 6, d: 2.8, color: '#3b4a63', blocks: false })
    place(zc.id, 'planterTall', cx - 3.2, z1 - 6.6)
    place(zc.id, 'planterTall', cx + 3.2, z1 - 6.6)
    place(zc.id, 'floorLamp', x0 + 0.8, z1 - 3.0)
    place(zc.id, 'floorLamp', x1 - 0.8, z1 - 3.0)
    place(zc.id, 'coffeeTable', x0 + 2, z1 - 4.4, 0)
    place(zc.id, 'coffeeTable', x1 - 2, z1 - 4.4, 0)
  }

  const booths = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cols = Math.floor((x1 - x0) / 3.3)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = x0 + 1.9 + c * 3.3 - (r ? 0 : 0), bz = zc.door === 'N' ? z1 - 2.0 - r * 4.4 : z0 + 2.0 + r * 4.4
        place(zc.id, 'booth', bx, bz, zc.door === 'N' ? Math.PI : 0)
      }
    }
    cornerPlants(zc)
  }

  const ceo = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2
    place(zc.id, 'desk', cx, z0 + 2.4, 0, { w: 2.6, color: 'ops' })
    place(zc.id, 'computer', cx - 0.4, z0 + 2.4, 0, { color: 'ops', blocks: false })
    place(zc.id, 'chair', cx, z0 + 3.4, 0, { color: 'ops', blocks: true })
    place(zc.id, 'meetingTable', cx, z1 - 3.4, 0, { w: 5, d: 1.6 })
    place(zc.id, 'sofa', x0 + 2.6, z1 - 1.3, Math.PI)
    place(zc.id, 'bookshelf', x0 + 0.5, z0 + 3, Math.PI / 2)
    place(zc.id, 'bookshelf', x1 - 0.5, z0 + 3, -Math.PI / 2)
    place(zc.id, 'bigScreen', cx, z0 + 0.14, 0, { w: 6, h: 2.2, label: 'UNTERNEHMENSÜBERSICHT', blocks: false })
    place(zc.id, 'rug', cx, z0 + 3.2, 0, { w: 6.4, d: 3.6, color: '#5a3f46', blocks: false })
    place(zc.id, 'floorLamp', x0 + 1.4, z1 - 1.2)
    place(zc.id, 'cabinet', x1 - 0.32, z1 - 3.6, -Math.PI / 2)
    cornerPlants(zc)
    for (let i = 0; i < 3; i++) spots.push({ id: `${zc.id}-spot-${i}`, zoneId: zc.id, kind: 'meeting', pos: { x: cx - 3 + i * 3, z: z1 - 1.4 }, yaw: Math.PI })
  }

  const strategy = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    place(zc.id, 'roundTable', cx, cz, 0)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      place(zc.id, 'chair', cx + Math.cos(a) * 1.7, cz + Math.sin(a) * 1.7, -a + Math.PI / 2, { blocks: true, color: 'ops' })
    }
    place(zc.id, 'whiteboard', x0 + 0.15, cz - 2.5, Math.PI / 2, { blocks: false })
    place(zc.id, 'whiteboard', x0 + 0.15, cz + 2.5, Math.PI / 2, { blocks: false })
    place(zc.id, 'rug', cx, cz, 0, { w: 5.6, d: 5.6, color: '#3b4a63', blocks: false })
    place(zc.id, 'pendant', cx, cz, 0, { blocks: false, color: '#8b7bd8' })
    place(zc.id, 'cabinet', x1 - 0.32, cz, -Math.PI / 2)
    wallScreens(zc)
    cornerPlants(zc)
    for (let i = 0; i < 3; i++) spots.push({ id: `${zc.id}-spot-${i}`, zoneId: zc.id, kind: 'meeting', pos: { x: cx - 2 + i * 2, z: z0 + 2 }, yaw: 0 })
  }

  const servers = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cz = (z0 + z1) / 2
    for (let i = 0; i < 4; i++) place(zc.id, 'serverRack', x1 - 0.7, z0 + 0.8 + i * 1.5, -Math.PI / 2, { color: i % 2 ? 'a' : 'b' })
    place(zc.id, 'plant', x0 + 0.6, cz)
  }

  const display = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    place(zc.id, 'bigScreen', x0 + 0.15, (z0 + z1) / 2, Math.PI / 2, { w: 5.2, h: 2.4, label: zc.screens?.[0] ?? 'ÜBERSICHT', blocks: false })
    place(zc.id, 'plant', x0 + 1, z0 + 0.5)
    place(zc.id, 'plant', x0 + 1, z1 - 0.5)
  }

  const elevatorCore = (zc: ZoneConfig) => {
    const { x0, x1, z1 } = zc.rect
    // Aufzugstüren an der Südwand der Kernzelle
    place(zc.id, 'wallDisplay', (x0 + x1) / 2, z1 - 0.12, Math.PI, { w: 1.4, h: 0.5, label: config.short, blocks: false })
    // Bilder links und rechts der Aufzugstüren (zur Foyerseite gewandt)
    place(zc.id, 'painting', x0 + 0.85, z1 + 0.12, 0, { w: 1.0, h: 0.8, blocks: false })
    place(zc.id, 'painting', x1 - 0.85, z1 + 0.12, 0, { w: 1.0, h: 0.8, blocks: false })
    place(zc.id, 'wallClock', (x0 + x1) / 2, z1 + 0.1, 0, { blocks: false })
  }

  const elevatorLobby = (zc: ZoneConfig) => {
    const { x0, z0, x1, z1 } = zc.rect
    const cx = (x0 + x1) / 2
    // Zwei Bänke an der Kernwand, Blick nach Süden
    benchSeat(zc.id, cx - 1.6, z0 + 0.55, 0, 2)
    benchSeat(zc.id, cx + 1.6, z0 + 0.55, 0, 2)
    place(zc.id, 'plant', x0 + 0.5, z1 - 0.5)
    place(zc.id, 'plant', x1 - 0.5, z1 - 0.5)
    let k = 0
    for (let zi = 0; zi < 3; zi++) for (let xi = 0; xi < 5; xi++) {
      lobbySpots.push({ id: `${zc.id}-wait-${k++}`, zoneId: zc.id, kind: 'waiting', pos: { x: cx - 2.0 + xi * 1.0, z: z0 + 2.6 + zi * 1.3 }, yaw: 0 })
    }
  }

  for (const dept of config.departments) {
    for (const zc of dept.zones) {
      zones.push({ config: zc, departmentId: dept.id, accent: dept.accent })
      zoneWalls(zc)
      switch (zc.type) {
        case 'workstations': workstations(zc, dept.id); break
        case 'creative': desksAsCreative(zc, dept.id); break
        case 'lounge': lounge(zc); break
        case 'kitchen': kitchen(zc); break
        case 'meeting': meeting(zc); break
        case 'bench': bench(zc); break
        case 'lobby': lobby(zc); break
        case 'booths': booths(zc); break
        case 'ceo': ceo(zc); break
        case 'strategy': strategy(zc); break
        case 'servers': servers(zc); break
        case 'display': display(zc); break
        case 'core': elevatorCore(zc); break
        case 'elevatorLobby': elevatorLobby(zc); break
      }
    }
  }

  const core = zones.find((z) => z.config.type === 'core')!.config.rect
  const ex = (core.x0 + core.x1) / 2
  return {
    config, zones, placements, walls, desks, seats, spots, lobbySpots,
    elevatorDoor: { x: ex, z: core.z1 },
    elevatorExit: { x: ex, z: core.z1 + 1.2 },
  }
}

const cache = new Map<string, GeneratedFloor>()
export function getFloor(id: string): GeneratedFloor {
  let g = cache.get(id)
  if (!g) {
    const cfg = BUILDING.floors.find((f) => f.id === id)
    if (!cfg) throw new Error(`Unbekanntes Geschoss ${id}`)
    g = generateFloor(cfg)
    cache.set(id, g)
  }
  return g
}
export const allFloors = () => BUILDING.floors.map((f) => getFloor(f.id))

export function rectContains(r: Rect, x: number, z: number) {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
}
export { HALF_D }
