import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/apiClient';
import { db, resetDemo, syncCoordinatorTrips } from './coordinatorStore';
import { reqOfTrip, tripHorses } from '../domain/coordinatorRules';

vi.mock('../../../shared/api/apiClient', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));
vi.mock('../../../shared/context/DemoModeContext', () => ({ getDemoMode: () => false }));

const summary = { tripId: 'TRIP_004', requestId: 'REQUEST_005', status: 'PLANNING', mode: 'ROAD', plannedDepart: '2026-12-09 06:00', eta: '2026-11-03 07:00' };
const context = {
  tripId: summary.tripId, requestId: summary.requestId, deployment: 'CONFIRMED', mode: null,
  specialistId: 'USER_005', coordinatorId: 'USER_006', horseIds: ['HORSE_006'],
  pickup: { name: 'Pickup stable', address: 'Address A', geo: { lat: 10, lng: 106 } },
  delivery: { name: 'Delivery stable', address: 'Address B', geo: { lat: 21, lng: 105 } },
  deliveryDeadline: '2027-02-11 18:00',
};
beforeEach(() => {
  resetDemo(false);
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { data: url === '/coordinator/trips' ? [summary] : context } }));
});

describe('Assigned coordinator trip data', () => {
  it('loads addresses, horse IDs and actual assignees from the trip context', async () => {
    await syncCoordinatorTrips();
    const trip = db.trips[0], request = reqOfTrip(trip);
    expect(apiClient.get).toHaveBeenCalledWith('/coordinator/trips/TRIP_004');
    expect(request.origin).toBe('Pickup stable');
    expect(request.destination).toBe('Delivery stable');
    expect(request.pickup.geo).toEqual({ lat: 10, lng: 106 });
    expect(request.count).toBe(1);
    expect(tripHorses(trip)).toEqual(['HORSE_006']);
    expect(trip.deployment.assignees.coordinator).toBe('USER_006');
    expect(trip.deliveryDeadline).toBe('2027-02-11 18:00');
    expect(trip.eta).toBe(context.deliveryDeadline);
    expect(trip.mode).toBeNull();
  });
  it('preserves locally edited route and resource data across polling', async () => {
    await syncCoordinatorTrips();
    db.trips[0].routes = [{ v: 1, status: 'DRAFT', stops: [{ name: 'Edited stop' }] }];
    db.trips[0].crew = { MAIN_DRIVER: 'driver-selected' };
    await syncCoordinatorTrips();
    expect(db.requests).toHaveLength(1);
    expect(db.trips[0].routes[0].stops[0].name).toBe('Edited stop');
    expect(db.trips[0].crew.MAIN_DRIVER).toBe('driver-selected');
  });
  it('keeps the last known request if loading its context fails', async () => {
    await syncCoordinatorTrips();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url !== '/coordinator/trips') throw new Error('Network unavailable');
      return { data: { data: [summary] } };
    });
    await syncCoordinatorTrips();
    expect(tripHorses(db.trips[0])).toEqual(['HORSE_006']);
    expect(reqOfTrip(db.trips[0]).pickup.address).toBe('Address A');
    vi.restoreAllMocks();
  });
});
