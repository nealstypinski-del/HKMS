import type { Department } from '../departments/department.types'

export const INITIAL_DEPARTMENTS: readonly Department[] = [
  { id: 'hq', name: 'Headquarters', company: 'shared', floor: 0, accent: '#f3f0e8', description: 'Empfang, Agentenbank, Küche und Lounge' },
  { id: 'hj-sales', name: 'Sales / Vertrieb', company: 'herkulesjobs', floor: 1, accent: '#ff8a3d', description: 'Leads, Vertrieb und Outreach' },
  { id: 'hj-recruiting', name: 'Recruiting Operations', company: 'herkulesjobs', floor: 1, accent: '#ffb066', description: 'Jobs, Qualität, Arbeitgeber und Content' },
  { id: 'hj-cs', name: 'Customer Success', company: 'herkulesjobs', floor: 1, accent: '#ff7a59', description: 'Arbeitgeberbetreuung, Support, Kundenanalyse' },
  { id: 'km-trends', name: 'Trends', company: 'kasselmemes', floor: 2, accent: '#2fd6c0', description: 'Trends, lokale Recherche, Community' },
  { id: 'km-redaktion', name: 'Redaktion', company: 'kasselmemes', floor: 2, accent: '#4ee3d0', description: 'Content, Captions, Redaktionsplanung' },
  { id: 'km-creative', name: 'Creative Studio', company: 'kasselmemes', floor: 2, accent: '#e15b7a', description: 'Visual, Reel und Creative Agenten (Generierung folgt später)' },
  { id: 'dev', name: 'AI / Development', company: 'shared', floor: 3, accent: '#8b7cf6', description: 'Entwicklung, Review, QA, Recherche, Automation' },
] as const
