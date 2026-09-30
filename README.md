# HERKULES AI HQ – 3D Digital Twin (Visual World Loop 1)

Begehbares Bürogebäude mit Glasfassade auf einer leeren, ebenen Fläche. Sechs Etagen, alles Deutsch beschriftet.
Rein visuelles Fundament: **keine echte Anbindung** an Claude, Codex, ChatGPT oder Gemini. Alle Agenten, Provider und Entwürfe sind Mock Daten und im UI als solche gekennzeichnet.

## Starten

```bash
npm install
npm run dev          # http://localhost:5173, mit Performance Overlay
npm run build        # Typprüfung + Produktionsbuild
npm test             # 44 Tests
```

Performance Overlay in einem Produktionsbuild: `?perf` an die URL hängen.

## Steuerung

| Ansicht | Bedienung |
|---|---|
| Dritte Person (Standard) | WASD laufen, Shift rennen, Ziehen dreht die Kamera, Mausrad Zoom |
| Ego | WASD, Maus (ins Bild klicken), Shift schneller, Esc löst die Maus |
| Übersicht | Ziehen dreht, Rechtsklick Ziehen oder WASD verschiebt, Mausrad Zoom, Klick wählt |
| Gebäude | Ganzer Turm, Etage anklicken, nochmal klicken betritt sie |
| Folgen | Agent anklicken, dann Folgen |

Treppe (Etage 0 nach 1) und Rolltreppen einfach hinauflaufen. `E` am Aufzug öffnet die Etagenwahl.
Oben rechts: ETAGEN, KARTE, ANSICHT, GRAFIK, FIGUR, + STARTEN.

## Aufbau

```
src/world/    reine Logik ohne Three.js, getestet
  buildingConfig.ts  Gebäude als Konfiguration (Etagen, Abteilungen, Zonen). Neue Etage = neuer Eintrag.
  generate.ts        Konfiguration → Möbel, Glaswände mit Türen, Schreibtische, Sitze
  nav.ts             Navigationsgitter + A* (Türen sind ausreichend breit, Hindernisse um den Agentenradius aufgeblasen)
  sim.ts             Sitzzuweisung, Laufen, Sitzen, Aufstehen, Warteschlange, Hängen-Erkennung
  connectors.ts      Treppe und Rolltreppen (Geometrie, Einstieg, Fahrt)
  store.ts           Zustand (zustand): Agenten, Auswahl, Grafik, Ansicht
  events.ts          onAgentSelected, onDeskSelected, onComputerSelected, onDepartmentSelected, onElevatorSelected
src/render/   Three.js / R3F
  kit.ts, FloorView.tsx   Möbel als Instanzen (wenige Draw Calls je Etage)
  figureGeo.ts, Character.tsx   Figuren, pro Aussehen zu wenigen Meshes verschmolzen, 3 Detailstufen
  Tower.tsx, Environment.tsx, Connectors.tsx
src/cameras/  ein Rig für alle Ansichten
src/ui/       Oberfläche
```

## Integration (Terminal 1)

- Der Renderer hält keinen Geschäftszustand. Agenten kommen aus dem Store (`useAgent(id)`), der Status (`working`, `meeting`, `idle`, `break`, `waiting`, `offline`) steuert die Bewegung.
- IDs: `floor-*`, `dept-*`, `desk-*`, `computer-*`, `agent-*`.
- Simulierte Aktivität (Schalter in GRAFIK) ist von echter Aktivität getrennt (`Agent.simulated`).

## Bekannte Grenzen

- Agenten bleiben auf ihrer Etage, sie fahren nicht selbst Aufzug, Treppe oder Rolltreppe. Nur der Spieler nutzt sie.
- Agenten kollidieren nicht untereinander (verhindert Türstaus, sie können sich kurz überlappen).
- Alle Inhalte (Produkte, Entwürfe, Bildschirmtexte) sind Platzhalter. Echte Produkt- und Firmendaten sind nicht eingebunden.
- Prozedurale Low Poly Optik, keine fotorealistischen Modelle oder Texturen.
- Bildrate wurde nur mit Software Rendering gemessen (siehe unten), nicht auf einer echten GPU.
