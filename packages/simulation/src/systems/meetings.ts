import type { Ctx } from '../context';
import { floorIndex } from '../layout';
import { fail, ok, type Agent, type Meeting, type MeetingSpec, type Result, type ZoneId } from '../types';

const TERMINAL = new Set(['COMPLETED', 'CANCELLED']);

/** Meetings: Raum reservieren, Teilnehmer versammeln, durchführen, zurückschicken. */
export class MeetingSystem {
  constructor(private c: Ctx) {}

  private roomIds(): ZoneId[] {
    return this.c.state.layout.zones.filter((z) => z.kind === 'MEETING_ROOM').map((z) => z.id);
  }

  private seatsOf(roomId: ZoneId) {
    return this.c.anchors.inZone(roomId).filter((a) => a.type === 'MEETING_SEAT');
  }

  isEligible(a: Agent): boolean {
    if (a.meetingId !== null) return false;
    if (this.c.systems.agents.isProtected(a)) return false;
    if (a.status === 'AVAILABLE' || a.status === 'BREAK' || a.status === 'COMPLETED') return true;
    if (a.status === 'WORKING' && a.taskId) return this.c.state.tasks[a.taskId]?.origin === 'MOCK';
    return false;
  }

  create(spec: MeetingSpec): Result<Meeting> {
    const c = this.c;
    if (!spec || !Array.isArray(spec.participantAgentIds)) return fail('INVALID', 'participantAgentIds muss eine Liste sein');
    if (spec.durationMs !== undefined && (!Number.isFinite(spec.durationMs) || spec.durationMs <= 0 || spec.durationMs > 86_400_000)) return fail('INVALID', 'durationMs muss zwischen 1 ms und 24 Stunden liegen');
    if (spec.roomId !== undefined && !this.roomIds().includes(spec.roomId)) return fail('NOT_FOUND', `Raum ${spec.roomId} ist kein Meetingraum`);
    const ids = [...new Set(spec.participantAgentIds)];
    if (ids.length < 2) return fail('INVALID', 'Ein Meeting braucht mindestens zwei Teilnehmer');
    for (const id of ids) {
      const a = c.state.agents[id];
      if (!a) return fail('NOT_FOUND', `Agent ${id} unbekannt`);
      if (a.meetingId) return fail('AGENT_IN_MEETING', `${a.name} ist bereits in einem Meeting`);
      if (a.status === 'OFFLINE' || a.status === 'ERROR') return fail('AGENT_UNAVAILABLE', `${a.name} ist ${a.status}`);
      if (c.systems.agents.isProtected(a)) return fail('AGENT_PROTECTED', `${a.name} bearbeitet eine echte Aufgabe`);
    }
    const rooms = spec.roomId ? [spec.roomId] : this.roomIds();
    if (!rooms.some((r) => this.seatsOf(r).length >= ids.length)) return fail('NO_ROOM', 'Kein Raum mit genug Sitzplätzen');

    const n = (c.state.counters['meeting'] = (c.state.counters['meeting'] ?? 0) + 1);
    const m: Meeting = {
      id: `MTG-${String(n).padStart(3, '0')}`,
      title: spec.title,
      participantAgentIds: ids,
      roomId: spec.roomId ?? null,
      taskId: spec.taskId ?? null,
      status: 'SCHEDULED',
      origin: spec.origin ?? 'MANUAL',
      durationMs: spec.durationMs ?? c.state.config.timings.defaultMeetingMs,
      seatByAgent: {},
      createdAtMs: c.now(),
      startedAtMs: null,
      endedAtMs: null,
      endsAtMs: null,
      assembleStartedAtMs: null,
      workflowRunId: spec.workflowRunId ?? null,
      cancelReason: null,
    };
    c.state.meetings[m.id] = m;
    for (const id of ids) c.state.agents[id]!.meetingId = m.id;
    c.emit('MEETING_CREATED', { meetingId: m.id, title: m.title, participantAgentIds: [...ids], origin: m.origin });
    c.log.add(c.now(), 'MEETING', `Meeting ${m.id} angelegt: ${m.title}`, { meetingId: m.id });
    return ok(m);
  }

  private chooseRoom(m: Meeting, participants: Agent[]): ZoneId | null {
    const c = this.c;
    const need = participants.length;
    let best: ZoneId | null = null;
    let bestCost = Infinity;
    const candidates = m.roomId ? [m.roomId] : this.roomIds();
    for (const roomId of candidates) {
      const seats = this.seatsOf(roomId);
      const free = seats.filter((s) => c.anchors.isFree(s.id)).length;
      if (free < need) continue;
      const rf = floorIndex(seats[0]!.floorId);
      let cost = 0;
      for (const p of participants) cost += Math.abs(rf - floorIndex(p.location.floorId));
      if (cost < bestCost) {
        bestCost = cost;
        best = roomId;
      }
    }
    return best;
  }

  private tryAssemble(m: Meeting): void {
    const c = this.c;
    const participants = m.participantAgentIds.map((id) => c.state.agents[id]!);
    if (!participants.every((p) => this.isEligibleInMeeting(p))) return;
    const room = this.chooseRoom(m, participants);
    if (!room) return;
    const free = this.seatsOf(room).filter((s) => c.anchors.isFree(s.id));
    m.roomId = room;
    m.status = 'ASSEMBLING';
    m.assembleStartedAtMs = c.now();
    participants.forEach((p, i) => (m.seatByAgent[p.id] = free[i]!.id));
    c.emit('MEETING_ASSEMBLING', { meetingId: m.id, roomId: room, participantAgentIds: [...m.participantAgentIds], seatByAgent: { ...m.seatByAgent } });
    c.log.add(c.now(), 'MEETING', `Meeting ${m.id} versammelt sich in ${room}`, { meetingId: m.id });
    for (const p of participants) c.systems.agents.startMeetingTravel(p, m.seatByAgent[p.id]!);
  }

  /** Teilnehmer haben meetingId bereits gesetzt, deshalb die Eignung ohne diese Prüfung. */
  private isEligibleInMeeting(a: Agent): boolean {
    if (this.c.systems.agents.isProtected(a)) return false;
    if (a.status === 'AVAILABLE' || a.status === 'BREAK' || a.status === 'COMPLETED') return true;
    if (a.status === 'WORKING' && a.taskId) return this.c.state.tasks[a.taskId]?.origin === 'MOCK';
    return false;
  }

  onParticipantArrived(a: Agent): void {
    const m = a.meetingId ? this.c.state.meetings[a.meetingId] : undefined;
    if (!m || m.status !== 'ASSEMBLING') return;
    if (!m.participantAgentIds.every((id) => this.c.state.agents[id]!.status === 'MEETING')) return;
    const c = this.c;
    m.status = 'ACTIVE';
    m.startedAtMs = c.now();
    m.endsAtMs = c.now() + m.durationMs;
    c.emit('MEETING_STARTED', { meetingId: m.id, roomId: m.roomId! });
    c.log.add(c.now(), 'MEETING', `Meeting ${m.id} beginnt`, { meetingId: m.id });
  }

  /** Agent fällt aus dem Meeting (z. B. Fehler). */
  removeParticipant(meetingId: string, a: Agent): void {
    const m = this.c.state.meetings[meetingId];
    if (!m) return;
    m.participantAgentIds = m.participantAgentIds.filter((id) => id !== a.id);
    delete m.seatByAgent[a.id];
    a.meetingId = null;
    if (m.participantAgentIds.length < 2) {
      this.cancel(m, 'TOO_FEW_PARTICIPANTS');
    } else if (m.status === 'ASSEMBLING') {
      this.onParticipantArrived(this.c.state.agents[m.participantAgentIds[0]!]!);
    }
  }

  complete(m: Meeting): void {
    const c = this.c;
    if (TERMINAL.has(m.status)) return;
    m.status = 'COMPLETED';
    m.endedAtMs = c.now();
    c.emit('MEETING_COMPLETED', { meetingId: m.id });
    c.log.add(c.now(), 'MEETING', `Meeting ${m.id} beendet`, { meetingId: m.id });
    for (const id of m.participantAgentIds) c.systems.agents.afterMeeting(c.state.agents[id]!);
    this.finish(m);
  }

  cancel(m: Meeting, reason: string): void {
    const c = this.c;
    if (TERMINAL.has(m.status)) return;
    const moved = m.status !== 'SCHEDULED';
    m.status = 'CANCELLED';
    m.cancelReason = reason;
    m.endedAtMs = c.now();
    c.emit('MEETING_CANCELLED', { meetingId: m.id, reason });
    c.log.add(c.now(), 'MEETING', `Meeting ${m.id} abgesagt: ${reason}`, { meetingId: m.id });
    for (const id of m.participantAgentIds) {
      const a = c.state.agents[id]!;
      if (moved) c.systems.agents.afterMeeting(a);
      else a.meetingId = null;
    }
    this.finish(m);
  }

  private finish(m: Meeting): void {
    const c = this.c;
    c.systems.workflows.onMeetingTerminal(m);
    c.state.meetingHistory.push({ id: m.id, title: m.title, status: m.status, participantAgentIds: [...m.participantAgentIds], endedAtMs: m.endedAtMs });
    if (c.state.meetingHistory.length > c.state.config.historyCapacity) c.state.meetingHistory.splice(0, c.state.meetingHistory.length - c.state.config.historyCapacity);
    delete c.state.meetings[m.id];
    c.flags.dispatchDirty = true;
  }

  tick(now: number): void {
    const cfg = this.c.state.config.timings;
    for (const m of Object.values(this.c.state.meetings)) {
      if (m.status === 'SCHEDULED') {
        if (now - m.createdAtMs > cfg.meetingScheduleTimeoutMs) this.cancel(m, 'SCHEDULE_TIMEOUT');
        else this.tryAssemble(m);
      } else if (m.status === 'ASSEMBLING') {
        if (now - (m.assembleStartedAtMs ?? now) > cfg.meetingAssembleTimeoutMs) this.cancel(m, 'ASSEMBLE_TIMEOUT');
      } else if (m.status === 'ACTIVE' && m.endsAtMs !== null && now >= m.endsAtMs) {
        this.complete(m);
      }
    }
  }
}
