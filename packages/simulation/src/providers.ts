import type { Capability, ExternalRef, Priority, TaskDepartment } from './types';

/**
 * Adaptergrenze für spätere echte Provider (Codex, Claude Code, weitere).
 * Es gibt bewusst KEINE echte Implementierung. Ein Adapter übersetzt rohe Provider Ereignisse
 * in ProviderEvent, die Engine bildet sie auf Aufgaben und Agentenstatus ab:
 *
 *   provider.session.started   -> EXTERNAL Aufgabe, Agent geht zum Schreibtisch, WORKING
 *   provider.session.waiting   -> WAITING_FOR_HUMAN, APPROVAL_REQUIRED
 *   provider.session.completed -> Aufgabe abgeschlossen
 *   provider.session.failed    -> Aufgabe fehlgeschlagen
 *
 * EXTERNAL Aufgaben werden von Pause und Beschleunigung nie berührt und nie automatisch freigegeben.
 */
export type ProviderEvent =
  | { type: 'provider.started'; providerId: string }
  | { type: 'provider.stopped'; providerId: string; reason?: string }
  | {
      type: 'provider.session.started';
      providerId: string;
      sessionId: string;
      title: string;
      departmentId: TaskDepartment;
      requiredCapabilities: Capability[];
      /** Feste Zuordnung zu einem Agenten (empfohlen). */
      agentId?: string;
      priority?: Priority;
    }
  | { type: 'provider.session.waiting'; providerId: string; sessionId: string; waitingFor: 'HUMAN_APPROVAL' | 'HUMAN_INPUT' }
  | { type: 'provider.session.completed'; providerId: string; sessionId: string }
  | { type: 'provider.session.failed'; providerId: string; sessionId: string; reason: string };

export interface ProviderAdapter {
  readonly providerId: string;
  /** Übersetzt ein rohes Ereignis des Providers. null = irrelevant. */
  toProviderEvent(raw: unknown): ProviderEvent | null;
}

export type { ExternalRef };
