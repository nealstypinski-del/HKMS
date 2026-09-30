/** WebGL Erkennung. Eine Aufgabe: sicher feststellen, ob der Browser 3D darstellen kann. */
export interface WebGLCheck {
  ok: boolean
  reason: 'ok' | 'no-context' | 'error'
  detail?: string
}

interface CanvasLike { getContext(id: string): unknown }

export function detectWebGL(create: () => CanvasLike = () => document.createElement('canvas')): WebGLCheck {
  try {
    const c = create()
    const gl = c.getContext('webgl2') ?? c.getContext('webgl') ?? c.getContext('experimental-webgl')
    if (!gl) return { ok: false, reason: 'no-context' }
    return { ok: true, reason: 'ok' }
  } catch (e) {
    return { ok: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) }
  }
}
