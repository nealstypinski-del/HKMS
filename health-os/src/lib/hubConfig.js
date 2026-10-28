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
