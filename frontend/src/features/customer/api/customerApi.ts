import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { apiMessage } from '../../../shared/api/apiError';
import type { ComplaintInput, ContractChangeInput, CustomerNotification, CustomerProfile, FileRef, Horse, HorseInput, TransportRequest, TripInfoInput, ContractVersion } from '../types';
import { city } from '../hooks/customerRules';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';
const horseBody = (h: HorseInput) => ({
  name: h.name.trim(), breed: h.breed.trim(), sex: h.sex, dob: h.dob,
  ...Object.fromEntries(['color', 'fluDate', 'vetName', 'vetPhone'].filter(key => !h.unsupportedFields?.includes(key)).map(key => [key, h[key as keyof HorseInput]])),
  microchip: h.microchip, value: h.value, currency: 'VND', conditions: h.conditions,
  passport: { number: h.passport.number, authority: h.passport.authority, issueDate: h.passport.issueDate, expiryDate: h.passport.expiryDate },
});
const routeBody = (r: TripInfoInput) => ({
  origin: r.origin, destination: r.destination,
  originCountry: city(r.origin).country, destinationCountry: city(r.destination).country,
  mode: city(r.destination).country === 'JP' ? 'AIR' : 'ROAD', date: r.date, careNotes: r.careNotes,
});
export const requestBody = (r: TransportRequest) => ({
  ...routeBody(r), pickup: r.pickup, delivery: r.delivery,
  horses: r.horses.filter(Boolean), horseNotes: r.horseNotes,
});
async function uploadHorseFiles(id: string, h: HorseInput) {
  for (const [kind, ref] of Object.entries({ photo: h.photo, passport: h.passport.scan, ownership: h.ownership, valueProof: h.valueProof, flu: h.flu, health: h.health })) {
    if (!ref?.file) continue;
    const form = new FormData(); form.append('file', ref.file);
    await contractClient<FileRef>('post', `/customer/horses/${id}/files/${kind}`, form);
  }
}
export const customerApi = {
  getProfile: () => contractClient<CustomerProfile>('get', '/customer/profile'),
  getHorses: async () => {
    const horses = await contractClient<Horse[]>('get', '/customer/horses');
    return horses.map(h => ({ ...h, ...Object.fromEntries((h.unsupportedFields ?? []).map(key => [key, ''])) }));
  },
  getRequests: async () => {
    const requests = await contractClient<TransportRequest[]>('get', '/customer/requests');
    return requests.map(r => {
      if (r.status !== 'DRAFT') return r;
      try {
        const saved = JSON.parse(sessionStorage.getItem(`flow1-progress:${r.id}`) || 'null');
        if (saved && saved.horseCount >= 1 && saved.horseCount <= 6) return { ...r, horseCount: Math.max(saved.horseCount, r.horses.length), horses: Array.from({ length: Math.max(saved.horseCount, r.horses.length) }, (_, i) => r.horses[i] || ''), wizardStep: saved.wizardStep ?? r.wizardStep };
      } catch { /* Invalid UI metadata must not affect server data. */ }
      return { ...r, horseCount: Math.max(1, r.horses.length), horses: r.horses.length ? r.horses : [''] };
    });
  },
  getSelectableHorses: (date: string, excludeRequestId: string) => contractClient<Array<{ id: string; name: string; selectable: boolean; conflict: unknown; documentWarnings: string[] }>>('get', '/customer/horses/selectable', undefined, { date, excludeRequestId }),
  getRequest: (id: string) => contractClient<TransportRequest>('get', `/customer/requests/${id}`),
  getNotifications: () => contractClient<CustomerNotification[]>('get', '/customer/notifications'),
  markNotificationRead: (id: string) => contractClient('post', `/customer/notifications/${id}/read`),
  markAllNotificationsRead: () => contractClient('post', '/customer/notifications/read-all'),
  getFormOptions: (origin: string, destination: string, mode?: string) => contractClient<FormOptions>('get', '/customer/request-form-options', undefined, {
    originCountry: city(origin).country, destinationCountry: city(destination).country,
    mode: mode || (city(destination).country === 'JP' ? 'AIR' : 'ROAD'),
  }),
  searchLocations: (address: string, country = 'VN') => contractClient<Array<{ label: string; point: { latitude: number; longitude: number; countryCode: string } }>>('get', '/locations/search', undefined, { q: address, country }),
  createHorse: async (body: HorseInput) => {
    const horse = await contractClient<Horse>('post', '/customer/horses', horseBody(body));
    if (!horse?.id) throw new Error('API chưa trả mã ngựa đã lưu.');
    try { await uploadHorseFiles(horse.id, body); }
    catch (error) { throw new Error(`Đã tạo ngựa ${horse.id}, nhưng tải tệp thất bại: ${apiMessage(error)}. Mở hồ sơ này để tải lại tệp, không tạo ngựa mới.`); }
    return { ok: true, id: horse.id };
  },
  updateHorse: async (id: string, body: HorseInput) => {
    await contractClient<Horse>('put', `/customer/horses/${id}`, horseBody(body));
    await uploadHorseFiles(id, body); return true;
  },
  createRequest: (body: TripInfoInput) => contractClient<TransportRequest>('post', '/customer/requests', routeBody(body)),
  saveRequest: (r: TransportRequest) => contractClient<TransportRequest>('put', `/customer/requests/${r.id}`, requestBody(r)),
  submitRequest: async (id: string, body: TransportRequest) => {
    try {
      await customerApi.saveRequest(body);
      const checklist = await contractClient<{ canSubmit: boolean; issues: Array<{ message: string }> }>('get', `/customer/requests/${id}/document-checklist`);
      if (!checklist.canSubmit) throw new Error(checklist.issues[0]?.message || 'Hồ sơ chưa đủ điều kiện gửi.');
      const request = await contractClient<TransportRequest>('post', `/customer/requests/${id}/submit`);
      return { ok: true, requestId: request.id, request };
    } catch (error) { return { ok: false, message: apiMessage(error) }; }
  },
  cancelRequest: (id: string, reason: string) => contractClient<{ requestStatus: TransportRequest['status'] }>('post', `/customer/requests/${id}/cancel`, { reason }),
  uploadDocument: async (requestId: string, key: string, scope: string, file: FileRef) => {
    if (!file.file) throw new Error('Chọn tệp thật từ máy trước khi tải lên.');
    const data = new FormData(); data.append('file', file.file); data.append('documentType', ({ passport: 'PASSPORT', ownership: 'OWNERSHIP', valueProof: 'VALUATION', flu: 'VACCINATION', health: 'HEALTH_CERTIFICATE' } as Record<string, string>)[key] || key.toUpperCase());
    if (scope === 'request') throw new Error('Hồ sơ chung theo đơn chưa có API lưu được xác nhận.');
    return contractClient<FileRef>('post', `/customer/requests/${requestId}/horses/${scope}/documents`, data);
  },
  getContract: (requestId: string) => contractClient<{ currentVersion: ContractVersion | null }>('get', `/customer/requests/${requestId}/contract`),
  acceptTerms: (id: string, versionNo: number) => contractClient<{ termsAcceptedAt: string }>('post', `/customer/contracts/${id}/accept-terms`, { versionNo }),
  requestContractChange: (id: string, body: ContractChangeInput, versionNo: number) => contractClient('post', `/customer/contracts/${id}/feedback`, {
    versionNo, text: [body.text, body.proposedDate && `Ngày đề xuất: ${body.proposedDate}`, body.proposedNotes, body.commercial, body.other].filter(Boolean).join('\n'),
  }),
  sendSignOtp: (id: string, versionNo: number) => contractClient<{ expiresInSeconds: number; resendAfterSeconds: number; sentTo: string }>('post', `/customer/contracts/${id}/sign-otp`, { versionNo }),
  signContract: (id: string, otp: string, versionNo: number) => contractClient<{ requestId: string; requestStatus: 'ACTIVATED'; tripId: string; tripStatus: 'PLANNING'; signedAt: string }>('post', `/customer/contracts/${id}/sign`, { versionNo, otp }),
  payDeposit: async (requestId: string) => {
    try {
      const deposit = await contractClient<{ invoiceId: string; canPay: boolean }>('get', `/customer/requests/${requestId}/deposit`);
      if (!deposit.canPay) throw new Error('Chưa thể tạo phiên thanh toán cho hợp đồng này.');
      const session = await contractClient<{ id: string; paymentUrl: string }>('post', `/customer/invoices/${deposit.invoiceId}/payment-session`, { method: 'VNPAY' });
      if (!session.paymentUrl) throw new Error('Máy chủ chưa trả đường dẫn thanh toán.');
      sessionStorage.setItem('last_deposit_payment_id', session.id);
      return { ok: true, paymentUrl: session.paymentUrl };
    } catch (error) { return { ok: false, message: apiMessage(error) }; }
  },
  // Other flows remain outside the Flow 1 contract.
  payBalance: (id: string) => contractClient('post', CUSTOMER_ENDPOINTS.BALANCE_PAYMENT(id)),
  confirmAcceptance: (id: string) => contractClient('post', CUSTOMER_ENDPOINTS.ACCEPTANCE(id)),
  raiseComplaint: (_id: string, body: ComplaintInput) => contractClient('post', CUSTOMER_ENDPOINTS.COMPLAINTS, body),
  mockDeposit: async (_id: string) => false,
};
export default customerApi;
