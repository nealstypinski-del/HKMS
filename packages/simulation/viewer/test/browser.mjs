import { spawn } from 'node:child_process';

/** Startet Chromium headless und steuert es über das DevTools Protokoll. Nur diese eine Aufgabe. */
export async function launch({ url, width = 1400, height = 900, webgl = true }) {
  const bin = process.env.CHROME_BIN ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const port = 9300 + Math.floor(Math.random() * 500);
  const flags = ['--headless=new', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`];
  flags.push(...(webgl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--disable-3d-apis', '--disable-gpu']));
  const chrome = spawn(bin, [...flags, 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let targets;
  for (let i = 0; i < 80; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {} await sleep(250); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (d.method === 'Runtime.exceptionThrown') errors.push('Ausnahme: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const api = {
    errors, sleep, send,
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; },
    async resize(w, h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); },
    async waitFor(expr, timeoutMs = 120_000) { const t0 = Date.now(); while (Date.now() - t0 < timeoutMs) { if (await api.eval(expr)) return true; await sleep(400); } return false; },
    async close() { try { ws.close(); } catch {} chrome.kill('SIGKILL'); },
  };
  await send('Runtime.enable'); await send('Page.enable');
  await api.resize(width, height);
  await send('Page.navigate', { url });
  return api;
}
