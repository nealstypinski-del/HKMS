# Herkules AI HQ · Visual Spike 0.1

Eigenständiger visueller Prototyp der 3D-Unternehmenswelt. Keine Businesslogik, keine echten Agenten.

## Starten

```
cd visual-spike
npm install
npm run dev
```

## Inhalt

- Runde Plattform mit leuchtendem Rand, isometrische Orthokamera (drehen und zoomen)
- Ein Erdgeschoss mit 12 Arbeitsplätzen, Küche, Agentenbank, Lounge, Aufzug und zentralem HQ-Display
- 22 Low-Poly-Figuren (sitzend, laufend, Meeting) mit Statusring und Namenslabel (Rolle bei Mausover)
- Alle Assets sind prozedural in React Three Fiber gebaut, es gibt noch keine GLB-Dateien

## Nächste Schritte

1. Blender-Assets (Schreibtische, Sofas, Aufzug, Figuren) als GLB exportieren und per `useGLTF` laden
2. Etagen 1 bis 3 (HerkulesJobs, KasselMemes, AI/Development) mit eigener Designsprache
3. Zustandsmodell entkoppeln, damit Loop 1 die Statusdaten liefern kann
