/**
 * Reine Bewegungsfunktionen der Rolltreppe (ohne Three.js, testbar).
 * Die Stufen laufen als Endlosband: Position entlang der Steigung 0..1.
 */
export const ESC_SPEED = 0.85 // m/s entlang der Horizontalen, gleich der Fahrgeschwindigkeit des Spielers

/** Anteil (0..1) der Steigung, in dem die Stufen am Ende flach unter der Kammplatte verschwinden. */
export const ESC_HIDE = 0.035

/**
 * Stufenpositionen (0..1) zum Zeitpunkt t. Aufwärts wandern die Stufen mit steigendem Wert.
 * n Stufen, Länge L (horizontal). Jede Stufe legt pro Sekunde speed / (L / n) Stufenabstände zurück.
 */
export function escalatorStepPositions(n: number, L: number, t: number, dir: 1 | -1, speed = ESC_SPEED): number[] {
  const shift = (dir * speed * t) / L // Anteil der Gesamtlänge
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const s = (i / n + shift) % 1
    out.push(s < 0 ? s + 1 : s)
  }
  return out
}

/** 0 = voll sichtbar, 1 = unter der Kammplatte verborgen, glatter Übergang an beiden Enden. */
export function escalatorSink(s: number): number {
  const e = Math.min(s, 1 - s)
  if (e >= ESC_HIDE) return 0
  const k = 1 - e / ESC_HIDE
  return k * k * (3 - 2 * k)
}
