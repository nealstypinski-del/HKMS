/** Erkennung von Geräten ohne Tastatur und Maus. Eine Aufgabe: Touchbedienung ein oder ausschalten. */
export function isTouchDevice(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    return coarse || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches)
  } catch {
    return false
  }
}
