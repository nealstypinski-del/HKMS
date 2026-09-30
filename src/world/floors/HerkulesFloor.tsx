import { Lamp, Plant, Rug, Whiteboard } from '../../furniture/Decor'
import { Sofa } from '../../furniture/Sofa'
import { Cyl } from '../primitives'
import { DeptFloor } from './DeptFloor'

export function HerkulesFloor() {
  return (
    <DeptFloor level={1}>
      <Rug pos={[7.4, 0, 5.0]} size={[5.6, 3.4]} color="#f4c9a0" />
      <Sofa pos={[7.4, 0, 6.5]} yaw={Math.PI} width={3.6} color="#ff8a3d" />
      <Cyl pos={[7.4, 0.28, 4.8]} size={[0.55, 0.05, 0.55]} color="#b98552" />
      <Cyl pos={[7.4, 0.14, 4.8]} size={[0.08, 0.28, 0.08]} color="#3a4256" />
      <Whiteboard pos={[-11.83, 2.3, 4.6]} rot={[0, Math.PI / 2, 0]} size={[2.6, 1.2]} accent="#ff8a3d" />
      <Plant pos={[3.6, 0, 6.8]} />
      <Plant pos={[11.2, 0, 6.8]} scale={1.2} />
      <Lamp pos={[10.6, 0, 4.4]} />
    </DeptFloor>
  )
}
