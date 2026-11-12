import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { dayKey } from '../lib/calc.js'
import { sync } from '../lib/sync.js'

/** 'connecting' | 'online' | 'local' – Zustand der Server-Synchronisation. */
export function useSyncMode() {
  return useSyncExternalStore(sync.subscribeMode, sync.mode)
}

/** useState mit localStorage-Cache und Server-Sync (siehe lib/sync.js). */
export function usePersistentState(key, init) {
  const initRef = useRef(init)
  const [value, setLocal] = useState(() => sync.read(key, init))
  useEffect(() => {
    sync.start()
    setLocal(sync.read(key, initRef.current))
    return sync.subscribe(key, (v) => setLocal(v))
  }, [key])
  const set = useCallback((upd) => {
    const cur = sync.read(key, initRef.current)
    sync.write(key, typeof upd === 'function' ? upd(cur) : upd)
  }, [key])
  return [value, set]
}

/**
 * Tages-State: gespeichert als { day, v }; an einem neuen Tag (auch um Mitternacht bei laufender App)
 * gilt wieder `init`.
 */
export function useDailyState(key, init) {
  const make = useRef(typeof init === 'function' ? init : () => init)
  const [stored, setStored] = usePersistentState(key, null)
  const today = dayKey()
  const [fresh, setFresh] = useState(() => ({ day: today, v: make.current() }))
  const current = stored && stored.day === today ? stored.v : (fresh.day === today ? fresh.v : make.current())
  useEffect(() => { if (fresh.day !== today) setFresh({ day: today, v: make.current() }) }, [today, fresh.day])

  const setValue = useCallback((upd) => {
    setStored((s) => {
      const base = s && s.day === dayKey() ? s.v : make.current()
      return { day: dayKey(), v: typeof upd === 'function' ? upd(base) : upd }
    })
  }, [setStored])
  const patch = useCallback((p) => setValue((base) => ({ ...base, ...(typeof p === 'function' ? p(base) : p) })), [setValue])
  return [current, setValue, patch]
}
