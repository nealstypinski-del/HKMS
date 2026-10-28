// Whoop-MCP-Bridge: startet den lokalen whoop-ai-mcp Server (stdio) und stellt
// whoop_get_recovery / whoop_get_sleep / whoop_get_workouts als einfache HTTP-JSON-Endpunkte bereit.
//
// Konfiguration: health-os/whoop-mcp.config.json (siehe whoop-mcp.config.example.json
// oder `scripts/find-whoop-mcp.ps1` auf dem Windows-PC, das die bestehende Config findet).
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const here = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = process.env.WHOOP_MCP_CONFIG || join(here, '..', 'whoop-mcp.config.json')
const PORT = Number(process.env.WHOOP_BRIDGE_PORT || 8787)

const TOOLS = {
  recovery: 'whoop_get_recovery',
  sleep: 'whoop_get_sleep',
  workouts: 'whoop_get_workouts',
}

let client = null
let state = { connected: false, error: null, tools: [] }

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) throw new Error(`Keine Konfiguration gefunden: ${CONFIG_PATH}`)
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  if (!cfg.command) throw new Error('whoop-mcp.config.json: "command" fehlt')
  return cfg
}

async function connect() {
  try {
    const cfg = loadConfig()
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args || [],
      env: { ...process.env, ...(cfg.env || {}) },
      cwd: cfg.cwd,
    })
    client = new Client({ name: 'neal-health-os-2076', version: '1.0.0' })
    await client.connect(transport)
    const { tools } = await client.listTools()
    state = { connected: true, error: null, test: !!cfg.test || /mock/i.test((cfg.args || []).join(' ')), tools: tools.map((t) => t.name) }
    Object.assign(TOOLS, cfg.tools || {})
    console.log(`[bridge] Whoop-MCP verbunden. Tools: ${state.tools.join(', ')}`)
  } catch (e) {
    client = null
    state = { connected: false, error: String(e.message || e), tools: [] }
    console.error('[bridge] Verbindung fehlgeschlagen:', state.error)
  }
}

/** MCP-Ergebnis -> JSON (Tools liefern typischerweise einen JSON-String in content[0].text). */
function unwrap(result) {
  if (result?.structuredContent) return result.structuredContent
  const text = (result?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  try { return JSON.parse(text) } catch { return { text } }
}

async function callTool(kind, args = {}) {
  if (!client) throw new Error(state.error || 'Whoop-MCP nicht verbunden')
  const res = await client.callTool({ name: TOOLS[kind], arguments: args })
  if (res.isError) throw new Error(unwrap(res).text || 'Tool-Fehler')
  return unwrap(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    if (url.pathname === '/api/whoop/status') {
      if (!state.connected) await connect()
      return res.end(JSON.stringify(state))
    }
    const m = url.pathname.match(/^\/api\/whoop\/(recovery|sleep|workouts)$/)
    if (!m) { res.statusCode = 404; return res.end('{"error":"not found"}') }
    if (!client) await connect()
    const args = Object.fromEntries(url.searchParams)
    if (args.limit) args.limit = Number(args.limit)
    res.end(JSON.stringify(await callTool(m[1], args)))
  } catch (e) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(e.message || e) }))
  }
})

server.listen(PORT, () => {
  console.log(`[bridge] http://localhost:${PORT}  (Config: ${CONFIG_PATH})`)
  connect()
})
process.on('SIGINT', async () => { try { await client?.close() } catch {} process.exit(0) })
