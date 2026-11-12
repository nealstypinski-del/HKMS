// Health-OS-Server: Sync-Store (JSON + SSE), Health-Auto-Export-Webhook, Whoop-MCP-Bridge, statisches Frontend.
import http from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore, KEY_RE } from './store.mjs'
import { createWhoop } from './whoop.mjs'
import { mergeHealth, parseHealthExport } from './healthExport.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const CONFIG_PATH = process.env.WHOOP_MCP_CONFIG || join(ROOT, 'whoop-mcp.config.json')
const DATA_DIR = process.env.HEALTH_OS_DATA || join(ROOT, 'data')
const DIST = join(ROOT, 'dist')
const MAX_BODY = 2 * 1024 * 1024

const cfg = existsSync(CONFIG_PATH) ? JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) : {}
const PORT = Number(process.env.PORT || process.env.WHOOP_BRIDGE_PORT || cfg.port || 8787)
const HOST = cfg.host || '0.0.0.0'

// Zugriffstoken: aus Config, sonst einmalig erzeugt und in data/token.txt gespeichert.
function loadToken() {
  if (cfg.token) return cfg.token
  const f = join(DATA_DIR, 'token.txt')
  if (existsSync(f)) return readFileSync(f, 'utf8').trim()
  mkdirSync(DATA_DIR, { recursive: true })
  const t = randomBytes(12).toString('hex')
  writeFileSync(f, t)
  return t
}
const TOKEN = loadToken()

const store = createStore(join(DATA_DIR, 'state.json'))
const whoop = createWhoop(cfg)
const sse = new Set()

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }

const isLoopback = (req) => /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '')
const cookieOf = (req, name) => (req.headers.cookie || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === name)?.[1]
const authorized = (req, url) =>
  isLoopback(req) || [url.searchParams.get('token'), req.headers['x-token'], (req.headers.authorization || '').replace(/^Bearer\s+/i, ''), cookieOf(req, 'nhos')].includes(TOKEN)

const json = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('Body zu groß')); req.destroy() } else chunks.push(c) })
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) } catch { reject(new Error('Ungültiges JSON')) } })
    req.on('error', reject)
  })
}

store.bus.on('change', (e) => { const msg = `event: state\ndata: ${JSON.stringify(e)}\n\n`; for (const r of sse) r.write(msg) })
setInterval(() => { for (const r of sse) r.write(': keepalive\n\n') }, 25000).unref()

function serveStatic(req, res, url) {
  if (!existsSync(join(DIST, 'index.html'))) { res.statusCode = 503; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Frontend nicht gebaut: "npm run build" ausführen (oder "npm start").') }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '')
  let file = join(DIST, p)
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html') // SPA
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream')
  if (/\/assets\//.test(file) || file.endsWith('.webp')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    // Token-Übergabe per Link/QR: Cookie setzen und auf die saubere URL umleiten
    if (!url.pathname.startsWith('/api/') && url.searchParams.get('token') === TOKEN) {
      res.setHeader('Set-Cookie', `nhos=${TOKEN}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`)
      res.statusCode = 302; res.setHeader('Location', url.pathname); return res.end()
    }
    if (!authorized(req, url)) {
      res.statusCode = 401; res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.end('<meta charset="utf-8"><body style="background:#04060a;color:#eef2ff;font:16px system-ui;padding:32px"><h1>NEAL HEALTH OS 2076</h1><p>Zugriffstoken fehlt. Den QR-Code/Link aus dem Server-Fenster öffnen (…/?token=…).</p>')
    }
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url)

    res.setHeader('Cache-Control', 'no-store')

    if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, store.all())

    const m = url.pathname.match(/^\/api\/state\/([A-Za-z0-9]+)$/)
    if (m && req.method === 'PUT') {
      if (!KEY_RE.test(m[1])) return json(res, 400, { error: 'ungültiger Schlüssel' })
      const body = await readBody(req)
      if (!('v' in body)) return json(res, 400, { error: 'Feld "v" fehlt' })
      const r = store.set(m[1], body.v, Number.isFinite(body.ts) ? body.ts : Date.now())
      return json(res, r.accepted ? 200 : 409, r)
    }

    if (url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write(': ok\n\n')
      sse.add(res)
      req.on('close', () => sse.delete(res))
      return
    }

    if (url.pathname === '/api/health-export' && req.method === 'POST') {
      const parsed = parseHealthExport(await readBody(req))
      const merged = mergeHealth(store.get('health')?.v, parsed)
      store.set('health', merged)
      const days = Object.keys(parsed)
      console.log(`[health] ${days.length} Tag(e) empfangen: ${days.map((d) => `${d}=${parsed[d].steps ?? '–'} Schritte`).join(', ')}`)
      return json(res, 200, { ok: true, days })
    }

    if (url.pathname === '/api/whoop/status') return json(res, 200, await whoop.status())
    const w = url.pathname.match(/^\/api\/whoop\/(recovery|sleep|workouts)$/)
    if (w) {
      const args = Object.fromEntries(url.searchParams)
      delete args.token
      for (const k of ['limit', 'days']) if (args[k]) args[k] = Number(args[k])
      return json(res, 200, await whoop.call(w[1], args))
    }
    json(res, 404, { error: 'not found' })
  } catch (e) {
    json(res, /JSON|Body|Kein "data/.test(String(e.message)) ? 400 : 502, { error: String(e.message || e) })
  }
})

function lanUrls() {
  return Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => `http://${i.address}:${PORT}`)
}

server.listen(PORT, HOST, async () => {
  console.log(`\n[server] NEAL HEALTH OS 2076 läuft: http://localhost:${PORT}   (Daten: ${DATA_DIR})`)
  const urls = lanUrls()
  if (urls.length) {
    const link = `${urls[0]}/?token=${TOKEN}`
    console.log(`[server] Handy/anderes Gerät (WLAN): ${link}`)
    console.log(`[server] Health Auto Export → POST ${urls[0]}/api/health-export  Header "x-token: ${TOKEN}"`)
    try { (await import('qrcode-terminal')).default.generate(link, { small: true }) } catch { /* QR optional */ }
  }
  whoop.status().then((s) => { if (!s.connected) console.log('[whoop] nicht verbunden:', s.error) })
})

const stop = async () => { store.flush(); await whoop.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
