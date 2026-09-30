import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

export const MODELS = [
  'desk1', 'desk', 'desk_triple', 'chair', 'tree', 'glass_partition', 'bookshelf', 'pod_wall',
  'sofa', 'lamp', 'bollard', 'bench', 'character', 'character_sit',
]
const url = (name) => `${import.meta.env.BASE_URL}models/${name}.glb`
MODELS.forEach((m) => useGLTF.preload(url(m)))

// Lädt ein GLB aus dem Blender-Kit. `colors` überschreibt benannte Materialien (z. B. { shirt, hair, skin }).
export function Model({ name, position = [0, 0, 0], rotation = 0, scale = 1, colors }) {
  const { scene } = useGLTF(url(name))
  const obj = useMemo(() => {
    const s = scene.clone(true)
    s.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      const c = colors?.[o.material.name]
      if (c) {
        o.material = o.material.clone()
        o.material.color.set(c)
      }
    })
    return s
  }, [scene, colors?.shirt, colors?.hair, colors?.skin])
  const rot = Array.isArray(rotation) ? rotation : [0, rotation, 0]
  const sc = Array.isArray(scale) ? scale : [scale, scale, scale]
  return <primitive object={obj} position={position} rotation={rot} scale={sc} />
}
