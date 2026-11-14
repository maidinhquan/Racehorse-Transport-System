import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { TransportRequest, Trip } from '../types';

const api = vi.hoisted(() => ({
  getCustomers: vi.fn().mockResolvedValue([]), getHorses: vi.fn().mockResolvedValue([]),
  getStaff: vi.fn().mockResolvedValue([]), getRequests: vi.fn().mockResolvedValue([]),
  getTrips: vi.fn(), getTransactions: vi.fn().mockResolvedValue([]), getNotifications: vi.fn().mockResolvedValue([]),
  getRequest: vi.fn(),
}));
vi.mock('../api/managerApi', () => ({ managerApi: api }));
vi.mock('../../../shared/context/DemoModeContext', () => ({ getDemoMode: () => false }));
vi.mock('../../../shared/utils/syncChannel', () => ({
  createSyncController: () => ({ subscribe: () => () => {} }), notifySync: vi.fn(),
}));

import { useManager } from './useManager';

it('loads the trip created by OTP signing while the request page stays open', async () => {
  const request = { id: 'REQUEST_005', status: 'ACTIVATED', versions: [{ signedAt: '2026-11-09 09:09' }] } as TransportRequest;
  const trip = { id: 'TRIP_005', requestId: request.id, status: 'PLANNING', plannedDepart: '', eta: '', deployment: { status: 'NOT_CONFIRMED' },
    readiness: { docsReady: 0, docsTotal: 0, insurance: 'MISSING', quarantineOk: false }, milestones: [], etaHistory: [] } as Trip;
  api.getTrips.mockResolvedValueOnce([]).mockResolvedValue([trip]);
  api.getRequest.mockResolvedValue(request);
  const view = renderHook(() => useManager());
  await waitFor(() => expect(view.result.current.loaded).toBe(true));
  expect(view.result.current.tripFor(request.id)).toBeUndefined();

  await act(async () => { await view.result.current.actions.loadRequest(request.id); });
  expect(view.result.current.tripFor(request.id)?.id).toBe('TRIP_005');
  view.unmount();
});
