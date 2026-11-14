import { describe, expect, it } from 'vitest';
import type { Tracking } from '../../tracking/types/flow4.types';
import { nextMilestone } from '../hooks/driverRules';
import { tripFromTracking } from './flow4Mapper';

const actor = { userId: 'USER_007', name: 'Hoàng Hùng', role: 'DRIVER_ESCORT' as const, crewDuty: 'MAIN_DRIVER' as const };
const ms = (n: number, kind: Tracking['milestones'][number]['kind'], done: boolean) => ({
  id: `MILESTONE_${String(n).padStart(3, '0')}`, leg: 'road' as const, kind, sequence: n, label: `Mốc ${n}`,
  status: done ? ('COMPLETED' as const) : ('PENDING' as const), plannedAt: `2026-09-15 0${n}:00`,
  occurredAt: done ? `2026-09-15 0${n}:05` : null, recordedAt: null, recordedBy: done ? actor : null, revision: 1, note: '',
  evidenceFileIds: [], geo: null, requiresHealthCheck: false,
  actions: { canComplete: false, canRequestCorrection: false, canRecordHealth: false, canProposeEta: false, blockers: [] },
});

const tracking = (status: 'READY_TO_DEPART' | 'IN_TRANSIT', done: number): Tracking => ({
  binding: { executionVersion: 2, approvedPlanVersion: 1, assignmentVersion: 1 },
  serverTime: '2026-09-15 10:00',
  trip: { tripId: 'TRIP_001', requestId: 'REQUEST_001', mode: 'AIR', tripStatus: status, requestStatus: 'IN_PROGRESS', phase: 'IN_PROGRESS', lastMilestoneId: null,
    eta: { currentEta: '2026-09-17 12:00', deliveryDeadline: '2026-12-01 00:00', pendingProposalId: null, proposedEta: null, version: 1 } },
  horses: [{ horseId: 'HORSE_001', name: 'Tia Chớp Đỏ', microchip: '981098102938475', careInstructions: '' }],
  pickup: { name: 'Điểm đón', address: 'Trang trại xuất phát', country: 'VN', geo: null },
  delivery: { name: 'Điểm đến', address: 'Trang trại đích', country: 'VN', geo: null },
  flight: null,
  legs: [{ key: 'road', mode: 'ROAD', status: 'ACTIVE', assignedUserIds: ['USER_007', 'USER_009'], vehicleId: 'VEHICLE_001',
    vehicle: { vehicleId: 'VEHICLE_001', plateNumber: '29C-123.45', type: 'HORSEBOX_3_STALLS', capacityStalls: 3, heightM: 3.6, grossWeightTons: 12.5 },
    crew: [{ userId: 'USER_007', name: 'Hoàng Hùng', duty: 'MAIN_DRIVER' }, { userId: 'USER_009', name: 'BS. Đỗ Hoa', duty: 'VETERINARIAN' }],
    from: 'Điểm đón', to: 'Điểm giao', milestoneIds: [] }],
  milestones: [
    ms(1, 'DEPARTED', done > 0),
    ms(2, 'STOP_ARRIVED', done > 1),
    ms(3, 'STOP_DEPARTED', done > 2),
    ms(4, 'FINAL_ARRIVED', done > 3),
  ],
  map: { routeSource: 'APPROVED_PLAN', locationSource: 'CONFIRMED_MILESTONE', lastConfirmedMilestoneId: null, markerGeo: null, isGps: false, routePoints: [] },
  policy: { version: 1, lateMilestoneMinutes: null, healthIntervalMinutes: null, minimumHealthPhotos: null, configured: false, note: '' },
  blockers: [], handoverAvailable: false,
});

describe('tripFromTracking', () => {
  it('maps route, ETA, crew, horses and vehicle from Flow 4 data', () => {
    const { trip, crew, horses } = tripFromTracking(tracking('IN_TRANSIT', 3), { receiverName: 'Người nhận' });
    expect(trip.origin).toBe('Trang trại xuất phát');
    expect(trip.destination).toBe('Trang trại đích');
    expect(trip.eta).toBe('2026-09-17 12:00');
    expect(trip.plannedDepart).toBe('2026-09-15 01:00');
    expect(trip.stops.map((s) => s.id)).toEqual(['MILESTONE_001', 'MILESTONE_002', 'MILESTONE_004']);
    expect(trip.vehicle).toEqual({ plate: '29C-123.45', model: 'HORSEBOX_3_STALLS' });
    expect(trip.crew).toEqual({ MAIN_DRIVER: 'USER_007', VETERINARIAN: 'USER_009' });
    expect(crew.map((c) => [c.id, c.role])).toEqual([['USER_007', 'DRIVER'], ['USER_009', 'VETERINARIAN']]);
    expect(horses[0]).toMatchObject({ id: 'HORSE_001', microchip: '981098102938475' });
    expect(trip.receiver.name).toBe('Người nhận');
  });

  it('turns completed milestones into arrival then departure before moving to next stop', () => {
    const { trip: tripArrived } = tripFromTracking(tracking('IN_TRANSIT', 2));
    expect(tripArrived.milestones.map((m) => [m.type, m.stopIndex])).toEqual([['DEPARTED', 0], ['ARRIVED_STOP', 1]]);
    expect(nextMilestone(tripArrived)).toMatchObject({ type: 'LEFT_STOP', stopIndex: 1 });

    const { trip: tripDeparted } = tripFromTracking(tracking('IN_TRANSIT', 3));
    expect(tripDeparted.milestones.map((m) => [m.type, m.stopIndex])).toEqual([['DEPARTED', 0], ['ARRIVED_STOP', 1], ['LEFT_STOP', 1]]);
    expect(nextMilestone(tripDeparted)).toMatchObject({ stopIndex: 2 });
  });

  it('passes milestone coordinates to the route stops so the map can draw the coordinator schedule', () => {
    const data = tracking('READY_TO_DEPART', 0);
    data.milestones[0].geo = { lat: 10.855, lng: 106.6565 };
    data.milestones[3].geo = { lat: 16.070091, lng: 108.208119 };
    const { trip } = tripFromTracking(data);
    expect(trip.stops.map((s) => [s.lat, s.lng])).toEqual([[10.855, 106.6565], [undefined, undefined], [16.070091, 108.208119]]);
  });

  it('offers departure first, stop arrival/departure in sequence, and destination arrival last', () => {
    expect(nextMilestone(tripFromTracking(tracking('READY_TO_DEPART', 0)).trip)).toMatchObject({ type: 'DEPARTED', stopIndex: 0 });
    const { trip: inTransit1 } = tripFromTracking(tracking('IN_TRANSIT', 1));
    expect(nextMilestone(inTransit1)).toEqual({ type: 'ARRIVED_STOP', stopIndex: 1 });
    const { trip: inTransit2 } = tripFromTracking(tracking('IN_TRANSIT', 2));
    expect(nextMilestone(inTransit2)).toMatchObject({ type: 'LEFT_STOP', stopIndex: 1 });
    const { trip: inTransit3 } = tripFromTracking(tracking('IN_TRANSIT', 3));
    expect(nextMilestone(inTransit3)).toEqual({ type: 'ARRIVED_DESTINATION', stopIndex: 2 });
    expect(nextMilestone(tripFromTracking(tracking('IN_TRANSIT', 4)).trip)).toBeNull();
  });

  it('blocks departure and leaving every stop until all horses have a health check', () => {
    const ready = tripFromTracking(tracking('READY_TO_DEPART', 0)).trip;
    ready.horses = ['HORSE_001'];
    ready.health = [];
    expect(nextMilestone(ready)).toMatchObject({ type: 'DEPARTED', blocked: true, healthCheckRequired: true });
    ready.health.push({ id: 'HL-0', horseId: 'HORSE_001', at: '2026-09-15 00:30', temp: 38, hr: 40, condition: 'NORMAL', notes: '', by: 'USER_009' });
    expect(nextMilestone(ready)?.blocked).toBeFalsy();

    const atStop = tripFromTracking(tracking('IN_TRANSIT', 2)).trip;
    atStop.horses = ['HORSE_001'];
    atStop.health = [{ id: 'HL-old', horseId: 'HORSE_001', at: '2000-01-01 00:00', temp: 38, hr: 40, condition: 'NORMAL', notes: '', by: 'USER_009' }];
    expect(nextMilestone(atStop)).toMatchObject({ type: 'LEFT_STOP', blocked: true, healthCheckRequired: true });
  });

  it('blocks leaving stop until health log is recorded when stop requires health check', () => {
    const data = tracking('IN_TRANSIT', 2);
    data.milestones[1].requiresHealthCheck = true;
    const { trip } = tripFromTracking(data);
    expect(trip.stops[1].requiresHealthCheck).toBe(true);

    // Chưa có health log -> bị khóa
    const blockedNext = nextMilestone(trip);
    expect(blockedNext).toMatchObject({ type: 'LEFT_STOP', stopIndex: 1, blocked: true, healthCheckRequired: true });

    // Sau khi đã có health log tại trạm -> mở khóa
    trip.health.push({
      id: 'HL-1',
      horseId: 'HORSE_001',
      at: '2026-09-15 02:10',
      temp: 38.0,
      hr: 40,
      condition: 'NORMAL',
      notes: 'Ngựa khỏe',
      by: 'USER_009',
    });
    const unblockedNext = nextMilestone(trip);
    expect(unblockedNext).toEqual({ type: 'LEFT_STOP', stopIndex: 1 });
  });

  it('counts a health log recorded after arrival within the same minute (by exact time), not one recorded before', () => {
    const { trip } = tripFromTracking(tracking('IN_TRANSIT', 2));
    trip.horses = ['HORSE_001'];
    const arrived = trip.milestones[trip.milestones.length - 1];
    arrived.recordedAt = '2026-09-15T02:10:30.000Z';
    const log = { id: 'HL-x', horseId: 'HORSE_001', at: arrived.at, temp: 38, hr: 40, condition: 'NORMAL' as const, notes: '', by: 'USER_009' };
    trip.health = [{ ...log, recordedAt: '2026-09-15T02:10:10.000Z' }];
    expect(nextMilestone(trip)).toMatchObject({ type: 'LEFT_STOP', blocked: true, healthCheckRequired: true });
    trip.health = [{ ...log, recordedAt: '2026-09-15T02:10:45.000Z' }];
    expect(nextMilestone(trip)?.blocked).toBeFalsy();
  });

  it('matches server health logs by the stop departure milestone id, not the arrival id', () => {
    const { trip } = tripFromTracking(tracking('IN_TRANSIT', 2));
    trip.horses = ['HORSE_001'];
    const stop = trip.stops[trip.milestones[trip.milestones.length - 1].stopIndex];
    stop.departureId = 'MS_DEPART_HERE';
    const log = { id: 'HL-s', horseId: 'HORSE_001', at: '2000-01-01 00:00', temp: 38, hr: 40, condition: 'NORMAL' as const, notes: '', by: 'USER_009' };
    trip.health = [{ ...log, milestoneId: 'MS_DEPART_PREVIOUS_STOP' }];
    expect(nextMilestone(trip)).toMatchObject({ blocked: true, healthCheckRequired: true });
    trip.health = [{ ...log, milestoneId: 'MS_DEPART_HERE' }];
    expect(nextMilestone(trip)?.blocked).toBeFalsy();
  });

  it('does not count the previous stop health logs for the next stop even within the same minute', () => {
    const { trip } = tripFromTracking(tracking('IN_TRANSIT', 2));
    trip.horses = ['HORSE_001'];
    const arrived = trip.milestones[trip.milestones.length - 1];
    trip.health = [{ id: 'HL-prev', horseId: 'HORSE_001', at: arrived.at, temp: 38, hr: 40, condition: 'NORMAL', notes: '', by: 'USER_009', milestoneId: 'OTHER_STOP' }];
    expect(nextMilestone(trip)).toMatchObject({ type: 'LEFT_STOP', blocked: true, healthCheckRequired: true });
    trip.health = [{ id: 'HL-now', horseId: 'HORSE_001', at: arrived.at, temp: 38, hr: 40, condition: 'NORMAL', notes: '', by: 'USER_009', milestoneId: trip.stops[arrived.stopIndex].departureId ?? trip.stops[arrived.stopIndex].id }];
    expect(nextMilestone(trip)?.blocked).toBeFalsy();
  });
});
