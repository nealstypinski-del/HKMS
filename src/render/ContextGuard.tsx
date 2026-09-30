import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useGpu } from '../ui/gpuState'

/**
 * Meldet Verlust und Wiederkehr des WebGL Kontexts (Treiberabsturz, zu viele Kontexte, Energiesparen).
 * preventDefault ist nötig, damit der Browser den Kontext überhaupt wiederherstellen darf.
 */
export function ContextGuard() {
  const gl = useThree((s) => s.gl)
  const setLost = useGpu((s) => s.setLost)
  useEffect(() => {
    const el = gl.domElement
    const lost = (e: Event) => { e.preventDefault(); setLost(true) }
    const back = () => setLost(false)
    el.addEventListener('webglcontextlost', lost)
    el.addEventListener('webglcontextrestored', back)
    return () => { el.removeEventListener('webglcontextlost', lost); el.removeEventListener('webglcontextrestored', back) }
  }, [gl, setLost])
  return null
}
