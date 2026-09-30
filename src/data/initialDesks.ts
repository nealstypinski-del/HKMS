import type { Desk } from '../agents/agent.types'
import { floorY } from '../config/office.config'
import { layoutOf } from '../config/floorLayouts'
import { INITIAL_DEPARTMENTS } from './initialDepartments'

const DESK_LABELS: Record<string, readonly string[]> = {
  'hj-sales': ['Lead Research', 'Sales Agent', 'Outreach', 'Account Management'],
  'hj-recruiting': ['Employer Research', 'Recruiting Content', 'Job Quality', 'Job Research'],
  'hj-cs': ['Arbeitgeberbetreuung', 'Support', 'Kundenanalyse'],
  'km-trends': ['Trend Scout', 'Local Research', 'Community Insights', 'Reserve'],
  'km-redaktion': ['Content Research', 'Copy / Caption', 'Editorial Planning', 'Reserve'],
  'km-creative': ['Visual Agent', 'Reel Agent', 'Creative Agent', 'Reserve'],
  dev: ['Software Developer', 'Frontend Developer', 'Backend Developer', 'Code Reviewer', 'QA Agent', 'Research Agent', 'Automation Agent', 'Reserve'],
}

export const deskIdFor = (departmentId: string, index: number): string => `${departmentId}-${String(index + 1).padStart(2, '0')}`

/** Erzeugt alle Arbeitsplätze aus dem Etagen Layout. Zuweisungen entstehen erst im Agent Store. */
export function buildInitialDesks(): Desk[] {
  const desks: Desk[] = []
  for (const dept of INITIAL_DEPARTMENTS) {
    const positions = layoutOf(dept.floor).deskPositions[dept.id] ?? []
    positions.forEach(([x, z], i) => {
      desks.push({
        id: deskIdFor(dept.id, i),
        departmentId: dept.id,
        position: [x, floorY(dept.floor), z],
        label: DESK_LABELS[dept.id]?.[i] ?? `Platz ${i + 1}`,
        computer: { state: 'offline', provider: 'mock' },
      })
    })
  }
  return desks
}

export const INITIAL_DESKS: readonly Desk[] = buildInitialDesks()
