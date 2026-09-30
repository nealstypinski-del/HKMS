# Assets (optional)

Die Welt läuft vollständig mit prozeduralen Assets aus Grundformen (`src/render/kit.ts`, `src/render/figureGeo.ts`).
Blender oder GLB Dateien sind nicht nötig.

Falls später eigene Modelle dazukommen sollen:

```
assets/models/
  furniture/      Schreibtisch, Stuhl, Monitor, Sofa ...
  characters/     Figuren, Haare, Kleidung, Kopfbedeckung
  architecture/   Treppe, Rolltreppe, Fassadenteile
  props/          Pflanzen, Getränkeautomat, Schilder
```

Empfehlung: glTF/GLB, niedrige Polygonzahl (unter 2.000 Dreiecke je Möbelstück), ein gemeinsames Material je Modell,
keine Texturen über 1024 px. Neue Modelle über `partsFor()` in `kit.ts` einhängen, damit sie weiter instanziert werden.
