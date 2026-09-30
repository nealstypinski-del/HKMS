# Projektplan Herkules Simulation und Viewer

Lebendes Dokument. Wird bei jedem Arbeitsschritt aktualisiert. Stand: Loop 1 fertig, 3D Demo Ansicht veröffentlicht.

## 1. Ziel

Ein digitales Unternehmen (HerkulesJobs, KasselMemes, Shared) als Simulation, die später echte KI Arbeit abbildet.
Die Simulation entscheidet WAS passiert, die Ansicht zeigt WIE es aussieht. Alles ist Demo, es wird nichts versendet.

## 2. Annahmen (bitte prüfen und korrigieren)

| Nr | Annahme | Wenn falsch, dann |
| --- | --- | --- |
| A1 | Terminal 1 liefert später die führenden Typen (Agent, Task, Department). | Typen bleiben in `src/types.ts`, Adapter schreiben. |
| A2 | Terminal 3 baut die echte 3D Welt. Der Viewer hier ist nur Demo und Referenz. | Viewer wird zum Produkt, dann Assets und Wegfinden zuerst. |
| A3 | Es gibt keine echten Provider, keine echten Kundendaten, keine Versandwege. | Provider Grenze in `src/providers.ts` ist der einzige Einstieg. |
| A4 | Zielgeräte: Desktop Browser mit WebGL. Mobil ist nachrangig. | Touch Steuerung und Qualitätsstufen vorziehen. |
| A5 | Bis 250 Agenten in der Simulation, bis 60 im Viewer. | Viewer braucht Instancing und Detailstufen. |
| A6 | Zeitzone Berlin, Arbeitstag 08:00 bis 18:00. | `config.timeZone` und `config.workday` ändern. |
| A7 | Freigaben sind immer menschlich, nie automatisch (außer Demo). | Nicht ändern ohne ausdrückliche Entscheidung. |
| A8 | GitHub Branch `claude/herkules-agent-behavior-8ou30y` ist die Sicherung. | Branch oder Repository wechseln. |

## 3. Arbeitspakete

Regel: Jede Datei hat genau eine Aufgabe. Nach jedem bestätigten Schritt wird nach GitHub gepusht.

| Nr | Paket | Ergebnis | Dateien (je eine Aufgabe) | Fertig wenn |
| --- | --- | --- | --- | --- |
| P1 (erledigt) | Robustheit der Simulation | Falsche Eingaben stürzen nichts ab, liefern klare Fehler | `tests/misuse.test.ts`, Validierung in `src/engine.ts` | Alle Missbrauchsfälle aus Abschnitt 4 (Simulation) grün |
| P2 | Viewer aufteilen | Große Dateien in kleine mit einer Aufgabe | `viewer/src/build/floors.js`, `walls.js`, `furniture/*.js`, `escalator.js`, `environment.js`, `agents/character.js`, `agents/motion.js`, `agents/pose.js`, `ui/*.js` | Ansicht sieht identisch aus, Build grün |
| P3 (erledigt) | Robustheit des Viewers | Kein weißer Bildschirm bei Fehlern | `viewer/src/guard/webgl.js`, `viewer/src/guard/dispose.js` | Abschnitt 4 (Viewer) grün |
| P4 | Wegfinden | Agenten laufen nicht durch Möbel | `src/nav/grid.ts`, `src/nav/astar.ts` (Simulation) oder `viewer/src/agents/nav.js` | Kein Agent schneidet Möbel in 20 Minuten Testlauf |
| P5 | Treppenhaus Etage 0 bis 1 | Feste Treppe zusätzlich zur Rolltreppe | `viewer/src/build/stairs.js`, Routenart in `src/movement.ts` | Agent nutzt Treppe und Rolltreppe |
| P6 | Aufzugskapazität | Warteschlange am Aufzug | `src/systems/elevator.ts` | Test: nie mehr als Kapazität gleichzeitig |
| P7 | Veranstaltungsräume | Main Stage, Workshop mit vielen Sitzen | `src/layout/events.ts`, `src/systems/sessions.ts` | Session mit 40 Teilnehmern läuft |
| P8 | Herkules Foundation | Weitere Abteilung | `src/types.ts`, `layout.ts`, `roster.ts` | Neue Abteilung ohne Änderung an Systemen |
| P9 | Assets aus Blender | GLB Modelle statt Kisten | `viewer/src/assets/loader.js` | Ladezeit unter 5 Sekunden |

Reihenfolge: P1, P3, P2, P4, P5, P6, P7, P8, P9. Pro Wecker Durchlauf (15 Minuten) genau ein Paket oder ein Teil davon.

## 4. Missbrauchsfälle ("dümmster Nutzer")

### Simulation
1. Unbekannte Ids (Agent, Aufgabe, Meeting) bei jedem Befehl.
2. Freigabe zweimal erteilen, oder für nicht wartende Aufgabe.
3. Aufgabe ohne Titel, ohne Fähigkeiten, mit unbekannter Abteilung, mit negativer Dauer.
4. Meeting mit einem Teilnehmer, mit doppelten Teilnehmern, mit 300 Teilnehmern, mit Offline Agenten.
5. `tickIntervalMs` gleich 0 oder negativ, `walkSpeedMps` gleich 0, unbekannte Zeitzone.
6. Geschwindigkeit 3x (nicht erlaubt), Pause doppelt, Fortsetzen ohne Pause.
7. Zustand laden: kaputtes JSON, falsche Version, leerer String, manipulierte Anker Belegung.
8. Dieselbe Provider Session zweimal starten, Abschluss ohne Start, Freigabeanfrage bei geschütztem Agenten.
9. Agent im Fehlerzustand bekommt Aufgabe, Meeting oder Pause.
10. Alle Schreibtische belegt, alle Bänke belegt, Aufgabe ohne Kapazität.
11. Sehr viele Aufgaben auf einmal (10 000), Speicher darf nicht wachsen.
12. Kommando innerhalb eines Ereignis Handlers (Reentrancy).

### Viewer
1. WebGL nicht verfügbar oder Kontext verloren: klare Meldung statt weißem Bild.
2. Fenstergröße 0, sehr klein, schnelle Größenänderung.
3. Tab im Hintergrund, danach großer Zeitsprung (Delta begrenzt).
4. Zehnmal schnell auf "Neu starten" oder Szenario wechseln (Speicher wird freigegeben).
5. Klick auf Agent während Szenariowechsel, Kamera folgt einem Agenten, der offline geht.
6. Mausrad Extremwerte, Rechtsklick, Umschalt plus Klick, Touch ohne Maus.
7. Etage wechseln, während ein Agent auf der Rolltreppe steht.
8. "Freigaben erteilen" mehrfach klicken.

## 5. Offene Punkte und Fragen an dich

1. Soll der Viewer langfristig bleiben oder nur Demo sein (A2)?
2. Sollen Freigaben in der Demo je Szenario einstellbar sein?
3. Welche echten Referenzen (Fotos, Grundrisse) darf ich verwenden?

## 6. Änderungsprotokoll

| Datum | Änderung |
| --- | --- |
| 30.09.2026 | Plan angelegt. P1 begonnen. |
| 30.09.2026 | P3 erledigt: `viewer/src/guard/webgl.js` (WebGL Prüfung mit Meldung), `guard/dispose.js` (Speicher freigeben), Kontextverlust, Fenstergröße 0, Schleifenfehler abgefangen, Folgen endet bei Offline. Neuer Browsertest `viewer/test/smoke.mjs` mit 16 Prüfungen, alle bestanden. Offen: Pinch Zoom auf Touch. Nächstes Paket: P2 Viewer aufteilen. |
| 30.09.2026 | P1 erledigt: 13 Missbrauchstests, Eingabevalidierung für Aufgaben und Meetings, Konfigurationsprüfung (`src/configValidation.ts`), Warteschlangengrenze (`maxQueuedTasks`), robustes Laden, `advance` ignoriert ungültige Zeitwerte. 125 Tests grün. Nächstes Paket: P3 Robustheit des Viewers. |
