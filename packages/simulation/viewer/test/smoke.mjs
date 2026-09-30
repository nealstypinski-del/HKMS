import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';

/** Rauchtest und Missbrauchstest des Viewers im echten Browser (Software WebGL). Aufruf: node test/smoke.mjs [html]. */
const html = resolve(process.argv[2] ?? 'dist/hochhaus3d.html');
const url = pathToFileURL(html).href;
const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass }); console.log(`${pass ? 'BESTANDEN' : 'FEHLER   '}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const frames = (b) => b.eval('window.__frames||0');

// 1. Normalbetrieb
let b = await launch({ url });
const up = await b.waitFor('(window.__frames||0) >= 12');
check('Startet und rendert Bilder', up, `Bilder: ${await frames(b)}`);
check('Ladebildschirm ist weg', (await b.eval("document.getElementById('loading').hidden")) === true);
check('22 Agenten geladen', (await b.eval('__hk.engine.getMetrics().totalAgents')) === 22);
check('Keine Konsolenfehler beim Start', b.errors.length === 0, b.errors[0] ?? '');

// 2. Mehrfaches Neustarten (Speicherlecks)
await b.eval("document.getElementById('restart').click()"); await b.sleep(1500);
const geo0 = await b.eval('__hk.renderer.info.memory.geometries'), tex0 = await b.eval('__hk.renderer.info.memory.textures');
for (let i = 0; i < 12; i++) { await b.eval("document.getElementById('restart').click()"); await b.sleep(150); }
await b.sleep(2500);
const geo1 = await b.eval('__hk.renderer.info.memory.geometries'), tex1 = await b.eval('__hk.renderer.info.memory.textures');
check('12 schnelle Neustarts: Geometrien wachsen nicht', geo1 <= geo0 * 1.3 + 50, `${geo0} -> ${geo1}`);
check('12 schnelle Neustarts: Texturen wachsen nicht', tex1 <= tex0 * 1.3 + 20, `${tex0} -> ${tex1}`);

// 3. Alle Szenarien nacheinander
for (const id of ['A_MORNING_START', 'B_BUSY_SALES_DAY', 'C_KASSELMEMES_TREND_SPIKE', 'D_DEVELOPMENT_SPRINT', 'E_WAITING_FOR_APPROVAL', 'F_FULL_HQ']) {
  await b.eval(`(()=>{const s=document.getElementById('scenario'); s.value='${id}'; s.dispatchEvent(new Event('change'));})()`);
  const f0 = await frames(b); await b.waitFor(`(window.__frames||0) >= ${f0 + 6}`, 60_000);
  const n = await b.eval('__hk.engine.getMetrics().totalAgents');
  check(`Szenario ${id}`, n === (id === 'F_FULL_HQ' ? 60 : 22), `${n} Agenten`);
}

// 4. Fenstergröße 0 und winzig
const f1 = await frames(b);
await b.resize(0, 0); await b.sleep(600); await b.resize(1, 1); await b.sleep(600); await b.resize(300, 200); await b.sleep(600); await b.resize(1400, 900);
await b.waitFor(`(window.__frames||0) >= ${f1 + 5}`, 60_000);
check('Fenster 0x0 und 1x1 überlebt', (await frames(b)) > f1);

// 5. Freigabe Knopf hämmern, Etagenwechsel während Rolltreppenfahrt, Folgen und Abbruch
for (let i = 0; i < 25; i++) await b.eval("document.getElementById('approve').click()");
await b.eval("__hk.engine.setAgentWorking('sh-operations',{departmentId:'HERKULESJOBS',requiredCapabilities:['operations']}); __hk.follow('sh-operations');");
for (let i = 0; i < 20; i++) { await b.eval(`__hk.setView(${i % 5})`); await b.sleep(120); }
await b.eval("__hk.engine.setAgentAvailable('sh-operations')");
await b.eval("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");
const f2 = await frames(b); await b.waitFor(`(window.__frames||0) >= ${f2 + 5}`, 60_000);
check('Knopf und Etagen Missbrauch ohne Fehler', b.errors.length === 0, b.errors[0] ?? '');

// 6. Extreme Pausen und Tempowechsel
for (const s of [1, 10, 2, 5, 10, 1]) await b.eval(`__hk.engine.setSpeed(${s})`);
await b.eval('__hk.engine.pause(); __hk.engine.pause(); __hk.engine.resume();');
check('Tempo und Pause Missbrauch ohne Fehler', b.errors.length === 0, b.errors[0] ?? '');
await b.close();

// 7. Ohne WebGL: verständliche Meldung statt weißem Bild
const nb = await launch({ url, webgl: false });
await nb.sleep(4000);
const msg = await nb.eval("document.getElementById('loading').textContent");
const shown = await nb.eval("document.getElementById('loading').hidden === false");
check('Ohne WebGL: klare Meldung sichtbar', shown && /WebGL/.test(msg ?? ''), (msg ?? '').slice(0, 60));
await nb.close();

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed ? 1 : 0);
