import * as THREE from 'three';
import { FH, ESC, DEPT_COLOR, M } from './world.js';

const SKIN = [0xf1c9a5, 0xe0ac82, 0xc68b62, 0x8d5a3c, 0xf6d9c2];
const HAIR = [0x2b1d14, 0x4a2e1a, 0x9c6b30, 0xd9b25f, 0x1b1b1b, 0xa33b2a, 0x7a7a7a];
const PANTS = [0x2b3245, 0x3a3f52, 0x4a4a4a, 0x5a4a3a];
const STATUS_COLOR = { AVAILABLE: 0x7fd1ff, ASSIGNED: 0xf2f5ff, MOVING: 0xf2f5ff, WORKING: 0x4fdc8a, WAITING: 0xffc94d, MEETING: 0x4da3ff, BREAK: 0xc084fc, ERROR: 0xff5c5c, COMPLETED: 0xa7f3c8 };
const G = {
  torso: new THREE.CylinderGeometry(0.2, 0.17, 0.56, 14), shoulder: new THREE.SphereGeometry(0.075, 10, 8), upper: new THREE.CylinderGeometry(0.058, 0.05, 0.3, 8), fore: new THREE.CylinderGeometry(0.05, 0.042, 0.28, 8), hand: new THREE.SphereGeometry(0.05, 8, 6),
  thigh: new THREE.CylinderGeometry(0.085, 0.07, 0.44, 8), shin: new THREE.CylinderGeometry(0.066, 0.055, 0.44, 8), foot: new THREE.BoxGeometry(0.11, 0.07, 0.24), head: new THREE.SphereGeometry(0.19, 18, 14), hair: new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
  eye: new THREE.SphereGeometry(0.02, 6, 6), plumb: new THREE.OctahedronGeometry(0.13, 0), ring: new THREE.RingGeometry(0.34, 0.44, 28), neck: new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), nose: new THREE.SphereGeometry(0.024, 6, 6), cup: new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8),
};
const cm = (hex, r = 0.75) => M(hex, { r });
const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

function makeCharacter(dept, seed) {
  const rnd = (n) => Math.floor(((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1 * 1000);
  const skin = SKIN[rnd(1) % SKIN.length], hair = HAIR[rnd(2) % HAIR.length], pants = PANTS[rnd(3) % PANTS.length];
  const shirt = DEPT_COLOR[dept];
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const P = { root, rig };
  const torsoG = new THREE.Group(); torsoG.position.y = 0.92; rig.add(torsoG); P.torso = torsoG;
  mesh(G.torso, M(shirt, { r: 0.7 }), torsoG, 0, 0.28, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), M(0xffffff, { r: 0.5 })); stripe.position.set(0, 0.34, 0.185); torsoG.add(stripe);
  mesh(G.neck, cm(skin), torsoG, 0, 0.6, 0);
  const head = new THREE.Group(); head.position.set(0, 0.79, 0); torsoG.add(head); P.head = head;
  mesh(G.head, cm(skin, 0.6), head); const hr = mesh(G.hair, cm(hair, 0.8), head, 0, 0.02, -0.005); hr.rotation.x = -0.15;
  mesh(G.eye, cm(0x1b1b1b, 0.3), head, -0.07, 0.03, 0.17); mesh(G.eye, cm(0x1b1b1b, 0.3), head, 0.07, 0.03, 0.17); mesh(G.nose, cm(skin, 0.6), head, 0, -0.02, 0.19);
  const arm = (sx) => { const sh = new THREE.Group(); sh.position.set(sx * 0.255, 0.5, 0); torsoG.add(sh); mesh(G.shoulder, M(shirt, { r: 0.7 }), sh); mesh(G.upper, M(shirt, { r: 0.7 }), sh, 0, -0.15, 0); const el = new THREE.Group(); el.position.y = -0.3; sh.add(el); mesh(G.fore, cm(skin, 0.6), el, 0, -0.14, 0); mesh(G.hand, cm(skin, 0.6), el, 0, -0.29, 0); return { sh, el }; };
  const aL = arm(-1), aR = arm(1); P.shL = aL.sh; P.elL = aL.el; P.shR = aR.sh; P.elR = aR.el;
  const leg = (sx) => { const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.92, 0); rig.add(hip); mesh(G.thigh, cm(pants), hip, 0, -0.22, 0); const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn); mesh(G.shin, cm(pants), kn, 0, -0.22, 0); mesh(G.foot, cm(0x1d1f26, 0.6), kn, 0, -0.47, 0.05); return { hip, kn }; };
  const lL = leg(-1), lR = leg(1); P.hipL = lL.hip; P.kneeL = lL.kn; P.hipR = lR.hip; P.kneeR = lR.kn;
  const cup = new THREE.Mesh(G.cup, cm(0xffffff, 0.4)); cup.position.set(0, -0.33, 0.05); cup.visible = false; P.elR.add(cup); P.cup = cup;
  const pb = new THREE.Mesh(G.plumb, new THREE.MeshStandardMaterial({ color: 0x4fdc8a, emissive: 0x4fdc8a, emissiveIntensity: 1.4, roughness: 0.25, flatShading: true })); pb.scale.set(0.8, 1.5, 0.8); pb.position.y = 2.35; root.add(pb); P.plumb = pb;
  const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.visible = false; root.add(ring); P.selRing = ring;
  root.traverse((o) => { if (o.isMesh) o.userData.root = root; });
  return P;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const idx = (id) => Number(id.replace('floor-', ''));
const SEAT = new Set(['sit']);

export class Crowd {
  constructor(engine, world, scene) {
    this.engine = engine; this.world = world; this.scene = scene; this.list = []; this.byRoot = new Map(); this.focus = 99; this.t = 0;
    const rows = [...new Set(engine.getAnchors().filter((a) => a.type === 'DESK').map((a) => a.hint.y))].sort((p, q) => p - q);
    let maxX = 0; engine.getAnchors().forEach((a) => { if (a.type === 'DESK') maxX = Math.max(maxX, a.hint.x); });
    this.lanesY = [...new Set([rows.length ? rows[0] - 1.6 : 4.4, ...rows.map((r) => r + 2.35), 19.6, 21.7, (world.bounds.Z1 - 1.5)])].sort((p, q) => p - q);
    this.laneXL = 5.4; this.laneXR = maxX + 2.8;
    engine.getAgents().forEach((a, k) => {
      const ch = makeCharacter(a.departmentId, k + 3); scene.add(ch.root);
      const rec = { a, ch, x: 0, z: 0, y: 0, yaw: Math.PI, speed: 0, phase: k * 1.7, init: false, key: '', path: null, pathLen: 0, start: { x: 0, z: 0 }, poseName: 'stand', seed: k, jx: ((k * 37) % 7 - 3) * 0.32, jz: ((k * 53) % 7 - 3) * 0.32, cur: {} };
      this.list.push(rec); this.byRoot.set(ch.root, rec);
    });
    this.planner = engine.ctx.planner; this.seat = world.seatInfo;
  }

  laneNear(z) { let b = this.lanesY[0], d = 1e9; for (const l of this.lanesY) { const dd = Math.abs(l - z); if (dd < d) { d = dd; b = l; } } return b; }

  buildPath(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z; const pts = [{ x: a.x, z: a.z }];
    if (Math.hypot(dx, dz) > 4.5) {
      const la = this.laneNear(a.z), lb = this.laneNear(b.z);
      const vx = (Math.abs(a.x - this.laneXL) + Math.abs(b.x - this.laneXL)) <= (Math.abs(a.x - this.laneXR) + Math.abs(b.x - this.laneXR)) ? this.laneXL : this.laneXR;
      pts.push({ x: a.x, z: la });
      if (la !== lb || Math.abs(a.x - b.x) > 9) { pts.push({ x: vx, z: la }); pts.push({ x: vx, z: lb }); }
      pts.push({ x: b.x, z: lb });
    }
    pts.push({ x: b.x, z: b.z });
    const out = [pts[0]]; for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i].x - out[out.length - 1].x, pts[i].z - out[out.length - 1].z) > 0.02) out.push(pts[i]);
    let len = 0; const cum = [0]; for (let i = 1; i < out.length; i++) { len += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z); cum.push(len); }
    return { pts: out, cum, len };
  }
  polyAt(path, p) { if (path.len < 0.001) return path.pts[path.pts.length - 1]; const d = p * path.len; let i = 1; while (i < path.cum.length - 1 && path.cum[i] < d) i++; const seg = path.cum[i] - path.cum[i - 1] || 1, t = clamp((d - path.cum[i - 1]) / seg); return { x: lerp(path.pts[i - 1].x, path.pts[i].x, t), z: lerp(path.pts[i - 1].z, path.pts[i].z, t) }; }

  ptOf(loc) { const info = loc.anchorId && this.seat.get(loc.anchorId); if (info) return { x: info.x, z: info.z, info }; const p = this.planner.pointOf(loc); return { x: p.x, z: p.y }; }

  /** Zielposition und Haltung eines Agenten aus dem Simulationszustand. */
  target(r, now) {
    const a = r.a, route = a.route, fl = idx(a.location.floorId);
    if (!route || !route.stages[route.stageIndex]) {
      const info = a.occupiedAnchorId && this.seat.get(a.occupiedAnchorId);
      if (info) return { floor: fl, x: info.x, z: info.z, yaw: info.yaw, pose: info.pose, ride: null };
      const p = this.planner.pointOf(a.location); const lobby = a.location.anchorId && a.location.anchorId.startsWith('elevator');
      return { floor: fl, x: p.x + (lobby ? 0 : r.jx), z: p.y + (lobby ? 0 : r.jz), yaw: null, pose: 'stand', ride: null };
    }
    const st = route.stages[route.stageIndex], p = clamp((now - route.stageStartedAtMs) / Math.max(1, st.durationMs));
    const fi = idx(st.from.floorId), ti = idx(st.to.floorId);
    const cf = route.stages.find((s) => s.kind === 'CHANGE_FLOOR'); const up = cf ? idx(cf.to.floorId) > idx(cf.from.floorId) : true;
    const inX = up ? ESC.xUp : ESC.xDown;
    const enter = up ? { x: inX, z: ESC.zBase + 1.4 } : { x: inX, z: ESC.zTop - 1.4 };
    const key = route.id + '#' + route.stageIndex;
    if (r.key !== key) { r.key = key; r.start = { x: r.x, z: r.z }; r.path = null; }
    switch (st.kind) {
      case 'STAND_UP': { const info = st.from.anchorId && this.seat.get(st.from.anchorId); return { floor: fi, x: info ? info.x : r.x, z: info ? info.z : r.z, yaw: info ? info.yaw : null, pose: 'stand', ride: null }; }
      case 'WALK_TO_ELEVATOR': { if (!r.path) r.path = this.buildPath(r.start, enter); const q = this.polyAt(r.path, p); return { floor: fi, x: q.x, z: q.z, yaw: null, pose: 'walk', ride: null }; }
      case 'WAIT_FOR_ELEVATOR': return { floor: fi, x: enter.x, z: enter.z, yaw: up ? Math.PI : 0, pose: 'stand', ride: null };
      case 'ENTER_ELEVATOR': { const on = up ? { x: inX, z: ESC.zBase - 0.2 } : { x: inX, z: ESC.zTop + 0.2 }; return { floor: fi, x: lerp(enter.x, on.x, p), z: lerp(enter.z, on.z, p), yaw: up ? Math.PI : 0, pose: 'walk', ride: null }; }
      case 'CHANGE_FLOOR': {
        const n = Math.max(1, Math.abs(ti - fi)), k = Math.min(n - 1, Math.floor(p * n)), q = p * n - k; const cur = fi + (up ? k : -k);
        const Lp = up ? cur : cur - 1; const D = ESC.zBase - ESC.zTop, tan = FH / D;
        const u = up ? q * D : (1 - q) * D;
        return { floor: cur, x: inX, z: ESC.zBase - u, y: Lp * FH + u * tan + 0.06, yaw: up ? Math.PI : 0, pose: 'ride', ride: { L: Lp } };
      }
      case 'EXIT_ELEVATOR': { const from = up ? { x: inX, z: ESC.zTop } : { x: inX, z: ESC.zBase }; const to = up ? { x: inX, z: ESC.zTop - 1.5 } : { x: inX, z: ESC.zBase + 1.5 }; return { floor: ti, x: lerp(from.x, to.x, p), z: lerp(from.z, to.z, p), yaw: up ? Math.PI : 0, pose: 'walk', ride: null }; }
      default: { const d = this.ptOf(st.to); if (!r.path) r.path = this.buildPath(r.start, d); const q = this.polyAt(r.path, p); const last = p > 0.97 && d.info; return { floor: ti, x: q.x, z: q.z, yaw: last ? d.info.yaw : null, pose: 'walk', ride: null }; }
    }
  }

  update(dt, now, time) {
    this.t = time; const k = clamp(dt * 11), ky = clamp(dt * 16);
    for (const r of this.list) {
      const a = r.a, root = r.ch.root;
      if (a.status === 'OFFLINE') { root.visible = false; continue; }
      const tg = this.target(r, now);
      const yFloor = tg.y !== undefined ? tg.y : tg.floor * FH;
      const lieUp = tg.pose === 'lie' ? 0.66 : 0;
      if (!r.init) { r.x = tg.x; r.z = tg.z; r.y = yFloor + lieUp; r.init = true; }
      const ox = r.x, oz = r.z;
      r.x = lerp(r.x, tg.x, k); r.z = lerp(r.z, tg.z, k); r.y = lerp(r.y, yFloor + lieUp, ky);
      const sp = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 1e-4); r.speed = lerp(r.speed, sp, clamp(dt * 8));
      const moving = r.speed > 0.35 && tg.pose !== 'ride';
      if (moving) { const dx = r.x - ox, dz = r.z - oz; if (Math.hypot(dx, dz) > 1e-5) r.yawT = Math.atan2(dx, dz); } else if (tg.yaw !== null && tg.yaw !== undefined) r.yawT = tg.yaw;
      if (r.yawT !== undefined) { let d = r.yawT - r.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; r.yaw += d * clamp(dt * 10); }
      root.position.set(r.x, r.y, r.z); root.rotation.y = r.yaw;
      root.visible = r.y < (this.focus + 1) * FH - 0.3 && tg.floor <= this.focus + (tg.ride ? 1 : 0);
      this.pose(r, tg, moving, dt, time);
    }
  }

  pose(r, tg, moving, dt, time) {
    const P = r.ch, a = r.a, kk = clamp(dt * 14);
    const sit = tg.pose === 'sit' && !moving, lie = tg.pose === 'lie' && !moving, ride = tg.pose === 'ride', coffee = tg.pose === 'coffee' && !moving;
    let hip = 0, knee = 0, shl = 0, shr = 0, elL = 0, elR = 0, rigY = 0, rigRx = 0, rigZ = 0, headY = 0, headX = 0, torsoX = 0, cup = false;
    if (moving) { r.phase += r.speed * dt * 2.3; const s = Math.sin(r.phase), amp = clamp(r.speed / 3.2, 0.35, 1.1); hip = s * 0.75 * amp; knee = Math.max(0, -s) * 1.0 * amp; shl = -s * 0.7 * amp; shr = s * 0.7 * amp; elL = -0.2; elR = -0.2; }
    else if (ride) { hip = 0; shl = 0.1; shr = -0.9; elR = -0.4; headY = Math.sin(time * 0.7 + r.seed) * 0.2; }
    else if (lie) { rigRx = -Math.PI / 2; rigZ = 0.9; rigY = -0.02; hip = 0; knee = 0; shl = 0.12; shr = 0.12; elL = -0.2; elR = -0.2; headY = 0; }
    else if (sit) {
      rigY = -0.34; hip = -Math.PI / 2; knee = Math.PI / 2;
      const at = a.activity, working = a.status === 'WORKING';
      if (working && tg.pose === 'sit') { const ty = Math.sin(time * 13 + r.seed) * 0.05, tz = Math.sin(time * 11 + r.seed * 2) * 0.05; shl = -1.05 + ty; shr = -1.05 + tz; elL = -0.85; elR = -0.85; headX = 0.12 + Math.sin(time * 0.6 + r.seed) * 0.03; torsoX = 0.05; }
      else if (a.status === 'MEETING') { const g = Math.sin(time * 2.1 + r.seed) > 0.55; shl = -0.55; shr = g ? -1.4 + Math.sin(time * 6 + r.seed) * 0.25 : -0.5; elL = -1.0; elR = g ? -0.7 : -1.0; headY = Math.sin(time * 0.8 + r.seed) * 0.35; }
      else if (at === 'CHAT_VISUAL') { shl = -0.4; shr = -0.9 + Math.sin(time * 5 + r.seed) * 0.4; elL = -0.7; elR = -0.9; headY = Math.sin(time * 1.4 + r.seed) * 0.45; }
      else if (at === 'READ') { shl = -1.0; shr = -1.0; elL = -1.25; elR = -1.25; headX = 0.35; }
      else if (at === 'WATCH_TV') { shl = -0.35; shr = -0.35; elL = -0.6; elR = -0.6; torsoX = -0.12; headY = Math.sin(time * 0.3 + r.seed) * 0.08; }
      else if (a.status === 'WAITING') { shl = -0.5; shr = -0.9; elL = -1.0; elR = -1.35; headY = Math.sin(time * 1.1 + r.seed) * 0.4; headX = 0.1; }
      else if (at === 'USE_KITCHEN') { shr = -1.0; elR = -1.1; cup = true; }
      else { shl = -0.35; shr = -0.35; elL = -0.8; elR = -0.8; headY = Math.sin(time * 0.5 + r.seed) * 0.15; }
    } else if (coffee) { shr = -1.0 + Math.sin(time * 1.6 + r.seed) * 0.05; elR = -1.2; shl = 0.05; cup = true; headX = 0.1; }
    else { const b = Math.sin(time * 1.6 + r.seed) * 0.02; shl = 0.05 + b; shr = 0.05 - b; headY = Math.sin(time * 0.5 + r.seed) * 0.3; if (a.status === 'WAITING') { shr = -1.1; elR = -1.3; } }
    const set = (o, v) => { o.rotation.x += (v - o.rotation.x) * kk; };
    set(P.hipL, hip); set(P.hipR, hip); set(P.kneeL, knee); set(P.kneeR, knee); set(P.shL, shl); set(P.shR, shr); set(P.elL, elL); set(P.elR, elR); set(P.torso, torsoX); set(P.head, headX); set(P.rig, rigRx);
    P.rig.position.y += (rigY - P.rig.position.y) * kk; P.rig.position.z += (rigZ - P.rig.position.z) * kk; P.head.rotation.y += (headY - P.head.rotation.y) * kk;
    P.cup.visible = cup;
    P.plumb.rotation.y = time * 1.8 + r.seed; P.plumb.position.y = 2.35 + Math.sin(time * 2.2 + r.seed) * 0.06; if (lie) P.plumb.position.y = 1.2 + Math.sin(time * 2.2) * 0.05;
    const col = STATUS_COLOR[a.status] || 0xffffff; if (P.plumb.material.color.getHex() !== col) { P.plumb.material.color.setHex(col); P.plumb.material.emissive.setHex(col); }
  }

  setFocus(f) { this.focus = f; }
  pick(raycaster) { const roots = this.list.filter((r) => r.ch.root.visible).map((r) => r.ch.root); const hit = raycaster.intersectObjects(roots, true)[0]; return hit ? this.byRoot.get(hit.object.userData.root) : null; }
  select(rec) { this.list.forEach((r) => (r.ch.selRing.visible = r === rec)); }
}
