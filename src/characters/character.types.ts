// Palette und Varianten des Charaktersystems. Avatar Daten sind nur Strings, damit später ein Character Creator
// dieselbe Struktur speichern kann. Unbekannte Varianten fallen sicher auf Standardwerte zurück.

export const SKIN_COLORS: Record<string, string> = { s1: '#f6d3b8', s2: '#e8b48d', s3: '#c98e63', s4: '#a26a45', s5: '#7a4b31', s6: '#4f2f20' }
export const HAIR_COLORS: Record<string, string> = { h1: '#2b2118', h2: '#6b4423', h3: '#c9a24a', h4: '#161616', h5: '#a33b2a', h6: '#8a8f99' }
export const SHIRT_COLORS: Record<string, string> = {
  c1: '#ff8a3d', c2: '#2fd6c0', c3: '#5b6ee1', c4: '#e15b7a', c5: '#f2c94c', c6: '#8e6bd8', c7: '#3aa76d', c8: '#e9ecf4',
}
export const PANTS_COLORS: Record<string, string> = { p1: '#2c3550', p2: '#4a3f36', p3: '#3d4a44', p4: '#5a5f73' }

export const HAIR_STYLES = ['short', 'long', 'bun', 'curly', 'fauxhawk', 'bald'] as const
export const SHIRT_STYLES = ['tee', 'hoodie', 'collar', 'vest'] as const
export const ACCESSORIES = ['glasses', 'headset', 'badge', 'cap', 'beanie'] as const

export type HairStyle = (typeof HAIR_STYLES)[number]
export type ShirtStyle = (typeof SHIRT_STYLES)[number]

export const pick = (table: Record<string, string>, key: string, fallback: string): string => table[key] ?? fallback
