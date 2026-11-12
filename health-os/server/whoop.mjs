// Whoop-MCP (stdio) als Client: whoop_get_recovery / _sleep / _workouts.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export function createWhoop(cfg) {
  const TOOLS = { recovery: 'whoop_get_recovery', sleep: 'whoop_get_sleep', workouts: 'whoop_get_workouts', ...(cfg?.tools || {}) }
  let client = null
  let state = { connected: false, error: cfg?.command ? null : 'whoop-mcp.config.json fehlt oder ohne "command"', test: false, tools: [] }

  /** MCP-Ergebnis → JSON (typisch: JSON-String in content[0].text). */
  const unwrap = (result) => {
    if (result?.structuredContent) return result.structuredContent
    const text = (result?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    try { return JSON.parse(text) } catch { return { text } }
  }

  async function connect() {
    if (!cfg?.command) return state
    try {
      const transport = new StdioClientTransport({ command: cfg.command, args: cfg.args || [], env: { ...process.env, ...(cfg.env || {}) }, cwd: cfg.cwd })
      client = new Client({ name: 'neal-health-os-2076', version: '1.0.0' })
      await client.connect(transport)
      const { tools } = await client.listTools()
      state = { connected: true, error: null, test: !!cfg.test || /mock/i.test((cfg.args || []).join(' ')), tools: tools.map((t) => t.name) }
      console.log(`[whoop] verbunden. Tools: ${state.tools.join(', ')}`)
    } catch (e) {
      client = null
      state = { connected: false, error: String(e.message || e), test: false, tools: [] }
      console.error('[whoop] Verbindung fehlgeschlagen:', state.error)
    }
    return state
  }

  async function call(kind, args = {}) {
    if (!client) await connect()
    if (!client) throw new Error(state.error || 'Whoop-MCP nicht verbunden')
    const one = async (a) => {
      const res = await client.callTool({ name: TOOLS[kind], arguments: a })
      if (res.isError) throw new Error(unwrap(res).text || 'Tool-Fehler')
      return unwrap(res)
    }
    const { days, ...rest } = args
    if (!days) return one(rest)
    // Backfill: paginiert, bis `days` Einträge vorliegen oder kein next_token mehr kommt
    let records = []
    let token
    for (let page = 0; page < 8 && records.length < days; page++) {
      const r = await one({ ...rest, limit: 25, ...(token ? { nextToken: token, next_token: token } : {}) })
      records = records.concat(Array.isArray(r) ? r : r.records ?? [])
      token = r.next_token ?? r.nextToken
      if (!token) break
    }
    return { records: records.slice(0, days) }
  }

  return {
    status: async () => (state.connected ? state : connect()),
    call,
    close: async () => { try { await client?.close() } catch { /* ignorieren */ } },
  }
}
