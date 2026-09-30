import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending, BackSide, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Fog, Group, HemisphereLight, InstancedMesh,
  MeshLambertMaterial, MeshStandardMaterial, Object3D, PCFShadowMap, PMREMGenerator, Points, PointsMaterial, ShaderMaterial, Vector3,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { getFloor } from '../world/generate'
import { floorBaseY, FLOOR_H } from '../world/constants'
import { mulberry } from '../world/avatar'
import { effectiveGraphics, timeOfDay, useWorld } from '../world/store'
import { env, envColors } from './env'
import { setReflections } from './materials'

const skyMat = new ShaderMaterial({
  side: BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new Color('#5aa6e6') }, bottom: { value: new Color('#cfe6f5') } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.7)),1.0); }',
})

function Stars() {
  const pts = useRef<Points>(null)
  const geo = useMemo(() => {
    const r = mulberry(42)
    const a: number[] = []
    for (let i = 0; i < 900; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95 + 0.05)
      a.push(Math.sin(ph) * Math.cos(th) * 700, Math.cos(ph) * 700, Math.sin(ph) * Math.sin(th) * 700)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(a, 3))
    return g
  }, [])
  const mat = useMemo(() => new PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: AdditiveBlending }), [])
  useFrame(() => { mat.opacity = envColors(env.tod).star })
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />
}

import { CanvasTexture, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three'

let gridTex: CanvasTexture | null = null
function getGridTexture() {
  if (gridTex) return gridTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128)
  g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 2
  g.strokeRect(0, 0, 128, 128)
  gridTex = new CanvasTexture(c)
  gridTex.wrapS = gridTex.wrapT = RepeatWrapping
  gridTex.repeat.set(200, 200) // 10 m Raster über 2000 m
  gridTex.colorSpace = SRGBColorSpace
  gridTex.anisotropy = 4
  return gridTex
}
const groundGeo = new PlaneGeometry(2000, 2000)

/** Eine komplett leere, ebene und begehbare Fläche. Das Gebäude steht allein darauf. */
function Ground() {
  const mat = useMemo(() => new MeshLambertMaterial({ color: '#8d919a', map: getGridTexture() }), [])
  useFrame(() => {
    const c = envColors(env.tod)
    // Tag: helle Steinfläche, Nacht: bläulich im Mondlicht, aber gut erkennbar
    mat.color.set('#3d4766').lerp(new Color('#8d919a'), Math.min(1, env.tod * 1.5))
    // Mondlicht: schwache Eigenhelligkeit, damit die Fläche nachts nicht schwarz wird
    mat.emissive.set('#1c2846').multiplyScalar(1 - Math.min(1, env.tod * 2))
  })
  return <mesh geometry={groundGeo} material={mat} rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow />
}

function Lights() {
  const key = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const moon = useRef<Group>(null)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const g = useWorld((s) => effectiveGraphics(s.graphics))
  const mode = useWorld((s) => s.cameraMode)
  const floorId = useWorld((s) => s.floorId)
  const timeMode = useWorld((s) => s.timeMode)

  useEffect(() => { env.target = timeOfDay(timeMode); if (timeMode !== 'auto') return; const id = setInterval(() => { env.target = timeOfDay('auto') }, 60000); return () => clearInterval(id) }, [timeMode])

  useEffect(() => {
    gl.shadowMap.enabled = g.shadows
    gl.shadowMap.type = PCFShadowMap
  }, [gl, g.shadows])

  // Reflexionen: prozedurale Raumumgebung, keine Netzwerk Assets.
  useEffect(() => {
    if (!g.reflections) { setReflections(false); return }
    const pm = new PMREMGenerator(gl)
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    setReflections(true, tex)
    return () => { setReflections(false); tex.dispose(); pm.dispose() }
  }, [gl, scene, g.reflections])

  const level = getFloor(floorId).config.level
  const shadowsOn = g.shadows && mode !== 'building'
  useEffect(() => {
    const l = key.current
    if (!l) return
    l.castShadow = shadowsOn
    const size = g.hqLighting ? 2048 : 1024
    l.shadow.mapSize.set(size, size)
    l.shadow.map?.dispose(); l.shadow.map = null
  }, [shadowsOn, g.hqLighting])

  useEffect(() => { scene.fog = new Fog('#cfe6f5', 120, 620) }, [scene])

  // Punktlichter nur bei "hohe Lichtqualität", an Aufenthaltsbereichen der aktuellen Etage
  const points = useMemo(() => {
    const f = getFloor(floorId)
    return f.zones.filter((z) => ['lounge', 'kitchen', 'meeting', 'lobby', 'strategy', 'ceo'].includes(z.config.type)).slice(0, 6).map((z) => ({
      x: (z.config.rect.x0 + z.config.rect.x1) / 2, z: (z.config.rect.z0 + z.config.rect.z1) / 2,
    }))
  }, [floorId])

  useFrame(() => {
    const c = envColors(env.tod)
    skyMat.uniforms.top.value.copy(c.top)
    skyMat.uniforms.bottom.value.copy(c.bottom)
    ;(scene.fog as Fog).color.copy(c.bottom)
    scene.background = g.background ? null : c.bottom.clone().multiplyScalar(0.6)
    if (key.current) {
      key.current.color.copy(c.sun)
      key.current.intensity = c.sunI
      const el = c.elevation
      const dir = new Vector3(0.55, el, 0.6).normalize()
      key.current.position.set(dir.x * 90, dir.y * 90 + level * FLOOR_H, dir.z * 90)
      key.current.target.position.set(0, level * FLOOR_H, 0)
      key.current.target.updateMatrixWorld()
    }
    if (hemi.current) { hemi.current.color.copy(c.hemiSky); hemi.current.intensity = c.hemiI }
    if (moon.current) {
      const dir = new Vector3(-0.5, 0.5, -0.6).normalize().multiplyScalar(420)
      moon.current.position.copy(dir)
      moon.current.visible = env.tod < 0.4
    }
  })

  const s = 34
  return (
    <>
      <hemisphereLight ref={hemi} args={['#cfe6ff', '#5a5346', 0.9]} />
      <directionalLight ref={key} intensity={2.2} shadow-camera-left={-s} shadow-camera-right={s} shadow-camera-top={s} shadow-camera-bottom={-s} shadow-camera-near={5} shadow-camera-far={220} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      {g.hqLighting && points.map((p, i) => <pointLight key={i} position={[p.x, floorBaseY(level) + 3.2, p.z]} intensity={18} distance={13} decay={2} color="#ffd9a8" />)}
      <group ref={moon}>
        <mesh><sphereGeometry args={[14, 16, 12]} /><meshBasicMaterial color="#f2f4ff" toneMapped={false} fog={false} /></mesh>
      </group>
    </>
  )
}

export function SceneEnvironment() {
  const bg = useWorld((s) => effectiveGraphics(s.graphics).background)
  return (
    <>
      <Lights />
      {bg && (
        <>
          <mesh renderOrder={-10} frustumCulled={false}><sphereGeometry args={[800, 24, 16]} /><primitive object={skyMat} attach="material" /></mesh>
          <Stars />
          <Ground />
        </>
      )}
    </>
  )
}

