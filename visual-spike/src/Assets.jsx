import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const MODELS = [
  'desk1', 'desk', 'desk_triple', 'chair', 'tree', 'glass_partition', 'bookshelf', 'pod_wall', 'sofa', 'lamp', 'bollard', 'bench',
  'character', 'coffee_machine', 'water_cooler', 'fridge', 'printer', 'whiteboard', 'painting', 'rug', 'ceiling_light',
  'meeting_table', 'trash_bin', 'reception_desk', 'plant_small',
]
const url = (name) => `${import.meta.env.BASE_URL}models/${name}.glb`
MODELS.forEach((m) => useGLTF.preload(url(m)))

function tint(root, colors) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    if (colors) {
      const c = colors[o.material.name]
      if (c) {
        o.material = o.material.clone()
        o.material.color.set(c)
      }
    }
  })
}

// Lädt ein GLB aus dem Blender-Kit. `colors` überschreibt benannte Materialien (z. B. { shirt, hair, skin }).
export function Model({ name, position = [0, 0, 0], rotation = 0, scale = 1, colors }) {
  const { scene } = useGLTF(url(name))
  const obj = useMemo(() => {
    const s = clone(scene)
    tint(s, colors)
    return s
  }, [scene, colors?.shirt, colors?.hair, colors?.skin])
  const rot = Array.isArray(rotation) ? rotation : [0, rotation, 0]
  const sc = Array.isArray(scale) ? scale : [scale, scale, scale]
  return <primitive object={obj} position={position} rotation={rot} scale={sc} />
}

// Figur mit Skelett. `clip`: Idle, Walk, Run, SitIdle, SitType (Blender-Animationen), Überblendung inklusive.
export const Rig = forwardRef(function Rig({ colors, clip = 'Idle', speed = 1, phase = 0, scale = 0.88 }, ref) {
  const { scene, animations } = useGLTF(url('character'))
  const obj = useMemo(() => {
    const s = clone(scene)
    tint(s, colors)
    s.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false })
    return s
  }, [scene, colors?.shirt, colors?.hair, colors?.skin])
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj])
  const actions = useMemo(() => Object.fromEntries(animations.map((c) => [c.name, mixer.clipAction(c)])), [mixer, animations])
  const cur = useRef(null)
  useEffect(() => {
    const next = actions[clip]
    if (!next || cur.current === next) return
    next.reset()
    if (!cur.current) next.time = (phase % 1) * next.getClip().duration
    next.timeScale = speed
    next.fadeIn(0.25).play()
    if (cur.current) cur.current.fadeOut(0.25)
    cur.current = next
  }, [clip, actions])
  useEffect(() => { if (cur.current) cur.current.timeScale = speed }, [speed])
  useEffect(() => () => mixer.stopAllAction(), [mixer])
  useFrame((_, dt) => mixer.update(dt))
  return <primitive ref={ref} object={obj} scale={scale} />
})
