import { describe, expect, it } from 'vitest';
import type { Milestone } from '../types/flow4.types';
import { progressFromMilestones } from './progress';

const actor = { userId: 'USER_007', name: 'Hoàng Hùng', role: 'DRIVER_ESCORT' as const, crewDuty: 'MAIN_DRIVER' as const };
const ms = (n: number, kind: Milestone['kind'], done: boolean, geo: Milestone['geo'] = null): Milestone => ({
  id: `MILESTONE_00${n}`, leg: 'road', kind, sequence: n, label: `Mốc ${n}`, status: done ? 'COMPLETED' : 'PENDING', plannedAt: `2026-11-19 0${n}:00`,
  occurredAt: done ? `2026-11-19 0${n}:10` : null, recordedAt: null, recordedBy: done ? actor : null, revision: 1, note: '', evidenceFileIds: [], geo,
  requiresHealthCheck: false, actions: { canComplete: false, canRequestCorrection: false, canRecordHealth: false, canProposeEta: false, blockers: [] },
});

describe('progressFromMilestones', () => {
  const list = [ms(3, 'FINAL_ARRIVED', false), ms(1, 'DEPARTED', true, { lat: 10.8, lng: 106.6 }), ms(2, 'STOP_ARRIVED', true, { lat: 11, lng: 108 })];

  it('orders milestones by sequence and keeps their coordinates', () => {
    const { stops } = progressFromMilestones(list);
    expect(stops.map((s) => [s.id, s.type, s.lat, s.lng])).toEqual([
      ['MILESTONE_001', 'ORIGIN', 10.8, 106.6], ['MILESTONE_002', 'REST_STOP', 11, 108], ['MILESTONE_003', 'DESTINATION', undefined, undefined]]);
  });

  it('reports only completed milestones, using the recorder name', () => {
    const { milestones } = progressFromMilestones(list);
    expect(milestones.map((m) => [m.type, m.stopIndex, m.by])).toEqual([['DEPARTED', 0, 'Hoàng Hùng'], ['LEFT_STOP', 1, 'Hoàng Hùng']]);
  });

  it('assigns public route points by order only when the counts match', () => {
    const publicList = list.map((m) => ({ ...m, geo: null }));
    const points = [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }];
    expect(progressFromMilestones(publicList, points).stops.map((s) => s.lat)).toEqual([1, 3, 5]);
    expect(progressFromMilestones(publicList, points.slice(0, 2)).stops.map((s) => s.lat)).toEqual([undefined, undefined, undefined]);
  });
});
