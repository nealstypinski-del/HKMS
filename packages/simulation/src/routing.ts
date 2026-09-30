import { PRIORITY_RANK, type Agent, type Capability, type Task } from './types';

/**
 * Deterministisches Task Routing. Kein Routing über Agentennamen, sondern über Capabilities.
 * Bewusst einfach (keine Optimierung): gleiche Eingabe liefert immer denselben Agenten.
 */

export function capabilitiesMatch(agentCapabilities: readonly Capability[], required: readonly Capability[]): boolean {
  for (const r of required) if (!agentCapabilities.includes(r)) return false;
  return true;
}

/** Darf ein pausierender Agent für diese Aufgabe aus der Pause geholt werden? */
export function mayInterruptBreak(task: Pick<Task, 'priority' | 'pinnedAgentId' | 'origin'>): boolean {
  return PRIORITY_RANK[task.priority] >= PRIORITY_RANK.HIGH || task.pinnedAgentId !== null || task.origin === 'EXTERNAL';
}

/** Effektive Priorität inkl. Aging (LOW/NORMAL steigen mit Wartezeit bis maximal HIGH). */
export function effectiveRank(task: Pick<Task, 'priority' | 'createdAtMs'>, nowMs: number, agingMs: number): number {
  const base = PRIORITY_RANK[task.priority];
  if (agingMs <= 0 || base >= PRIORITY_RANK.HIGH) return base;
  const bonus = Math.floor(Math.max(0, nowMs - task.createdAtMs) / agingMs);
  return Math.min(PRIORITY_RANK.HIGH, base + bonus);
}

export interface RouteScore {
  agent: Agent;
  /** 0 = eigene Abteilung, 1 = Shared Agent hilft aus. */
  departmentTier: number;
  /** 0 = verfügbar, 1 = pausiert (nur bei hoher Priorität). */
  availabilityTier: number;
  workload: number;
  /** Weniger Zusatzfähigkeiten = spezialisierter = bevorzugt. */
  extraCapabilities: number;
}

export class TaskRouter {
  /** Bewertet einen Agenten für eine Aufgabe. null = nicht geeignet. */
  score(task: Task, agent: Agent): RouteScore | null {
    if (agent.status !== 'AVAILABLE' && agent.status !== 'BREAK') return null;
    if (agent.taskId !== null || agent.meetingId !== null) return null;
    if (agent.status === 'BREAK' && !mayInterruptBreak(task)) return null;
    if (task.pinnedAgentId !== null && task.pinnedAgentId !== agent.id) return null;
    if (!capabilitiesMatch(agent.capabilities, task.requiredCapabilities)) return null;

    let departmentTier: number;
    if (task.departmentId === 'ANY' || task.departmentId === agent.departmentId) departmentTier = 0;
    else if (agent.departmentId === 'SHARED') departmentTier = 1;
    else return null;

    return {
      agent,
      departmentTier,
      availabilityTier: agent.status === 'AVAILABLE' ? 0 : 1,
      workload: agent.tasksCompleted,
      extraCapabilities: agent.capabilities.length - task.requiredCapabilities.length,
    };
  }

  /** Alle geeigneten Agenten, beste zuerst. */
  rank(task: Task, candidates: readonly Agent[]): RouteScore[] {
    const scores: RouteScore[] = [];
    for (const a of candidates) {
      const s = this.score(task, a);
      if (s) scores.push(s);
    }
    scores.sort(compareScores);
    return scores;
  }

  pick(task: Task, candidates: readonly Agent[]): Agent | null {
    let best: RouteScore | null = null;
    for (const a of candidates) {
      const s = this.score(task, a);
      if (s && (best === null || compareScores(s, best) < 0)) best = s;
    }
    return best ? best.agent : null;
  }
}

function compareScores(a: RouteScore, b: RouteScore): number {
  return (
    a.departmentTier - b.departmentTier ||
    a.availabilityTier - b.availabilityTier ||
    a.workload - b.workload ||
    a.extraCapabilities - b.extraCapabilities ||
    (a.agent.id < b.agent.id ? -1 : a.agent.id > b.agent.id ? 1 : 0)
  );
}
