import { Lamp, Plant, Rug, Whiteboard } from '../../furniture/Decor'
import { Sofa } from '../../furniture/Sofa'
import { Cyl } from '../primitives'
import { ThemeWall } from '../ThemeWall'
import { DeptFloor } from './DeptFloor'

export function HerkulesFloor() {
  return (
    <DeptFloor level={1}>
      <Rug pos={[0.5, 0, 3.7]} size={[5.2, 2.4]} color="#f4c9a0" />
      <Sofa pos={[0.5, 0, 2.9]} yaw={0} width={3.8} color="#ff8a3d" />
      <Cyl pos={[0.5, 0.28, 4.3]} size={[0.55, 0.05, 0.55]} color="#b98552" />
      <Cyl pos={[0.5, 0.14, 4.3]} size={[0.08, 0.28, 0.08]} color="#3a4256" />
      <Whiteboard pos={[-11.83, 2.3, 4.6]} rot={[0, Math.PI / 2, 0]} size={[2.6, 1.2]} accent="#ff8a3d" />
      <ThemeWall pos={[-11.83, 2.6, -3.0]} title="Vertrieb und Produkte" tiles={['Produkt A', 'Produkt B', 'Produkt C']} accent="#ff8a3d" />
      <Plant pos={[11.4, 0, 3.8]} scale={1.2} />
      <Lamp pos={[3.0, 0, 3.2]} />
    </DeptFloor>
  )
}
