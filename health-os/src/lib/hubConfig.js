// HQ-Hub: Artwork + Hotspots.
// Artwork = Ausschnitt aus dem Entwurfs-Screenshot (scripts/crop-hub-art.py). Zum Austausch: neue Datei nach public/hub.webp,
// ART_RATIO (Breite/Höhe) anpassen und die x/y-Koordinaten (Prozent des Bildes) der Räume nachziehen.
export const HUB_ART = '/hub.webp'
export const ART_RATIO = 1724 / 1406

export const ATLAS = { x: 39.9, y: 9 } // Ziel-Kugel: Live-Zahl wird über den eingebrannten Text gelegt

export const ROOMS = [
  { id: 'training', label: 'TRAINING', color: '#00F0FF', x: 22, y: 46 },
  { id: 'koerper', label: 'KÖRPER', color: '#E024E3', x: 58, y: 42 },
  { id: 'pharma', label: 'PHARMA', color: '#FF2D55', x: 48, y: 31, pill: true },
  { id: 'ernaehrung', label: 'ERNÄHRUNG', color: '#FF9500', x: 81, y: 55 },
  { id: 'regeneration', label: 'REGENERATION', color: '#00FF66', x: 42, y: 84 },
  { id: 'pool', label: 'POOL', color: '#007AFF', x: 58, y: 88, pill: true },
]

// Dezente Effekt-Ebenen (Prozent des Bildes): Sterne am Fenster, Dampf über dem Esstisch, Pool-/Raumlicht.
export const FX = {
  stars: [{ x: 60.2, y: 70.5, r: 3, d: 0 }, { x: 62.4, y: 73.2, r: 2, d: 1.3 }, { x: 64.1, y: 69.8, r: 2.5, d: 2.1 }, { x: 61.3, y: 75.5, r: 2, d: 0.7 }],
  steam: [{ x: 82, y: 52, d: 0 }, { x: 84.5, y: 53, d: 2 }, { x: 80.5, y: 54, d: 4 }],
  glows: [
    { x: 53, y: 83, w: 9, c: '#00F0FF', d: 0 },   // Pool
    { x: 22, y: 41, w: 11, c: '#2F8CFF', d: 1.2 }, // Trainingsraum
    { x: 82, y: 56, w: 10, c: '#E024E3', d: 2.4 }, // Küche
    { x: 40, y: 12, w: 12, c: '#FFB800', d: 0.6 }, // Orb
  ],
}
