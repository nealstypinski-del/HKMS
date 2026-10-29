// Sync-Schicht: localStorage als lokaler Cache, der Server (/api/state + SSE) als gemeinsame Quelle.
// Last-Write-Wins je Schlüssel (ts = ms). Ohne Server bleibt alles lokal ("LOKAL") und wird später nachgeschoben.
const NS = 'nhos2076:'
export const SYNCED = new Set(['weight', 'weightLog', 'dose', 'measure', 'activeKcal', 'xpLedger', 'daily', 'targetKg', 'health', 'days', 'pharmaLog'])

const memo = new Map() // key -> { v, ts }
const subs = new Map() // key -> Set<fn>
const modeSubs = new Set()
let mode = 'connecting' // 'connecting' | 'online' | 'local'
let started = false
let es = null
let retry = null

const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* Quota/Privatmodus */ } },
}

function load(key) {
  if (memo.has(key)) return memo.get(key)
  const raw = ls.get(NS + key)
  let entry = null
  if (raw != null) { try { entry = { v: JSON.parse(raw), ts: Number(ls.get(`${NS}ts:${key}`)) || 0 } } catch { entry = null } }
  if (entry) memo.set(key, entry)
  return entry
}

function store(key, v, ts) {
  memo.set(key, { v, ts })
  ls.set(NS + key, JSON.stringify(v))
  ls.set(`${NS}ts:${key}`, String(ts))
  subs.get(key)?.forEach((fn) => fn(v))
}

function setMode(m) {
  if (mode === m) return
  mode = m
  modeSubs.forEach((fn) => fn())
}

async function api(path, opts) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } })
  if (r.status === 401) throw new Error('401')
  return r
}

async function push(key) {
  const e = load(key)
  if (!e) return
  try {
    const r = await api(`/api/state/${key}`, { method: 'PUT', body: JSON.stringify({ v: e.v, ts: e.ts }) })
    if (r.status === 409) { const { entry } = await r.json(); if (entry && entry.ts > e.ts) store(key, entry.v, entry.ts) }
    else if (!r.ok) throw new Error(String(r.status))
    if (mode === 'local') reconcile() // Server wieder erreichbar: erst abgleichen, dann "online"
  } catch { if (mode !== 'connecting') setMode('local'); scheduleRetry() }
}

function scheduleRetry() {
  if (retry) return
  retry = setTimeout(() => { retry = null; reconcile() }, 10000)
}

/** Lokal ↔ Server abgleichen (neuerer Zeitstempel gewinnt, ältere Seite wird überschrieben). */
async function reconcile() {
  try {
    const r = await api('/api/state')
    if (!r.ok) throw new Error(String(r.status))
    const server = await r.json()
    for (const key of SYNCED) {
      const s = server[key], l = load(key)
      if (s && (!l || s.ts > l.ts)) store(key, s.v, s.ts)
      else if (l && (!s || l.ts > s.ts)) await push(key)
    }
    setMode('online')
    openEvents()
  } catch { setMode('local'); scheduleRetry() }
}

function openEvents() {
  if (es || typeof EventSource === 'undefined') return
  es = new EventSource('/api/events')
  es.addEventListener('state', (ev) => {
    try {
      const { key, v, ts } = JSON.parse(ev.data)
      const l = load(key)
      if (SYNCED.has(key) && (!l || ts > l.ts)) store(key, v, ts)
    } catch { /* ignorieren */ }
  })
  es.onopen = () => setMode('online')
  es.onerror = () => { setMode('local'); scheduleRetry() }
}

export const sync = {
  start() { if (!started) { started = true; reconcile() } },
  read(key, init) { return load(key)?.v ?? init },
  write(key, v) {
    store(key, v, Date.now())
    if (SYNCED.has(key)) push(key)
  },
  subscribe(key, fn) {
    if (!subs.has(key)) subs.set(key, new Set())
    subs.get(key).add(fn)
    return () => subs.get(key).delete(fn)
  },
  mode: () => mode,
  subscribeMode(fn) { modeSubs.add(fn); return () => modeSubs.delete(fn) },
}
