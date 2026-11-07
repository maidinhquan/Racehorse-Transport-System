import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trip } from '../types';
import { useManager } from './useManager';

const api = vi.hoisted(() => ({
  getCustomers: vi.fn().mockResolvedValue([]), getHorses: vi.fn().mockResolvedValue([]),
  getStaff: vi.fn().mockResolvedValue([]), getRequests: vi.fn().mockResolvedValue([]),
  getTrips: vi.fn(), getTransactions: vi.fn().mockResolvedValue([]), getNotifications: vi.fn().mockResolvedValue([]),
  getTrip: vi.fn(), deployTrip: vi.fn().mockResolvedValue({}),
  holdTrip: vi.fn().mockResolvedValue({}), resumeTrip: vi.fn().mockResolvedValue({}),
}));
vi.mock('../api/managerApi', () => ({ managerApi: api }));
vi.mock('../../../shared/context/DemoModeContext', () => ({ getDemoMode: () => false }));
vi.mock('../../../shared/utils/syncChannel', () => ({
  createSyncController: () => ({ subscribe: () => () => {} }), notifySync: vi.fn(),
}));

const trip = {
  id: 'TRIP_004', requestId: 'REQUEST_004', status: 'PLANNING',
  plannedDepart: '2026-12-09 06:00', eta: '2027-02-11 18:00',
  deployment: { status: 'NOT_CONFIRMED' },
  readiness: { docsReady: 0, docsTotal: 1, insurance: 'MISSING', quarantineOk: false },
  milestones: [], etaHistory: [],
} as Trip;

describe('Manager trip action refresh', () => {
  it('refreshes the affected trip after assignment, hold and resume without reloading every list', async () => {
    api.getTrips.mockResolvedValue([trip]);
    const { result } = renderHook(() => useManager());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.getTrip(trip.id)?.deployment.status).toBe('NOT_CONFIRMED');
    for (const status of ['CONFIRMED', 'ON_HOLD', 'CONFIRMED'] as const) {
      api.getTrip.mockResolvedValue({ ...trip, deployment: { status, specialistId: 'USER_005', coordinatorId: 'USER_006' } });
      await act(async () => {
        const action = status === 'ON_HOLD' ? result.current.actions.holdTrip(trip.id, 'Customer requested a pause')
          : api.deployTrip.mock.calls.length ? result.current.actions.resumeTrip(trip.id)
            : result.current.actions.confirmDeployment(trip.id, 'USER_005', 'USER_006');
        expect((await action).ok).toBe(true);
      });
      expect(result.current.getTrip(trip.id)?.deployment.status).toBe(status);
    }
    expect(api.getTrip).toHaveBeenCalledTimes(3);
    expect(api.getTrips).toHaveBeenCalledOnce();
    expect(result.current.getTrip(trip.id)?.deployment.specialistId).toBe('USER_005');
  });

  it('does not report success when refreshing the trip fails', async () => {
    api.getTrip.mockRejectedValueOnce(new Error('Trip refresh failed'));
    const { result } = renderHook(() => useManager());
    await act(async () => {
      const response = await result.current.actions.confirmDeployment(trip.id, 'USER_005', 'USER_006');
      expect(response.ok).toBe(false);
    });
    expect(result.current.toast?.message).not.toBe('Đã phân công chuyến.');
  });
});
