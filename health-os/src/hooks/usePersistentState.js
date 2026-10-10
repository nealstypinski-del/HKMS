import { useCallback, useEffect, useRef, useState } from 'react'
import { dayKey } from '../lib/calc.js'

const NS = 'nhos2076:'

function read(key, init) {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw == null ? init : JSON.parse(raw)
  } catch {
    return init
  }
}
function write(key, value) {
  try { localStorage.setItem(NS + key, JSON.stringify(value)) } catch { /* Quota/Privatmodus: ignorieren */ }
}

/** useState mit localStorage-Persistenz (Weight, Water, Dose, …). */
export function usePersistentState(key, init) {
  const [value, setValue] = useState(() => read(key, init))
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    write(key, value)
  }, [key, value])
  return [value, setValue]
}

/**
 * Tages-State: wird um Mitternacht (bzw. beim nächsten Laden an einem neuen Tag) auf `init` zurückgesetzt.
 * Gespeichert als { day, v }.
 */
export function useDailyState(key, init) {
  const make = () => {
    const stored = read(key, null)
    return stored && stored.day === dayKey() ? stored.v : typeof init === 'function' ? init() : init
  }
  const [value, setValue] = useState(make)
  useEffect(() => { write(key, { day: dayKey(), v: value }) }, [key, value])
  const patch = useCallback((p) => setValue((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), [])
  return [value, setValue, patch]
}
