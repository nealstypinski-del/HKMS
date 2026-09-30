import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { envState, stepEnvironment } from './outdoorEnvironment.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { focus } from '../runtime/focus.js'
import { smoothstep } from '../common/noise.js'

const SKY_V = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const SKY_F = /* glsl */ `varying vec3 vDir; uniform vec3 uTop; uniform vec3 uHorizon;
void main(){ float t = clamp(vDir.y * 1.6 + 0.05, 0.0, 1.0); vec3 c = mix(uHorizon, uTop, pow(t, 0.65));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

// Himmel, Sterne, Nebel, Sonne bzw. Mond und Hemisphärenlicht. Nachts keine dynamischen Punktlichter.
export default function OutdoorEnvironment({ quality }) {
  const { scene, gl } = useThree()
  const sun = useRef()
  const hemi = useRef()
  const sky = useRef()
  const stars = useRef()
  const skyMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } },
  }), [])
  const starGeo = useMemo(() => {
    const p = []
    for (let i = 0; i < 700; i++) {
      const u = Math.random() * 2 - 1
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      const y = Math.abs(u) * 0.9 + 0.1
      p.push(Math.cos(a) * r * 1100, y * 1100, Math.sin(a) * r * 1100)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])
  const starMat = useMemo(() => new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }), [])

  // Reflexionsumgebung (prozedural, ohne Netzwerkzugriff): Glas, Metall und Lack reflektieren und der Innenraum bekommt weiches Fülllicht
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex
    return () => { scene.environment = null; tex.dispose(); pm.dispose() }
  }, [scene, gl])

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#cfe2ee', 0.001)
    return () => { scene.fog = null }
  }, [scene])

  useFrame(({ camera }, dt) => {
    stepEnvironment(Math.min(dt, 0.1))
    const e = envState
    scene.fog.color.copy(e.fog)
    scene.fog.density = e.fogDensity
    gl.setClearColor(e.skyHorizon)
    scene.environmentIntensity = quality.envIntensity * (1 - 0.7 * e.night)
    skyMat.uniforms.uTop.value.copy(e.skyTop)
    skyMat.uniforms.uHorizon.value.copy(e.skyHorizon)
    sky.current?.position.copy(camera.position)
    stars.current?.position.copy(camera.position)
    starMat.opacity = smoothstep(0.35, 0.95, e.night)
    if (hemi.current) {
      hemi.current.color.copy(e.hemiSky)
      hemi.current.groundColor.copy(e.hemiGround)
      hemi.current.intensity = e.hemiIntensity
    }
    const l = sun.current
    if (l) {
      l.color.copy(e.sunColor)
      l.intensity = e.sunIntensity
      // Schattenkamera folgt dem Fokuspunkt
      l.target.position.set(focus.x, focus.y - 1.7, focus.z)
      l.position.set(focus.x + e.sunDir.x * 220, focus.y + e.sunDir.y * 220, focus.z + e.sunDir.z * 220)
      l.target.updateMatrixWorld()
    }
  })

  const R = quality.shadowRadius
  return (
    <>
      <mesh ref={sky} material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[1300, 24, 12]} />
      </mesh>
      <points ref={stars} geometry={starGeo} material={starMat} frustumCulled={false} renderOrder={-9} />
      <hemisphereLight ref={hemi} />
      <directionalLight
        key={`${quality.shadows}-${quality.shadowMap}-${R}`}
        ref={sun}
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowMap, quality.shadowMap]}
        shadow-camera-left={-R} shadow-camera-right={R} shadow-camera-top={R} shadow-camera-bottom={-R}
        shadow-camera-near={10} shadow-camera-far={520}
        shadow-bias={-0.0006} shadow-normalBias={0.35}
      />
    </>
  )
}
