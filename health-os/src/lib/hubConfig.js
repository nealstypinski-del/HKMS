// HQ-Hub: Räume, Hotspots und Artwork.
// ART: Pfad zu deinem Artwork (z. B. '/hub.webp' → Datei in health-os/public/hub.webp ablegen).
// null = eingebauter SVG-Platzhalter. x/y = Mittelpunkt in % der Bildfläche (Seitenverhältnis ART_RATIO).
export const HUB_ART = null
export const ART_RATIO = 1000 / 620

export const ATLAS = { x: 50, y: 40 } // Ziel-Kugel (Live-Zahl wird hier überlagert)

export const ROOMS = [
  { id: 'training', label: 'TRAINING', color: '#00F0FF', x: 21, y: 30 },
  { id: 'koerper', label: 'KÖRPER', color: '#E024E3', x: 79, y: 30 },
  { id: 'pharma', label: 'PHARMA', color: '#FF2D55', x: 12, y: 64 },
  { id: 'pool', label: 'POOL', color: '#007AFF', x: 88, y: 64 },
  { id: 'ernaehrung', label: 'ERNÄHRUNG', color: '#FF9500', x: 33, y: 85 },
  { id: 'regeneration', label: 'REGENERATION', color: '#00FF66', x: 67, y: 85 },
]
