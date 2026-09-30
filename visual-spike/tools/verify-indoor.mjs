// Prüfung der Innenwelt ohne Grafik (node tools/verify-indoor.mjs): Treppe, Rolltreppen, Türen, Wände, Erreichbarkeit. Exitcode 1 bei Fehlern.
import { HQ, STAIRS, ESC, ESCALATORS, ROOMS, WALLS, VOIDS, buildFurniture, wallSegments } from '../src/world/indoor/config/hq.layout.js'
import { walkY, conveyorAt, buildIndoorColliders, stairY } from '../src/world/indoor/nav/indoorWalk.js'
import { DESK_ANCHORS, MEETING_ANCHORS } from '../src/world/indoor/nav/indoorAnchors.js'
import { resolveCollisions, setIndoorColliders } from '../src/world/outdoor/camera/collision.js'
import { findPathTo } from '../src/world/outdoor/routes/OutdoorRouteSystem.js'
import { ESCALATOR_SPEED } from '../src/world/outdoor/routes/OutdoorRouteSystem.js'

setIndoorColliders(buildIndoorColliders())
let fails = 0
const out = []
const check = (name, ok, detail) => { out.push(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${detail}`); if (!ok) fails++ }
const f = (n, d = 2) => Number(n).toFixed(d)

// ---- Maße
const angleStairs = Math.atan2(STAIRS.riser, STAIRS.tread) * 180 / Math.PI
check('Treppe Stufenzahl', STAIRS.count * STAIRS.riser - STAIRS.rise < 1e-9, `${STAIRS.count} Stufen für ${STAIRS.rise} m Höhe`)
check('Treppe Steigung (max. 0,19 m)', STAIRS.riser <= 0.19, `${f(STAIRS.riser, 4)} m`)
check('Treppe Auftritt (min. 0,26 m)', STAIRS.tread >= 0.26, `${f(STAIRS.tread, 3)} m`)
check('Treppe Schrittmaßregel 2s+a (0,59 bis 0,65 m)', 2 * STAIRS.riser + STAIRS.tread > 0.59 && 2 * STAIRS.riser + STAIRS.tread < 0.65, `${f(2 * STAIRS.riser + STAIRS.tread, 3)} m, Neigung ${f(angleStairs, 1)} Grad, Breite ${STAIRS.width} m`)
check('Rolltreppe Neigung', Math.abs(ESC.angle * 180 / Math.PI - 30) < 1e-9, `30 Grad, Länge ${f(ESC.length, 2)} m, Horizontallauf ${f(ESC.run, 3)} m, Höhe ${HQ.floorH} m`)
check('Rolltreppe Geschwindigkeit', ESC.speed === 0.5, `${ESC.speed} m/s, Fahrzeit ${f(ESC.length / ESC.speed, 1)} s`)
const doors = WALLS.flatMap((w) => w.doors.map((d) => ({ w: w.doorW, level: w.level })))
check('Türbreiten (min. 0,90 m)', doors.every((d) => d.w >= 0.9), `${doors.length} Türen, schmalste ${Math.min(...doors.map((d) => d.w))} m, breiteste ${Math.max(...doors.map((d) => d.w))} m`)
const conf = ROOMS.filter((r) => /Konferenz|Meeting/.test(r.name))
const furn = buildFurniture()
out.push(`INFO Räume: ${ROOMS.length} (Etage 0: ${ROOMS.filter((r) => r.level === 0).length}, Etage 1: ${ROOMS.filter((r) => r.level === 1).length}), Konferenz und Meetingräume: ${conf.length} (${conf.map((r) => r.name).join(', ')})`)
out.push(`INFO Ausstattung: ${furn.desks.length} Arbeitsplätze, ${furn.chairs.length} Stühle, ${furn.tables.length} Tische, ${furn.sofas.length} Sofas, ${furn.plants.length} Pflanzen, ${furn.screens.length} Wandbildschirme, ${furn.banners.length} Bereichstafeln`)
out.push(`INFO Wandsegmente: ${WALLS.reduce((a, w) => a + wallSegments(w).length, 0)}, Deckenöffnungen: ${VOIDS.length}`)

// ---- Begehbarkeit (dieselbe Logik wie der Spielerregler: Kollision, Bodenhöhe, Rolltreppenband)
function makePlayer(x, z, y = 0) { return { x, z, surf: y } }
function step(p, dx, dz, speed, dt) {
  const l = Math.hypot(dx, dz) || 1
  p.x += (dx / l) * speed * dt; p.z += (dz / l) * speed * dt
  const belt = conveyorAt(p.x, p.z, p.surf)
  if (belt) p.z += belt.dz * dt
  resolveCollisions(p, 0.4, p.surf)
  const ny = walkY(p.x, p.z, p.surf)
  const d = Math.abs(ny - p.surf)
  p.maxJump = Math.max(p.maxJump || 0, d)
  p.surf = ny
}
function goTo(p, tx, tz, speed = 4.6, maxT = 60) {
  const dt = 0.02; let t = 0
  while (Math.hypot(tx - p.x, tz - p.z) > 0.15 && t < maxT) { step(p, tx - p.x, tz - p.z, speed, dt); t += dt }
  return t
}

// Von außen durch die Tür in die Lobby
let p = makePlayer(0, -20)
let t = goTo(p, 0, -8)
check('Eingang: von außen in die Lobby', Math.hypot(p.x, p.z + 8) < 0.3, `${f(t, 1)} s, Endpunkt (${f(p.x)}, ${f(p.z)}), Höhe ${f(p.surf)} m`)

// Treppe hinauf
p = makePlayer(-5, -8)
t = goTo(p, -5, -6.2)
p.maxJump = 0
const t1 = goTo(p, -5, 2.4)
const t2 = goTo(p, -5, 4.5)
check('Treppe: F0 bis F1 begehbar', Math.abs(p.surf - 4.5) < 1e-6 && p.z > 2.8, `${f(t1 + t2, 1)} s bei 4,6 m/s, Endhöhe ${f(p.surf, 3)} m, größter Höhensprung pro 0,02 s Schritt ${f(p.maxJump, 3)} m`)
// Treppe hinab
p.maxJump = 0
const t3 = goTo(p, -5, -6.2)
check('Treppe: F1 bis F0 begehbar', Math.abs(p.surf) < 1e-6, `${f(t3, 1)} s, Endhöhe ${f(p.surf, 3)} m, größter Höhensprung ${f(p.maxJump, 3)} m`)
// seitlich in die Treppe: gesperrt
p = makePlayer(-8, 0)
goTo(p, -4.6, 0, 4.6, 6)
check('Treppe: Seiteneinstieg gesperrt', p.x < -6.1 || p.surf === 0 && p.x < -6.0, `Spieler bleibt bei x=${f(p.x)} (Stufenkörper bei x=-6,0 bis -4,0)`)

// Rolltreppe aufwärts: am Fuß stehen bleiben und fahren lassen
for (const e of ESCALATORS) {
  const up = e.dir > 0
  p = makePlayer(e.x, up ? -6.2 : 4.0, up ? 0 : 4.5)
  goTo(p, e.x, up ? ESC.z0 + 0.3 : ESC.z1 - 0.3, 3, 10)
  const startZ = p.z; const startY = p.surf
  let ride = 0; const dt = 0.02
  let maxJump = 0; let last = p.surf
  while (ride < 60) {
    // stehen bleiben (keine Eingabe): nur das Band wirkt
    const belt = conveyorAt(p.x, p.z, p.surf)
    if (!belt) break
    p.z += belt.dz * dt
    resolveCollisions(p, 0.4, p.surf)
    p.surf = walkY(p.x, p.z, p.surf)
    maxJump = Math.max(maxJump, Math.abs(p.surf - last)); last = p.surf
    ride += dt
  }
  const expect = (ESC.z1 - ESC.z0) / (ESC.speed * Math.cos(ESC.angle))
  check(`Rolltreppe ${e.id === 'up' ? 'aufwärts' : 'abwärts'} (Etage ${up ? '0 nach 1' : '1 nach 0'})`, Math.abs(ride - expect) < 1.0 && Math.abs(p.surf - (up ? 4.5 : 0)) < 0.05, `Fahrzeit ${f(ride, 1)} s (Soll ${f(expect, 1)} s), Start z=${f(startZ)} y=${f(startY)}, Ende z=${f(p.z)} y=${f(p.surf, 2)}, größter Höhensprung ${f(maxJump, 3)} m`)
}

// Öffnungen auf Etage 1: nicht hineinfallen
p = makePlayer(-5, -7, 4.5)
goTo(p, -5, -3, 4.6, 5)
check('Öffnung Etage 1 gesichert (Treppenhaus)', p.surf === 4.5 && p.z < -5.3, `Spieler bleibt bei z=${f(p.z)} auf Höhe ${f(p.surf)} m`)
p = makePlayer(1.7, -7, 4.5)
goTo(p, 1.7, -2, 4.6, 5)
check('Öffnung Etage 1 gesichert (Rolltreppen)', p.surf === 4.5 && p.z < -5.3, `Spieler bleibt bei z=${f(p.z)} auf Höhe ${f(p.surf)} m`)

// Türen: jede Tür ist durchgehbar, Wände sperren
let ok = 0; const bad = []
for (const w of WALLS) for (const d of w.doors) {
  const y = HQ.levels[w.level]
  const a = w.ax === 'z' ? [w.c - 1.5, d] : [d, w.c - 1.5]
  const b = w.ax === 'z' ? [w.c + 1.5, d] : [d, w.c + 1.5]
  const q = makePlayer(a[0], a[1], y)
  goTo(q, b[0], b[1], 3, 6)
  if (Math.hypot(q.x - b[0], q.z - b[1]) < 0.3) ok++; else bad.push(`${w.level}:${w.ax}${w.c}@${d}`)
}
check('Alle Türen durchgehbar', bad.length === 0, `${ok}/${doors.length}${bad.length ? ' Fehler: ' + bad.join(', ') : ''}`)
let blocked = 0; let total = 0
for (const w of WALLS) for (const [a, b] of wallSegments(w)) {
  total++
  const m = (a + b) / 2; const y = HQ.levels[w.level]
  const from = w.ax === 'z' ? [w.c - 1.2, m] : [m, w.c - 1.2]
  const to = w.ax === 'z' ? [w.c + 1.2, m] : [m, w.c + 1.2]
  const q = makePlayer(from[0], from[1], y)
  goTo(q, to[0], to[1], 3, 3)
  if (Math.hypot(q.x - to[0], q.z - to[1]) > 0.4) blocked++
}
check('Wandsegmente sperren', blocked === total, `${blocked}/${total}`)

// ---- Erreichbarkeit im Wegegraph für Agenten (von der Plaza in jeden Raum)
const anchors = [...DESK_ANCHORS, ...MEETING_ANCHORS]
const lens = []; let unreachable = 0
for (const a of anchors) {
  const path = findPathTo(0, -60, a.node, 0)
  const last = path.pts[path.pts.length - 1]
  if (last.id !== a.node) { unreachable++; continue }
  lens.push(path.length + Math.hypot(a.x - last.x, a.z - last.z))
}
lens.sort((x, y) => x - y)
check('Agenten erreichen jeden Platz von der Plaza', unreachable === 0, `${anchors.length - unreachable}/${anchors.length} (${DESK_ANCHORS.length} Arbeitsplätze, ${MEETING_ANCHORS.length} Konferenzstühle), Weg kürzester ${f(lens[0], 0)} m, Median ${f(lens[Math.floor(lens.length / 2)], 0)} m, längster ${f(lens[lens.length - 1], 0)} m`)
out.push(`INFO Fußweg Plaza bis zum entferntesten Platz bei 1,84 m/s: ${f(lens[lens.length - 1] / 1.84, 0)} s (Rolltreppe mit ${ESCALATOR_SPEED} m/s)`)

console.log(out.join('\n'))
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden')
process.exit(fails ? 1 : 0)
