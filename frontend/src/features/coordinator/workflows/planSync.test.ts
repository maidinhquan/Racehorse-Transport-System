import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/apiClient';
import { pushPlanToBackend } from './planSync';

vi.mock('../../../shared/api/apiClient', () => ({ apiClient: { put: vi.fn(), post: vi.fn() } }));

const trip = {
  id: 'TRIP_004', mode: 'ROAD', plannedDepart: '2026-11-30 08:00', eta: '2026-12-01 08:00',
  routes: [{ v: 1, status: 'DRAFT', stops: [{ name: 'Điểm nhận', type: 'ORIGIN' }, { name: 'Điểm giao', type: 'DESTINATION' }] }],
};

beforeEach(() => vi.clearAllMocks());

it('returns a server error instead of reporting a route as submitted', async () => {
  vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } });
  vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { message: 'Không thể gửi phương án' } } });

  expect(await pushPlanToBackend(trip)).toContain('Không thể gửi phương án');
  expect(apiClient.post).toHaveBeenCalledOnce();
});
