import type { CompanyId } from '../config/office.config'

export interface Department {
  id: string
  name: string
  company: CompanyId
  floor: number
  accent: string
  description: string
}
