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
    description: 'Lead Research, Employer Research, Sales, Outreach Entwurf, Freigabe, Customer Success',
    steps: [
      task('Lead research (DEMO)', 'HERKULESJOBS', ['lead_research'], 25_000),
      task('Employer research (DEMO)', 'HERKULESJOBS', ['company_analysis'], 25_000),
      task('Sales qualification (DEMO)', 'HERKULESJOBS', ['sales'], 20_000),
      task('Outreach draft (DEMO)', 'HERKULESJOBS', ['outreach', 'copywriting'], 25_000, true),
      task('Customer success handover (DEMO)', 'HERKULESJOBS', ['customer_success'], 15_000),
    ],
  },
  km_trend_spike: {
    id: 'km_trend_spike',
    title: 'KasselMemes Trend Spike (DEMO)',
    description: 'Trend, Research, Editorial, Creative, Meeting, Entwurf wartet auf Freigabe',
    steps: [
      task('Trend detected (DEMO)', 'KASSELMEMES', ['trend_detection'], 15_000),
      task('Local research (DEMO)', 'KASSELMEMES', ['local_research'], 25_000),
      task('Editorial angle (DEMO)', 'KASSELMEMES', ['editorial'], 25_000),
      task('Creative concept (DEMO)', 'KASSELMEMES', ['creative'], 25_000),
      { kind: 'MEETING', title: 'Trend sync (DEMO)', participantsFromSteps: [0, 1, 2, 3], durationMs: 30_000 },
      task('Draft ready for review (DEMO)', 'KASSELMEMES', ['caption', 'copywriting'], 20_000, true),
    ],
  },
  dev_feature: {
    id: 'dev_feature',
    title: 'Entwicklung Feature (DEMO)',
    description: 'Developer, Code Review, QA, Abschluss',
    steps: [
      task('Feature task (DEMO)', 'SHARED', ['coding'], 40_000),
      task('Code review (DEMO)', 'SHARED', ['review'], 20_000),
      task('QA run (DEMO)', 'SHARED', ['testing'], 25_000),
    ],
  },
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
    t('Enrich lead batch', ['lead_enrichment']),
    t('Research employer', ['company_analysis']),
    t('Draft outreach', ['outreach', 'copywriting'], 0.35),
    t('Follow up round', ['follow_up']),
    t('Recruiting post draft', ['recruiting_content'], 0.3),
    t('Customer check in', ['customer_success']),
    t('Job market scan', ['job_research']),
    t('Account review', ['account_management']),
  ],
  KASSELMEMES: [
    t('Scan trends', ['trend_detection']),
    t('Local event research', ['local_research']),
    t('Editorial plan', ['editorial']),
    t('Caption batch', ['caption'], 0.3),
    t('Creative concept', ['creative']),
    t('Community replies draft', ['community'], 0.4),
    t('Partnership outreach draft', ['partnerships'], 0.4),
    t('Reel edit', ['video']),
  ],
  SHARED: [
    t('Implement change', ['coding'], 0, 25_000, 70_000),
    t('Review change', ['review']),
    t('Run test suite', ['testing']),
    t('Automation tweak', ['automation']),
    t('General research', ['research']),
    t('Operations check', ['operations']),
  ],
};
