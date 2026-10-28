import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDemoModeStorage } from '../../shared/context/DemoModeContext';
import { db, resetDemo } from '../../features/coordinator/store/coordinatorStore';
import { ROUTING } from '../../features/coordinator/workflows/routePlanner';
import AppRouter from './AppRouter';

// Exercise real pages and routing; maps are outside the scope of this migration.
vi.mock('../../features/coordinator/components/maps/LeafletMaps', () => ({
  RouteMap: () => <div data-testid="route-map" />,
  PlannerMap: () => <div data-testid="planner-map" />,
  PlacePickMap: () => <div data-testid="place-map" />,
}));

describe('Coordinator routes after replacing the old portal', () => {
  beforeEach(() => {
    setDemoModeStorage(true);
    resetDemo(true);
    ROUTING.provider = 'SIM';
  });

  it.each([
    'dashboard', 'monitor', 'places', 'fleet', 'crew', 'flights',
    'incidents', 'notifications', 'profile',
  ])('opens the new %s page directly', (page) => {
    window.history.replaceState({}, '', `/coordinator/${page}`);
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/coordinator/${page}`);
    expect(screen.getByRole('link', { name: /Dịch vụ bay & đối tác/ })).toBeInTheDocument();
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
    setDemoModeStorage(false);
    resetDemo(false);
    window.history.replaceState({}, '', '/coordinator/dashboard');
    const { container } = render(<AppRouter />);
    expect(container.querySelector('.cbn-coord')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Không có chuyến đang lập kế hoạch');
  });
});
