import type { ReactNode } from 'react'
import { layoutOf } from '../../config/floorLayouts'
import { floorByLevel } from '../../config/office.config'
import { INITIAL_DEPARTMENTS } from '../../data/initialDepartments'
import { INITIAL_DESKS } from '../../data/initialDesks'
import { Desk } from '../../furniture/Desk'
import { Plant, Whiteboard } from '../../furniture/Decor'
import { MeetingTable } from '../../furniture/MeetingTable'
import { Bookshelf, CoatRack, FileCabinet, Picture, Printer, WallClock, WaterCooler } from '../../furniture/Props'
import { Box } from '../primitives'
import { floorMaterial } from '../textures'
import { ConferenceRoom } from '../ConferenceRoom'
import { ElevatorShaft } from '../Elevator'
import { Stairs } from '../Stairs'
import { TOP_LEVEL } from '../../config/office.config'
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
            <Box pos={[cx, 0.008, -4.0]} size={[maxX - minX, 0.014, 7.4]} material={floorMaterial('carpet', cfg.zoneColor, maxX - minX, 7.4)} cast={false} />
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
      <ConferenceRoom accent={cfg.accent} label={cfg.shortName} />
      {level < TOP_LEVEL && <Stairs />}
      <ElevatorShaft level={level} />
      <Plant pos={[-11.2, 0, 7.0]} scale={1.2} />
      <Plant pos={[11.2, 0, 2.6]} />
      <Bookshelf pos={[-11.1, 0, -7.5]} seed={level} />
      <Bookshelf pos={[-6.3, 0, -7.5]} seed={level + 2} />
      {!dev && <Bookshelf pos={[-0.2, 0, -7.5]} seed={level + 4} />}
      <FileCabinet pos={[-5.0, 0, -7.4]} />
      <FileCabinet pos={[-4.4, 0, -7.4]} />
      <Printer pos={[1.9, 0, -7.4]} />
      <WaterCooler pos={[8.4, 0, -7.5]} />
      <WallClock pos={[-11.4, 4.55, -7.82]} />
      <CoatRack pos={[11.5, 0, -1.0]} />
      <Picture pos={[-11.83, 2.2, 0.6]} rot={[0, Math.PI / 2, 0]} colors={[cfg.accent, '#5b6ee1', '#f2c94c']} />
      {children}
    </group>
  )
}
