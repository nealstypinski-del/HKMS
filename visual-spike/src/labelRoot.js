// Stabiler DOM-Container für alle Html-Labels (verhindert removeChild-Fehler beim Etagenwechsel)
export const labelRoot = { current: null }
