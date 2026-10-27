import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/apiClient';
import specification from '../../../contracts/flow6.openapi.json';
import { flow6Api } from './flow6Api';
import { flow6Request } from './flow6Client';

vi.mock('../../../shared/api/apiClient', () => ({ apiClient: { request: vi.fn() } }));
const request = vi.mocked(apiClient.request);
const key = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';
const requestId = 'REQUEST_001';
const acceptance = { expectedVersion: 1, statementVersion: 1, confirmed: true as const };
const ops = Object.values(specification.paths).flatMap(methods => Object.values(methods));
function response(name: string) {
  const op = ops.find(item => item['x-client-name'] === name)!;
  const [status, result] = Object.entries(op.responses).find(([code]) => Number(code) < 300)!;
  const content = (result as { content: Record<string, { examples: { success: { value: unknown } } }> }).content;
  return { status: Number(status), data: structuredClone(content['application/json'].examples.success.value) };
}

beforeEach(() => { request.mockReset(); });

describe('Flow 6 API boundary', () => {
  it('reads the server aggregate without filling missing states with demo data', async () => {
    request.mockResolvedValueOnce(response('getCustomerAftercare'));
    const result = await flow6Api.getCustomerAftercare(requestId);
    expect(result.phase).toBe('AWAITING_ACCEPTANCE');
    expect(result.acceptance.status).toBe('PENDING');
    expect(result.settlement.canPay).toBe(false);
    expect(request.mock.calls[0][0]).toMatchObject({ method: 'get', url: `/customer/requests/${requestId}/aftercare` });
  });

  it('sends explicit consent, server versions and the caller idempotency key', async () => {
    request.mockResolvedValueOnce(response('acceptDelivery'));
    const result = await flow6Api.acceptDelivery(requestId, acceptance, key);
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'post', url: `/customer/requests/${requestId}/aftercare/acceptance`,
      data: acceptance, headers: { 'Idempotency-Key': key },
    });
    expect(result.acceptance.status).toBe('ACCEPTED');
    expect(result.phase).toBe('AWAITING_PAYMENT');
    expect(result.paymentWindow.dueAt).not.toBe(result.acceptanceWindow.dueAt);
  });

  it('rejects missing consent, invalid keys and fake state before making HTTP requests', async () => {
    await expect(flow6Request('F6-J10', { path: { requestId }, body: { expectedVersion: 1, statementVersion: 1 }, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    await expect(flow6Api.acceptDelivery(requestId, acceptance, 'invalid')).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    await expect(flow6Request('F6-J10', { path: { requestId }, body: { ...acceptance, status: 'ACCEPTED' }, idempotencyKey: key })).rejects.toMatchObject({ errorCode: 'CONTRACT_VALIDATION_ERROR' });
    expect(request).not.toHaveBeenCalled();
  });

  it('does not accept malformed IDs, unknown routes or query-shaped path values', async () => {
    await expect(flow6Api.getCustomerAftercare('REQUEST_001/acceptance')).rejects.toThrow('contract');
    await expect(flow6Request('F6-UNKNOWN', { path: {} })).rejects.toMatchObject({ errorCode: 'UNKNOWN_OPERATION' });
    await expect(flow6Request('F6-J07', { path: { requestId, ownerId: 'USER_002' } })).rejects.toThrow('contract');
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves backend refusal and stale versions without automatic retry', async () => {
    const error = { success: false, message: 'Đang có khiếu nại chưa giải quyết.', errorCode: 'OPEN_COMPLAINT', data: null };
    request.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: error } });
    await expect(flow6Api.acceptDelivery(requestId, acceptance, key)).rejects.toMatchObject({ status: 409, errorCode: 'OPEN_COMPLAINT' });
    request.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { ...error, errorCode: 'STALE_VERSION' } } });
    await expect(flow6Api.acceptDelivery(requestId, acceptance, key)).rejects.toMatchObject({ errorCode: 'STALE_VERSION' });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.every(([config]) => (config?.data as { expectedVersion?: number })?.expectedVersion === 1)).toBe(true);
  });

  it('only starts a payment session, never sends an amount or declares payment verified', async () => {
    request.mockResolvedValueOnce(response('createBalancePayment'));
    const body = { expectedVersion: 2, invoiceVersion: 1, method: 'VNPAY' as const };
    const session = await flow6Api.createBalancePayment(requestId, body, key);
    expect(session.status).toBe('PROCESSING');
    expect(request.mock.calls[0][0]?.data).toEqual(body);
    await expect(flow6Request('F6-J22', { path: { requestId }, body: { ...body, amount: 1 }, idempotencyKey: key })).rejects.toThrow('contract');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('cannot mark an unaccepted dispute as customer acceptance', async () => {
    request.mockResolvedValueOnce(response('applyDisputeDecision'));
    const result = await flow6Api.applyDisputeDecision(requestId, 'decision_001', { expectedVersion: 1 }, key);
    expect(result.acceptance.status).toBe('NOT_REQUIRED_BY_DISPUTE');
    expect(result.acceptance.acceptedAt).toBeNull();
    expect(result.closure).toBeNull();
    expect(result.settlement.outstanding).toBeGreaterThan(0);
  });

  it('uploads the actual file with a browser-generated multipart boundary', async () => {
    const file = new File(['actual-image-bytes'], 'photo.png', { type: 'image/png' });
    request.mockResolvedValueOnce(response('uploadDriverEvidence'));
    await flow6Api.uploadDriverEvidence(requestId, file, key);
    const config = request.mock.calls[0][0];
    expect(config?.data).toBeInstanceOf(FormData);
    expect((config?.data as FormData).get('file')).toBe(file);
    expect(config?.headers?.['Content-Type']).toBeUndefined();
    expect(config?.headers?.['Idempotency-Key']).toBe(key);
    await expect(flow6Api.uploadDriverEvidence(requestId, new File(['x'], 'x.html', { type: 'text/html' }), key)).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('downloads authenticated bytes and rejects a fake success page', async () => {
    const file = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    request.mockResolvedValueOnce({ status: 200, data: file });
    expect(await flow6Api.downloadCustomerEvidence(requestId, 'evidence_001')).toBe(file);
    expect(request.mock.calls[0][0]?.responseType).toBe('blob');
    request.mockResolvedValueOnce({ status: 200, data: new Blob(['<html>Login</html>'], { type: 'text/html' }) });
    await expect(flow6Api.downloadCustomerEvidence(requestId, 'evidence_001')).rejects.toMatchObject({ errorCode: 'INVALID_FILE_RESPONSE' });
  });

  it('rejects malformed responses, false success and uncontracted success status', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'OK', data: { phase: 'CLOSED' } } });
    await expect(flow6Api.getCustomerAftercare(requestId)).rejects.toThrow('contract');
    request.mockResolvedValueOnce({ status: 200, data: { success: false, message: 'Chưa triển khai.', errorCode: 'FEATURE_NOT_SUPPORTED', data: null } });
    await expect(flow6Api.getCustomerAftercare(requestId)).rejects.toMatchObject({ errorCode: 'FEATURE_NOT_SUPPORTED' });
    request.mockResolvedValueOnce({ ...response('acceptDelivery'), status: 202 });
    await expect(flow6Api.acceptDelivery(requestId, acceptance, key)).rejects.toMatchObject({ errorCode: 'INVALID_RESPONSE_STATUS' });
  });

  it('releases the concurrent lock after a network error and preserves the key on retry', async () => {
    let reject!: (reason: Error) => void;
    request.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const first = flow6Api.acceptDelivery(requestId, acceptance, key);
    const assertion = expect(first).rejects.toThrow('Network unavailable');
    await expect(flow6Api.acceptDelivery(requestId, acceptance, key)).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });
    reject(new Error('Network unavailable'));
    await assertion;
    request.mockResolvedValueOnce(response('acceptDelivery'));
    await flow6Api.acceptDelivery(requestId, acceptance, key);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.map(([config]) => config?.headers?.['Idempotency-Key'])).toEqual([key, key]);
  });
});
