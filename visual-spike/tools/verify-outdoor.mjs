// Reproduzierbare Prüfung der Außenwelt ohne Grafik (node tools/verify-outdoor.mjs). Gibt exakte Zahlen aus, Exitcode 1 bei Fehlern.
import { MONUMENT, REF, CASCADE, POOL } from '../src/world/outdoor/config/bergpark.config.js'
import { NODES } from '../src/world/outdoor/routes/routeNodes.js'
import { heightAt, cascadeElevationAtV } from '../src/world/outdoor/terrain/heightField.js'
import { treadLength, waterStepCount, segments } from '../src/world/outdoor/cascades/cascadeLayout.js'
import { buildSegmentData } from '../src/world/outdoor/cascades/CascadeSegment.js'
import { routes, findPathTo, samplePolyline } from '../src/world/outdoor/routes/OutdoorRouteSystem.js'
import { ANCHORS, getAnchor } from '../src/world/outdoor/activities/OutdoorActivityAnchors.js'
import { resolveCollisions } from '../src/world/outdoor/camera/collision.js'
import { createAgent, assignIntent, interrupt, stepAgent } from '../src/world/outdoor/agents/outdoorAgentSim.js'
import { worldZones } from '../src/world/outdoor/streaming/WorldZoneManager.js'
import { triggerCompletionPulse, stepCompletionPulses, pulseState } from '../src/world/outdoor/water/CompletionPulse.js'

let fails = 0
const out = []
const check = (name, ok, detail) => { out.push(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${detail}`); if (!ok) fails++ }

// 1. Maße
const tiers = MONUMENT.tiers.reduce((a, t) => a + t.h, 0)
const total = MONUMENT.octagonH + 0.5 - 0.5 + tiers + MONUMENT.pedestalH + MONUMENT.figureH
check('Monument Gesamthöhe', Math.abs(total - REF.monumentHeight) < 0.01, `${total.toFixed(2)} m (Referenz ${REF.monumentHeight} m)`)
check('Figurenhöhe', MONUMENT.figureH === REF.figureHeight, `${MONUMENT.figureH} m`)
check('Kaskadenlänge', CASCADE.length === REF.cascadeLength, `${CASCADE.length} m`)
check('Kaskadenbreite (Becken)', CASCADE.basinHalf * 2 === REF.cascadeWidth, `${CASCADE.basinHalf * 2} m`)

// 2. Treppen und Wasserstufen
let stairs = 0, bed = 0, kerbs = 0, posts = 0
for (const s of segments) { const d = buildSegmentData(s); stairs += d.stairs.length; bed += d.bed.length; kerbs += d.kerbs.length; posts += d.railPosts.length }
check('Treppenstufen gesamt (2 Seiten)', stairs === REF.stepsPerSide * 2, `${stairs} (2 x ${REF.stepsPerSide})`)
check('Wasserstufen', bed === waterStepCount, `${bed} Stufen, je ${(CASCADE.drop / waterStepCount).toFixed(3)} m Fall`)
check('Segmente', segments.length === CASCADE.segmentCount, `${segments.length}`)
console.log(`Stufenhöhe ${(treadLength * CASCADE.drop / CASCADE.length).toFixed(4)} m, Trittfläche ${treadLength.toFixed(4)} m, Kaskadenkanten ${kerbs}, Geländerpfosten ${posts}`)

// 3. Navigationsfläche gegen sichtbare Stufen: maximale Abweichung
let maxDev = 0
for (let k = 0; k < REF.stepsPerSide; k++) {
  const v = (k + 0.5) * treadLength
  const visual = cascadeElevationAtV(v) + 0.09
  const nav = heightAt(-9.5, CASCADE.zTop + v) + 0.09
  maxDev = Math.max(maxDev, Math.abs(visual - nav))
}
check('Treppe: Navigationsfläche gleich Sichtfläche', maxDev < 0.01, `größte Abweichung ${maxDev.toFixed(5)} m`)
let maxSlope = 0
for (let z = -140; z > -330; z -= 1) maxSlope = Math.max(maxSlope, Math.abs(heightAt(-9.5, z) - heightAt(-9.5, z - 1)))
check('Kaskadenneigung', maxSlope < 0.35, `${(maxSlope * 100).toFixed(1)} % (${(Math.atan(maxSlope) * 180 / Math.PI).toFixed(1)} Grad)`)

// 4. Routen
for (const r of Object.values(routes)) {
  const stairsLen = r.segs.filter((s) => s.surface === 'stairs').reduce((a, s) => a + s.len, 0)
  out.push(`INFO Route ${r.id}: ${r.nodes.length} Knoten, ${r.length.toFixed(1)} m, davon Treppe ${stairsLen.toFixed(1)} m`)
}
const need = ['cascade-run-start', 'cascade-run-checkpoint-01', 'cascade-run-checkpoint-02', 'cascade-run-top', 'forest-run-start', 'forest-run-checkpoint', 'stretching-area', 'bench-rest-01', 'water-rest-area', 'bench-cascade-01', 'bench-forest-01', 'bench-herkules-01', 'anchor-coffee-outdoor-01']
check('Pflichtanker vorhanden', need.every((id) => getAnchor(id)), `${need.filter((id) => getAnchor(id)).length}/${need.length}, insgesamt ${ANCHORS.length} Anker, davon ${ANCHORS.filter((a) => a.kind === 'bench').length} Bänke`)
let unreachable = []
for (const a of ANCHORS) { const p = findPathTo(a.x, a.z, 'hq-door'); if (!p || (p.length < 0.1 && Math.hypot(a.x - NODES['hq-door'].x, a.z - NODES['hq-door'].z) > 2)) unreachable.push(a.id) }
check('Alle Anker vom HQ Eingang erreichbar', unreachable.length === 0, `${ANCHORS.length - unreachable.length}/${ANCHORS.length}`)

// 5. Kollision (Bewegung schrittweise, das Ergebnis der Auflösung fließt in den nächsten Schritt ein)
const walk = (x, z, dx, dz, steps) => { const q = { x, z }; for (let i = 0; i < steps; i++) { q.x += dx; q.z += dz; resolveCollisions(q, 0.4) } return q }
let p = walk(0, -340, 0, -0.5, 160)
check('Monument blockiert Durchlaufen', p.z > MONUMENT.z && Math.hypot(p.x - MONUMENT.x, p.z - MONUMENT.z) >= MONUMENT.colliderR, `Spieler stoppt bei z=${p.z.toFixed(2)} (Monumentmitte z=${MONUMENT.z}, Abstand ${Math.hypot(p.x - MONUMENT.x, p.z - MONUMENT.z).toFixed(2)} m)`)
p = walk(0, -150, 0, 0.5, 100)
check('Ergebnisbecken nicht begehbar', Math.hypot(p.x / (POOL.a + 0.4), (p.z - POOL.z) / (POOL.b + 0.4)) >= 0.999, `Spieler geht um das Becken, Endpunkt (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`)
p = walk(0, -30, 0, 0.25, 130)
check('HQ Tür passierbar', p.z >= 0, `Spieler erreicht z=${p.z.toFixed(2)} durch die Tür`)
p = walk(5, -30, 0, 0.25, 130)
check('HQ Wand blockiert', p.z < -6, `Spieler bei x=5 stoppt bei z=${p.z.toFixed(2)}`)

// 6. Agenten: Kaskadenlauf und Unterbrechung
const a = createAgent('t1', 'Test')
assignIntent(a, 'RUN_CASCADES')
let t = 0, topT = null
while (t < 900) { stepAgent(a, 0.1); t += 0.1; if (topT === null && a.z < -330 && a.mode === 'route') topT = t; if (topT !== null) break }
check('Agent erreicht Kaskadenspitze', topT !== null, `nach ${topT?.toFixed(1)} s, y=${a.y.toFixed(1)} m`)
const distBefore = Math.hypot(a.x, a.z + 7.6)
interrupt(a)
let back = 0
while (a.mode !== 'inside' && back < 900) { stepAgent(a, 0.1); back += 0.1 }
check('Unterbrechung führt zurück ins HQ', a.mode === 'inside', `Rückweg ${back.toFixed(1)} s (Luftlinie ${distBefore.toFixed(0)} m), Agent sofort unterbrechbar trotz Stamina ${a.stamina.toFixed(2)}`)
const r = createAgent('t2', 'Rest'); assignIntent(r, 'REST_OUTSIDE', { anchorId: 'bench-cascade-01' })
t = 0; while (r.mode !== 'anchor' && t < 900) { stepAgent(r, 0.1); t += 0.1 }
check('Agent setzt sich auf Bank', r.activity === 'SIT', `${t.toFixed(1)} s, Aktivität ${r.activity}`)

// 7. Zonen
worldZones.update(0, -30)
const near = { ...worldZones.states }
worldZones.update(0, -400)
const far = { ...worldZones.states }
check('Zonen streamen', near.HQ_INTERIOR !== far.HQ_INTERIOR && far.HERKULES_UPPER === 'HIGH_DETAIL', `HQ_INTERIOR ${near.HQ_INTERIOR} -> ${far.HQ_INTERIOR}, HERKULES_UPPER ${near.HERKULES_UPPER} -> ${far.HERKULES_UPPER}`)

// 8. Abschlusspulse bündeln
for (let i = 0; i < 6; i++) triggerCompletionPulse(`T${i}`, 'workflow')
for (let i = 0; i < 40; i++) stepCompletionPulses(0.1)
const active = pulseState.pulses.filter((q) => q.active).length
check('Abschlusspulse gebündelt', pulseState.completed === 6 && active <= 2, `6 Abschlüsse -> ${active} aktive Pulse`)

console.log(out.join('\n'))
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden')
process.exit(fails ? 1 : 0)
