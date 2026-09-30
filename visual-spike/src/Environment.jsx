import { Model } from './Assets.jsx'
import { OUTDOOR, HALF_X, HALF_Z } from './world.js'

// Weite, leere Fläche unter dem Nachthimmel mit Vorplatz, Bäumen, Pollern, Bank und Sofa vor dem Haus
export default function Environment() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#3e4459" roughness={1} />
      </mesh>
      {/* Vorplatz und Weg */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 8]} receiveShadow>
        <planeGeometry args={[64, 60]} />
        <meshStandardMaterial color="#737a8f" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF_X * 2 + 6, HALF_Z * 2 + 6]} />
        <meshStandardMaterial color="#8a90a4" roughness={0.9} />
      </mesh>
      {[[-32, 8, 0.5, 60], [32, 8, 0.5, 60]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.08, z]}><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color="#c9ccd6" /></mesh>
      ))}
      <mesh position={[0, 0.08, 38]}><boxGeometry args={[64.5, 0.16, 0.5]} /><meshStandardMaterial color="#c9ccd6" /></mesh>
      {/* Teppich mit Sofa und Lampe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[OUTDOOR.sofa[0], 0.02, OUTDOOR.sofa[1] - 0.6]} receiveShadow>
        <planeGeometry args={[5.4, 3.6]} />
        <meshStandardMaterial color="#2f3444" />
      </mesh>
      <Model name="sofa" position={[OUTDOOR.sofa[0], 0.03, OUTDOOR.sofa[1]]} rotation={Math.PI} />
      <Model name="lamp" position={[OUTDOOR.lamp[0], 0.03, OUTDOOR.lamp[1]]} />
      <Model name="bench" position={[OUTDOOR.bench[0], 0, OUTDOOR.bench[1]]} scale={[1.4, 1, 1.2]} />
      {OUTDOOR.bollards.map(([x, z], i) => <Model key={i} name="bollard" position={[x, 0, z]} />)}
      {OUTDOOR.trees.map(([x, z, s], i) => <Model key={i} name="tree" position={[x, 0, z]} scale={s} />)}
    </group>
  )
}
