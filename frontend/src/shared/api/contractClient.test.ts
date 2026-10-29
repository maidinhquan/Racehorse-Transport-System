import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { contractClient } from './contractClient';
import spec from '../../contracts/flow1.openapi.json';
import { customerApi, requestFromWire } from '../../features/customer/api/customerApi';
import { managerApi } from '../../features/manager/api/managerApi';
import type { HorseInput } from '../../features/customer/types';

vi.mock('./apiClient', () => ({ apiClient: { request: vi.fn() } }));
const request = vi.mocked(apiClient.request);
const example = (path: string, method: string, status = '200') => {
  const op = (spec.paths as Record<string, Record<string, any>>)[path][method];
  return structuredClone(op.responses[status].content['application/json'].examples.case1.value);
};
beforeEach(() => { request.mockReset(); sessionStorage.clear(); });

describe('Flow 1 wire contract', () => {
  it('does not send a legacy draft mode when saving a contract', async () => {
    request.mockResolvedValue({ status: 200, data: example('/manager/requests/{requestId}/contract-draft', 'put') });
    const input = structuredClone(spec.paths['/manager/requests/{requestId}/contract-draft'].put.requestBody.content['application/json'].example);
    const draft = { ...input, mode: 'AIR' } as unknown as import('../../features/manager/types').ContractDraft;
    await managerApi.saveContractDraft('REQUEST_001', draft);
    expect(request.mock.calls[0][0]?.data).not.toHaveProperty('mode');
  });
  it('accepts a frozen contract with the transport mode explicitly deferred', async () => {
    const response = example('/customer/contracts/{contractId}/versions/{versionNo}', 'get');
    delete response.data.mode;
    response.data.modeDeferred = true;
    response.data.snapshot.route.mode = null;
    response.data.snapshot.route.transportModeDecision = 'FLOW3';
    request.mockResolvedValue({ status: 200, data: response });
    const result = await contractClient<any>('get', '/customer/contracts/CONTRACT_001/versions/1');
    expect(result.modeDeferred).toBe(true);
    expect(result.mode).toBeUndefined();
  });
  it('keeps an empty list empty without introducing demo horses', async () => {
    request.mockResolvedValue({ status: 200, data: { success: true, message: 'OK', data: [] } });
    expect(await customerApi.getHorses()).toEqual([]);
  });
  it('matches selectable before the dynamic horse detail route', async () => {
    request.mockResolvedValue({ status: 200, data: example('/customer/horses/selectable', 'get') });
    const result = await customerApi.getSelectableHorses('2026-11-20', 'REQUEST_001');
    expect(result[0].selectable).toBe(true);
  });
  it('rejects missing data and missing frontend fields', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'OK' } });
    await expect(customerApi.getHorses()).rejects.toThrow('contract');
    const data = example('/customer/horses', 'get'); delete data.data[0].microchip;
    request.mockResolvedValueOnce({ status: 200, data });
    await expect(customerApi.getHorses()).rejects.toThrow('microchip');
  });
  it('rejects obsolete rowVersion and malformed OTP before sending', async () => {
    await expect(contractClient('post', '/customer/contracts/CONTRACT_001/sign', { versionNo: 1, otp: '482913', rowVersion: 'fake' })).rejects.toThrow('contract');
    await expect(customerApi.signContract('CONTRACT_001', '00000X', 1)).rejects.toThrow('contract');
    expect(request).not.toHaveBeenCalled();
  });
  it('requires server verification even for the old bypass code', async () => {
    request.mockRejectedValue(new Error('OTP_INVALID_OR_EXPIRED'));
    await expect(customerApi.signContract('CONTRACT_001', '000000', 1)).rejects.toThrow('OTP_INVALID_OR_EXPIRED');
    expect(request.mock.calls[0][0]).toMatchObject({ method: 'post', url: '/customer/contracts/CONTRACT_001/sign', data: { versionNo: 1, otp: '000000' } });
  });
  it('uploads the selected File without dummy document content', async () => {
    const saved = example('/customer/horses', 'post', '201');
    request.mockResolvedValueOnce({ status: 201, data: saved });
    request.mockResolvedValueOnce({ status: 201, data: example('/customer/horses/{horseId}/files/{fileType}', 'post', '201') });
    const actual = new File(['actual passport content'], 'my-passport.pdf', { type: 'application/pdf' });
    const input = { ...saved.data, color: '', fluDate: '', vetName: '', vetPhone: '', passport: { ...saved.data.passport, scan: { name: actual.name, file: actual } } } as HorseInput;
    await customerApi.createHorse(input);
    const upload = request.mock.calls[1][0];
    expect(upload?.url).toBe('/customer/horses/HORSE_001/files/passport');
    const file = (upload?.data as FormData).get('file') as File;
    expect(file.name).toBe(actual.name); expect(file.size).toBe(actual.size);
    expect((upload?.data as FormData).get('Photo')).toBeNull();
    expect(upload?.headers?.['Content-Type']).toBeUndefined();
  });
  it('uses the selected schedule unchanged for manager costs', async () => {
    request.mockResolvedValue({ status: 200, data: example('/manager/requests/{requestId}/cost-estimate', 'post') });
    const selected = { transportMode: 'AIR', departureAt: '2026-11-20 08:00', deliveryAt: '2026-11-21 18:00' };
    await managerApi.getCostEstimate('REQUEST_001', selected);
    expect(request.mock.calls[0][0]?.data).toEqual(selected);
  });
  it('blocks transfer initiation until its contract is supported', async () => {
    await expect(contractClient('post', '/customer/invoices/INVOICE_001/payment-session', { method: 'BANK_TRANSFER' })).rejects.toThrow('contract');
    expect(request).not.toHaveBeenCalled();
  });
});

  // Regression cases for the current contract (65 endpoints, VNPAY only).
describe('current Flow 1 request boundaries', () => {
  it('sends the UUID idempotency header without UI-only request fields', async () => {
    request.mockResolvedValue({ status: 201, data: example('/customer/requests', 'post', '201') });
    const wire = (spec.paths['/customer/requests'].post.requestBody.content['application/json'] as any).example;
    const input = requestFromWire({ ...wire, id: 'LOCAL_draft', status: 'DRAFT', customerId: 'USER_001' });
    const key = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';
    const result = await customerApi.createRequest(input, key);
    expect(request.mock.calls[0][0]).toMatchObject({ headers: { 'Idempotency-Key': key }, data: { origin: input.origin, destination: input.destination, originCountry: 'VN', destinationCountry: 'JP', mode: 'AIR', expectedDeliveryDate: input.date, expectedTransportDate: input.pickupAt, careInstructions: input.careNotes } });
    expect(request.mock.calls[0][0]?.data).not.toHaveProperty('horseCount');
    expect(result.history).toEqual([]);
    expect(result.revisions).toEqual([]);
  });
  it('rejects missing required headers, invalid path parameters and undocumented endpoints', async () => {
    const body = { origin: 'Ho Chi Minh City', destination: 'Tokyo', originCountry: 'VN', destinationCountry: 'JP', mode: 'AIR', date: '2026-11-20', pickupAt: '2026-11-19', careNotes: '' };
    await expect(contractClient('post', '/customer/requests', body)).rejects.toThrow('Idempotency-Key');
    await expect(contractClient('get', '/customer/horses/not-a-contract-id')).rejects.toThrow('horseId');
    await expect(contractClient('post', '/manager/payments/PAYMENT_001/confirm', {})).rejects.toThrow('không có');
    await expect(contractClient('post', '/manager/payments/PAYMENT_001/reject', {})).rejects.toThrow('không có');
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects undeclared query parameters and request bodies on bodyless operations', async () => {
    await expect(contractClient('get', '/customer/requests', undefined, { customerId: 'USER_002' })).rejects.toThrow('customerId');
    await expect(contractClient('get', '/customer/horses/selectable')).rejects.toThrow('expectedTransportDate');
    await expect(contractClient('post', '/manager/contracts/CONTRACT_001/refund/complete', { reference: 'old' })).rejects.toThrow('không nhận request body');
    expect(request).not.toHaveBeenCalled();
  });
  it('sends only feedback for manager revision and no body for refund completion', async () => {
    request.mockResolvedValueOnce({ status: 200, data: example('/manager/requests/{requestId}/request-changes', 'post') });
    await managerApi.requestRevision('REQUEST_001', 'Please update the transport date.');
    expect(request.mock.calls[0][0]?.data).toEqual({ feedback: 'Please update the transport date.' });
    request.mockResolvedValueOnce({ status: 200, data: example('/manager/contracts/{contractId}/refund/complete', 'post') });
    await managerApi.confirmRefund('CONTRACT_001');
    expect(request.mock.calls[1][0]?.data).toBeUndefined();
  });
  it('uses the contract hold and resume endpoints', async () => {
    request.mockResolvedValueOnce({ status: 200, data: example('/manager/trips/{tripId}/hold', 'post') });
    await managerApi.holdTrip('TRIP_001', 'Waiting for the revised transport date.');
    expect(request.mock.calls[0][0]?.data).toEqual({ reason: 'Waiting for the revised transport date.' });
    request.mockResolvedValueOnce({ status: 200, data: example('/manager/trips/{tripId}/resume', 'post') });
    await managerApi.resumeTrip('TRIP_001');
    expect(request.mock.calls[1][0]?.url).toBe('/manager/trips/TRIP_001/resume');
    expect(request.mock.calls[1][0]?.data).toBeUndefined();
  });
  it('uses value-proof for profile files and omits unsupported horse fields', async () => {
    const saved = example('/customer/horses', 'post', '201');
    request.mockResolvedValueOnce({ status: 201, data: saved });
    request.mockResolvedValueOnce({ status: 201, data: example('/customer/horses/{horseId}/files/{fileType}', 'post', '201') });
    await customerApi.createHorse({ ...saved.data, color: 'Bay', fluDate: '2026-10-01', vetName: 'Vet', vetPhone: '0901234567', valueProof: { name: 'value.pdf', file: new File(['proof'], 'value.pdf', { type: 'application/pdf' }) } });
    const body = request.mock.calls[0][0]?.data;
    expect(body).not.toHaveProperty('color'); expect(body).not.toHaveProperty('fluDate'); expect(body).not.toHaveProperty('vetName');
    expect(request.mock.calls[1][0]?.url).toBe('/customer/horses/HORSE_001/files/value-proof');
  });
  it('does not send medical files to an endpoint absent from the backend', async () => {
    const file = new File(['medical'], 'health.pdf', { type: 'application/pdf' });
    await expect(customerApi.uploadDocument('REQUEST_001', 'health', 'HORSE_001', { name: file.name, file })).rejects.toThrow('không có');
    expect(request).not.toHaveBeenCalled();
  });
  it('blocks invalid multipart fields, photo PDF files and unsupported fileType routes', async () => {
    const data = new FormData(); data.set('file', new File(['pdf'], 'photo.pdf', { type: 'application/pdf' }));
    await expect(contractClient('post', '/customer/horses/HORSE_001/files/photo', data)).rejects.toThrow('JPEG');
    await expect(contractClient('post', '/customer/horses/HORSE_001/files/flu', data)).rejects.toThrow('fileType');
    data.set('documentType', 'HEALTH_CERTIFICATE'); data.set('undeclared', 'x');
    await expect(contractClient('post', '/customer/requests/REQUEST_001/horses/HORSE_001/documents', data)).rejects.toThrow('không có');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('Flow 1 server errors', () => {
  it('preserves the backend errorCode instead of branching on a translated message', async () => {
    const error = { success: false, message: 'Trạng thái hiện tại không cho phép ký.', errorCode: 'INVALID_STATE', data: null };
    request.mockRejectedValueOnce({ response: { status: 409, data: error } });
    await expect(customerApi.signContract('CONTRACT_001', '123456', 1)).rejects.toMatchObject({ name: 'Flow1ApiError', message: error.message, errorCode: error.errorCode });
  });
  it('accepts backend validation errors without an optional errorCode', async () => {
    request.mockRejectedValueOnce({ response: { status: 409, data: { success: false, message: 'Incomplete error' } } });
    await expect(customerApi.signContract('CONTRACT_001', '123456', 1)).rejects.toMatchObject({ message: 'Incomplete error' });
  });
});
