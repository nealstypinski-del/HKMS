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

## Zyklusplan (je 15 Minuten ein Paket)

1. M5 und M6: `sim/selectionGuard.js` löscht ungültige Auswahl.
2. M7: `camera/positionGuard.js` fängt NaN und Ausreißer der Spielerposition ab.
3. M12: `camera/modeLock.js` regelt, welche Kamerafahrt gerade aktiv sein darf.
4. M11: `common/LoadingOverlay.jsx` mit Fortschritt und Rückfall.
5. M13: Klangstart in eigener Datei mit Fehlerbehandlung.
6. M3 und M4: Entprellung und Obergrenzen.
7. M10: Touch Steuerung (virtueller Joystick) in eigener Datei.
8. Profiling auf echter GPU (braucht deinen Rechner).
