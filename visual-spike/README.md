# Herkules AI HQ · Visual Spike 0.4

Eigenständiger visueller Prototyp der 3D-Unternehmenswelt. Keine Businesslogik, keine echten Agenten.

## Starten

```
cd visual-spike
npm install
npm run dev
```

## Inhalt

- Riesige leere, begehbare Fläche unter Nachthimmel mit Vorplatz, Bäumen, Pollern, Bank, Sofa und Lampe (keine runde Plattform)
- Das Büro ist ein Hochhaus mit Glasfassade und Eingang an der Vorderseite. Von außen sieht man durch das Glas alle vier Etagen.
- Eigene Spielfigur ("Du"): W A S D oder Pfeiltasten laufen, Umschalt rennen, Maus dreht die Kamera. Kollisionen mit Möbeln, Pod-Wänden, Glasfassade und Bäumen.
- Im Haus wird die Vorderfassade ausgeblendet und die Etage wie ein aufgeschnittenes Modell gezeigt. Der Aufzug (rechts oben) wechselt die Etage.
- Etagen: Erdgeschoss (Betriebszentrale), HerkulesJobs, KasselMemes, KI / Entwicklung, jeweils mit Pods (Holz-Rückwand mit Schild pro Abteilung), Wandscreens und Terminalmonitoren
- Alle Beschriftungen, Bildschirme und Rollen sind auf Deutsch
- Möbel, Bäume, Pod-Wände, Glasbrüstungen und Figuren kommen als GLB aus dem Blender-Kit (`blender/build_kit.py`, Ausgabe in `public/models/`). Küche, Aufzug und Agentenbank sind noch prozedural.
- Alle Etagen kommen aus `src/data/floors.js`, damit Loop 1 später echte Daten liefern kann

## Nächste Schritte

1. Küche, Aufzug und Agentenbank ebenfalls in Blender bauen, Sofafarben pro Etage
2. Etagen 1 bis 3 (HerkulesJobs, KasselMemes, AI/Development) mit eigener Designsprache
3. Zustandsmodell entkoppeln, damit Loop 1 die Statusdaten liefern kann
