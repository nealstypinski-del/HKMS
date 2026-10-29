// "npm run doctor": prüft die Whoop-MCP-Anbindung und speichert bereinigte Beispielantworten nach samples/.
// Danach können die Normalisierer in src/mcp/whoopClient.js exakt auf dein Format abgestimmt werden.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWhoop } from '../server/whoop.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG = process.env.WHOOP_MCP_CONFIG || join(ROOT, 'whoop-mcp.config.json')
const ok = (m) => console.log(`  ✓ ${m}`)
const bad = (m) => console.log(`  ✗ ${m}`)

// Struktur (Schlüssel + Typen) zeigen, Zahlen/Texte unkenntlich machen – es sollen keine Gesundheitsdaten im Chat landen.
const shape = (v, d = 0) => Array.isArray(v) ? [shape(v[0], d + 1), v.length > 1 ? `… ${v.length} Einträge` : undefined].filter((x) => x !== undefined)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, d > 5 ? '…' : shape(x, d + 1)]))
  : typeof v === 'number' ? 'number' : typeof v === 'string' ? (/^\d{4}-\d{2}-\d{2}T/.test(v) ? 'iso-datum' : 'string') : typeof v

console.log('\nNEAL HEALTH OS – Whoop-MCP-Check\n')
if (!existsSync(CONFIG)) { bad(`Keine Konfiguration: ${CONFIG}`); console.log('    → powershell -ExecutionPolicy Bypass -File scripts\\find-whoop-mcp.ps1  (oder whoop-mcp.config.example.json kopieren)'); process.exit(1) }
let cfg
try { cfg = JSON.parse(readFileSync(CONFIG, 'utf8')); ok('Konfiguration gelesen') } catch (e) { bad(`Konfiguration unlesbar: ${e.message}`); process.exit(1) }
if (!cfg.command) { bad('"command" fehlt in der Konfiguration'); process.exit(1) }
console.log(`    Befehl: ${cfg.command} ${(cfg.args || []).join(' ')}`)

const whoop = createWhoop(cfg)
const st = await whoop.status()
if (!st.connected) { bad(`MCP-Start fehlgeschlagen: ${st.error}`); process.exit(1) }
ok(`MCP verbunden${st.test ? ' (als TEST erkannt)' : ''}. Tools: ${st.tools.join(', ')}`)

mkdirSync(join(ROOT, 'samples'), { recursive: true })
let failed = 0
for (const kind of ['recovery', 'sleep', 'workouts']) {
  try {
    const res = await whoop.call(kind, { limit: 3 })
    const s = shape(res)
    writeFileSync(join(ROOT, 'samples', `whoop-${kind}.shape.json`), JSON.stringify(s, null, 2))
    ok(`whoop_get_${kind}: Antwort erhalten → samples/whoop-${kind}.shape.json`)
    console.log('    ' + JSON.stringify(s).slice(0, 300))
  } catch (e) { failed++; bad(`whoop_get_${kind}: ${e.message}`) }
}
await whoop.close()
console.log(failed ? '\nEinige Tools schlugen fehl – Tool-Namen unter "tools" in der Konfiguration prüfen.' : '\nAlles in Ordnung. Die Dateien in samples/ (nur Struktur, keine Messwerte) kannst du mir zeigen, falls Felder nicht erkannt werden.')
process.exit(failed ? 1 : 0)
