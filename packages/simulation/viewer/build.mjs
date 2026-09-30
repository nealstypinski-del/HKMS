import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] ?? 'dist/hochhaus3d.html';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: !process.env.HK_DEBUG, format: 'iife', target: 'es2020', write: false, loader: { '.ts': 'ts' }, logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = readFileSync('template.html', 'utf8').replace('/*BUNDLE*/', () => js);
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
