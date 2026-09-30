import { describe, expect, it } from 'vitest';
import { AnchorBook, buildLayout, DeskAssignmentService, InvariantError, makeRoster, type Agent } from '../src/index';
import { makeEngine, MIN } from './helpers';

const book = () => new AnchorBook(buildLayout().anchors);

describe('Anker Reservierung', () => {
  it('reserviert, belegt und gibt frei', () => {
    const b = book();
    b.reserve('bench-01', 'a1');
    expect(b.freeCapacity('bench-01')).toBe(0);
    b.occupy('bench-01', 'a1');
    expect(b.get('bench-01').occupants).toEqual(['a1']);
    expect(b.get('bench-01').reservedBy).toEqual([]);
    b.vacate('bench-01', 'a1', false);
    expect(b.freeCapacity('bench-01')).toBe(1);
  });

  it('verhindert das Stapeln auf demselben Stuhl', () => {
    const b = book();
    b.reserve('kitchen-seat-01', 'a1');
    expect(() => b.reserve('kitchen-seat-01', 'a2')).toThrow(InvariantError);
    expect(b.isFree('kitchen-seat-01', 'a2')).toBe(false);
    expect(b.isFree('kitchen-seat-01', 'a1')).toBe(true);
  });

  it('respektiert Kapazität größer 1', () => {
    const b = book();
    b.reserve('kitchen-counter-01', 'a1');
    b.reserve('kitchen-counter-01', 'a2');
    expect(() => b.reserve('kitchen-counter-01', 'a3')).toThrow(InvariantError);
  });

  it('behält die Reservierung, wenn der Schreibtisch nur zeitweise verlassen wird', () => {
    const b = book();
    b.reserve('desk-hj-01', 'a1');
    b.occupy('desk-hj-01', 'a1');
    b.vacate('desk-hj-01', 'a1', true);
    expect(b.isFree('desk-hj-01', 'a2')).toBe(false);
    b.release('desk-hj-01', 'a1');
    expect(b.isFree('desk-hj-01', 'a2')).toBe(true);
  });

  it('findFree liefert den ersten freien Anker in Layout Reihenfolge', () => {
    const b = book();
    b.reserve('desk-hj-01', 'a1');
    expect(b.findFree('DESK', 'a2', { departmentId: 'HERKULESJOBS' })!.id).toBe('desk-hj-02');
    expect(b.findFree('DESK', 'a1', { departmentId: 'HERKULESJOBS' })!.id).toBe('desk-hj-01');
  });
});

describe('Schreibtischvergabe', () => {
  const agent = (id: string, dept: Agent['departmentId']) => ({ id, departmentId: dept, preferredDeskId: null, deskAnchorId: null, occupiedAnchorId: null }) as Agent;

  it('vergibt jeden Schreibtisch höchstens einmal und jedem Agenten höchstens einen', () => {
    const b = book();
    const svc = new DeskAssignmentService(b);
    const a1 = agent('a1', 'HERKULESJOBS');
    const a2 = agent('a2', 'HERKULESJOBS');
    const d1 = svc.findDesk(a1, { departmentId: 'HERKULESJOBS' })!;
    svc.reserve(a1, d1);
    const d2 = svc.findDesk(a2, { departmentId: 'HERKULESJOBS' })!;
    expect(d2).not.toBe(d1);
    expect(() => svc.reserve(a1, d2)).toThrow();
    svc.release(a1);
    expect(a1.deskAnchorId).toBeNull();
    expect(svc.findDesk(a2, { departmentId: 'HERKULESJOBS' })).toBe(d1);
  });

  it('liefert null, wenn kein Schreibtisch frei ist', () => {
    const b = book();
    const svc = new DeskAssignmentService(b);
    for (const a of b.ofType('DESK')) if (a.departmentId === 'SHARED') b.reserve(a.id, `x-${a.id}`);
    expect(svc.findDesk(agent('a', 'SHARED'), { departmentId: 'SHARED' })).toBeNull();
  });

  it('Aufgabe bleibt in der Warteschlange, wenn kein Schreibtisch frei ist', () => {
    const e = makeEngine({ roster: makeRoster(1).slice(0, 8), layout: { desks: { HERKULESJOBS: 1, KASSELMEMES: 1, SHARED: 1 }, benchSeats: 12, floorBenchSeats: { HERKULESJOBS: 8, KASSELMEMES: 2, SHARED: 2 }, coffeeMachines: 1, kitchenSeats: 2, loungeSeats: 2, meetingSeats: 6, waitingPointsPerFloor: 2, lobbyPoints: 2 } });
    const t1 = e.createTask({ title: 'a', departmentId: 'HERKULESJOBS', requiredCapabilities: ['lead_research'], workDurationMs: 20_000 });
    const t2 = e.createTask({ title: 'b', departmentId: 'HERKULESJOBS', requiredCapabilities: ['company_analysis'], workDurationMs: 20_000 });
    e.runFor(2_000);
    const states = [t1, t2].map((t) => e.getTask(t.ok ? t.value.id : '')!.status).sort();
    expect(states).toEqual(['ASSIGNED', 'QUEUED']);
    e.runFor(3 * MIN);
    expect(e.getTasks().length).toBe(0);
  });
});
