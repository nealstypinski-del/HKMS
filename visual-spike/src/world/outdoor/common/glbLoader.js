import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Lädt Blender GLB Modelle (Suspense tauglich, mit Zwischenspeicher).
// Gehostete Builds, die keine .glb Dateien ausliefern können, legen die Modelle als models/<name>.json mit Feld b64 (Base64) ab (VITE_GLB_JSON=1).
const cache = new Map()

async function load(name) {
  const base = import.meta.env.BASE_URL
  const loader = new GLTFLoader()
  if (import.meta.env.VITE_GLB_JSON) {
    const j = await (await fetch(`${base}models/${name}.json`)).json()
    const bin = Uint8Array.from(atob(j.b64), (c) => c.charCodeAt(0))
    return loader.parseAsync(bin.buffer, '')
  }
  return loader.loadAsync(`${base}models/${name}.glb`)
}

function entry(name) {
  let e = cache.get(name)
  if (!e) {
    e = { status: 'pending' }
    e.promise = load(name).then((v) => { e.status = 'ok'; e.value = v }, (err) => { e.status = 'err'; e.error = err })
    cache.set(name, e)
  }
  return e
}

export const preloadGlb = (name) => { entry(name) }

export function useGlb(name) {
  const e = entry(name)
  if (e.status === 'pending') throw e.promise
  if (e.status === 'err') throw e.error
  return e.value
}
