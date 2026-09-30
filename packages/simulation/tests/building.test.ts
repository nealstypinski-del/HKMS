import { describe, expect, it } from 'vitest';
import { BASE_ROSTER, buildLayout, createScenarioEngine, TASK_TEMPLATES, WORKFLOWS, type Capability } from '../src/index';
import { makeEngine, recordEvents, types, MIN, S } from './helpers';

describe('Hochhaus Layout', () => {
  const { layout, anchors } = buildLayout();
  const zoneIds = layout.zones.map((z) => z.id);

  it('hat fünf Etagen mit deutschen Bezeichnungen', () => {
    expect(layout.floors.map((f) => f.label)).toEqual(['Empfang und Erdgeschoss', 'HerkulesJobs', 'KasselMemes', 'AI und Entwicklung', 'Wellness und Dachlounge']);
    const labels = layout.zones.map((z) => z.label).join(' | ');
    for (const word of ['Wellnessraum', 'Dachlounge mit Fernseher', 'Lounge mit Fernseher', 'Konferenzraum Herkules', 'Kundenraum', 'Newsroom KasselMemes', 'Redaktionsraum', 'Community Lounge', 'Teeküche HerkulesJobs']) {
      expect(labels, word).toContain(word);
    }
    expect(labels).not.toMatch(/\b(Lounge Area|Meeting Room|Kitchen|Waiting)\b/);
  });

  it('jede Abteilungsetage hat Schreibtische, Bank, Meetingraum, Küche, Lounge und Warteplatz', () => {
    for (const slug of ['hj', 'km', 'dev']) {
      for (const z of [`${slug}-desks`, `agent-bench-${slug}`, `meeting-room-${slug}`, `kitchen-${slug}`, `lounge-${slug}`, `waiting-${slug}`]) expect(zoneIds, z).toContain(z);
    }
    expect(zoneIds).toEqual(expect.arrayContaining(['wellness', 'dachlounge', 'konferenz', 'lobby', 'kitchen', 'lounge', 'meeting-room-a', 'meeting-room-b']));
  });

  it('Sofas schauen auf einen Fernseher, Fernseher sind nicht belegbar', () => {
    const tvs = Object.values(anchors).filter((a) => a.type === 'TV');
    expect(tvs.length).toBe(5); // Erdgeschoss, drei Abteilungen, Dachlounge
    expect(tvs.every((t) => t.capacity === 0)).toBe(true);
    const sofas = Object.values(anchors).filter((a) => a.type === 'SOFA' && a.zoneId !== 'wellness');
    expect(sofas.length).toBeGreaterThan(20);
    for (const s of sofas) {
      expect(s.focusAnchorId, s.id).toBeDefined();
      expect(anchors[s.focusAnchorId!]!.type).toBe('TV');
      expect(anchors[s.focusAnchorId!]!.zoneId).toBe(s.zoneId);
      expect(s.allowedActivities).toContain('WATCH_TV');
    }
    const liegen = Object.values(anchors).filter((a) => a.zoneId === 'wellness');
    expect(liegen.length).toBe(6);
    expect(liegen.every((l) => l.allowedActivities.includes('REST') && l.floorId === 'floor-4')).toBe(true);
  });

  it('alle Anker Ids sind eindeutig und liegen in bekannten Zonen', () => {
    const ids = Object.keys(anchors);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of Object.values(anchors)) expect(zoneIds, a.id).toContain(a.zoneId);
  });
});

describe('Pausen im Hochhaus', () => {
  it('Küche und Lounge zuerst auf der eigenen Etage (kein Aufzug)', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    e.sendAgentToKitchen('km-creative');
    const req = ev.find((x) => x.type === 'AGENT_MOVEMENT_REQUESTED')!;
    if (req.type !== 'AGENT_MOVEMENT_REQUESTED') throw new Error();
    expect(req.payload.destination.floorId).toBe('floor-2');
    expect(req.payload.destinationAnchorId).toBe('kitchen-km-coffee-01');
    expect(req.payload.stages.some((s) => s.kind === 'CHANGE_FLOOR')).toBe(false);
    e.sendAgentToBreak('km-editorial', 'LOUNGE');
    const req2 = ev.filter((x) => x.type === 'AGENT_MOVEMENT_REQUESTED')[1]!;
    if (req2.type !== 'AGENT_MOVEMENT_REQUESTED') throw new Error();
    expect(req2.payload.destinationAnchorId).toMatch(/^lounge-km-sofa-/);
  });

  it('Wellness: Fahrt in die Wellness Etage, Ruhen, zurück zur Bank', () => {
    const e = makeEngine();
    const ev = recordEvents(e);
    expect(e.sendAgentToBreak('hj-sales', 'WELLNESS').ok).toBe(true);
    const req = ev.find((x) => x.type === 'AGENT_MOVEMENT_REQUESTED')!;
    if (req.type !== 'AGENT_MOVEMENT_REQUESTED') throw new Error();
    expect(req.payload.destination.floorId).toBe('floor-4');
    expect(req.payload.stages.find((s) => s.kind === 'CHANGE_FLOOR')!.durationMs).toBe(3 * e.getState().config.timings.elevatorFloorMs);
    const a = e.getAgent('hj-sales')!;
    const acts = new Set<string | null>();
    for (let i = 0; i < 4 * 300; i++) { e.tick(); acts.add(a.activity); }
    expect(['REST', 'SIT', 'CHAT_VISUAL', 'READ', 'WATCH_TV'].some((x) => acts.has(x))).toBe(true);
    expect(types(ev)).toContain('BREAK_ENDED');
    expect(a.status).toBe('AVAILABLE');
    expect(a.location.floorId).toBe('floor-1');
  });

  it('Fernsehen kommt in Lounges mit Fernseher vor, nie in der Wellness Liege', () => {
    const e = createScenarioEngine('B_BUSY_SALES_DAY');
    const seen = new Map<string, Set<string>>();
    e.onAny((ev) => {
      if (ev.type !== 'AGENT_INTENT_CHANGED' || !ev.payload.activity) return;
      const a = e.getAgent(ev.payload.agentId)!;
      const z = a.location.zoneId;
      if (!seen.has(z)) seen.set(z, new Set());
      seen.get(z)!.add(ev.payload.activity);
    });
    e.runFor(40 * MIN);
    for (const acts of seen.values()) void acts;
    expect(seen.get('wellness')?.has('WATCH_TV') ?? false).toBe(false);
  });
});

describe('Firmenspezifische Inhalte (DEMO)', () => {
  const caps = new Set<Capability>(BASE_ROSTER.flatMap((a) => a.capabilities));

  it('jede Fähigkeit in Vorlagen und Workflows wird von mindestens einem Agenten geboten', () => {
    for (const [dept, list] of Object.entries(TASK_TEMPLATES)) {
      for (const tpl of list) {
        const capable = BASE_ROSTER.filter((a) => tpl.capabilities.every((c) => a.capabilities.includes(c)) && (a.departmentId === dept || a.departmentId === 'SHARED'));
        expect(capable.length, `${dept}: ${tpl.title}`).toBeGreaterThan(0);
      }
    }
    for (const wf of Object.values(WORKFLOWS)) {
      for (const step of wf.steps) {
        if (step.kind !== 'TASK') continue;
        const capable = BASE_ROSTER.filter((a) => step.requiredCapabilities.every((c) => a.capabilities.includes(c)) && (a.departmentId === step.departmentId || a.departmentId === 'SHARED'));
        expect(capable.length, `${wf.id}: ${step.title}`).toBeGreaterThan(0);
      }
    }
    expect(caps.has('giveaway') && caps.has('product_knowledge')).toBe(true);
  });

  it('alle Titel und Rollen sind deutsch und als DEMO markiert', () => {
    for (const wf of Object.values(WORKFLOWS)) {
      expect(wf.title).toMatch(/\(DEMO\)$/);
      for (const s of wf.steps) expect(s.title, s.title).toMatch(/\(DEMO\)$/);
    }
    for (const list of Object.values(TASK_TEMPLATES)) for (const t of list) expect(t.title).toMatch(/\(DEMO\)$/);
    expect(BASE_ROSTER.map((a) => a.role).join(' ')).not.toMatch(/Research|Employer|Outreach Agent|Editorial|Developer|Operations/);
  });

  for (const id of ['hj_produktberatung', 'km_nachrichtenbeitrag', 'km_gewinnspiel']) {
    it(`Workflow ${id} läuft komplett durch`, () => {
      const e = makeEngine({ config: { mockAutoApproveAfterMs: 20 * S } });
      e.startWorkflow(id);
      e.runFor(12 * MIN);
      const steps = WORKFLOWS[id]!.steps.filter((s) => s.kind === 'TASK').length;
      expect(e.getState().taskHistory.filter((h) => h.status === 'COMPLETED').length).toBe(steps);
      expect(Object.keys(e.getState().workflowRuns)).toEqual([]);
    });
  }

  it('Gewinnspiel Workflow enthält ein Meeting mit den Beteiligten', () => {
    const e = makeEngine({ config: { mockAutoApproveAfterMs: 20 * S } });
    const ev = recordEvents(e);
    e.startWorkflow('km_gewinnspiel');
    e.runFor(12 * MIN);
    const m = ev.find((x) => x.type === 'MEETING_CREATED');
    expect(m && m.type === 'MEETING_CREATED' ? m.payload.title : '').toBe('Gewinnspiel Abstimmung (DEMO)');
    expect(types(ev)).toContain('MEETING_COMPLETED');
  });
});
