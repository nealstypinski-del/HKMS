# Lebender Plan: HERKULES AI HQ

Jede Loop Runde nimmt das nächste offene Paket, setzt nur dieses um, testet, pusht und hakt es hier ab.

## Regeln
- Ein Paket pro Runde. Neue Logik in eigene Dateien mit genau einer Aufgabe, dazu ein Test.
- `npm test` und `npm run build` müssen grün sein, sonst zurückrollen.
- Sicherung: Push auf GitHub (Branch `claude/youthful-pasteur-dkw2t3`). Kein Pull Request, kein Force Push.

## Annahmen (bitte korrigieren)
- Ziel der Runden ist Stabilität und Struktur, nicht neue Optik.
- Sicherung heißt Push auf den bestehenden Branch.
- Bildrate ist nur mit Software Rendering messbar und wird so berichtet.
- Alle Firmeninhalte bleiben Platzhalter.

## A. Absicherung gegen Fehlbedienung
- [x] A1 Massenstart und ungültige Eingaben (`src/world/limits.ts`)
- [x] A2 Beschädigter localStorage (`persist.ts` mit Validierung)
- [x] A3 Kein WebGL, Kontextverlust, kleines Fenster (Fehlerseite, Wiederherstellung)
- [x] A4 Schnelles Wechseln von Modus, Etage, Wandmodus; Etagenwechsel während der Fahrt; Agent löschen während Auswahl oder Folgen
- [x] A5 Spieler außerhalb der Fläche oder in Möbeln, alle Tasten gleichzeitig, Tab im Hintergrund (große Zeitschritte)
- [ ] A6 Benchmark während Stresstest, Doppelklicks, mehrere Panels
- [ ] A7 Touchgeräte ohne Tastatur: klarer Hinweis

## B. Dateien mit genau einer Aufgabe
- [x] B1 (Spielerbewegung ausgelagert, Rest folgt) `CameraRig.tsx` trennen (Eingabe, Spielerbewegung, Modi)
- [ ] B2 `generate.ts` je Zonentyp eine Datei
- [ ] B3 `kit.ts` je Möbelgruppe
- [ ] B4 `Panels.tsx` je Panel eine Datei
- [ ] B5 `Character.tsx` (Figur, Agent, Spieler)
- [ ] B6 `Tower.tsx` (Bodenplatte, Fassade, Dach)

## C. Nachvollziehbarkeit
- [ ] C1 `docs/FEHLERFAELLE.md` Checkliste
- [ ] C2 CI auf GitHub Actions (nur mit Zustimmung des Nutzers)

## Protokoll
- Runde 1: A1 erledigt. limits.ts begrenzt Massenstart (100 je Start, 300 gesamt), prüft Zahl, Etage, Abteilung. 64 Tests grün (vorher 59).
- Runde 2: A2 erledigt. persist.ts und graphicsSettings.ts (Grafiktypen aus dem Store gelöst). Prüft jedes Feld, wirft nie, 20 KB Grenze. 72 Tests grün.
- Runde 3: A3 (WebGL, Kontextverlust, Fehlerseite), A4 (Store Härtung, Fuzzing), A5 (Spielerbewegung in playerMove.ts, unstick, Weltgrenze) erledigt. 96 Tests. Mutationstests bestätigen, dass die Angriffstests beißen.
