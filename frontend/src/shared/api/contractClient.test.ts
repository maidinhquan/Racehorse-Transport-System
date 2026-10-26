import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { contractClient } from './contractClient';
import spec from '../../contracts/flow1.openapi.json';
import { customerApi } from '../../features/customer/api/customerApi';
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
    const data = example('/customer/horses', 'get'); delete data.data[0].color;
    request.mockResolvedValueOnce({ status: 200, data });
    await expect(customerApi.getHorses()).rejects.toThrow('color');
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
