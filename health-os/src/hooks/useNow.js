import { useEffect, useState } from 'react'

/** Sekundentakt-Uhr. `?t=HH:MM` in der URL überschreibt die Uhrzeit (Test/Screenshots). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const m = new URLSearchParams(location.search).get('t')?.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return now
  const d = new Date(now)
  d.setHours(+m[1], +m[2], now.getSeconds())
  return d
}
