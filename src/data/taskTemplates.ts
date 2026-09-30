// Beispielaufgaben für den MockProvider. Rein fiktiv, sie lösen keine echten Aktionen aus.

export type RoleKind = 'dev' | 'research' | 'sales' | 'content' | 'creative' | 'support'

export function roleKind(role: string): RoleKind {
  const r = role.toLowerCase()
  if (/(developer|frontend|backend|code review|qa|automation)/.test(r)) return 'dev'
  if (/(sales|outreach)/.test(r)) return 'sales'
  if (/(editorial|caption|content)/.test(r)) return 'content'
  if (/(creative|visual|reel)/.test(r)) return 'creative'
  if (/(success|support)/.test(r)) return 'support'
  return 'research'
}

export const TASK_TITLES: Record<RoleKind, readonly string[]> = {
  dev: ['Build Fehler in der CI analysieren', 'Login Flow refactoren', 'API Endpunkt für Jobs erweitern', 'Pull Request prüfen', 'Regressionstest für Formulare'],
  research: ['Marktrecherche Handwerksbetriebe Region Kassel', 'Arbeitgeber Profile prüfen', 'Trendquellen sichten', 'Wettbewerber Übersicht aktualisieren'],
  sales: ['Leads für Pflegebetriebe qualifizieren', 'Outreach Entwurf vorbereiten', 'Angebotsübersicht abgleichen', 'Follow up Liste erstellen'],
  content: ['Redaktionsplan für die Woche entwerfen', 'Captions für drei Beiträge vorschlagen', 'Recruiting Text überarbeiten', 'Themenliste priorisieren'],
  creative: ['Moodboard für neue Serie anlegen', 'Reel Konzept skizzieren', 'Visual Varianten planen'],
  support: ['Arbeitgeber Rückfragen sortieren', 'Kundenanalyse Zusammenfassung', 'Supportanfragen priorisieren'],
}

export function pickTaskTitle(role: string, seed: number): string {
  const list = TASK_TITLES[roleKind(role)]
  return list[Math.abs(seed) % list.length] as string
}
