/**
 * Bildschirm Joystick für Touchgeräte. Eine Aufgabe: den Zustand des virtuellen Eingabegeräts halten und Werte prüfen.
 * Die Kamera liest ihn zusätzlich zur Tastatur. Vorwärts ist positives y.
 */
export const virtualInput = { x: 0, y: 0, run: false }

const finite = (v: number) => (Number.isFinite(v) ? v : 0)
const clamp1 = (v: number) => Math.max(-1, Math.min(1, finite(v)))

export function setVirtualStick(x: number, y: number) {
  virtualInput.x = clamp1(x)
  virtualInput.y = clamp1(y)
}
export function setVirtualRun(run: boolean) { virtualInput.run = run === true }
export function resetVirtualInput() { virtualInput.x = 0; virtualInput.y = 0; virtualInput.run = false }

/**
 * Wandelt eine Verschiebung des Fingers (Pixel, y nach unten) in einen Joystickwert um.
 * Innerhalb des Radius proportional, darüber auf Länge 1 begrenzt. Bei Radius 0 oder ungültigen Werten: kein Signal.
 */
export function clampStick(dx: number, dy: number, radius: number): { x: number; y: number } {
  const r = finite(radius)
  if (r <= 0) return { x: 0, y: 0 }
  const x = finite(dx) / r, y = -finite(dy) / r // Bildschirm y nach unten = rückwärts
  const len = Math.hypot(x, y)
  if (len <= 1) return { x, y }
  return { x: x / len, y: y / len }
}
