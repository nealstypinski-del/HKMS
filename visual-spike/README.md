# Herkules AI HQ · Visual Spike 0.3

Eigenständiger visueller Prototyp der 3D-Unternehmenswelt. Keine Businesslogik, keine echten Agenten.

## Starten

```
cd visual-spike
npm install
npm run dev
```

## Inhalt

- Runde Plattform mit leuchtendem Rand, isometrische Orthokamera (drehen und zoomen)
- Vier umschaltbare Etagen (Erdgeschoss, HerkulesJobs, KasselMemes, AI/Development) mit eigener Farbwelt, Wandscreens und Terminalmonitoren
- Alle Etagen kommen aus `src/data/floors.js`, damit Loop 1 später echte Daten liefern kann
- 22 Low-Poly-Figuren (sitzend, laufend, Meeting) mit Statusring und Namenslabel (Rolle bei Mausover)
- Möbel, Bäume, Pod-Wände, Glasbrüstungen und Figuren kommen als GLB aus dem Blender-Kit (`blender/build_kit.py`, Ausgabe in `public/models/`). Küche, Aufzug, Agentenbank und Wandscreens sind noch prozedural.
- Freie Perspektivkamera, Nachthimmel mit Sternen, pro Etage mehrere Pods mit Holz-Rückwand und Schild

## Nächste Schritte

1. Küche, Aufzug und Agentenbank ebenfalls in Blender bauen, Sofafarben pro Etage
2. Etagen 1 bis 3 (HerkulesJobs, KasselMemes, AI/Development) mit eigener Designsprache
3. Zustandsmodell entkoppeln, damit Loop 1 die Statusdaten liefern kann
