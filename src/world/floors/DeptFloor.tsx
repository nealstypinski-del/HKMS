import type { ReactNode } from 'react'
import { layoutOf } from '../../config/floorLayouts'
import { floorByLevel } from '../../config/office.config'
import { INITIAL_DEPARTMENTS } from '../../data/initialDepartments'
import { INITIAL_DESKS } from '../../data/initialDesks'
import { Desk } from '../../furniture/Desk'
import { Plant, Whiteboard } from '../../furniture/Decor'
import { MeetingTable } from '../../furniture/MeetingTable'
import { Box } from '../primitives'
import { ElevatorShaft } from '../Elevator'
import { DeptScreen } from '../StatusScreens'

/** Gemeinsamer Aufbau der Abteilungsetagen: Zonen, Schreibtische, Abteilungsschilder, Besprechungstisch. */
export function DeptFloor({ level, dev = false, children }: { level: number; dev?: boolean; children?: ReactNode }) {
  const cfg = floorByLevel(level)
  const depts = INITIAL_DEPARTMENTS.filter((d) => d.floor === level)
  const layout = layoutOf(level)
  return (
    <group>
      {depts.map((dept) => {
        const xs = (layout.deskPositions[dept.id] ?? []).map((p) => p[0])
        if (xs.length === 0) return null
        const minX = Math.min(...xs) - 1.5
        const maxX = Math.max(...xs) + 1.5
        const cx = (minX + maxX) / 2
        return (
          <group key={dept.id}>
            <Box pos={[cx, 0.006, -4.0]} size={[maxX - minX, 0.012, 7.4]} color={cfg.zoneColor} cast={false} />
            <Box pos={[cx, 0.014, -0.28]} size={[maxX - minX, 0.012, 0.07]} color={dept.accent} emissive={dept.accent} ei={0.7} cast={false} />
            <DeptScreen deptId={dept.id} name={dept.name} accent={dept.accent} x={cx} />
            {!dev && <Whiteboard pos={[cx, 2.35, -7.8]} accent={dept.accent} size={[2.2, 1.1]} />}
            {INITIAL_DESKS.filter((d) => d.departmentId === dept.id).map((d) => (
              <Desk key={d.id} deskId={d.id} accent={dept.accent} dev={dev} />
            ))}
          </group>
        )
      })}
      <MeetingTable level={level} accent={cfg.accent} />
      <ElevatorShaft level={level} />
      <Plant pos={[-11.2, 0, 7.0]} scale={1.2} />
      <Plant pos={[11.2, 0, 2.6]} />
      {children}
    </group>
  )
}
