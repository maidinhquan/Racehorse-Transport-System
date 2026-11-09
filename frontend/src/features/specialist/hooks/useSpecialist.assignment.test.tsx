import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { SpecTrip } from '../types';

const trips: SpecTrip[] = [
  { id: 'TRIP_001', requestId: 'REQUEST_001', customerName: '', origin: '', destination: '', originCountry: 'VN', destCountry: 'VN', mode: 'ROAD', status: 'PLANNING', deployment: 'CONFIRMED', specialistId: 'USER_005', plannedDepart: '', eta: '', horses: [], checkpoints: [] },
  { id: 'TRIP_002', requestId: 'REQUEST_002', customerName: '', origin: '', destination: '', originCountry: 'VN', destCountry: 'VN', mode: 'ROAD', status: 'COMPLETED', deployment: 'CONFIRMED', specialistId: 'USER_005', plannedDepart: '', eta: '', horses: [], checkpoints: [] },
  { id: 'TRIP_003', requestId: 'REQUEST_003', customerName: '', origin: '', destination: '', originCountry: 'VN', destCountry: 'VN', mode: 'ROAD', status: 'READY_TO_DEPART', deployment: 'CONFIRMED', specialistId: 'USER_020', plannedDepart: '', eta: '', horses: [], checkpoints: [] },
];

vi.mock('../api/specialistApi', () => ({ specialistApi: {
  getTrips: () => Promise.resolve(trips),
  getCustomerDocs: () => Promise.resolve([]),
  getDocuments: () => Promise.resolve([]),
  getRequests: () => Promise.resolve([]),
  getBookings: () => Promise.resolve([]),
  getDocTypes: () => Promise.resolve([]),
  getRegulations: () => Promise.resolve([]),
  getPackages: () => Promise.resolve([]),
  getAudit: () => Promise.resolve([]),
} }));

import { useSpecialist } from './useSpecialist';

const login = (id: string) => sessionStorage.setItem('accessToken', `header.${btoa(JSON.stringify({ sub: id }))}.signature`);

afterEach(() => {
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('rts_shared_trips');
});

it('shows only trips assigned to the current specialist after switching accounts', async () => {
  localStorage.setItem('rts_shared_trips', JSON.stringify({ TRIP_001: { id: 'TRIP_001', updatedAt: '' }, TRIP_002: { id: 'TRIP_002', updatedAt: '' } }));
  login('USER_020');
  const view = renderHook(() => useSpecialist());
  await waitFor(() => expect(view.result.current.trips.map((t) => t.id)).toEqual(['TRIP_003']));

  act(() => login('USER_021'));
  view.rerender();
  await waitFor(() => expect(view.result.current.loadedFor).toBe('USER_021'));
  expect(view.result.current.trips).toEqual([]);
  view.unmount();
});
