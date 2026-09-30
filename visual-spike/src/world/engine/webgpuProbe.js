// Eine Aufgabe: prüfen, ob der WebGPU Renderer von Three.js in dieser Umgebung startet und welches Backend er wählt.
import * as THREE from 'three/webgpu'
import { color, time, sin, positionLocal, vec3 } from 'three/tsl'

const out = { navigatorGpu: !!navigator.gpu, adapter: null, backend: null, error: null, frames: 0 }
try {
  if (navigator.gpu) { const a = await navigator.gpu.requestAdapter(); out.adapter = a ? (a.info?.description || a.info?.vendor || 'Adapter vorhanden') : 'kein Adapter' }
  const renderer = new THREE.WebGPURenderer({ antialias: true })
  renderer.setSize(320, 200)
  document.body.appendChild(renderer.domElement)
  await renderer.init()
  out.backend = renderer.backend?.isWebGPUBackend ? 'WebGPU' : renderer.backend?.isWebGLBackend ? 'WebGL2 Rückfall' : String(renderer.backend?.constructor?.name)
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 50)
  cam.position.z = 3
  const mat = new THREE.MeshStandardNodeMaterial()
  mat.colorNode = color('#ff8a3d').add(vec3(sin(time.mul(2)).mul(0.2)))
  mat.positionNode = positionLocal.add(vec3(0, sin(time.add(positionLocal.x.mul(3))).mul(0.05), 0))
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 8, 8, 8), mat)
  scene.add(mesh, new THREE.HemisphereLight('#ffffff', '#445566', 2))
  for (let i = 0; i < 5; i++) { mesh.rotation.y += 0.1; await renderer.renderAsync(scene, cam); out.frames++ }
} catch (e) {
  out.error = String(e?.message || e).slice(0, 300)
}
window.__probe = out
document.title = 'probe:' + JSON.stringify(out)
