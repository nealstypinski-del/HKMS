# Herkules Hochhaus 3D (Demo Ansicht)

Sims artige 3D Ansicht der Simulation, nur zum Ansehen und Entwickeln. Fachlich gehört die echte 3D Welt zu Terminal 3.
Die Ansicht nutzt die Simulation unverändert (`../src`), zeichnet Etagen, Räume, Möbel und Figuren aus den Ankern und Ereignissen
und bewegt Agenten über Wege und Rolltreppen. Alles ist prozedural (keine Modelle, keine Bilder, kein Netzwerk).

```
cd packages/simulation/viewer
npm install
node build.mjs dist/hochhaus3d.html   # eine einzige HTML Datei
```

Bedienung: Ziehen dreht die Kamera, Umschalt oder rechte Maustaste verschiebt, Mausrad zoomt, Klick auf einen Agenten zeigt Details
und erlaubt "Kamera folgt". Tasten 0 bis 4 wählen die Etage, T zeigt den Turm.

Hinweis: Visuell fahren die Agenten Rolltreppen. In der Simulation heißt die Etappe weiter "Aufzug" (`WAIT_FOR_ELEVATOR`, `CHANGE_FLOOR`).
