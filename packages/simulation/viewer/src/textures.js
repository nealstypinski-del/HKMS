import * as THREE from 'three';

/** Prozedurale Texturen (Canvas), deterministisch. Kein Netzwerk, keine Dateien. */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (opts.repeat !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

export function woodTex(base = '#b98552', seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed); const planks = 8, ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const f = 0.86 + r() * 0.28; g.fillStyle = shade(base, f); g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(60,30,10,${0.05 + r() * 0.08})`; g.lineWidth = 1; g.beginPath(); const y = i * ph + r() * ph; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 6, w * 0.6, y + (r() - 0.5) * 6, w, y + (r() - 0.5) * 4); g.stroke(); }
      const cut = r() * w; g.fillStyle = 'rgba(30,15,5,0.35)'; g.fillRect(cut, i * ph, 2, ph);
      g.fillStyle = 'rgba(30,15,5,0.4)'; g.fillRect(0, i * ph, w, 2);
    }
  });
}

export function oakTex(seed = 21) { return woodTex('#d6b08a', seed); }

export function carpetTex(base = '#4a5878', seed = 2) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) { const f = 0.8 + r() * 0.4; g.fillStyle = shade(base, f); g.globalAlpha = 0.5; g.fillRect(r() * w, r() * h, 2, 2); }
    g.globalAlpha = 1;
  });
}

export function tileTex(a = '#e9ecef', b = '#cfd6de', n = 4) {
  return canvasTex(512, 512, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = 'rgba(80,90,105,0.55)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  });
}

export function marbleTex(seed = 3) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed); g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,125,140,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(90,95,110,0.4)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
}

export function grassTex() {
  return canvasTex(256, 256, (g, w, h) => { const r = rng(9); g.fillStyle = '#6f9a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3800; i++) { g.fillStyle = shade('#6f9a58', 0.8 + r() * 0.45); g.globalAlpha = 0.6; g.fillRect(r() * w, r() * h, 2, 3); } g.globalAlpha = 1; });
}

export function asphaltTex() {
  return canvasTex(256, 256, (g, w, h) => { const r = rng(4); g.fillStyle = '#4a4f5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = shade('#4a4f5a', 0.75 + r() * 0.5); g.fillRect(r() * w, r() * h, 2, 2); } });
}

export function wallTex() {
  return canvasTex(256, 256, (g, w, h) => { const r = rng(5); g.fillStyle = '#f2ede4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(150,140,120,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 3, 12); } });
}

export function slabTex() {
  return canvasTex(256, 256, (g, w, h) => { const r = rng(6); g.fillStyle = '#8b93a3'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = shade('#8b93a3', 0.85 + r() * 0.3); g.fillRect(r() * w, r() * h, 2, 2); } });
}

export function rugTex(a, b) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.strokeStyle = b; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 3; g.strokeRect(32, 32, w - 64, h - 64);
    g.fillStyle = b; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2 + Math.cos(i) * 40, h / 2 + Math.sin(i) * 40, 12, 0, 6.3); g.globalAlpha = 0.5; g.fill(); }
    g.globalAlpha = 1;
  }, { repeat: false });
}

export function textTex(lines, { w = 512, h = 256, bg = '#1c2333', fg = '#ffffff', accent = '#ff8a3d', font = 'bold 64px "Segoe UI", system-ui, sans-serif', sub = null, border = true } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((t, i) => g.fillText(t, w / 2, h / 2 + (i - (arr.length - 1) / 2) * 74 - (sub ? 18 : 0)));
    if (sub) { g.font = '28px "Segoe UI", system-ui, sans-serif'; g.fillStyle = accent; g.fillText(sub, w / 2, h - 44); }
  }, { repeat: false });
}

/** Monitorinhalt: Code, Dashboard oder Chat. */
export function screenTex(kind, accent = '#4da3ff', seed = 1) {
  return canvasTex(256, 160, (g, w, h) => {
    const r = rng(seed * 97 + kind.length); g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b2640'; g.fillRect(0, 0, w, 14); g.fillStyle = accent; g.fillRect(6, 4, 30, 6);
    if (kind === 'code') { for (let i = 0; i < 12; i++) { g.fillStyle = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#c9d1d9'][Math.floor(r() * 5)]; g.fillRect(10 + Math.floor(r() * 3) * 14, 22 + i * 11, 20 + r() * 110, 5); } }
    else if (kind === 'chart') { for (let i = 0; i < 9; i++) { const bh = 12 + r() * 90; g.fillStyle = accent; g.fillRect(18 + i * 24, h - 10 - bh, 16, bh); } g.strokeStyle = '#3b4b70'; g.strokeRect(10, 22, w - 20, h - 30); }
    else { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#22314f' : accent; const bw = 60 + r() * 100; g.fillRect(i % 2 ? w - bw - 10 : 10, 24 + i * 19, bw, 13); } }
  }, { repeat: false });
}

export function skyTex() {
  return canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5fa4f0'); gr.addColorStop(0.55, '#a9d2f7'); gr.addColorStop(1, '#f6e8d2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { repeat: false });
}

/** Animierter Fernsehinhalt. Wird zeitweise neu gezeichnet. */
export function tvCanvas() {
  const c = document.createElement('canvas'); c.width = 192; c.height = 108;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = c.getContext('2d');
  return { texture: t, draw(time, variant) {
    const cols = [['#12315c', '#ff8a3d'], ['#1c3d2f', '#2fd6c0'], ['#3b1f4a', '#c084fc']][variant % 3];
    g.fillStyle = cols[0]; g.fillRect(0, 0, 192, 108);
    g.fillStyle = cols[1]; g.fillRect(0, 84, 192, 24);
    g.fillStyle = '#fff'; g.fillRect(8, 90, 60 + 40 * Math.sin(time * 0.7 + variant), 5); g.fillRect(8, 99, 90, 3);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(14 + i * 44, 14 + 8 * Math.sin(time + i), 34, 44 + 10 * Math.cos(time * 0.8 + i)); }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(96 + 60 * Math.sin(time * 0.5 + variant), 40, 9, 0, 6.3); g.fill();
    t.needsUpdate = true;
  } };
}
