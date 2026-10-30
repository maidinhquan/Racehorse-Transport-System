import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/apiClient';
import specification from '../../../contracts/flow3.openapi.json';
import { flow3Api } from './flow3Api';
import { flow3Request } from './flow3Client';
import { flow3Endpoints } from './flow3Endpoints';

vi.mock('../../../shared/api/apiClient', () => ({ apiClient: { request: vi.fn() } }));
const request = vi.mocked(apiClient.request);
const key = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';
const tripId = 'TRIP_001';
const operations = Object.entries(specification.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({ path, method, op })),
);
function fixture(id: string) {
  const entry = operations.find(({ op }) => op.operationId === id)!;
  const [status, response] = Object.entries(entry.op.responses).find(([code]) => code.startsWith('2'))!;
  const media = (response as { content: { 'application/json': { example: unknown } } }).content['application/json'];
  return { status: Number(status), data: structuredClone(media.example) };
}
const failure = { success: false, message: 'Tải lại phương án.', errorCode: 'STALE_VERSION', data: null };
beforeEach(() => { request.mockReset(); });

describe('Flow 3 contract boundary', () => {
  it('uses the current query names for flight lookup', async () => {
    request.mockResolvedValueOnce(fixture('F3-J54'));
    const query = { tripId, partnerId: 'PARTNER_001', providerFlightCode: 'EQA-DEMO-01' };
    const result = await flow3Api.lookupFlight(query);
    expect(result.serviceId).toBeTruthy();
    expect(request.mock.calls[0][0]).toMatchObject({ method: 'get', url: '/coordinator/flights/lookup', params: query });
  });

  it('rejects missing, unknown and invalid query fields before HTTP', async () => {
    await expect(flow3Request('F3-J54', { path: {}, query: { partnerId: 'PARTNER_001', providerFlightCode: 'EQA' } })).rejects.toThrow('tripId');
    await expect(flow3Request('F3-J54', { path: {}, query: { tripId, partnerId: 'PARTNER_001', flightCode: 'EQA' } })).rejects.toThrow('flightCode');
    await expect(flow3Request('F3-J23', { path: {}, query: { mode: 'BOAT' } })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    await expect(flow3Request('F3-J27', { path: { tripId } })).rejects.toThrow('leg');
    await expect(flow3Request('F3-J47', { path: { placeId: 'PLACE_001' }, query: { expectedVersion: 0 }, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps the server snapshot version in delete queries', async () => {
    request.mockResolvedValueOnce(fixture('F3-J38'));
    await flow3Api.deleteAirPartner('PARTNER_001', 4, key);
    expect(request.mock.calls[0][0]).toMatchObject({ method: 'delete', params: { expectedVersion: 4 }, headers: { 'Idempotency-Key': key } });
    request.mockResolvedValueOnce(fixture('F3-J47'));
    await flow3Api.deletePlace('PLACE_001', 7, key);
    expect(request.mock.calls[1][0]).toMatchObject({ method: 'delete', params: { expectedVersion: 7 } });
  });

  it('uploads the actual file and expectedVersion as multipart fields and returns file metadata', async () => {
    request.mockResolvedValueOnce(fixture('F3-J42'));
    const file = new File(['%PDF-1.7 evidence'], 'booking.pdf', { type: 'application/pdf' });
    const result = await flow3Api.uploadFlightEvidence(tripId, file, 10, key);
    const sent = request.mock.calls[0][0]!;
    expect(sent).toMatchObject({ method: 'post', url: `/coordinator/trips/${tripId}/flight/evidence`, headers: { 'Idempotency-Key': key } });
    const form = sent.data as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('expectedVersion')).toBe('10');
    expect([...form.keys()]).toEqual(['expectedVersion', 'file']);
    expect(sent.headers?.['Content-Type']).toBeUndefined();
    expect(result.fileId).toBeTruthy();
    expect(result.contentType).toBe('application/pdf');
    expect(result).not.toHaveProperty('binding');
  });

  it('rejects missing files, unsupported types and invalid multipart metadata', async () => {
    const file = new File(['%PDF-1.7 evidence'], 'booking.pdf', { type: 'application/pdf' });
    await expect(flow3Request('F3-J42', { path: { tripId }, body: { expectedVersion: 10 }, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
    await expect(flow3Api.uploadFlightEvidence(tripId, new File([], 'empty.pdf', { type: 'application/pdf' }), 10, key)).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
    await expect(flow3Api.uploadFlightEvidence(tripId, new File(['text'], 'x.txt', { type: 'text/plain' }), 10, key)).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
    await expect(flow3Api.uploadFlightEvidence(tripId, file, 0, key)).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    await expect(flow3Request('F3-J42', { path: { tripId }, body: { expectedVersion: 10, label: 'Legacy label' }, file, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    await expect(flow3Request('F3-J42', { path: { tripId }, body: { expectedVersion: 10, file: 'fake.pdf' }, file, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects files over 10 MiB and invalid idempotency keys', async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
    await expect(flow3Api.uploadFlightEvidence(tripId, file, 10, key)).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
    await expect(flow3Api.uploadFlightEvidence(tripId, file, 10, 'invalid')).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['application/pdf', 'image/jpeg', 'image/png'])('downloads %s as a blob rather than JSON', async type => {
    const blob = new Blob(['file bytes'], { type });
    request.mockResolvedValueOnce({ status: 200, data: blob });
    const result = await flow3Api.downloadPlanningFile(tripId, 'FILE_001');
    expect(result).toBe(blob);
    expect(request.mock.calls[0][0]).toMatchObject({ method: 'get', url: `/trips/${tripId}/planning-files/FILE_001`, responseType: 'blob' });
    expect(request.mock.calls[0][0]?.headers?.Accept).toContain(type);
  });

  it('rejects empty downloads and unexpected binary content', async () => {
    request.mockResolvedValueOnce({ status: 200, data: new Blob([], { type: 'application/pdf' }) });
    await expect(flow3Api.downloadPlanningFile(tripId, 'FILE_001')).rejects.toMatchObject({ errorCode: 'INVALID_FILE_RESPONSE' });
    request.mockResolvedValueOnce({ status: 200, data: new Blob(['html error'], { type: 'text/html' }) });
    await expect(flow3Api.downloadPlanningFile(tripId, 'FILE_001')).rejects.toMatchObject({ errorCode: 'INVALID_FILE_RESPONSE' });
  });

  it('preserves a JSON error returned as a blob without retrying', async () => {
    const blob = new Blob([JSON.stringify(failure)], { type: 'application/json' });
    // jsdom's Blob lacks text(); browsers provide this method.
    Object.defineProperty(blob, 'text', { value: async () => JSON.stringify(failure) });
    request.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: blob } });
    await expect(flow3Api.downloadPlanningFile(tripId, 'FILE_001')).rejects.toMatchObject({ errorCode: 'STALE_VERSION', status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('validates JSON responses instead of filling missing data', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'OK' } });
    await expect(flow3Api.getCoordinatorTrips()).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    request.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'OK', data: [] } });
    expect(await flow3Api.getCoordinatorTrips()).toEqual([]);
  });

  it('uses the Expected command for independent document readiness and pickup reopening', async () => {
    request.mockResolvedValueOnce(fixture('F3-J16'));
    await flow3Api.confirmDocsReady(tripId, { expectedVersion: 10 }, key);
    expect(request.mock.calls[0][0]?.data).toEqual({ expectedVersion: 10 });
    request.mockResolvedValueOnce(fixture('F3-J33'));
    await flow3Api.reopenPickupRelocation(tripId, { expectedVersion: 10 }, key);
    expect(request.mock.calls[1][0]?.data).toEqual({ expectedVersion: 10 });
  });

  it('withdraws a specific plan version and validates without reserving resources', async () => {
    request.mockResolvedValueOnce(fixture('F3-J09'));
    await flow3Api.withdrawPlan(tripId, { expectedVersion: 10, planVersion: 1 }, key);
    expect(request.mock.calls[0][0]?.data).toEqual({ expectedVersion: 10, planVersion: 1 });
    request.mockResolvedValueOnce(fixture('F3-J07'));
    expect((await flow3Api.validatePlan(tripId, { expectedVersion: 10, planVersion: 1 })).resourceHoldsCreated).toBe(false);
    expect(request.mock.calls[1][0]?.headers).not.toHaveProperty('Idempotency-Key');
  });

  it('rejects unknown operations and undeclared path parameters', async () => {
    await expect(flow3Request('F3-UNKNOWN', { path: {} })).rejects.toMatchObject({ errorCode: 'UNKNOWN_OPERATION' });
    await expect(flow3Request('F3-J24', { path: { tripId, owner: 'USER_001' } })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps stale mutations unchanged and never upgrades the version automatically', async () => {
    request.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: failure } });
    const body = { expectedVersion: 10, planVersion: 1 };
    await expect(flow3Api.submitPlan(tripId, body, key)).rejects.toMatchObject({ errorCode: 'STALE_VERSION', status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({ data: body, headers: { 'Idempotency-Key': key } });
  });

  it('blocks concurrent duplicate mutations and releases the lock on completion', async () => {
    let finish!: (value: ReturnType<typeof fixture>) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const body = { expectedVersion: 10, planVersion: 1 };
    const pending = flow3Api.submitPlan(tripId, body, key);
    await expect(flow3Api.submitPlan(tripId, body, key)).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });
    finish(fixture('F3-J08'));
    await pending;
    request.mockResolvedValueOnce(fixture('F3-J08'));
    await flow3Api.submitPlan(tripId, body, key);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps every endpoint registry entry aligned with the contract', () => {
    expect(Object.keys(flow3Endpoints)).toHaveLength(operations.length);
    for (const { path, method, op } of operations) {
      expect(flow3Endpoints[op.operationId as keyof typeof flow3Endpoints]).toEqual({ path, method: method.toUpperCase() });
    }
  });
});
