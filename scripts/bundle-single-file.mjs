// Fasst den Vite Build (dist/) zu einer einzigen HTML Datei zusammen, damit die App als einzelne Seite veröffentlicht werden kann.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assets = readdirSync(join(dist, 'assets'))
const js = readFileSync(join(dist, 'assets', assets.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script')
const css = readFileSync(join(dist, 'assets', assets.find((f) => f.endsWith('.css'))), 'utf8')
const html = `<title>Herkules AI HQ</title>
<style>:root{color-scheme:dark}${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`
mkdirSync('single', { recursive: true })
writeFileSync('single/herkules-ai-hq.html', html)
console.log('single/herkules-ai-hq.html', (html.length / 1e6).toFixed(2), 'MB')
