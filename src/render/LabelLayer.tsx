import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { floorBaseY } from '../world/constants'
import { getFloor } from '../world/generate'
import { PROVIDER_LABEL } from '../world/mockAgents'
import { sim } from '../world/sim'
import { effectiveGraphics, useWorld } from '../world/store'

const STATUS_TEXT: Record<string, string> = { working: 'Arbeitet', meeting: 'Besprechung', idle: 'Bereit', break: 'Pause', waiting: 'Wartet', offline: 'Offline' }
const POOL = 40
const _v = new Vector3(), _f = new Vector3()

/**
 * Weltlabels als gepoolte DOM Elemente. Es werden nur die nächsten Figuren beschriftet,
 * weit entfernte oder hinter der Kamera liegende Labels werden ausgeblendet.
 */
export function LabelLayer() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const box = useRef<HTMLDivElement | null>(null)
  const els = useRef<{ el: HTMLDivElement; key: string }[]>([])

  useEffect(() => {
    const host = gl.domElement.parentElement!
    const div = document.createElement('div')
    div.className = 'labels'
    host.appendChild(div)
    box.current = div
    els.current = Array.from({ length: POOL }, () => {
      const el = document.createElement('div')
      el.className = 'lbl'
      el.style.display = 'none'
      div.appendChild(el)
      return { el, key: '' }
    })
    return () => { div.remove() }
  }, [gl])

  useFrame(() => {
    const st = useWorld.getState()
    const g = effectiveGraphics(st.graphics)
    const pool = els.current
    let used = 0
    if (g.labels && st.cameraMode !== 'building' && pool.length) {
      const w = gl.domElement.clientWidth, h = gl.domElement.clientHeight
      const ego = st.cameraMode === 'firstPerson'
      const maxD = ego ? 16 : 30
      const cand: { id: string; d: number }[] = []
      camera.getWorldDirection(_f)
      for (const r of sim.rt.values()) {
        if (r.hidden || r.floorId !== st.floorId) continue
        const y = floorBaseY(getFloor(r.floorId).config.level)
        const d = camera.position.distanceTo(_v.set(r.x, y + 1.6, r.z))
        if (d > maxD) continue
        if (ego) { _v.sub(camera.position); if (_v.dot(_f) <= 0) continue }
        cand.push({ id: r.id, d })
      }
      cand.sort((a, b) => a.d - b.d)
      const limit = g.performanceMode ? 12 : POOL
      for (const c of cand.slice(0, limit)) {
        const r = sim.get(c.id)!
        const a = st.agents[c.id]
        if (!a) continue
        _v.set(r.x, floorBaseY(getFloor(r.floorId).config.level) + 2.15 - r.sit * 0.2, r.z).project(camera)
        if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) continue
        const slot = pool[used++]
        const sel = st.selection?.type === 'agent' && st.selection.id === c.id
        const showDraft = a.status === 'working' && (sel || c.d < 9)
        const key = `${a.role}|${a.provider}|${a.status}|${a.simulated}|${sel}|${showDraft}`
        if (slot.key !== key) {
          slot.key = key
          const prov = PROVIDER_LABEL[a.provider]
          slot.el.className = `lbl s-${a.status}${sel ? ' sel' : ''}`
          slot.el.innerHTML = `<b>${a.role}</b><span>${prov ? `<i>${prov}</i>` : ''}<u></u>${STATUS_TEXT[a.status]}${a.simulated ? '<em>SIM</em>' : ''}</span>${showDraft ? `<span class="dr">Entwurf: ${a.draft}</span>` : ''}`
        }
        const fade = c.d > maxD * 0.7 ? Math.max(0, (maxD - c.d) / (maxD * 0.3)) : 1
        const sc = Math.max(0.7, Math.min(1.05, 16 / (c.d + 6)))
        slot.el.style.opacity = String(fade)
        slot.el.style.transform = `translate(-50%,-100%) translate(${((_v.x + 1) / 2) * w}px,${((1 - _v.y) / 2) * h}px) scale(${sc})`
        slot.el.style.display = 'block'
      }
    }
    for (let i = used; i < pool.length; i++) if (pool[i].el.style.display !== 'none') pool[i].el.style.display = 'none'
  })
  return null
}
