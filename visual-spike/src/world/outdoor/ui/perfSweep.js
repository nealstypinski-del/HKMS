// Automatischer Messlauf: besucht feste Standpunkte in allen Grafikstufen und protokolliert FPS, Drawcalls, Dreiecke, Bäume, Agenten.
// FPS wird aus der echten Bildzeit (requestAnimationFrame) berechnet. Auf Rechnern ohne GPU (Software Rendering) sind die Werte NICHT
// mit Desktop Hardware vergleichbar, Drawcalls und Dreiecke dagegen schon.
import { outdoorStats } from '../runtime/stats.js'

export const VIEWPOINTS = [
  { id: 'A', name: 'HQ Außen', mode: 'tp', pos: [0, -24], heading: Math.PI, pitch: -0.08 },
  { id: 'B', name: 'Kaskade unten', mode: 'tp', pos: [-9.5, -131], heading: Math.PI, pitch: -0.05 },
  { id: 'C', name: 'Kaskade Mitte', mode: 'tp', pos: [-9.5, -231], heading: Math.PI, pitch: -0.05 },
  { id: 'D', name: 'Herkules oben', mode: 'tp', pos: [0, -372], heading: Math.PI, pitch: 0.3 },
  { id: 'E', name: 'Übersicht', mode: 'tycoon' },
  { id: 'F', name: 'HQ Lobby', mode: 'tp', pos: [0, -11], heading: 0, pitch: -0.1 },
  { id: 'G', name: 'Etage 1 Redaktion', mode: 'tp', pos: [-13, 4.5], heading: -Math.PI / 2, pitch: -0.1, y: 4.5 },
  { id: 'H', name: 'Rolltreppe', mode: 'tp', pos: [-1.5, -1], heading: 0, pitch: -0.12 },
]

const raf = () => new Promise((r) => requestAnimationFrame(r))
async function frames(n) { for (let i = 0; i < n; i++) await raf() }

async function sample(n) {
  let last = performance.now()
  const dts = []
  let calls = 0; let tris = 0
  for (let i = 0; i < n; i++) {
    await raf()
    const now = performance.now()
    dts.push(now - last)
    last = now
    calls = Math.max(calls, outdoorStats.calls)
    tris = Math.max(tris, outdoorStats.triangles)
  }
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length
  const med = [...dts].sort((a, b) => a - b)[Math.floor(dts.length / 2)]
  return { fps: 1000 / mean, fpsMedian: 1000 / med, frameMs: mean, calls: outdoorStats.calls, triangles: outdoorStats.triangles, trees: outdoorStats.visibleTrees, agents: outdoorStats.visibleAgents }
}

// ctx: { api, setMode, setSettings, agentApi }
export async function runSweep(ctx, { presets = ['LOW', 'MEDIUM', 'HIGH'], points = VIEWPOINTS, warm = 4, n = 8, onProgress } = {}) {
  const rows = []
  for (const q of presets) {
    ctx.setSettings((s) => ({ ...s, quality: q }))
    await frames(warm)
    for (const p of points) {
      ctx.setMode(p.mode)
      if (p.pos) ctx.api.teleport(p.pos[0], p.pos[1], p.heading, p.pitch, p.y ?? null)
      await frames(warm)
      const r = await sample(n)
      rows.push({ preset: q, view: `${p.id} ${p.name}`, ...r, totalAgents: outdoorStats.totalAgents })
      onProgress?.(rows.length, presets.length * points.length)
    }
  }
  return rows
}
