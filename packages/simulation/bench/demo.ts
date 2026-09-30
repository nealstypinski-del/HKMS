import { createScenarioEngine, formatClock } from '../src/index';

/** Textdemo: KasselMemes Trend Spike (alles DEMO, nichts wird versendet). */
const e = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE', { config: { invariantCheckEveryTicks: 1 } });
const t = (ms: number) => formatClock(ms);
const name = (id: string | null) => (id ? e.getAgent(id)?.name ?? id : '-');
const lines: string[] = [];
const seen = new Set<string>();
e.onAny((ev) => {
  const p = ev.payload as any;
  switch (ev.type) {
    case 'WORKFLOW_STARTED': lines.push(`${t(ev.timeMs)}  WORKFLOW   ${p.runId} gestartet (${p.workflowId})`); break;
    case 'TASK_ASSIGNED': lines.push(`${t(ev.timeMs)}  ZUWEISUNG  ${p.taskId} an ${name(p.agentId)} (Schreibtisch ${p.deskAnchorId})`); break;
    case 'AGENT_MOVEMENT_REQUESTED': {
      const kinds = (p.stages as any[]).map((s) => s.kind);
      if (kinds.includes('CHANGE_FLOOR') && !seen.has(p.agentId + kinds.length)) { seen.add(p.agentId + kinds.length); const cf = (p.stages as any[]).find((s) => s.kind === 'CHANGE_FLOOR'); lines.push(`${t(ev.timeMs)}  AUFZUG     ${name(p.agentId)}: ${cf.from.floorId} nach ${cf.to.floorId}, Ziel ${p.destinationAnchorId ?? p.destination.zoneId}`); }
      break;
    }
    case 'TASK_STARTED': lines.push(`${t(ev.timeMs)}  ARBEIT     ${name(p.agentId)} startet ${p.taskId}`); break;
    case 'MEETING_ASSEMBLING': lines.push(`${t(ev.timeMs)}  MEETING    versammelt in ${p.roomId}: ${(p.participantAgentIds as string[]).map(name).join(', ')}`); break;
    case 'MEETING_STARTED': lines.push(`${t(ev.timeMs)}  MEETING    ${p.meetingId} beginnt`); break;
    case 'MEETING_COMPLETED': lines.push(`${t(ev.timeMs)}  MEETING    ${p.meetingId} beendet`); break;
    case 'APPROVAL_REQUIRED': lines.push(`${t(ev.timeMs)}  FREIGABE   ${p.taskId} "${p.title}" wartet auf Mensch (${name(p.agentId)} am Warteplatz)`); break;
    case 'BREAK_STARTED': if (lines.length < 400 && p.kind === 'KITCHEN') lines.push(`${t(ev.timeMs)}  PAUSE      ${name(p.agentId)} geht in die Küche`); break;
  }
});
e.runFor(6 * 60_000);
const tail = e.getTasks().filter((x) => x.status === 'WAITING_FOR_HUMAN');
console.log(lines.slice(0, 34).join('\n'));
console.log(`... (${lines.length} Einträge insgesamt)\n`);
const m = e.getMetrics();
console.log(`Stand ${t(e.getClock().nowMs)} Berliner Zeit: ${m.workingAgents} arbeiten, ${m.movingAgents} unterwegs, ${m.meetingAgents} im Meeting, ${m.waitingAgents} warten auf Freigabe, ${m.breakAgents} in Pause, ${m.availableAgents} verfügbar, Aktivität ${m.activityLevel}/100`);
console.log('Etagen (Minimap Daten):', e.getMinimap().map((f) => `${f.label}: ${f.agentCount}`).join(' | '));
if (tail[0]) {
  console.log(`\nMensch erteilt Freigabe für ${tail[0].id} ...`);
  e.grantApproval(tail[0].id);
  e.runFor(20_000);
  console.log(e.getLog(4).map((l) => `${l.clock}  ${l.text}`).join('\n'));
}
console.log(`\nInvarianten: ${e.checkInvariants().length} Verstöße`);
