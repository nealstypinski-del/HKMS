import * as THREE from 'three';
import { createScenarioEngine, listScenarios, formatClock } from '../../src/index';
import { buildWorld, FH, resetMaterialCache } from './world.js';
import { webglAvailable, showMessage, hideMessage } from './guard/webgl.js';
import { disposeObject } from './guard/dispose.js';
import { Crowd } from './agents.js';
import * as T from './textures.js';

const TITLE_DE = { A_MORNING_START: 'Morgenstart', B_BUSY_SALES_DAY: 'Vertriebstag unter Volllast', C_KASSELMEMES_TREND_SPIKE: 'KasselMemes Trendwelle', D_DEVELOPMENT_SPRINT: 'Entwicklungs Sprint', E_WAITING_FOR_APPROVAL: 'Warten auf Freigabe', F_FULL_HQ: 'Volles HQ (60 Agenten)' };
const STATUS_DE = { AVAILABLE: 'verfügbar', ASSIGNED: 'zugewiesen', MOVING: 'unterwegs', WORKING: 'arbeitet', WAITING: 'wartet auf Freigabe', MEETING: 'im Meeting', BREAK: 'Pause', ERROR: 'Fehler', COMPLETED: 'fertig', OFFLINE: 'offline' };
const INTENT_DE = { GO_TO_DESK: 'geht zum Schreibtisch', USE_WORKSTATION: 'arbeitet am Platz', GO_TO_AGENT_BENCH: 'geht zur Bank', SIT_ON_AGENT_BENCH: 'ruht auf der Bank', GO_TO_KITCHEN: 'geht in die Küche', USE_KITCHEN: 'in der Küche', GO_TO_LOUNGE: 'geht in die Lounge', SIT_IN_LOUNGE: 'in der Lounge', GO_TO_MEETING: 'geht zum Meeting', ATTEND_MEETING: 'im Meeting', GO_TO_ELEVATOR: 'geht zur Rolltreppe', CHANGE_FLOOR: 'fährt Rolltreppe', WAIT_FOR_APPROVAL: 'wartet auf Freigabe', RETURN_TO_DESK: 'zurück zum Schreibtisch', WANDER: 'macht einen Spaziergang', IDLE: 'steht bereit' };
const ACT_DE = { SIT: 'sitzt', CHAT_VISUAL: 'unterhält sich', READ: 'liest', REST: 'ruht sich aus', WATCH_TV: 'schaut Fernsehen', WAIT: 'wartet', STAND: 'steht', WORK: 'arbeitet', USE_KITCHEN: 'holt Kaffee', ATTEND_MEETING: 'im Gespräch', WAIT_FOR_APPROVAL: 'wartet' };
const DEPT_DE = { HERKULESJOBS: 'HerkulesJobs', KASSELMEMES: 'KasselMemes', SHARED: 'Shared' };
const STATUS_HEX = { AVAILABLE: '#7fd1ff', ASSIGNED: '#f2f5ff', MOVING: '#f2f5ff', WORKING: '#4fdc8a', WAITING: '#ffc94d', MEETING: '#4da3ff', BREAK: '#c084fc', ERROR: '#ff5c5c', COMPLETED: '#a7f3c8' };
const VIEWS = [['Turm', 99], ['Erdgeschoss', 0], ['HerkulesJobs', 1], ['KasselMemes', 2], ['Entwicklung', 3], ['Wellness', 4]];
const $ = (id) => document.getElementById(id);

const canvas = $('gl');
if (!webglAvailable()) { showMessage('Dein Browser oder Gerät unterstützt kein WebGL. Bitte einen aktuellen Browser mit eingeschalteter Hardwarebeschleunigung verwenden.'); throw new Error('HK:kein WebGL'); }
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = T.skyTex(); scene.fog = new THREE.Fog(0xeadfcf, 170, 420);

scene.add(new THREE.HemisphereLight(0xdfeeff, 0xe8d6b8, 1.0));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 320 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xbcd7ff, 0.45); fill.position.set(60, 30, -40); scene.add(fill);

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 600);
const cam = { az: 0.72, el: 0.62, target: new THREE.Vector3(20, 8.4, 15), size: 36, goalTarget: new THREE.Vector3(20, 8.4, 15), goalSize: 36, goalAz: 0.72, goalEl: 0.62 };

let follow = null; let engine, world, crowd, speed = 5, focusView = 2, selected = null, simTime = 0, escTime = 0, lastUi = 0, lastTv = 0;
const sel = $('scenario');
listScenarios().forEach((s) => { const o = document.createElement('option'); o.value = s.id; o.textContent = TITLE_DE[s.id] || s.title; sel.appendChild(o); });
sel.value = 'C_KASSELMEMES_TREND_SPIKE';

function boot() {
  if (world) { scene.remove(world.world); disposeObject(world.world); }
  if (crowd) crowd.list.forEach((r) => { scene.remove(r.ch.root); disposeObject(r.ch.root); });
  resetMaterialCache();
  engine = createScenarioEngine(sel.value); engine.runFor(150000); engine.setSpeed(speed);
  world = buildWorld(engine, scene); crowd = new Crowd(engine, world, scene);
  follow = null; const b = world.bounds; cam.goalTarget.set((b.X0 + b.X1) / 2, 2 * FH, (b.Z0 + b.Z1) / 2);
  setView(focusView, true); selected = null; crowd.select(null); showInfo(null);
}

function setView(f, instant) {
  focusView = f; if (!world) return; if (!instant && !setView.fromFollow) follow = null;
  world.floors.forEach((fl) => { fl.group.visible = fl.index <= f; if (fl.escalator) fl.escalator = fl.escalator; });
  crowd.setFocus(f);
  const b = world.bounds, cx = (b.X0 + b.X1) / 2, cz = (b.Z0 + b.Z1) / 2;
  if (f >= 99) { cam.goalTarget.set(cx, 2 * FH + 2.2, cz + 6); cam.goalSize = 52; cam.goalAz = 0.5; cam.goalEl = 0.3; } else { cam.goalTarget.set(cx, f * FH + 0.8, cz); cam.goalSize = 36; cam.goalAz = 0.72; cam.goalEl = 0.62; }
  if (instant) { cam.target.copy(cam.goalTarget); cam.size = cam.goalSize; cam.az = cam.goalAz; cam.el = cam.goalEl; }
  document.querySelectorAll('[data-view]').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.dataset.view) === f)));
}

function placeCamera() {
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight, asp = w / h;
  camera.left = -cam.size * asp / 2; camera.right = cam.size * asp / 2; camera.top = cam.size / 2; camera.bottom = -cam.size / 2; camera.updateProjectionMatrix();
  const d = 200, ce = Math.cos(cam.el);
  camera.position.set(cam.target.x + Math.sin(cam.az) * ce * d, cam.target.y + Math.sin(cam.el) * d, cam.target.z + Math.cos(cam.az) * ce * d); camera.lookAt(cam.target);
  sun.position.set(cam.target.x - 40, cam.target.y + 100, cam.target.z + 50); sun.target.position.copy(cam.target); sun.target.updateMatrixWorld();
}
function resize() { const w = window.innerWidth, h = window.innerHeight; if (!(w > 0 && h > 0)) return; renderer.setSize(w, h, false); placeCamera(); }
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showMessage('Die Grafik wurde vom Browser unterbrochen. Sie wird wiederhergestellt ...'); });
canvas.addEventListener('webglcontextrestored', () => { hideMessage(); });

// Steuerung: ziehen = drehen, Umschalt oder rechte Taste = verschieben, Rad = zoomen
let drag = null, moved = 0;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; moved = 0; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) { hover(e); return; }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  if (drag.pan) { const k = cam.size / canvas.clientHeight; const rx = Math.cos(cam.az), rz = -Math.sin(cam.az); cam.goalTarget.x -= (dx * rx) * k; cam.goalTarget.z -= (dx * rz) * k; cam.goalTarget.x += dy * Math.sin(cam.az) * k * 1.3; cam.goalTarget.z += dy * Math.cos(cam.az) * k * 1.3; }
  else { cam.goalAz = cam.az = cam.az - dx * 0.006; cam.goalEl = cam.el = Math.min(1.25, Math.max(0.18, cam.el + dy * 0.004)); }
});
canvas.addEventListener('pointerup', (e) => { if (moved < 5) pickAt(e); drag = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.goalSize = Math.min(120, Math.max(10, cam.goalSize * Math.pow(1.0015, e.deltaY))); }, { passive: false });
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function pick(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return crowd.pick(ray); }
function pickAt(e) { const rec = pick(e); selected = rec; crowd.select(rec); showInfo(rec); }
function hover(e) { canvas.style.cursor = crowd && pick(e) ? 'pointer' : 'grab'; }

function showInfo(rec) {
  const box = $('info'); if (!rec) { box.hidden = true; return; }
  const a = rec.a, task = a.taskId ? engine.getTask(a.taskId) : null;
  box.hidden = false;
  $('iname').textContent = a.name; $('idept').textContent = DEPT_DE[a.departmentId] + ' · ' + a.role;
  $('istatus').textContent = STATUS_DE[a.status] + ' · ' + (INTENT_DE[a.intent] || a.intent) + (a.activity ? ' · ' + (ACT_DE[a.activity] || a.activity) : '');
  $('istatus').style.color = STATUS_HEX[a.status] || '#fff';
  $('itask').textContent = task ? `${task.id} ${task.title}` : 'Keine Aufgabe';
  $('icaps').textContent = a.capabilities.join(', ');
  $('follow').textContent = follow === rec ? 'Kamera folgt (beenden)' : 'Kamera folgt diesem Agenten';
}

function ui(force) {
  const m = engine.getMetrics(), ck = engine.getClock();
  $('clock').textContent = formatClock(ck.nowMs);
  $('day').textContent = new Date(ck.nowMs).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' });
  const chips = [['arbeiten', m.workingAgents, STATUS_HEX.WORKING], ['unterwegs', m.movingAgents, STATUS_HEX.MOVING], ['Meeting', m.meetingAgents, STATUS_HEX.MEETING], ['Pause', m.breakAgents, STATUS_HEX.BREAK], ['Freigabe', m.waitingAgents, STATUS_HEX.WAITING], ['bereit', m.availableAgents, STATUS_HEX.AVAILABLE], ['Warteschlange', m.queuedTasks, '#ffffff'], ['Aktivität', m.activityLevel, '#ff8a3d']];
  $('chips').innerHTML = chips.map((c) => `<div class="chip"><i style="background:${c[2]}"></i><b>${c[1]}</b><span>${c[0]}</span></div>`).join('');
  const pend = engine.getTasks().filter((t) => t.status === 'WAITING_FOR_HUMAN'); const b = $('approve'); b.textContent = `Freigaben erteilen (${pend.length})`; b.disabled = pend.length === 0;
  $('log').innerHTML = engine.getLog(9).slice().reverse().map((l) => `<li><time>${l.clock}</time><span>${l.text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span></li>`).join('');
  if (selected) showInfo(selected);
  void force;
}

let last = performance.now();
function frame(ts) {
  try {
  const dt = Math.min(0.1, (ts - last) / 1000); last = ts; simTime += dt;
  engine.advance(dt * 1000);
  const st = engine.getState(); const now = st.clock.nowMs + st.accumulatorMs;
  if (engine.getClock().mode !== 'PAUSED') escTime += dt * (1 + 0);
  crowd.update(dt, now, simTime);
  world.escalators.forEach((e) => e.update(escTime));
  if (simTime - lastTv > 0.2) { lastTv = simTime; world.tvCanvases.forEach((t) => { if (t.floor <= focusView) t.tc.draw(simTime, t.v); }); }
  if (follow && follow.a.status === 'OFFLINE') { follow = null; if (selected) showInfo(selected); }
  if (follow) { const fl = Math.max(0, Math.min(4, Math.round(follow.y / FH))); if (fl !== focusView) { setView.fromFollow = true; setView(fl); setView.fromFollow = false; } cam.goalTarget.set(follow.x, follow.y + 1.0, follow.z); cam.goalSize = Math.min(cam.goalSize, 22); }
  const k = Math.min(1, dt * 5); cam.target.lerp(cam.goalTarget, k); cam.size += (cam.goalSize - cam.size) * k; if (!drag) { cam.az += (cam.goalAz - cam.az) * k; cam.el += (cam.goalEl - cam.el) * k; }
  placeCamera(); renderer.render(scene, camera);
  if (simTime - lastUi > 0.3) { lastUi = simTime; ui(false); }
  window.__frames = (window.__frames || 0) + 1;
  requestAnimationFrame(frame);
  } catch (err) { console.error(err); showMessage('Fehler in der Darstellung: ' + (err && err.message ? err.message : err) + '. Bitte die Seite neu laden.'); }
}

document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { speed = Number(b.dataset.speed); engine.setSpeed(speed); document.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
$('pause').addEventListener('click', () => { const p = engine.getClock().mode === 'PAUSED'; if (p) engine.resume(); else engine.pause(); $('pause').textContent = p ? 'Pause' : 'Weiter'; });
$('approve').addEventListener('click', () => { engine.getTasks().filter((t) => t.status === 'WAITING_FOR_HUMAN').forEach((t) => engine.grantApproval(t.id)); ui(true); });
$('follow').addEventListener('click', () => { if (!selected) return; follow = follow === selected ? null : selected; if (follow) { cam.goalSize = 16; } showInfo(selected); });
$('restart').addEventListener('click', () => { boot(); $('pause').textContent = 'Pause'; });
sel.addEventListener('change', () => { follow = null; boot(); $('pause').textContent = 'Pause'; });
const vb = $('views'); VIEWS.forEach(([label, f]) => { const b = document.createElement('button'); b.dataset.view = f; b.textContent = label; b.setAttribute('aria-pressed', String(f === focusView)); b.addEventListener('click', () => setView(f)); vb.appendChild(b); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { follow = null; if (selected) showInfo(selected); } if (e.key >= '0' && e.key <= '4') setView(Number(e.key)); if (e.key === 't' || e.key === 'T') setView(99); });

const hash = location.hash.replace('#', ''); if (/^etage[0-4]$/.test(hash)) focusView = Number(hash.slice(5));
resize(); boot(); window.__hk = { signature() { let m = 0, v = 0, i = 0; world.world.traverse((o) => { if (o.isMesh) { m++; v += o.geometry.attributes.position.count; if (o.isInstancedMesh) i += o.count; } }); return { meshes: m, vertices: v, instances: i, floors: world.floors.length, seats: world.seatInfo.size, tvs: world.tvCanvases.length, escalators: world.escalators.length }; }, renderer, cam, follow: (id) => { follow = crowd.list.find((r) => r.a.id === id) || null; selected = follow; crowd.select(follow); showInfo(follow); }, get crowd() { return crowd; }, get engine() { return engine; }, setView, get world() { return world; } }; ui(true); $('loading').hidden = true; requestAnimationFrame(frame);
