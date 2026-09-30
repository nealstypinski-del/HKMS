import { BUILDING } from './buildingConfig'
import { hashString, randomAvatar } from './avatar'
import type { Agent, AgentStatus, Provider } from './types'

/** Nur Anzeigenamen. Es gibt keine Anbindung an einen echten Anbieter, alles hier ist Mock. */
export const PROVIDER_LABEL: Record<Provider, string> = {
  'claude-code': 'Claude Code', codex: 'Codex', chatgpt: 'ChatGPT', gemini: 'Gemini',
}
export const PROVIDER_COLOR: Record<Provider, string> = {
  'claude-code': '#e07a4f', codex: '#3fb6c4', chatgpt: '#4fbf8a', gemini: '#7a8cff',
}
const PROVIDERS: Provider[] = ['claude-code', 'codex', 'chatgpt', 'gemini']

interface RoleDef { role: string; provider?: Provider; drafts: string[] }

/** Deutsche Rollen und Mock Entwürfe pro Abteilung. Ein Provider ist festgelegt, wo die Abteilung nach ihm benannt ist. */
const ROLES: Record<string, RoleDef> = {
  'dept-sales': { role: 'Vertriebs-Agent', drafts: ['Angebot Produktpaket Handwerk', 'Erstansprache Handwerk', 'Nachfass-Mail Kunde 14'] },
  'dept-employer-research': { role: 'Recherche-Agent', drafts: ['Profil Bäckerei Nord', 'Leadliste Kassel Handwerk', 'Ansprechpartner Pflegedienst'] },
  'dept-recruiting': { role: 'Recruiting-Agent', drafts: ['Stellenanzeige Elektriker', 'Bewerberliste Kfz', 'Interviewleitfaden Pflege'] },
  'dept-hj-conference': { role: 'Besprechungs-Agent', drafts: ['Protokoll Teamrunde', 'Angebotsabstimmung'] },
  'dept-km-conference': { role: 'Besprechungs-Agent', drafts: ['Themenplan Woche', 'Reichweitenauswertung'] },
  'dept-customer-success': { role: 'Kundenerfolgs-Agent', drafts: ['Onboarding-Plan', 'Status-Update Kunde 7', 'Feedback-Auswertung'] },
  'dept-trend-lab': { role: 'Trend-Scout', drafts: ['Meme-Idee Montag', 'Trendbericht KW 12', 'Formatvorschlag Karussell'] },
  'dept-editorial': { role: 'Nachrichten-Redakteur', drafts: ['Nachrichtenbeitrag Kassel', 'Meldung Verkehr', 'Themenpaket Pendler'] },
  'dept-creative-studio': { role: 'Infobeitrags-Agent', drafts: ['Infobeitrag Stadtwerke', 'Grafik Wissenskarte', 'Layout Titelbild'] },
  'dept-community': { role: 'Gewinnspiel- & Community-Agent', drafts: ['Gewinnspiel Wochenende', 'Antworten Kommentare', 'Teilnahmebedingungen'] },
  'dept-codex': { role: 'Entwickler-Agent', provider: 'codex', drafts: ['Refactoring Auth-Modul', 'Pull-Request Beschreibung', 'Testfälle Import'] },
  'dept-claude-code': { role: 'Entwickler-Agent', provider: 'claude-code', drafts: ['Architektur-Entwurf', 'Fehleranalyse Build', 'Migration Datenbank'] },
  'dept-development': { role: 'Entwickler-Agent', drafts: ['API-Entwurf Schnittstelle', 'Komponentenstruktur', 'Code-Review Notizen'] },
  'dept-automation': { role: 'Automatisierungs-Agent', drafts: ['Ablauf Lead-Import', 'Zeitplan Nachtläufe', 'Fehlerbehandlung'] },
  'dept-qa': { role: 'Prüf-Agent', drafts: ['Testplan Release', 'Fehlerliste Sprint', 'Regressionstests'] },
  'dept-research-infra': { role: 'Forschungs-Agent', drafts: ['Marktanalyse Tools', 'Kostenvergleich Hosting'] },
  'dept-operations': { role: 'Betriebs-Agent', drafts: ['Tagesübersicht', 'Auslastung Woche', 'Eskalationsliste'] },
  'dept-approval': { role: 'Freigabe-Agent', drafts: ['Freigabe-Paket 3', 'Prüfliste Angebote'] },
  'dept-management': { role: 'Assistenz der Geschäftsführung', drafts: ['Wochenbericht', 'Terminvorschlag'] },
  'dept-shared-ops': { role: 'Betriebs-Agent', drafts: ['Aufgabenverteilung', 'Freigaben sammeln', 'Übergabenotiz'] },
  'dept-shared': { role: 'Empfangs-Agent', drafts: ['Besucherliste', 'Raumplan Heute'] },
}

export function floorOfDepartment(deptId: string): string | undefined {
  return BUILDING.floors.find((f) => f.departments.some((d) => d.id === deptId))?.id
}

/** Departments, die Schreibtische haben (Arbeitsabteilungen). */
export function deptsWithDesks(floorId: string) {
  const f = BUILDING.floors.find((x) => x.id === floorId)!
  return f.departments.filter((d) => d.zones.some((z) => z.type === 'workstations' || z.type === 'creative'))
}

let counter = 0
export function makeAgent(departmentId: string, status: AgentStatus = 'working', simulated = true): Agent {
  const floorId = floorOfDepartment(departmentId)!
  const r = ROLES[departmentId] ?? { role: 'Agent', drafts: ['Entwurf'] }
  counter++
  const short = departmentId.replace('dept-', '')
  const id = `agent-${short}-${String(counter).padStart(3, '0')}`
  const h = hashString(id)
  const provider = r.provider ?? PROVIDERS[h % PROVIDERS.length]
  return {
    id, name: `${r.role} ${counter}`, role: r.role, provider, departmentId, floorId, status,
    avatar: randomAvatar(id), simulated, draft: r.drafts[(h >> 3) % r.drafts.length],
  }
}

/** Startbelegung: viel Betrieb auf HerkulesJobs, etwas auf den anderen Etagen. */
export function initialAgents(): Agent[] {
  const out: Agent[] = []
  const plan: [string, number, AgentStatus[]][] = [
    ['dept-sales', 5, ['working', 'working', 'working', 'idle', 'working']],
    ['dept-employer-research', 4, ['working', 'working', 'break', 'working']],
    ['dept-recruiting', 3, ['working', 'waiting', 'working']],
    ['dept-customer-success', 3, ['working', 'working', 'idle']],
    ['dept-hj-conference', 3, ['meeting', 'meeting', 'meeting']],
    ['dept-trend-lab', 4, ['working', 'working', 'idle', 'working']],
    ['dept-editorial', 3, ['working', 'working', 'working']],
    ['dept-community', 3, ['working', 'working', 'break']],
    ['dept-km-conference', 3, ['meeting', 'meeting', 'meeting']],
    ['dept-codex', 4, ['working', 'working', 'waiting', 'working']],
    ['dept-claude-code', 4, ['working', 'working', 'working', 'idle']],
    ['dept-qa', 2, ['working', 'idle']],
    ['dept-operations', 2, ['working', 'working']],
    ['dept-shared-ops', 2, ['working', 'idle']],
    ['dept-shared', 3, ['idle', 'idle', 'break']],
  ]
  for (const [dept, n, st] of plan) for (let i = 0; i < n; i++) out.push(makeAgent(dept, st[i % st.length]))
  return out
}
