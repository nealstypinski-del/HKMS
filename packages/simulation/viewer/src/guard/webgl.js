/** Prüft, ob der Browser WebGL kann, und zeigt sonst eine verständliche Meldung. Nur diese eine Aufgabe. */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Zeigt eine Vollbildmeldung (nutzt das Element #loading). */
export function showMessage(text) {
  const el = document.getElementById('loading');
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
}

export function hideMessage() {
  const el = document.getElementById('loading');
  if (el) el.hidden = true;
}
