import type { AnchorBook } from './anchors';
import type { Agent, AnchorId, DepartmentId, Task } from './types';

/**
 * DeskAssignmentService: findet und reserviert Schreibtische.
 * Regeln: pro Agent höchstens ein Schreibtisch, pro Schreibtisch höchstens ein Agent.
 */
export class DeskAssignmentService {
  constructor(private anchors: AnchorBook) {}

  /** Bevorzugt den letzten Schreibtisch, dann Abteilung des Agenten, dann Abteilung der Aufgabe. */
  findDesk(agent: Agent, task: Pick<Task, 'departmentId'>): AnchorId | null {
    const pref = agent.preferredDeskId;
    if (pref && this.anchors.has(pref) && this.anchors.isFree(pref, agent.id)) {
      const d = this.anchors.get(pref).departmentId;
      if (d === agent.departmentId || d === task.departmentId) return pref;
    }
    const own = this.anchors.findFree('DESK', agent.id, { departmentId: agent.departmentId });
    if (own) return own.id;
    if (task.departmentId !== 'ANY' && task.departmentId !== agent.departmentId) {
      const other = this.anchors.findFree('DESK', agent.id, { departmentId: task.departmentId as DepartmentId });
      if (other) return other.id;
    }
    return null;
  }

  reserve(agent: Agent, deskId: AnchorId): void {
    if (agent.deskAnchorId && agent.deskAnchorId !== deskId) {
      throw new Error(`Agent ${agent.id} hat bereits Schreibtisch ${agent.deskAnchorId}`);
    }
    this.anchors.reserve(deskId, agent.id);
    agent.deskAnchorId = deskId;
    agent.preferredDeskId = deskId;
  }

  /** Gibt den Schreibtisch frei (Reservierung und Belegung). */
  release(agent: Agent): void {
    if (!agent.deskAnchorId) return;
    this.anchors.release(agent.deskAnchorId, agent.id);
    if (agent.occupiedAnchorId === agent.deskAnchorId) agent.occupiedAnchorId = null;
    agent.deskAnchorId = null;
  }
}
