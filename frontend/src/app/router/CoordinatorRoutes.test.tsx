import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../shared/api/core/apiClient';
import {
  db, resetCoordinatorState, syncCoordinatorIncidents, syncCoordinatorMasterData, syncCoordinatorTrips,
} from '../../features/coordinator/store/coordinatorStore';
import { ROUTING } from '../../features/coordinator/workflows/routePlanner';
import AppRouter from './AppRouter';

// Dữ liệu mẫu cho test, trả về qua API giả để store dựng đúng như khi chạy thật.
const TRIPS = [
  { tripId: 'TRIP_001', requestId: 'REQUEST_001', status: 'PLANNING', mode: 'ROAD', plannedDepart: '2026-12-09 06:00', eta: '2026-12-10 07:00' },
  { tripId: 'TRIP_002', requestId: 'REQUEST_002', status: 'PLANNING', mode: 'AIR', plannedDepart: '2026-12-11 06:00', eta: '2026-12-12 07:00' },
];
const tripContext = (tripId: string) => {
  const trip = TRIPS.find((t) => t.tripId === tripId) ?? TRIPS[0];
  return {
    tripId: trip.tripId, requestId: trip.requestId, deployment: 'CONFIRMED', mode: trip.mode,
    specialistId: 'USER_005', coordinatorId: 'USER_006', horseIds: ['HORSE_001'],
    pickup: { name: 'Pickup stable', address: 'Address A', geo: { lat: 10, lng: 106 } },
    delivery: { name: 'Delivery stable', address: 'Address B', geo: { lat: 21, lng: 105 } },
    deliveryDeadline: '2027-02-11 18:00',
  };
};
const VEHICLES = [{ id: 'VEH_001', plate: '51C-123.45', model: 'Xe chuyên dụng', base: 'Hà Nội', status: 'READY', capacity: 2 }];
const INCIDENTS = [{ incidentId: 'INC_001', tripId: 'TRIP_001', category: 'OTHER', severity: 'HIGH', status: 'REPORTED', description: 'Sự cố mẫu', reportedAt: '2026-12-09T08:00:00Z' }];

function fakeApi(url: string): unknown {
  if (url === '/coordinator/trips') return TRIPS;
  if (url.startsWith('/coordinator/trips/')) return tripContext(decodeURIComponent(url.split('/').pop() ?? ''));
  if (url === '/coordinator/vehicles') return VEHICLES;
  if (url === '/incidents') return INCIDENTS;
  return [];
}

// Exercise real pages and routing; maps are outside the scope of this migration.
vi.mock('../../features/coordinator/components/maps/LeafletMaps', () => ({
  RouteMap: () => <div data-testid="route-map" />,
  PlannerMap: () => <div data-testid="planner-map" />,
  PlacePickMap: () => <div data-testid="place-map" />,
  IncidentMap: () => <div data-testid="incident-map" />,
}));

describe('Coordinator routes after replacing the old portal', () => {
  beforeEach(async () => {
    resetCoordinatorState();
    ROUTING.provider = 'SIM';
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => ({ data: { data: fakeApi(url) } }) as never);
    await syncCoordinatorTrips();
    await syncCoordinatorIncidents();
    await syncCoordinatorMasterData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'dashboard', 'monitor', 'places', 'fleet', 'crew',
    'incidents', 'notifications', 'profile',
  ])('opens the new %s page directly', (page) => {
    window.history.replaceState({}, '', `/coordinator/${page}`);
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/coordinator/${page}`);
    expect(screen.getByRole('link', { name: /Quản lý địa điểm/ })).toBeInTheDocument();
  });

  it.each(['overview', 'route', 'resources', 'progress', 'flight'])('opens the %s trip tab', (tab) => {
    const trip = db.trips.find((t) => t.mode === (tab === 'flight' ? 'AIR' : 'ROAD'))!;
    window.history.replaceState({}, '', `/coordinator/trips/${trip.id}/${tab}`);
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(trip.id) })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/coordinator/trips/${trip.id}/${tab}`);
  });

  it('opens vehicle details from the fleet list', async () => {
    window.history.replaceState({}, '', '/coordinator/fleet');
    render(<AppRouter />);
    const vehicle = db.vehicles[0];
    fireEvent.click(screen.getByText(vehicle.plate));
    await waitFor(() => expect(window.location.pathname).toBe(`/coordinator/fleet/${vehicle.id}`));
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(vehicle.plate) })).toBeInTheDocument();
  });

  it('opens an incident detail page directly', () => {
    const incident = db.incidents[0];
    window.history.replaceState({}, '', `/coordinator/incidents/${incident.id}`);
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/coordinator/incidents/${incident.id}`);
    expect(screen.getByRole('main')).toHaveTextContent(incident.id);
  });

  it('redirects the old trip list URL to monitoring', async () => {
    window.history.replaceState({}, '', '/coordinator/trips');
    render(<AppRouter />);
    await waitFor(() => expect(window.location.pathname).toBe('/coordinator/monitor'));
    expect(screen.getByRole('heading', { level: 2, name: 'Giám sát hành trình' })).toBeInTheDocument();
  });

  it('shows an empty portal when demo data is disabled', () => {
    resetCoordinatorState();
    window.history.replaceState({}, '', '/coordinator/dashboard');
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Không có chuyến đang lập kế hoạch');
  });
});
