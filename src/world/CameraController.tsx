import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { INITIAL_DEPARTMENTS } from '../data/initialDepartments'
import { FLOOR_HEIGHT, floorY } from '../config/office.config'
import { layoutOf } from '../config/floorLayouts'
import { useOfficeStore, type CameraRequest } from '../store/office.store'
import { characterRegistry } from './runtime'

export const DEFAULT_TARGET = new THREE.Vector3(0, 1.5, 0)
export const DEFAULT_POSITION = new THREE.Vector3(21, 15, 23)
const OVERVIEW_TARGET = new THREE.Vector3(0, 8, 0)
const OVERVIEW_POSITION = new THREE.Vector3(36, 15, 42)
const BOUNDS = { x: 15, zMin: -11, zMax: 11, yMin: -1, yMax: 26 }

interface Goal {
  target: THREE.Vector3
  /** Abstand der Kamera zum Ziel */
  distance: number
  /** Blickrichtung (vom Ziel zur Kamera), optional */
  direction?: THREE.Vector3
}

function goalFor(req: CameraRequest, camera: THREE.Camera, controls: OrbitControlsImpl): Goal | null {
  const currentDistance = camera.position.distanceTo(controls.target)
  switch (req.kind) {
    case 'reset':
      return { target: DEFAULT_TARGET.clone(), distance: DEFAULT_POSITION.distanceTo(DEFAULT_TARGET), direction: DEFAULT_POSITION.clone().sub(DEFAULT_TARGET).normalize() }
    case 'all':
      return { target: OVERVIEW_TARGET.clone(), distance: OVERVIEW_POSITION.distanceTo(OVERVIEW_TARGET), direction: OVERVIEW_POSITION.clone().sub(OVERVIEW_TARGET).normalize() }
    case 'floor':
      return { target: new THREE.Vector3(0, floorY(req.level ?? 0) + 1.5, 0), distance: 32, direction: DEFAULT_POSITION.clone().sub(DEFAULT_TARGET).normalize() }
    case 'department': {
      const dept = INITIAL_DEPARTMENTS.find((d) => d.id === req.targetId)
      if (!dept) return null
      const xs = (layoutOf(dept.floor).deskPositions[dept.id] ?? []).map((p) => p[0])
      const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0
      return { target: new THREE.Vector3(xs.length ? cx : 0, floorY(dept.floor) + 1.0, xs.length ? -3.6 : 0), distance: xs.length ? 16 : 32, direction: DEFAULT_POSITION.clone().sub(DEFAULT_TARGET).normalize() }
    }
    case 'agent': {
      const live = req.targetId ? characterRegistry.get(req.targetId) : undefined
      if (!live) return null
      return { target: new THREE.Vector3(live.x, live.y + 0.9, live.z), distance: Math.min(currentDistance, 14) }
    }
  }
}

/** Orbit, Zoom und Pan mit Grenzen, dazu sanfte Kameraflüge für Etagen, Abteilungen und Agenten. */
export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const goal = useRef<Goal | null>(null)
  const lastSeq = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Gespeicherte Kameraposition beim Start wiederherstellen
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const { savedCamera, focus } = useOfficeStore.getState()
    if (savedCamera) {
      camera.position.set(...savedCamera.position)
      c.target.set(...savedCamera.target)
    } else {
      // Ohne gespeicherte Position direkt auf die aktuelle Etage blicken
      const g = goalFor({ seq: 0, kind: focus === 'all' ? 'all' : 'floor', level: focus === 'all' ? 0 : focus }, camera, c)
      if (g) {
        c.target.copy(g.target)
        camera.position.copy(g.target).add((g.direction ?? new THREE.Vector3(1, 0.6, 1).normalize()).multiplyScalar(g.distance))
      }
    }
    c.update()
  }, [camera])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useFrame((_, rawDt) => {
    const c = controlsRef.current
    if (!c) return
    const dt = Math.min(rawDt, 0.05)
    const req = useOfficeStore.getState().cameraRequest
    if (req && req.seq !== lastSeq.current) {
      lastSeq.current = req.seq
      goal.current = goalFor(req, camera, c)
    }
    const g = goal.current
    if (g) {
      const k = 1 - Math.exp(-4.5 * dt)
      const offset = camera.position.clone().sub(c.target)
      const dir = g.direction ?? offset.clone().normalize()
      const desired = dir.clone().multiplyScalar(g.distance)
      c.target.lerp(g.target, k)
      offset.lerp(desired, k)
      camera.position.copy(c.target).add(offset)
      if (c.target.distanceTo(g.target) < 0.03 && offset.distanceTo(desired) < 0.05) goal.current = null
    }
    // Zielpunkt im Gebäude halten (kein Wegdriften beim Verschieben)
    const t = c.target
    t.x = THREE.MathUtils.clamp(t.x, -BOUNDS.x, BOUNDS.x)
    t.z = THREE.MathUtils.clamp(t.z, BOUNDS.zMin, BOUNDS.zMax)
    t.y = THREE.MathUtils.clamp(t.y, BOUNDS.yMin, Math.max(BOUNDS.yMax, 3 * FLOOR_HEIGHT + 8))
    c.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={7}
      maxDistance={70}
      minPolarAngle={0.25}
      maxPolarAngle={1.42}
      panSpeed={0.8}
      zoomSpeed={0.8}
      rotateSpeed={0.6}
      screenSpacePanning={false}
      onStart={() => {
        goal.current = null
      }}
      onEnd={() => {
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          const c = controlsRef.current
          if (c) useOfficeStore.getState().saveCamera({ position: camera.position.toArray() as [number, number, number], target: c.target.toArray() as [number, number, number] })
        }, 400)
      }}
    />
  )
}
