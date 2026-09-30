import { SimulationEngine, createScenarioEngine, type ScenarioId } from '../src/index';

const ids: ScenarioId[] = ['A_MORNING_START', 'B_BUSY_SALES_DAY', 'C_KASSELMEMES_TREND_SPIKE', 'D_DEVELOPMENT_SPRINT', 'E_WAITING_FOR_APPROVAL', 'F_FULL_HQ'];
for (const id of ids) {
  const e = createScenarioEngine(id, { config: { invariantCheckEveryTicks: 1 } });
  const counts: Record<string, number> = {};
  e.onAny((ev) => { counts[ev.type] = (counts[ev.type] ?? 0) + 1; });
  try {
    e.runFor(20 * 60_000);
  } catch (err) {
    console.log(id, 'FEHLER', (err as Error).message);
    continue;
  }
  const m = e.getMetrics();
  console.log(id, JSON.stringify({ w: m.workingAgents, a: m.availableAgents, b: m.breakAgents, mt: m.meetingAgents, wt: m.waitingAgents, mv: m.movingAgents, off: m.offlineAgents, q: m.queuedTasks, lvl: m.activityLevel }));
  console.log('  ', Object.entries(counts).filter(([k]) => /TASK_COMPLETED|MEETING_COMPLETED|BREAK_STARTED|APPROVAL_REQUIRED|WORKFLOW_COMPLETED/.test(k)).map(([k, v]) => `${k}=${v}`).join(' '));
}
