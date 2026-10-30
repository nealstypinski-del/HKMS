# Herkules AI HQ: begehbare Welt (Bergpark und HQ Innenwelt)

Diese Welt ist ein eigenständiges Modul unter `src/world/`. Sie ersetzt keine bestehende Komponente des Visual Spikes.
Öffnen: `npm run dev` und im Etagenmodus oben rechts **Bergpark (Außenwelt)** wählen, oder direkt `http://localhost:5173/?view=bergpark`.

## Ehrliche Einordnung

* Das ist eine **stilisierte Low Poly Welt**, kein fotorealistisches Abbild. Die Räume sind aus deinen Angaben abgeleitet
  (HerkulesJobs, KasselMemes mit Infobeiträgen, Nachrichtenbeiträgen und Gewinnspielen, Vertrieb). Es lagen weder Grundrisse noch Fotos vor.
* Die Cloud Sitzung hatte **keinen Zugriff auf deinen Desktop**. Alle Raumnamen, Tafeln und Bildschirmtexte sind Platzhalter und stehen gesammelt in
  `src/world/indoor/config/hq.layout.js`. Mit echten Plänen oder Fotos lassen sich Räume, Maße und Beschriftungen dort direkt anpassen.
* Alle Zahlen in diesem Dokument stammen aus den Prüfskripten unter `tools/` oder aus dem Messlauf im Browser. Der Messlauf lief ohne GPU
  (Software Rendering), deshalb sind FPS Werte nicht auf echte Grafikkarten übertragbar. Drawcalls und Dreiecke sind dagegen hardwareunabhängig.

## Bedienung

| Eingabe | Wirkung |
| --- | --- |
| W A S D oder Pfeile | gehen |
| Umschalt | rennen |
| Maus ziehen, Q und E | umsehen bzw. drehen |
| Mausrad | Kameraabstand in der Third Person Ansicht |
| H | Menü ein und ausblenden |
| Teleport Liste | HQ Eingang, Lobby, Etage 1, Konferenz Herkules, Ergebnisbecken, Kaskade, Herkules |
| RUN OUTDOOR TOUR | geführte Begehung: HQ Lobby, Außenbereich, Ergebnisbecken, Kaskade unten, Mitte, oben, Herkules, Wald, zurück ins HQ |

Ansichten: Third Person (Avatar sichtbar), First Person, Übersicht (Tycoon Kamera aus der Höhe).

## Aufbau der Welt

Maßstab 1 Einheit = 1 Meter, HQ im Ursprung, bergauf ist `-Z`, Herkules liegt bei `z = -400`.

* **HQ** (44 m x 28 m, vier Geschosse): Etage 0 und Etage 1 sind begehbar, Etage 2 und 3 sind Massing.
  * Etage 0: Empfang, Halle mit Treppe und zwei Rolltreppen, Konferenzraum Herkules, Meetingraum Kaskade, Café Bergpark,
    Showroom Produkte, Konferenzraum Oktogon, Meetingraum Wilhelmshöhe.
  * Etage 1: HerkulesJobs, KasselMemes Redaktion (drei Bereiche), Vertrieb, AI Agents Hub, Konferenzraum Löwenburg, Lounge, Galerie.
  * Treppe: 27 Stufen, Steigung 0,1667 m, Auftritt 0,28 m. Rolltreppen: 30 Grad, 0,5 m/s, eine aufwärts und eine abwärts, Stufen animiert.
* **Bergpark**: Plaza, Parkwege, Ergebnisbecken, Kaskade (210 m, 12 Segmente, 6 Stufentore, 535 Treppenstufen je Seite), Herkulesmonument (71 m),
  Wald mit instanziierten Bäumen, Lampen, Bänke, Kiosk.
* **Agenten**: Sie sitzen an 33 Arbeitsplätzen und in Meetings, einige laufen Rundgänge über Rolltreppe und Treppe, fünf gehen hinaus in den Park
  (Kaskadenlauf, Waldlauf, Bank, Spaziergang zum Herkules, Dehnen) und kehren nach einer eintreffenden Aufgabe an ihren Platz zurück.

## Modulstruktur

```
src/world/
  outdoor/                Außenwelt (Terminal 6)
    config/               bergpark.config.js  alle Maße und Grafikstufen
    terrain/              analytisches Höhenfeld, Terrainnetz
    cascades/             Layout, Segmente, Stufentore, Ergebnisbecken, Zustandsvertrag, Mock
    water/                Wassershader, Abschlusspuls
    herkules/             Monument und Figur (3 Detailstufen)
    forest/               Platzierung, Baumgeometrie, instanziertes LOD
    routes/               Knoten, Routen, Wegegraph (Außen und Innen gemeinsam)
    activities/           semantische Aktivitätsanker
    streaming/            Zonen und Zustände mit Hysterese
    environment/          Tageszeit, Wetter, Himmel, Wasserton Anker
    hq/                   Außenhülle, Plaza, Wege, Bänke, Laternen
    agents/               Avatar, Simulation der Außen und Innenagenten
    camera/               Third Person, First Person, Übersicht, Tour, Kollision
    ui/                   Menü, Karte und Grundriss, Leistungsanzeige, Messlauf
  indoor/                 HQ Innenwelt
    config/hq.layout.js   Grundriss, Räume, Wände, Möbel (hier Platzhalter ändern)
    render/               Geometrie, Texturen, Rolltreppen, Innenwelt Komponente
    nav/                  Bodenhöhen, Kollisionen, Wegeknoten, Sitzanker
tools/
  verify-outdoor.mjs      Prüfung Außenwelt ohne Grafik
  verify-indoor.mjs       Prüfung Innenwelt ohne Grafik
```

## Schnittstellen für andere Terminals

* **Verhalten (Terminal 4)**: `assignIntent(agent, intent, opts)` und `interrupt(agent)` in `outdoor/agents/outdoorAgentSim.js`.
  Absichten: `RUN_CASCADES`, `RUN_FOREST`, `WALK_CASCADES`, `WALK_TO_HERKULES`, `REST_OUTSIDE`, `STRETCH`, `RETURN_TO_HQ`, `PATROL_INDOOR`,
  `WORK_AT_DESK`, `ATTEND_MEETING`. Orte liefern `ANCHORS` (außen) sowie `DESK_ANCHORS` und `MEETING_ANCHORS` (innen).
  Ausdauer ist reiner Darstellungszustand und blockiert nie echte Arbeit: `interrupt` wirkt sofort.
* **Kaskade als Arbeitsfluss**: `setCascadeVisualizationState({ activityLevel, stages: { strategy, research, production, review, approval, output } })`.
  Abgebildet werden ausschließlich `activityLevel` (Helligkeit und Tempo), `stages[x].activity` (Helligkeit und Tempo der Stufe) und
  `stages[x].status` (`blocked` färbt Tor und Wasser gelb und bremst den Fluss). Derzeit speist `mockWorkflow.js` Demowerte ein, es sind keine echten Kennzahlen.
  `triggerCompletionPulse(taskId, category)` schickt einen gebündelten Lichtpuls ins Ergebnisbecken.
* **Umgebung (Terminal 3)**: `setTimeOfDay('DAY' | 'EVENING' | 'NIGHT')`, `setWeather('CLEAR' | 'CLOUDY' | 'FOG' | 'RAIN' | 'SNOW')`
  (Regen und Schnee sind vorerst nur Nebel und Lichtarchitektur), `worldZones` mit den Zonen `HQ_INTERIOR`, `HQ_EXTERIOR`, `PARK_LOWER`, `CASCADE`, `HERKULES_UPPER`, `FOREST`.
* Änderungen an geteilten Dateien: nur `src/App.jsx` (Schalter **Bergpark (Außenwelt)** und Parameter `?view=bergpark`, Bergpark wird per `lazy` geladen).

## Prüfen

```
node tools/verify-outdoor.mjs     # Maße, Treppen, Routen, Kollision, Agenten, Zonen, Pulse
node tools/verify-indoor.mjs      # Treppe, Rolltreppen, Türen, Wände, Erreichbarkeit, Sturzsicherung
npm run build
```

Im Browser liefert **Messlauf starten** (oder `window.__bergpark.sweep()`) FPS, Drawcalls und Dreiecke an acht Standpunkten in allen drei Grafikstufen.

## Bekannte Grenzen

* Keine Fotorealistik, keine Nachbildung deiner echten Räume (siehe oben).
* Etage 2 und 3 sowie das Monumentinnere sind nicht begehbar.
* Innenagenten laufen auf dem Wegegraph, nicht mit Kollisionsvermeidung untereinander. Möbel werden über Knoten umgangen, nicht über eine Wegsuche im Raum.
* Wassertöne sind ein synthetisches Rauschen als Platzhalter und standardmäßig aus.
* Die Zahlen aus dem Messlauf stammen von Software Rendering. Ob 60 FPS auf echter Hardware erreicht werden, ist **nicht gemessen**.

## Messergebnisse (Messlauf im Browser, Stand Sims Ausbau)

Umgebung: Chromium ohne GPU (ANGLE mit SwiftShader Software Renderer), Fenster 960 x 540, 50 Agenten. **FPS Werte sind Software Rendering und nicht auf Grafikkarten übertragbar** (einzelne Ausreißer sind Zeitgeber Artefakte). Drawcalls und Dreiecke zählen alle Renderdurchgänge einschließlich Schatten und Nachbearbeitung und sind hardwareunabhängig.

| Stufe | Standpunkt | FPS (Software) | Drawcalls | Dreiecke | Bäume | Agenten |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| LOW | A HQ Außen | 1.5 | 155 | 158.537 | 153 | 40 |
| LOW | B Kaskade unten | Artefakt | 76 | 109.703 | 190 | 1 |
| LOW | C Kaskade Mitte | 0.8 | 59 | 99.422 | 128 | 0 |
| LOW | D Herkules oben | 0.6 | 29 | 76.618 | 53 | 0 |
| LOW | E Übersicht | 1.1 | 130 | 111.285 | 27 | 0 |
| LOW | F HQ Lobby | 3.7 | 211 | 138.428 | 25 | 40 |
| LOW | G Etage 1 Redaktion | 0.4 | 142 | 129.396 | 90 | 36 |
| LOW | H Rolltreppe | 0.6 | 146 | 130.332 | 20 | 49 |
| LOW | I Sims Ansicht | 1.5 | 221 | 171.803 | 18 | 50 |
| MEDIUM | A HQ Außen | 1.1 | 290 | 239.426 | 850 | 39 |
| MEDIUM | B Kaskade unten | 1.1 | 167 | 161.638 | 860 | 1 |
| MEDIUM | C Kaskade Mitte | 1.1 | 109 | 116.019 | 624 | 0 |
| MEDIUM | D Herkules oben | 1.0 | 74 | 93.105 | 167 | 0 |
| MEDIUM | E Übersicht | 1.5 | 175 | 122.388 | 389 | 0 |
| MEDIUM | F HQ Lobby | 0.8 | 346 | 211.701 | 74 | 40 |
| MEDIUM | G Etage 1 Redaktion | 0.7 | 281 | 203.619 | 245 | 34 |
| MEDIUM | H Rolltreppe | 0.6 | 281 | 209.977 | 67 | 49 |
| MEDIUM | I Sims Ansicht | 0.8 | 357 | 249.122 | 52 | 50 |
| HIGH | A HQ Außen | 0.7 | 319 | 287.453 | 2861 | 40 |
| HIGH | B Kaskade unten | 0.7 | 229 | 223.369 | 2136 | 1 |
| HIGH | C Kaskade Mitte | 0.7 | 134 | 147.709 | 1371 | 0 |
| HIGH | D Herkules oben | 0.6 | 96 | 111.383 | 420 | 0 |
| HIGH | E Übersicht | 0.9 | 208 | 156.913 | 2520 | 0 |
| HIGH | F HQ Lobby | 0.5 | 380 | 236.191 | 174 | 40 |
| HIGH | G Etage 1 Redaktion | 0.5 | 310 | 231.651 | 583 | 33 |
| HIGH | H Rolltreppe | 0.5 | 311 | 236.815 | 154 | 49 |
| HIGH | I Sims Ansicht | 0.6 | 396 | 258.703 | 134 | 50 |

Höchstwerte: LOW 221 Drawcalls und 171.803 Dreiecke. MEDIUM 357 und 249.122. HIGH 396 und 287.453.

**Nicht gemessen:** 60 FPS auf echter Hardware. Die Figuren sind seit dem Ausbau eine einzige Crowd (rund 12 Drawcalls für alle Agenten statt etwa 8 je Figur). Die automatische Grafikreduktion schaltet bei unter 22 FPS eine Stufe herunter.

## Sims Ausbau (Simulation)

* **Ansicht**: Sims Ansicht mit Etagenschnitt (Alle, 1, 0) und Wandmodus (Hoch, Halb, Weg), Auswahl eines Agenten per Klick, Verfolgen, Plumbob über jedem Kopf (Farbe aus dem Status von `theme.js`).
* **Simulation**: Uhr mit Pause, 1x, 3x, 9x. Bedürfnisse (Energie, Hunger, Sozial, Komfort, Spaß), Aufgaben mit Fortschritt, Besprechungen um 10:00, 11:30, 14:00 und 16:00, Kaffee, Wasserspender, Sofa, Sport im Park. Jede abgeschlossene Aufgabe löst einen Lichtpuls in der Kaskade aus.
* **Integration der Terminals**: Namen, Rollen und Status kommen aus `src/data/floors.js` (Terminal 3), Figur, Schreibtische mit Gesichts Monitoren, Stühle, Sofas, Regale, Lampen, Pflanzen, Pod Wand und Poller sind die Blender Assets aus `public/models` (Terminal 2), das Verhalten läuft über `assignIntent`, `goSpot` und `interrupt` (Vertrag für Terminal 4).
* **Grafik**: Nachbearbeitung mit Umgebungsverdunklung (N8AO), Bloom, Kantenglättung, Vignette und Filmtonwert (ab Stufe MEDIUM), prozedurale Reflexionsumgebung, weiche Schatten. Das ist stilisierte Low Poly Grafik im Sims Stil, keine AAA Qualität.
* **Herkules**: Kamerafahrt **HERKULES ZEIGEN** (Anfahrt, Umrundung, Nahaufnahme mit Bildunterschriften), überarbeitetes Oktogon mit Mauerwerkschichten, Pilastern, Balustrade und Kupferkappen, neue Figur mit Löwenfell, Bart und Keule.
* **Prüfen**: `node tools/verify-sim.mjs` simuliert einen ganzen Tag mit 47 Agenten und prüft außerdem die Laufanimation (Beinschwung Gehen 86 Grad, Rennen 120 Grad).
