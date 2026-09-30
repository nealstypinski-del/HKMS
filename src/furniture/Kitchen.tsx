import { LOBBY_LAYOUT } from '../config/floorLayouts'
import { Box, Cyl } from '../world/primitives'

/** Küchenzeile mit Kaffeemaschine, Kühlschrank, Tresen und Hockern. */
export function Kitchen() {
  const { counterX, counterZ, islandX, islandZ } = LOBBY_LAYOUT.kitchen
  const stools = [4.4, 5.15, 5.9, 6.65]
  return (
    <group>
      <Box pos={[counterX, 0.006, -5.3]} size={[6.6, 0.012, 5.2]} color="#c3d3d8" cast={false} />
      <Box pos={[counterX, 0.45, counterZ]} size={[5.2, 0.9, 0.7]} color="#e9e4d8" />
      <Box pos={[counterX, 0.93, counterZ]} size={[5.3, 0.06, 0.76]} color="#3a4256" />
      <Box pos={[counterX, 2.55, counterZ - 0.15]} size={[5.2, 0.8, 0.4]} color="#f4efe4" />
      <Box pos={[counterX + 3.15, 1.0, counterZ + 0.05]} size={[0.95, 2.0, 0.8]} color="#cfd6e4" />
      <Box pos={[counterX + 3.15, 1.35, counterZ + 0.46]} size={[0.06, 0.6, 0.04]} color="#59627f" />
      {/* Kaffeemaschine */}
      <Box pos={[counterX - 1.4, 1.25, counterZ]} size={[0.5, 0.55, 0.4]} color="#20263a" />
      <Box pos={[counterX - 1.4, 1.2, counterZ + 0.21]} size={[0.3, 0.16, 0.02]} color="#ff6b6b" emissive="#ff6b6b" ei={1.2} cast={false} />
      <Cyl pos={[counterX - 0.6, 1.02, counterZ]} size={[0.12, 0.1, 0.12]} color="#ff8a3d" />
      {/* Tresen */}
      <Box pos={[islandX, 0.45, islandZ]} size={[3.0, 0.9, 0.9]} color="#f0ebdf" />
      <Box pos={[islandX, 0.93, islandZ]} size={[3.2, 0.07, 1.05]} color="#b98552" />
      {stools.map((x) => (
        <group key={x}>
          <Cyl pos={[x, 0.34, -3.55]} size={[0.04, 0.68, 0.04]} color="#20263a" />
          <Cyl pos={[x, 0.68, -3.55]} size={[0.22, 0.07, 0.22]} color="#ff8a3d" />
          <Cyl pos={[x, 0.03, -3.55]} size={[0.2, 0.05, 0.2]} color="#20263a" />
        </group>
      ))}
    </group>
  )
}
