// JSON-Datei-Store mit Last-Write-Wins je Schlüssel. Werte: { v, ts }.
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const KEY_RE = /^[a-z][A-Za-z0-9]{0,31}$/

export function createStore(file, { debounceMs = 250 } = {}) {
  const bus = new EventEmitter()
  let data = {}
  let timer = null

  if (file && existsSync(file)) {
    try { data = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error('[store] state.json unlesbar, starte leer:', e.message) }
  }

  function flush() {
    timer = null
    if (!file) return
    mkdirSync(dirname(file), { recursive: true })
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(data))
    renameSync(tmp, file) // atomar
  }
  const schedule = () => { if (!timer) timer = setTimeout(flush, debounceMs) }

  return {
    bus,
    all: () => data,
    get: (key) => data[key],
    /** @returns {{accepted:boolean, entry:{v:any,ts:number}}} */
    set(key, v, ts = Date.now()) {
      if (!KEY_RE.test(key)) throw new Error(`Ungültiger Schlüssel: ${key}`)
      const cur = data[key]
      if (cur && cur.ts > ts) return { accepted: false, entry: cur }
      data[key] = { v, ts }
      schedule()
      bus.emit('change', { key, v, ts })
      return { accepted: true, entry: data[key] }
    },
    flush: () => { if (timer) { clearTimeout(timer); flush() } },
  }
}
