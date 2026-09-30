import type { Capability, TaskDepartment } from './types';

/**
 * Mock Workflows. Rein simuliert, es werden keine echten Nachrichten, Posts, CRM Updates
 * oder E Mails erzeugt. Alle Titel sind als (DEMO) markiert.
 */

export interface TaskStepDef {
  kind: 'TASK';
  title: string;
  departmentId: TaskDepartment;
  requiredCapabilities: Capability[];
  workDurationMs: number;
  requiresApproval?: boolean;
}

export interface MeetingStepDef {
  kind: 'MEETING';
  title: string;
  /** Teilnehmer sind die Agenten, die diese früheren Schritte bearbeitet haben. */
  participantsFromSteps: number[];
  durationMs: number;
}

export type WorkflowStepDef = TaskStepDef | MeetingStepDef;

export interface WorkflowDef {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStepDef[];
}

const task = (
  title: string,
  departmentId: TaskDepartment,
  requiredCapabilities: Capability[],
  workDurationMs: number,
  requiresApproval = false,
): TaskStepDef => ({ kind: 'TASK', title, departmentId, requiredCapabilities, workDurationMs, requiresApproval });

export const WORKFLOWS: Record<string, WorkflowDef> = {
  hj_sales: {
    id: 'hj_sales',
    title: 'HerkulesJobs Vertrieb (DEMO)',
    description: 'Lead Recherche, Arbeitgeber Recherche, Vertrieb, Ansprache Entwurf, Freigabe, Kundenerfolg',
    steps: [
      task('Lead Recherche (DEMO)', 'HERKULESJOBS', ['lead_research'], 25_000),
      task('Arbeitgeber Recherche (DEMO)', 'HERKULESJOBS', ['company_analysis'], 25_000),
      task('Vertriebsqualifizierung (DEMO)', 'HERKULESJOBS', ['sales'], 20_000),
      task('Ansprache Entwurf (DEMO)', 'HERKULESJOBS', ['outreach', 'copywriting'], 25_000, true),
      task('Übergabe an Kundenerfolg (DEMO)', 'HERKULESJOBS', ['customer_success'], 15_000),
    ],
  },
  hj_produktberatung: {
    id: 'hj_produktberatung',
    title: 'HerkulesJobs Produktberatung (DEMO)',
    description: 'Bedarf klären, Produktberatung, Angebot als Entwurf mit Freigabe, Nachfassen',
    steps: [
      task('Bedarf klären (DEMO)', 'HERKULESJOBS', ['account_management'], 20_000),
      task('Produktberatung (DEMO)', 'HERKULESJOBS', ['sales', 'product_knowledge'], 30_000),
      task('Angebot Entwurf (DEMO)', 'HERKULESJOBS', ['outreach', 'copywriting'], 25_000, true),
      task('Nachfassen planen (DEMO)', 'HERKULESJOBS', ['follow_up'], 15_000),
    ],
  },
  km_trend_spike: {
    id: 'km_trend_spike',
    title: 'KasselMemes Trendwelle (DEMO)',
    description: 'Trend, Recherche, Redaktion, Kreativ, Meeting, Entwurf wartet auf Freigabe',
    steps: [
      task('Trend erkannt (DEMO)', 'KASSELMEMES', ['trend_detection'], 15_000),
      task('Lokale Recherche (DEMO)', 'KASSELMEMES', ['local_research'], 25_000),
      task('Redaktioneller Winkel (DEMO)', 'KASSELMEMES', ['editorial'], 25_000),
      task('Kreatives Konzept (DEMO)', 'KASSELMEMES', ['creative'], 25_000),
      { kind: 'MEETING', title: 'Trend Abstimmung (DEMO)', participantsFromSteps: [0, 1, 2, 3], durationMs: 30_000 },
      task('Entwurf zur Freigabe (DEMO)', 'KASSELMEMES', ['caption', 'copywriting'], 20_000, true),
    ],
  },
  km_nachrichtenbeitrag: {
    id: 'km_nachrichtenbeitrag',
    title: 'KasselMemes Nachrichtenbeitrag (DEMO)',
    description: 'Nachricht recherchieren, Beitrag schreiben, Bildtext, Freigabe',
    steps: [
      task('Nachricht recherchieren (DEMO)', 'KASSELMEMES', ['local_research'], 25_000),
      task('Nachrichtenbeitrag schreiben (DEMO)', 'KASSELMEMES', ['editorial', 'copywriting'], 30_000),
      task('Bildtext ergänzen (DEMO)', 'KASSELMEMES', ['caption'], 15_000),
      task('Beitrag zur Freigabe (DEMO)', 'KASSELMEMES', ['editorial'], 10_000, true),
    ],
  },
  km_gewinnspiel: {
    id: 'km_gewinnspiel',
    title: 'KasselMemes Gewinnspiel (DEMO)',
    description: 'Idee, Gestaltung, Ablauf mit Community, Meeting, Entwurf mit Freigabe',
    steps: [
      task('Gewinnspiel Idee (DEMO)', 'KASSELMEMES', ['editorial'], 20_000),
      task('Gewinnspiel Gestaltung (DEMO)', 'KASSELMEMES', ['creative'], 25_000),
      task('Ablauf und Teilnahmebedingungen (DEMO)', 'KASSELMEMES', ['giveaway'], 25_000),
      { kind: 'MEETING', title: 'Gewinnspiel Abstimmung (DEMO)', participantsFromSteps: [0, 1, 2], durationMs: 25_000 },
      task('Gewinnspiel zur Freigabe (DEMO)', 'KASSELMEMES', ['caption', 'copywriting'], 15_000, true),
    ],
  },
  dev_feature: {
    id: 'dev_feature',
    title: 'Entwicklung Feature (DEMO)',
    description: 'Entwickler, Code Review, QA, Abschluss',
    steps: [
      task('Feature Aufgabe (DEMO)', 'SHARED', ['coding'], 40_000),
      task('Code Review (DEMO)', 'SHARED', ['review'], 20_000),
      task('QA Lauf (DEMO)', 'SHARED', ['testing'], 25_000),
    ],
  },
};

/** Workflows je Abteilung, aus denen der Generator wählt. */
export const WORKFLOWS_BY_DEPARTMENT: Record<'HERKULESJOBS' | 'KASSELMEMES' | 'SHARED', string[]> = {
  HERKULESJOBS: ['hj_sales', 'hj_produktberatung'],
  KASSELMEMES: ['km_trend_spike', 'km_nachrichtenbeitrag', 'km_gewinnspiel'],
  SHARED: ['dev_feature'],
};

export interface TaskTemplate {
  title: string;
  capabilities: Capability[];
  minMs: number;
  maxMs: number;
  approvalChance: number;
}

const t = (title: string, capabilities: Capability[], approvalChance = 0, minMs = 15_000, maxMs = 60_000): TaskTemplate => ({
  title: `${title} (DEMO)`,
  capabilities,
  minMs,
  maxMs,
  approvalChance,
});

export const TASK_TEMPLATES: Record<'HERKULESJOBS' | 'KASSELMEMES' | 'SHARED', TaskTemplate[]> = {
  HERKULESJOBS: [
    t('Leads anreichern', ['lead_enrichment']),
    t('Arbeitgeber recherchieren', ['company_analysis']),
    t('Ansprache entwerfen', ['outreach', 'copywriting'], 0.35),
    t('Nachfassrunde', ['follow_up']),
    t('Recruiting Beitrag entwerfen', ['recruiting_content'], 0.3),
    t('Kunden Check in', ['customer_success']),
    t('Stellenmarkt beobachten', ['job_research']),
    t('Account Überprüfung', ['account_management']),
    t('Produktberatung vorbereiten', ['sales', 'product_knowledge']),
  ],
  KASSELMEMES: [
    t('Trends beobachten', ['trend_detection']),
    t('Lokale Ereignisse recherchieren', ['local_research']),
    t('Redaktionsplan', ['editorial']),
    t('Infobeitrag entwerfen', ['editorial', 'copywriting'], 0.3),
    t('Nachrichtenbeitrag prüfen', ['editorial'], 0.3),
    t('Bildtexte erstellen', ['caption'], 0.3),
    t('Kreatives Konzept', ['creative']),
    t('Community Antworten entwerfen', ['community'], 0.4),
    t('Gewinnspiel vorbereiten', ['giveaway'], 0.4),
    t('Partnerschaftsanfrage entwerfen', ['partnerships'], 0.4),
    t('Reel schneiden', ['video']),
  ],
  SHARED: [
    t('Änderung umsetzen', ['coding'], 0, 25_000, 70_000),
    t('Änderung prüfen', ['review']),
    t('Testlauf', ['testing']),
    t('Automatisierung anpassen', ['automation']),
    t('Allgemeine Recherche', ['research']),
    t('Betriebsprüfung', ['operations']),
  ],
};
