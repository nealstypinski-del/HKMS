# Projektplan Herkules AI Simulation

Lebendes Dokument. Jeder Zyklus (alle 15 Minuten) nimmt sich den obersten offenen Punkt, setzt ihn in einer eigenen kleinen Datei um, prüft ihn, committet nach GitHub und aktualisiert diese Liste.

## Regeln

1. **Eine Datei, eine Aufgabe.** Neue Funktionen kommen in neue, kleine Dateien. Bestehende Dateien werden nur an der Anschlussstelle geändert.
2. **Erst prüfen, dann committen.** Ein Commit entsteht nur, wenn `npm run build` und die drei Prüfskripte (`tools/verify-outdoor.mjs`, `verify-indoor.mjs`, `verify-sim.mjs`) bestehen.
3. **Immer nach GitHub.** Push auf `claude/festive-turing-hb147n` nach jeder bestätigten Änderung. Kein Force Push, keine Löschung fremder Dateien.
4. **Annahmen stehen im Plan.** Wird eine Annahme falsch, wird sie hier korrigiert.

## Annahmen (bitte korrigieren, falls falsch)

| Nr | Annahme | Folge, wenn falsch |
| --- | --- | --- |
| A1 | Die Nutzer öffnen die Simulation im Browser auf einem Desktop mit WebGL 2. | Handy und alte Rechner brauchen eine Ausweichseite und eine niedrige Grafikstufe. |
| A2 | Raumnamen, Tafeln und Texte sind Platzhalter, echte Grundrisse und Fotos fehlen noch. | Räume müssen später nach Plänen umgebaut werden (nur `hq.layout.js` betroffen). |
| A3 | Terminal 4 liefert später echtes Verhalten und echte Aufgaben. Bis dahin ersetzt der Mock die Daten. | Der Vertrag (`assignIntent`, `goSpot`, `interrupt`) muss stabil bleiben. |
| A4 | Es gibt keine Zugangsdaten, kein Login, keine echten Kundendaten in der Welt. | Sobald echte Daten fließen, braucht es Rechte und Datenschutz. |
| A5 | 60 FPS auf Desktop Hardware sind das Ziel, gemessen ist es noch nicht. | Profiling auf echter GPU ist Pflicht vor der Freigabe. |

## Bausteine

| Baustein | Datei oder Ordner | Status |
| --- | --- | --- |
| Außenwelt (Terrain, Kaskade, Herkules, Wald) | `src/world/outdoor/` | fertig |
| HQ Innenwelt (Grundriss, Möbel, Treppe, Rolltreppen) | `src/world/indoor/` | fertig |
| Agenten (Crowd, Bewegung) | `outdoor/crowd`, `outdoor/agents` | fertig |
| Simulation (Uhr, Bedürfnisse, Aufgaben, Besprechungen) | `src/world/sim/` | fertig |
| Sims Ansicht, Etagenschnitt, Auswahlpanel | `outdoor/ui/SimUI.jsx`, `runtime/viewState.js` | fertig |
| Prüfskripte | `tools/` | fertig |
| Absicherung gegen Fehlbedienung | siehe Missbrauchsfälle | in Arbeit |
| Engine Umstieg (WebGPU Renderer, TSL, siehe unten) | `src/world/engine/` | E1 fertig, E2 offen |
| Profiling auf echter GPU | offen | offen |
| Echte Räume nach Plänen | offen | wartet auf Material |

## Missbrauchsfälle (der ungeschickteste Nutzer der Welt)

Status: **offen**, **erledigt** oder **bewusst akzeptiert**.

| Nr | Was der Nutzer tut | Was schiefgehen kann | Gegenmaßnahme | Status |
| --- | --- | --- | --- | --- |
| M1 | Öffnet die Seite ohne WebGL (alter Browser, Grafiktreiber aus) | Weißer Bildschirm, keine Erklärung | `WebGLGuard.jsx`: Prüfung und freundliche Meldung | erledigt |
| M2 | Ein Renderfehler wirft eine Ausnahme | Seite bleibt schwarz | Fehlergrenze mit Schaltfläche „Neu laden“ in `WebGLGuard.jsx` | erledigt |
| M3 | Wechselt hektisch zwischen Ansichten und Grafikstufen | Nachladen, Ruckler, halbe Zustände | Wechsel entprellen, Zustände nur über Speicher (`viewState`) ändern | offen |
| M4 | Stellt 100 Agenten und Nacht und 9x Geschwindigkeit gleichzeitig ein | Bildrate bricht ein | Automatische Grafikreduktion (vorhanden), Obergrenze für Agenten bei LOW | offen |
| M5 | Klickt in die Leere, auf Menüs und Agenten gleichzeitig | Auswahl bleibt hängen, Panel verweist auf entfernten Agenten | Auswahl beim Neuaufbau der Besetzung löschen | offen |
| M6 | Löscht die Besetzung (Zahl der Agenten ändern) während ein Agent gewählt ist | Panel zeigt Geisterdaten | wie M5 | offen |
| M7 | Läuft in Wände, Möbel, Wasser, Pool, Monument | Durchfallen oder Steckenbleiben | Kollision (vorhanden, geprüft), Schutz gegen NaN Positionen ergänzen | offen |
| M8 | Läuft im Treppenhaus rückwärts oder springt von der Rolltreppe | Falsche Etage, Steckenbleiben | Höhenlogik (geprüft), Rückfallposition „Zum Eingang“ als Schaltfläche | offen |
| M9 | Setzt Tageszeit von Hand und lässt die Uhr gleichzeitig laufen | Widerspruch zwischen Uhr und Himmel | Handwahl schaltet „Tageszeit folgt Uhr“ ab (vorhanden) | erledigt |
| M10 | Öffnet die Seite auf dem Handy | Menü verdeckt alles | Menü startet auf schmalen Bildschirmen eingeklappt (vorhanden), Touch Steuerung fehlt | offen |
| M11 | Lädt die Seite bei langsamer Leitung | Modelle fehlen, halbe Welt | Ladeanzeige und Rückfall bei fehlenden Modellen | offen |
| M12 | Startet Messlauf oder Herkulesfahrt mitten in einer Tour | Kamerazustände überlagern sich | Tour, Fahrt und Messlauf schließen sich gegenseitig aus | offen |
| M13 | Schaltet Wasserton ein, ohne dass der Browser Ton erlaubt | Stille oder Fehler | Fehler abfangen, Hinweis anzeigen | offen |
| M14 | Gibt sehr viele Klicks auf „Aufgabe trifft ein“ | Übervolle Meldungsliste, viele Pulse | Meldungsliste begrenzen (vorhanden), Pulse bündeln (vorhanden) | erledigt |

## Engine Umstieg (Recherche und Plan)

**Recherche zu BridgeMind (Stand Sitzung):** BridgeMind nutzt keine eigene Engine. Die öffentlichen Projekte (`turbo-kart-rush`, `apex-formula`, `leonida`, `bridge-horror-house`, `voxelcraft`) sind Three.js Spiele mit rein prozeduralen Assets, teils mit Rapier Physik. Die Benchmark Prompts verlangen laut Suchergebnis Three.js mit „WebGPU Techniken (2026)“. Die Webseiten selbst waren für mich gesperrt, Details stammen aus Suchtreffern und der GitHub Übersicht. Alle Projekte sind MIT lizenziert; es werden keine Assets kopiert.

**Schluss für uns:** Die „neue Engine“ ist der WebGPU Renderer von Three.js (Version 0.186 liegt schon vor) mit TSL Materialien und TSL Nachbearbeitung (Bausteine `GTAONode`, `BloomNode`, `SMAANode`, `GodraysNode`, `DepthOfFieldNode`, `MotionBlur` sind vorhanden). React Three Fiber 9.8 kann den Renderer asynchron erzeugen.

**Befund E1 (`webgpuProbe.js`):** Ohne WebGPU startet der Renderer sauber mit WebGL 2 Rückfall und rendert TSL Materialien (5 von 5 Bildern). Mit WebGPU scheitert das alte Test Chromium an einer Texturansicht (`swizzle`), aktuelle Chrome Versionen unterstützen sie. Folge: **jeder Start muss bei Fehler automatisch auf `forceWebGL` zurückfallen** (Missbrauchsfall M15).

| Schritt | Inhalt | Datei | Status |
| --- | --- | --- | --- |
| E1 | Machbarkeit prüfen | `engine/webgpuProbe.js` | erledigt |
| E2 | Renderer Fabrik: WebGPU versuchen, Testbild rendern, bei Fehler WebGL erzwingen, hinter Schalter `?engine=webgpu` | `engine/createRenderer.js` | offen |
| E3 | Rohe GLSL Shader portieren: Kaskadenwasser, Beckenwasser, Himmel | `engine/tsl/waterNode.js`, `engine/tsl/skyNode.js` | offen |
| E4 | Nachbearbeitung neu: GTAO, Bloom, SMAA, Vignette, Filmton als TSL Kette statt `@react-three/postprocessing` | `engine/tsl/postChain.js` | offen |
| E5 | Ungeprüfte Funktionen absichern: Schnittebenen (Wandmodus), Nebel, Instanzfarben, Sprites | `engine/compat.md` und Tests | offen |
| E6 | Optional: Wald und Crowd per Compute Shader, Godrays, Tiefenunschärfe | eigene Dateien je Effekt | offen |
| E7 | Messung auf echter GPU, WebGPU gegen WebGL | braucht deinen Rechner | offen |

Weitere Missbrauchsfälle dazu: **M15** Browser meldet WebGPU, Gerät scheitert (Rückfall, siehe E2), **M16** Nutzer schaltet den Motor mitten in der Sitzung um (Neustart des Canvas mit Sicherung des Zustands), **M17** Safari und ältere Browser ohne WebGPU (WebGL 2 Rückfall ist geprüft).

## Zyklusplan (je 15 Minuten ein Paket)

0. E2: `engine/createRenderer.js` mit Rückfall und Schalter.

1. M5 und M6: `sim/selectionGuard.js` löscht ungültige Auswahl.
2. M7: `camera/positionGuard.js` fängt NaN und Ausreißer der Spielerposition ab.
3. M12: `camera/modeLock.js` regelt, welche Kamerafahrt gerade aktiv sein darf.
4. M11: `common/LoadingOverlay.jsx` mit Fortschritt und Rückfall.
5. M13: Klangstart in eigener Datei mit Fehlerbehandlung.
6. M3 und M4: Entprellung und Obergrenzen.
7. M10: Touch Steuerung (virtueller Joystick) in eigener Datei.
8. Profiling auf echter GPU (braucht deinen Rechner).

## Zusammenführung mit dem Basis Branch

Der Basis Branch brachte einen neuen animierten Charakter (`character.glb`, geskinnt mit Idle, Walk, Run, SitIdle, SitType) und eine neue `Effects.jsx`. Die Menge der Bergpark Crowd nutzt weiter den alten starren Charakter als `character_rigid.glb`, `Effects.jsx` wurde nur um `enableNormalPass={ssao}` ergänzt. Offener Punkt **I1**: Crowd auf den geskinnten Charakter umstellen, damit beide Terminals dieselben Figuren zeigen.
