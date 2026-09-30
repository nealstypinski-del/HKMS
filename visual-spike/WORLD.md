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

## Messergebnisse (Messlauf im Browser)

Umgebung: Chromium ohne GPU (ANGLE mit SwiftShader Software Renderer), Fenster 960 x 540, 50 Agenten in der Welt. **Die FPS Werte sind Software Rendering und nicht auf Desktop Grafikkarten übertragbar.** Die Median Spalte der Bildzeit ist durch Zeitgeber Artefakte des Software Renderers unbrauchbar und wird deshalb nicht angegeben. Drawcalls, Dreiecke, sichtbare Bäume und Agenten sind hardwareunabhängig.

| Stufe | Standpunkt | FPS (Software) | Drawcalls | Dreiecke | Bäume sichtbar | Agenten sichtbar |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| LOW | A HQ Außen | 2.8 | 116 | 124.165 | 152 | 40 |
| LOW | B Kaskade unten | 4.8 | 70 | 98.255 | 181 | 1 |
| LOW | C Kaskade Mitte | 3.8 | 54 | 93.804 | 128 | 0 |
| LOW | D Herkules oben | 2.7 | 24 | 71.168 | 53 | 0 |
| LOW | E Übersicht | 4.8 | 109 | 103.859 | 27 | 0 |
| LOW | F HQ Lobby | 2.7 | 287 | 105.170 | 25 | 41 |
| LOW | G Etage 1 Redaktion | 1.7 | 124 | 101.066 | 80 | 32 |
| LOW | H Rolltreppe | Artefakt (52,2 gemessen, unplausibel) | 194 | 100.690 | 20 | 48 |
| MEDIUM | A HQ Außen | 1.3 | 203 | 166.805 | 850 | 39 |
| MEDIUM | B Kaskade unten | 2.4 | 100 | 137.799 | 860 | 1 |
| MEDIUM | C Kaskade Mitte | 1.7 | 73 | 110.006 | 624 | 0 |
| MEDIUM | D Herkules oben | 2.1 | 45 | 80.846 | 167 | 0 |
| MEDIUM | E Übersicht | 3.5 | 123 | 114.483 | 389 | 0 |
| MEDIUM | F HQ Lobby | 1.5 | 351 | 138.606 | 74 | 40 |
| MEDIUM | G Etage 1 Redaktion | 1.3 | 237 | 141.296 | 245 | 31 |
| MEDIUM | H Rolltreppe | 1.4 | 378 | 143.620 | 67 | 48 |
| HIGH | A HQ Außen | 1.4 | 242 | 214.299 | 2861 | 38 |
| HIGH | B Kaskade unten | 1.5 | 112 | 186.339 | 2137 | 1 |
| HIGH | C Kaskade Mitte | 1.6 | 81 | 141.146 | 1371 | 0 |
| HIGH | D Herkules oben | 1.5 | 51 | 95.552 | 420 | 0 |
| HIGH | E Übersicht | 2.7 | 129 | 146.689 | 2520 | 0 |
| HIGH | F HQ Lobby | 1.9 | 352 | 161.164 | 174 | 40 |
| HIGH | G Etage 1 Redaktion | 1.0 | 204 | 166.380 | 584 | 29 |
| HIGH | H Rolltreppe | 1.4 | 303 | 163.520 | 153 | 48 |

Höchstwerte je Stufe: LOW 287 Drawcalls und 124.165 Dreiecke, MEDIUM 378 und 166.805, HIGH 352 und 214.299.

Optimierung in dieser Runde: Schatten nur noch für Figuren im Umkreis von 16 m. Das senkte die Drawcalls in der Lobby (Standpunkt F) auf HIGH von 547 auf 352 und auf MEDIUM von 555 auf 351.

**Nicht gemessen:** 60 FPS auf echter Hardware. Größte Kostenblöcke sind laut Drawcall Zählung die Agentenfiguren (je etwa 7 Meshes), die Beschriftungstafeln im Innenraum und die Schattenpässe.
