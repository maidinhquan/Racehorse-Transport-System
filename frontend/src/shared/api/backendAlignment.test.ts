import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { apiMessage } from './apiError';
import { Flow1ApiError } from './contractClient';
import { customerApi, requestFromWire } from '../../features/customer/api/customerApi';
import { managerApi } from '../../features/manager/api/managerApi';
import { readRequestDrafts, writeRequestDrafts, mergeRequestDrafts } from '../../features/customer/api/requestDrafts';
import { contractFromWire } from './flow1Wire';
import { canPayDeposit, canSign } from '../../features/customer/hooks/customerRules';
import type { TransportRequest } from '../../features/customer/types';
import { initialDraft } from '../../features/manager/hooks/managerRules';

vi.mock('./apiClient', () => ({ apiClient: { request: vi.fn() } }));
const request = vi.mocked(apiClient.request);
const reply = (data: unknown, status = 200) => ({ status, data: { success: true, message: 'OK', data } });
const horse = {
  id: 'HORSE_001', name: 'Mare', breed: 'Arabian', sex: 'MARE', dob: '2020-01-01', microchip: '981000000000001',
  value: '150000000', currency: 'VND', healthNotes: 'Dị ứng thuốc', weight: 450.25, reproductiveStatus: 'NOT_PREGNANT',
  passport: { number: 'P001', authority: 'Authority', issueDate: '2021-01-01', expiryDate: '2035-01-01' },
};
const contact = { name: 'Stable', address: 'A street', postal: '', contact: 'Receiver', phone: '0901234567', notes: '', cityId: '0123456789abcdef012345', latitude: 10.8, longitude: 106.7 };
const rawRequest = {
  id: 'REQUEST_001', customerId: 'USER_001', origin: 'Ho Chi Minh City', destination: 'Tokyo', originCountry: 'VN', destinationCountry: 'JP', mode: 'AIR',
  expectedTransportDate: '2027-01-01', expectedDeliveryDate: '2027-01-04', careInstructions: 'Cho uống nước', status: 'PENDING_REVIEW',
  horses: ['HORSE_001'], horseNotes: { HORSE_001: 'Nghỉ ngơi' }, pickup: contact, delivery: contact,
};
beforeEach(() => { request.mockReset(); sessionStorage.clear(); localStorage.clear(); });

describe('backend DTO alignment', () => {
  it('sends the chosen contract mode through request validation and requests policies for that mode', async () => {
    request.mockResolvedValueOnce(reply({ ...rawRequest, status: 'CONTRACT_PREPARATION' }));
    const r = await managerApi.getRequest(rawRequest.id);
    const draft = { ...initialDraft(r), mode: 'ROAD' as const };
    request.mockResolvedValueOnce(reply({ requestId: r.id, contractId: 'CONTRACT_001', versionNo: 1, status: 'DRAFT', savedAt: '2026-10-30T00:00:00Z' }));
    await managerApi.saveContractDraft(r.id, draft);
    expect(request.mock.calls[1][0]?.data).toMatchObject({ mode: 'ROAD' });
    request.mockResolvedValueOnce(reply({ request: rawRequest, customer: {}, horses: [], draft: null, currentContract: null, versions: [], defaults: {} }));
    await managerApi.getContractEditor(r.id, 'AIR');
    expect(request.mock.calls[2][0]?.params).toEqual({ mode: 'AIR' });
  });
  it('round-trips health notes and preserves weight/reproduction while uploading the real file', async () => {
    request.mockResolvedValueOnce(reply(horse));
    const h = await customerApi.getHorse(horse.id);
    expect(h).toMatchObject({ conditions: 'Dị ứng thuốc', weight: 450.25, reproductiveStatus: 'NOT_PREGNANT' });
    const file = new File(['real image bytes'], 'passport.png', { type: 'image/png' });
    request.mockResolvedValueOnce(reply(horse));
    request.mockResolvedValueOnce(reply({ name: file.name, url: '/api/customer/horses/HORSE_001/files/passport' }, 201));
    await customerApi.updateHorse(h.id, { ...h, passport: { ...h.passport, scan: { name: file.name, file } } });
    expect(request.mock.calls[1][0]?.data).toMatchObject({ healthNotes: 'Dị ứng thuốc', weight: 450.25, reproductiveStatus: 'NOT_PREGNANT' });
    expect(request.mock.calls[1][0]?.data).not.toHaveProperty('conditions');
    expect((request.mock.calls[2][0]?.data as FormData).get('file')).toBe(file);
  });
  it('does not fabricate passport details or horse value when the backend omits them', async () => {
    request.mockResolvedValueOnce(reply({ ...horse, value: null, passport: {} }));
    const h = await customerApi.getHorse(horse.id);
    expect(h.value).toBe(''); expect(h.passport).toEqual({ number: '', authority: '', issueDate: '', expiryDate: '', scan: undefined });
  });
  it('sends a complete request once and keeps the idempotency key across a failed retry', async () => {
    const input = { ...requestFromWire(rawRequest), id: 'LOCAL_draft', status: 'DRAFT' as const };
    request.mockRejectedValueOnce(new Error('Connection interrupted'));
    expect((await customerApi.submitRequest(input.id, input)).ok).toBe(false);
    request.mockResolvedValueOnce(reply(rawRequest, 201));
    expect((await customerApi.submitRequest(input.id, input)).ok).toBe(true);
    const [first, second] = request.mock.calls.map(([config]) => config!);
    expect(first.headers?.['Idempotency-Key']).toBe(second.headers?.['Idempotency-Key']);
    expect(second.data).toMatchObject({ expectedTransportDate: '2027-01-01', expectedDeliveryDate: '2027-01-04', careInstructions: 'Cho uống nước', horses: ['HORSE_001'], pickup: { cityId: contact.cityId } });
    for (const key of ['date', 'pickupAt', 'careNotes', 'status', 'customerId']) expect(second.data).not.toHaveProperty(key);
  });
  it('handles manager request lists without detail-only arrays', async () => {
    request.mockResolvedValueOnce(reply([rawRequest]));
    expect((await managerApi.getRequests())[0]).toMatchObject({ date: '2027-01-04', pickupAt: '2027-01-01', careNotes: 'Cho uống nước', versions: [] });
  });
  it('keeps unpublished drafts out of the manager published version list', async () => {
    request.mockResolvedValueOnce(reply({ ...rawRequest, versions: [{ contractId: 'CONTRACT_001', requestId: rawRequest.id, versionNo: 1, contractStatus: 'DRAFT', versionStatus: 'DRAFT' }] }));
    expect((await managerApi.getRequest(rawRequest.id)).versions).toEqual([]);
  });
  it('uses backend version/deadline/status and immutable snapshot fields', () => {
    const v = contractFromWire({ contractId: 'CONTRACT_001', requestId: 'REQUEST_001', versionNo: 3, requestStatus: 'DEPOSIT_VERIFIED', contractStatus: 'ISSUED', versionStatus: 'ISSUED', currentDeadline: '2027-01-01 12:00',
      snapshot: { route: { departureAtUtc: '2027-01-03T00:00:00Z', deliveryAtUtc: '2027-01-04T00:00:00Z' }, pickup: { cityName: 'Hanoi' }, delivery: { cityName: 'Tokyo' }, careInstructions: 'Care', horses: [{ id: 'HORSE_001', microchip_ISO: '981000000000001', feI_Passport_No: 'P001' }] },
    });
    expect(v).toMatchObject({ v: 3, state: 'ISSUED', validUntil: '2027-01-01 12:00' });
    expect(v.snapshot?.horses[0]).toMatchObject({ microchip: '981000000000001', passportNo: 'P001' });
  });
  it('sends the schedule and excludes the request being edited from horse reservations', async () => {
    request.mockResolvedValueOnce(reply([]));
    await customerApi.getSelectableHorses('2027-01-04', 'REQUEST_001', '2027-01-01');
    expect(request.mock.calls[0][0]?.params).toEqual({ expectedTransportDate: '2027-01-01', expectedDeliveryDate: '2027-01-04', excludeRequestId: 'REQUEST_001' });
  });
  it('shows field validation errors from both axios and wrapped errors', () => {
    const errors = { file: ['The File field is required.'] };
    expect(apiMessage({ response: { status: 400, data: { message: 'Validation failed', errors } } })).toContain('file: The File field is required.');
    expect(apiMessage(new Flow1ApiError('Validation failed', undefined, errors))).toContain('file: The File field is required.');
  });
  it('opens payment before signature and requires a verified deposit for signing', () => {
    const v = { ...contractFromWire({ contractId: 'CONTRACT_001', requestId: 'REQUEST_001', versionNo: 1, requestStatus: 'CONTRACT_READY', versionStatus: 'ISSUED', contractStatus: 'ISSUED', currentDeadline: '2099-01-01 00:00', termsAcceptedAt: '2026-10-28 00:00', terms: [{ title: 'Term', text: 'Text' }], total: 100, depositPct: 30 }), snapshot: {} };
    const r = { ...requestFromWire(rawRequest), status: 'CONTRACT_READY', versions: [v], payments: [] } as unknown as TransportRequest;
    expect(canPayDeposit(r)).toBe(true); expect(canSign(r)).toBe(false);
    r.status = 'DEPOSIT_VERIFIED';
    r.payments = [{ id: 'PAYMENT_001', contractId: 'CONTRACT_001', versionNo: 1, type: 'DEPOSIT', method: 'VNPAY', amount: 30, confirmedAmount: 30, status: 'SUCCESS', createdAt: '' }];
    expect(canPayDeposit(r)).toBe(false); expect(canSign(r)).toBe(true);
  });
});

describe('local request preparation', () => {
  it('keeps drafts and unsent corrections during polling, then accepts a server transition', () => {
    const draft = { ...requestFromWire(rawRequest), id: 'LOCAL_draft', status: 'DRAFT' as const };
    const correction = { ...requestFromWire(rawRequest), status: 'CHANGES_REQUESTED' as const, editingLocally: true, careNotes: 'Changed locally' };
    writeRequestDrafts([draft, correction]);
    expect(readRequestDrafts()).toHaveLength(2);
    expect(mergeRequestDrafts([{ ...correction, editingLocally: false, careNotes: '' }], [draft, correction])[1].careNotes).toBe('Changed locally');
    expect(mergeRequestDrafts([requestFromWire(rawRequest)], [correction])[0].status).toBe('PENDING_REVIEW');
    sessionStorage.setItem('userEmail', 'another@example.com');
    expect(readRequestDrafts()).toEqual([]);
  });
});
