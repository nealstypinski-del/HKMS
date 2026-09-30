import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
/** Gibt eine Kennzahl der statischen Szene aus (Meshes, Eckpunkte, Sitze). Für Umbauten ohne sichtbare Änderung. */
const scenarios = ['C_KASSELMEMES_TREND_SPIKE', 'F_FULL_HQ'];
const b = await launch({ url: pathToFileURL(resolve(process.argv[2] ?? 'dist/hochhaus3d.html')).href });
await b.waitFor('(window.__frames||0) >= 5');
for (const id of scenarios) {
  await b.eval(`(()=>{const s=document.getElementById('scenario'); s.value='${id}'; s.dispatchEvent(new Event('change'));})()`);
  const f = await b.eval('window.__frames||0'); await b.waitFor(`(window.__frames||0) >= ${f + 4}`);
  console.log(id, JSON.stringify(await b.eval('__hk.signature()')));
}
console.log('Fehler:', b.errors.length ? b.errors.join(' | ') : 'keine');
await b.close(); process.exit(0);
