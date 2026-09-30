# Herkules AI HQ · Visual Spike 0.5

Eigenständiger visueller Prototyp der 3D-Unternehmenswelt. Keine Businesslogik, keine echten Agenten.

## Starten

```
cd visual-spike
npm install
npm run dev
```

## Inhalt

- Riesige leere, begehbare Fläche unter Nachthimmel mit Vorplatz, Bäumen, Pollern, Bank, Sofa und Lampe
- Das Büro ist ein Hochhaus mit Glasfassade und Eingang an der Vorderseite. Von außen sieht man durch das Glas alle vier Etagen.
- Eigene Spielfigur ("Du") mit Skelett und Animationen (Stehen, Gehen, Rennen). W A S D oder Pfeiltasten laufen, Umschalt rennt, Maus dreht die Kamera. Kollisionen mit Möbeln, Wänden, Fassade und Bäumen.
- Fahrende Rolltreppen zwischen allen Etagen (eine Spur hoch, eine runter). Betreten fährt die Figur automatisch mit, oben oder unten wechselt die Etage. Zusätzlich Aufzug und Etagenwahl.
- Agenten mit Skelett: sitzen und tippen, laufen entlang fester Wege, und Schreibtisch-Agenten stehen von selbst auf, holen Kaffee (Symbol am Namensschild) und setzen sich wieder
- Etagen: Erdgeschoss (Betriebszentrale), HerkulesJobs, KasselMemes, KI / Entwicklung, jeweils mit Pods, Wandscreens, Terminalmonitoren, Küchenzeile, Drucker, Whiteboard, Teppichen und mehr
- Bildqualität: Umgebungslicht mit Reflexionen, Umgebungsverdeckung (nur im Live-Modus), Bloom, Filmton, Vignette
- Alle Beschriftungen, Bildschirme und Rollen sind auf Deutsch
- Modelle und Animationen kommen aus dem Blender-Kit (`blender/build_kit.py`, Ausgabe in `public/models/`). Küche, Aufzug und Agentenbank sind noch prozedural.
- Alle Etagen kommen aus `src/data/floors.js`, damit Loop 1 später echte Daten liefern kann
- Aufnahmemodus: `?capture=1` schaltet auf manuelles Rendern (`window.__hkms.advance`, `go`, `cam`), damit sich ein ruckelfreies Video Bild für Bild aufnehmen lässt

## Nächste Schritte

1. Küche, Aufzug und Agentenbank ebenfalls in Blender bauen, Sofafarben pro Etage
2. Etagen 1 bis 3 (HerkulesJobs, KasselMemes, AI/Development) mit eigener Designsprache
3. Zustandsmodell entkoppeln, damit Loop 1 die Statusdaten liefern kann

## Begehbare Welt (Bergpark und HQ Innenwelt)

Siehe `WORLD.md`: Außenwelt mit Kaskade und Herkules, begehbares HQ mit Treppe, Rolltreppen, Büros und Konferenzräumen (Third Person), Schnittstellen, Prüfskripte und Messergebnisse.
