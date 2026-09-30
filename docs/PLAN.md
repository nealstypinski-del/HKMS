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
- [ ] A2 Beschädigter localStorage (`persist.ts` mit Validierung)
- [ ] A3 Kein WebGL, Kontextverlust, kleines Fenster (Fehlerseite, Wiederherstellung)
- [ ] A4 Schnelles Wechseln von Modus, Etage, Wandmodus; Etagenwechsel während der Fahrt; Agent löschen während Auswahl oder Folgen
- [ ] A5 Spieler außerhalb der Fläche oder in Möbeln, alle Tasten gleichzeitig, Tab im Hintergrund (große Zeitschritte)
- [ ] A6 Benchmark während Stresstest, Doppelklicks, mehrere Panels
- [ ] A7 Touchgeräte ohne Tastatur: klarer Hinweis

## B. Dateien mit genau einer Aufgabe
- [ ] B1 `CameraRig.tsx` trennen (Eingabe, Spielerbewegung, Modi)
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
