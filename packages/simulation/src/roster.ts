import type { Capability, DepartmentId } from './types';

/**
 * Seed Roster. ALLES hier ist DEMO / MOCK. Es gibt keine echten HerkulesJobs Kundendaten
 * und keine echten KasselMemes Geschäftsdaten.
 */

export interface AgentSeed {
  id: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  capabilities: Capability[];
  providerId: string;
}

const seed = (id: string, role: string, departmentId: DepartmentId, capabilities: Capability[]): AgentSeed => ({
  id,
  name: role,
  role,
  departmentId,
  capabilities,
  providerId: 'mock',
});

export const BASE_ROSTER: readonly AgentSeed[] = [
  // HerkulesJobs
  seed('hj-lead-research', 'Lead Recherche Agent', 'HERKULESJOBS', ['research', 'lead_research', 'lead_enrichment']),
  seed('hj-sales', 'Vertriebs Agent', 'HERKULESJOBS', ['sales', 'outreach', 'follow_up', 'product_knowledge']),
  seed('hj-employer-research', 'Arbeitgeber Recherche Agent', 'HERKULESJOBS', ['research', 'company_analysis', 'lead_enrichment']),
  seed('hj-outreach', 'Ansprache Agent', 'HERKULESJOBS', ['outreach', 'copywriting', 'follow_up']),
  seed('hj-recruiting-content', 'Recruiting Content Agent', 'HERKULESJOBS', ['copywriting', 'recruiting_content', 'creative']),
  seed('hj-customer-success', 'Kundenerfolg Agent', 'HERKULESJOBS', ['customer_success', 'follow_up']),
  seed('hj-job-research', 'Stellen Recherche Agent', 'HERKULESJOBS', ['research', 'job_research']),
  seed('hj-account-management', 'Kundenbetreuung Agent', 'HERKULESJOBS', ['account_management', 'sales', 'follow_up', 'product_knowledge']),
  // KasselMemes
  seed('km-trend-scout', 'Trend Scout', 'KASSELMEMES', ['trend_detection', 'research']),
  seed('km-local-research', 'Lokale Recherche Agent', 'KASSELMEMES', ['research', 'local_research']),
  seed('km-editorial', 'Redaktions Agent', 'KASSELMEMES', ['editorial', 'copywriting']),
  seed('km-caption', 'Bildtext Agent', 'KASSELMEMES', ['copywriting', 'caption']),
  seed('km-creative', 'Kreativ Agent', 'KASSELMEMES', ['creative']),
  seed('km-community', 'Community Agent', 'KASSELMEMES', ['community', 'giveaway']),
  seed('km-partnership', 'Partnerschafts Agent', 'KASSELMEMES', ['partnerships', 'giveaway']),
  seed('km-video-reel', 'Video und Reel Agent', 'KASSELMEMES', ['creative', 'video']),
  // Shared
  seed('sh-developer', 'Entwickler Agent', 'SHARED', ['coding']),
  seed('sh-code-review', 'Code Review Agent', 'SHARED', ['review']),
  seed('sh-qa', 'QA Agent', 'SHARED', ['testing']),
  seed('sh-automation', 'Automatisierungs Agent', 'SHARED', ['automation']),
  seed('sh-research', 'Recherche Agent', 'SHARED', ['research']),
  seed('sh-operations', 'Betriebs Agent', 'SHARED', ['operations']),
];

/** Wiederholt das Basis Roster (ids und Namen mit laufender Nummer), z. B. für Lasttests. */
export function makeRoster(copies: number): AgentSeed[] {
  if (copies <= 1) return BASE_ROSTER.map((s) => ({ ...s, capabilities: [...s.capabilities] }));
  const out: AgentSeed[] = [];
  for (let c = 1; c <= copies; c++) {
    const suffix = String(c).padStart(2, '0');
    for (const s of BASE_ROSTER) {
      out.push({ ...s, id: `${s.id}-${suffix}`, name: `${s.role} ${suffix}`, capabilities: [...s.capabilities] });
    }
  }
  return out;
}

/** Roster mit genau n Agenten (zyklisch aus dem Basis Roster). */
export function makeRosterOfSize(n: number): AgentSeed[] {
  const out: AgentSeed[] = [];
  for (let i = 0; i < n; i++) {
    const s = BASE_ROSTER[i % BASE_ROSTER.length]!;
    const round = Math.floor(i / BASE_ROSTER.length) + 1;
    const suffix = String(round).padStart(2, '0');
    out.push(round === 1 && n <= BASE_ROSTER.length ? { ...s, capabilities: [...s.capabilities] } : { ...s, id: `${s.id}-${suffix}`, name: `${s.role} ${suffix}`, capabilities: [...s.capabilities] });
  }
  return out;
}
