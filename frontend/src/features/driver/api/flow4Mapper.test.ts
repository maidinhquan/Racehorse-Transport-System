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
  milestones: [ms(1, 'DEPARTED', done > 0), ms(2, 'STOP_ARRIVED', done > 1), ms(3, 'AIRPORT_ORIGIN_ARRIVED', done > 2), ms(4, 'FINAL_ARRIVED', done > 3)],
  map: { routeSource: 'APPROVED_PLAN', locationSource: 'CONFIRMED_MILESTONE', lastConfirmedMilestoneId: null, markerGeo: null, isGps: false, routePoints: [] },
  policy: { version: 1, lateMilestoneMinutes: null, healthIntervalMinutes: null, minimumHealthPhotos: null, configured: false, note: '' },
  blockers: [], handoverAvailable: false,
});

describe('tripFromTracking', () => {
  it('maps route, ETA, crew, horses and vehicle from Flow 4 data', () => {
    const { trip, crew, horses } = tripFromTracking(tracking('IN_TRANSIT', 2), { receiverName: 'Người nhận' });
    expect(trip.origin).toBe('Trang trại xuất phát');
    expect(trip.destination).toBe('Trang trại đích');
    expect(trip.eta).toBe('2026-09-17 12:00');
    expect(trip.plannedDepart).toBe('2026-09-15 01:00');
    expect(trip.stops.map((s) => s.id)).toEqual(['MILESTONE_001', 'MILESTONE_002', 'MILESTONE_003', 'MILESTONE_004']);
    expect(trip.vehicle).toEqual({ plate: '29C-123.45', model: 'HORSEBOX_3_STALLS' });
    expect(trip.crew).toEqual({ MAIN_DRIVER: 'USER_007', VETERINARIAN: 'USER_009' });
    expect(crew.map((c) => [c.id, c.role])).toEqual([['USER_007', 'DRIVER'], ['USER_009', 'VETERINARIAN']]);
    expect(horses[0]).toMatchObject({ id: 'HORSE_001', microchip: '981098102938475' });
    expect(trip.receiver.name).toBe('Người nhận');
  });

  it('turns completed milestones into a sequence whose next step is the next pending Flow 4 milestone', () => {
    const { trip } = tripFromTracking(tracking('IN_TRANSIT', 2));
    expect(trip.milestones.map((m) => [m.type, m.stopIndex])).toEqual([['DEPARTED', 0], ['LEFT_STOP', 1]]);
    expect(nextMilestone(trip)).toMatchObject({ stopIndex: 2 });
  });

  it('passes milestone coordinates to the route stops so the map can draw the coordinator schedule', () => {
    const data = tracking('READY_TO_DEPART', 0);
    data.milestones[0].geo = { lat: 10.855, lng: 106.6565 };
    data.milestones[3].geo = { lat: 16.070091, lng: 108.208119 };
    const { trip } = tripFromTracking(data);
    expect(trip.stops.map((s) => [s.lat, s.lng])).toEqual([[10.855, 106.6565], [undefined, undefined], [undefined, undefined], [16.070091, 108.208119]]);
  });

  it('offers departure first and the destination arrival last', () => {
    expect(nextMilestone(tripFromTracking(tracking('READY_TO_DEPART', 0)).trip)).toEqual({ type: 'DEPARTED', stopIndex: 0 });
    const { trip } = tripFromTracking(tracking('IN_TRANSIT', 3));
    expect(nextMilestone(trip)).toEqual({ type: 'ARRIVED_DESTINATION', stopIndex: 3 });
    expect(nextMilestone(tripFromTracking(tracking('IN_TRANSIT', 4)).trip)).toBeNull();
  });
});
