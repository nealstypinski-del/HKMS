import type { SimulationState } from './state';
import type { AnchorId } from './types';

/**
 * Prüft harte Invarianten des Zustands. Liefert eine Liste von Verstößen (leer = alles in Ordnung).
 * Beispiele: kein Agent auf zwei Schreibtischen, kein Schreibtisch mit zwei Agenten,
 * kein Agent gleichzeitig WORKING und BREAK, keine Aufgabe bei zwei Agenten.
 */
export function checkInvariants(state: SimulationState): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  const occupiedBy = new Map<string, AnchorId[]>();
  const heldBy = new Map<string, AnchorId[]>();
  const push = (map: Map<string, AnchorId[]>, k: string, v: AnchorId) => {
    const l = map.get(k);
    if (l) l.push(v);
    else map.set(k, [v]);
  };

  for (const a of Object.values(state.anchors)) {
    const all = [...a.occupants, ...a.reservedBy];
    if (new Set(all).size !== all.length) err(`Anker ${a.id}: doppelter Eintrag`);
    if (all.length > a.capacity) err(`Anker ${a.id}: Kapazität ${a.capacity} überschritten (${all.length})`);
    if (a.type === 'DESK' && a.capacity !== 1) err(`Schreibtisch ${a.id} hat Kapazität ${a.capacity}`);
    for (const id of all) if (!state.agents[id]) err(`Anker ${a.id}: unbekannter Agent ${id}`);
    for (const id of a.occupants) push(occupiedBy, id, a.id);
    for (const id of all) push(heldBy, id, a.id);
  }

  const taskOwner = new Map<string, string>();
  for (const a of Object.values(state.agents)) {
    const occ = occupiedBy.get(a.id) ?? [];
    if (occ.length > 1) err(`${a.id} belegt mehrere Anker: ${occ.join(', ')}`);
    if (a.occupiedAnchorId && !occ.includes(a.occupiedAnchorId)) err(`${a.id}: occupiedAnchorId ${a.occupiedAnchorId} nicht in occupants`);
    if (!a.occupiedAnchorId && occ.length > 0) err(`${a.id}: belegt ${occ[0]} ohne occupiedAnchorId`);

    const held = heldBy.get(a.id) ?? [];
    const desks = held.filter((id) => state.anchors[id]!.type === 'DESK');
    if (desks.length > 1) err(`${a.id} hält mehrere Schreibtische: ${desks.join(', ')}`);
    if (a.deskAnchorId && !held.includes(a.deskAnchorId)) err(`${a.id}: deskAnchorId ${a.deskAnchorId} nicht reserviert`);
    if (a.holdAnchorId && !held.includes(a.holdAnchorId)) err(`${a.id}: holdAnchorId ${a.holdAnchorId} nicht reserviert`);
    for (const id of held) {
      if (id !== a.deskAnchorId && id !== a.holdAnchorId && id !== a.occupiedAnchorId) err(`${a.id} hält unerwartet ${id}`);
    }

    if (a.taskId) {
      const t = state.tasks[a.taskId];
      if (!t) err(`${a.id}: Aufgabe ${a.taskId} existiert nicht`);
      else if (t.primaryAgentId !== a.id) err(`${a.id}: Aufgabe ${a.taskId} gehört ${t.primaryAgentId}`);
      const prev = taskOwner.get(a.taskId);
      if (prev) err(`Aufgabe ${a.taskId} bei zwei Agenten: ${prev}, ${a.id}`);
      taskOwner.set(a.taskId, a.id);
    }
    if (a.meetingId && !state.meetings[a.meetingId]) err(`${a.id}: Meeting ${a.meetingId} existiert nicht`);

    const task = a.taskId ? state.tasks[a.taskId] : undefined;
    switch (a.status) {
      case 'WORKING':
        if (!task || task.status !== 'IN_PROGRESS') err(`${a.id}: WORKING ohne laufende Aufgabe`);
        if (a.occupiedAnchorId === null || a.occupiedAnchorId !== a.deskAnchorId) err(`${a.id}: WORKING ohne Schreibtisch`);
        if (a.breakPlan) err(`${a.id}: WORKING und BREAK gleichzeitig`);
        break;
      case 'BREAK':
        if (a.taskId || a.meetingId) err(`${a.id}: BREAK mit Aufgabe oder Meeting`);
        if (!a.breakPlan) err(`${a.id}: BREAK ohne Pausenplan`);
        break;
      case 'MEETING':
        if (!a.meetingId) err(`${a.id}: MEETING ohne Meeting`);
        break;
      case 'WAITING':
        if (!task || task.status !== 'WAITING_FOR_HUMAN') err(`${a.id}: WAITING ohne wartende Aufgabe`);
        break;
      case 'ASSIGNED':
        if (!task || task.status !== 'ASSIGNED') err(`${a.id}: ASSIGNED ohne zugewiesene Aufgabe`);
        break;
      case 'OFFLINE':
        if (held.length > 0 || a.route || a.taskId) err(`${a.id}: OFFLINE hält noch Ressourcen`);
        break;
      case 'ERROR':
      case 'COMPLETED':
        if (a.taskId) err(`${a.id}: ${a.status} mit Aufgabe`);
        break;
      default:
        break;
    }
    if (a.breakPlan && a.status !== 'BREAK' && a.status !== 'AVAILABLE') err(`${a.id}: Pausenplan im Status ${a.status}`);
  }

  for (const t of Object.values(state.tasks)) {
    if (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_HUMAN') {
      const a = t.primaryAgentId ? state.agents[t.primaryAgentId] : undefined;
      if (!a || a.taskId !== t.id) err(`Aufgabe ${t.id} (${t.status}) ohne passenden Agenten`);
    }
    if (t.status === 'QUEUED') {
      const inQueue = state.queues[t.departmentId].filter((id) => id === t.id).length;
      if (inQueue !== 1) err(`Aufgabe ${t.id} ${inQueue}x in Warteschlange`);
      if (t.primaryAgentId) err(`Aufgabe ${t.id} in Warteschlange aber zugewiesen`);
    }
  }
  for (const [dept, ids] of Object.entries(state.queues)) {
    for (const id of ids) {
      const t = state.tasks[id];
      if (!t || t.status !== 'QUEUED') err(`Warteschlange ${dept}: ${id} ist nicht QUEUED`);
    }
  }

  for (const m of Object.values(state.meetings)) {
    if (new Set(m.participantAgentIds).size !== m.participantAgentIds.length) err(`Meeting ${m.id}: doppelte Teilnehmer`);
    for (const id of m.participantAgentIds) {
      if (state.agents[id]?.meetingId !== m.id) err(`Meeting ${m.id}: Teilnehmer ${id} verweist woanders hin`);
      if ((m.status === 'ASSEMBLING' || m.status === 'ACTIVE') && !m.seatByAgent[id]) err(`Meeting ${m.id}: kein Sitz für ${id}`);
    }
  }
  return errors;
}
