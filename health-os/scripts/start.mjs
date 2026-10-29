// Produktivstart: Frontend bauen (falls nötig) und den Server starten, der auch das Frontend ausliefert.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((m, e) => Math.max(m, e.isDirectory() ? newest(join(dir, e.name)) : statSync(join(dir, e.name)).mtimeMs), 0)
const win = process.platform === 'win32'
const dist = join('dist', 'index.html')
if (!existsSync(dist) || newest('src') > statSync(dist).mtimeMs) {
  console.log('[start] Frontend wird gebaut …')
  const r = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: win })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
const srv = spawn('node', ['server/index.mjs'], { stdio: 'inherit', shell: win })
process.on('SIGINT', () => srv.kill())
srv.on('exit', (c) => process.exit(c ?? 0))
