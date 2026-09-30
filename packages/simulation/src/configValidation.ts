import type { SimConfig } from './types';

/** Prüft eine Konfiguration und wirft bei gefährlichen Werten einen verständlichen Fehler. */
export function validateConfig(c: SimConfig): void {
  const errs: string[] = [];
  const num = (name: string, v: unknown, min: number, max: number) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) errs.push(`${name} muss zwischen ${min} und ${max} liegen (ist ${String(v)})`);
  };
  num('tickIntervalMs', c.tickIntervalMs, 20, 5000);
  num('walkSpeedMps', c.walkSpeedMps, 0.1, 20);
  num('confirmTimeoutFactor', c.confirmTimeoutFactor, 1, 100);
  num('agingMs', c.agingMs, 0, 86_400_000);
  num('maxQueuedTasks', c.maxQueuedTasks, 0, 100_000);
  num('logCapacity', c.logCapacity, 1, 100_000);
  num('historyCapacity', c.historyCapacity, 0, 100_000);
  num('invariantCheckEveryTicks', c.invariantCheckEveryTicks, 0, 1_000_000);
  num('autosaveEveryTicks', c.autosaveEveryTicks, 0, 1_000_000);
  num('workday.startMinute', c.workday.startMinute, 0, 1439);
  num('workday.endMinute', c.workday.endMinute, 1, 1440);
  num('workday.arrivalWindowMs', c.workday.arrivalWindowMs, 0, 86_400_000);
  if (c.workday.startMinute >= c.workday.endMinute) errs.push('workday.startMinute muss vor workday.endMinute liegen');
  for (const [k, v] of Object.entries(c.idle)) num(`idle.${k}`, v, 0, 100_000_000);
  if (c.idle.decisionMinMs > c.idle.decisionMaxMs) errs.push('idle.decisionMinMs darf nicht größer als decisionMaxMs sein');
  if (c.idle.maxBreakShare > 1) errs.push('idle.maxBreakShare darf höchstens 1 sein');
  for (const [k, v] of Object.entries(c.timings)) num(`timings.${k}`, v, 0, 86_400_000);
  if (c.movementMode !== 'SIMULATED' && c.movementMode !== 'RENDERER_CONFIRMED') errs.push(`movementMode unbekannt: ${String(c.movementMode)}`);
  if (c.approvalBehavior !== 'STAY_AT_DESK' && c.approvalBehavior !== 'GO_TO_WAITING_AREA') errs.push(`approvalBehavior unbekannt: ${String(c.approvalBehavior)}`);
  if (c.mockAutoApproveAfterMs !== null) num('mockAutoApproveAfterMs', c.mockAutoApproveAfterMs, 0, 86_400_000);
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: c.timeZone });
  } catch {
    errs.push(`timeZone unbekannt: ${String(c.timeZone)}`);
  }
  if (errs.length > 0) throw new Error(`Ungültige Konfiguration: ${errs.join('; ')}`);
}
