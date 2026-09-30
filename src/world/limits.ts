/** Obergrenzen und Prüfung für Agentenstarts. Eine Aufgabe: verhindern, dass Eingaben die Welt überlasten. */
export const MAX_AGENTS_TOTAL = 300
export const MAX_LAUNCH_AT_ONCE = 100

export type LaunchLimit = 'ok' | 'invalid' | 'per-launch-cap' | 'total-cap' | 'full'

/** Macht aus beliebiger Eingabe eine ganze Zahl >= 0. Text, NaN, Unendlich und negative Werte ergeben 0. */
export function sanitizeCount(n: unknown): number {
  const v = typeof n === 'string' && n.trim() !== '' ? Number(n) : n
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  return Math.max(0, Math.floor(v))
}

/** Wie viele der angeforderten Agenten tatsächlich gestartet werden dürfen, und warum weniger. */
export function allowedLaunch(requested: unknown, currentTotal: number): { count: number; reason: LaunchLimit } {
  const asked = sanitizeCount(requested)
  if (asked === 0) return { count: 0, reason: 'invalid' }
  const room = Math.max(0, MAX_AGENTS_TOTAL - Math.max(0, Math.floor(currentTotal)))
  if (room === 0) return { count: 0, reason: 'full' }
  const perLaunch = Math.min(asked, MAX_LAUNCH_AT_ONCE)
  const count = Math.min(perLaunch, room)
  if (count === asked) return { count, reason: 'ok' }
  return { count, reason: asked > MAX_LAUNCH_AT_ONCE && count === MAX_LAUNCH_AT_ONCE ? 'per-launch-cap' : 'total-cap' }
}

export const limitMessage = (reason: LaunchLimit, count: number): string | null => {
  switch (reason) {
    case 'ok': return null
    case 'invalid': return 'Ungültige Anzahl. Bitte eine Zahl ab 1 wählen.'
    case 'per-launch-cap': return `Höchstens ${MAX_LAUNCH_AT_ONCE} Agenten auf einmal. Es wurden ${count} gestartet.`
    case 'total-cap': return `Insgesamt höchstens ${MAX_AGENTS_TOTAL} Agenten. Es wurden nur ${count} gestartet.`
    case 'full': return `Die Welt ist voll (${MAX_AGENTS_TOTAL} Agenten). Erst Agenten entfernen.`
  }
}
