import { apiRequest } from '../../../shared/api/apiRequest';
import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { apiMessage } from '../../../shared/api/apiError';
import { flow2Api } from '../../../shared/api/flow2Api';
import type { ComplaintInput, ContractChangeInput, CustomerNotification, CustomerProfile, FileRef, Horse, HorseInput, TransportRequest, TripInfoInput, ContractVersion, DocRecord, Payment } from '../types';
import { city } from '../hooks/customerRules';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';
const horseBody = (h: HorseInput) => {
  let conditions = (h.conditions || '').trim();
  if (h.color?.trim() && !conditions.includes('[Màu lông:')) {
    conditions = conditions ? `${conditions}\n[Màu lông: ${h.color.trim()}]` : `[Màu lông: ${h.color.trim()}]`;
  }
  return {
    name: h.name.trim(), breed: h.breed.trim(), sex: h.sex, dob: h.dob,
    microchip: h.microchip.trim(), value: h.value, currency: 'VND', conditions,
    passport: { number: h.passport.number, authority: h.passport.authority, issueDate: h.passport.issueDate, expiryDate: h.passport.expiryDate },
  };
};
type WireRequest = Omit<TransportRequest, 'history' | 'revisions' | 'status'> & { status: TransportRequest['status'] | 'IN_PROGRESS' };
const requestFromWire = (r: WireRequest): TransportRequest => ({ ...r,
  status: r.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : r.status,
  // Compatibility-only UI collections: Flow 1 no longer returns or accepts audit timelines.
  history: [], revisions: [], versions: r.versions.map(v => ({ ...v, deadlineHistory: [] })),
});
export interface PaymentSession { id: string; invoiceId: string; amount: number; currency: 'VND'; method: 'VNPAY'; status: string; paymentUrl: string; expiresAt: string }
export type HorseFileType = 'photo' | 'passport' | 'ownership' | 'value-proof';
const DOCUMENT_TYPES: Record<string, string> = { passport: 'PASSPORT', ownership: 'OWNERSHIP', valueProof: 'VALUATION', flu: 'VACCINATION', health: 'HEALTH_CERTIFICATE' };
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
  const files: Array<[HorseFileType, FileRef | undefined]> = [['photo', h.photo], ['passport', h.passport.scan], ['ownership', h.ownership], ['value-proof', h.valueProof]];
  for (const [fileType, ref] of files) {
    if (!ref?.file) continue;
    const form = new FormData(); form.append('file', ref.file);
    await contractClient<FileRef>('post', `/customer/horses/${id}/files/${fileType}`, form);
  }
}
export const customerApi = {
  getProfile: () => contractClient<CustomerProfile>('get', '/customer/profile'),
  getHorses: async () => {
    const horses = await contractClient<Horse[]>('get', '/customer/horses');
    return horses.map(h => {
      const unsupported = (h.unsupportedFields ?? []).filter(key => key !== 'color');
      let color = h.color || '';
      if (!color && h.conditions?.includes('[Màu lông:')) {
        const m = h.conditions.match(/\[Màu lông:\s*([^\]]+)\]/);
        if (m) color = m[1].trim();
      }
      return { ...h, ...Object.fromEntries(unsupported.map(key => [key, ''])), color, unsupportedFields: unsupported };
    });
  },
  getRequests: async () => {
    const requests = (await contractClient<WireRequest[]>('get', '/customer/requests')).map(requestFromWire);
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
  getRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('get', `/customer/requests/${id}`)),
  getHorse: async (id: string) => {
    const h = await contractClient<Horse>('get', `/customer/horses/${id}`);
    const unsupported = (h.unsupportedFields ?? []).filter(key => key !== 'color');
    let color = h.color || '';
    if (!color && h.conditions?.includes('[Màu lông:')) {
      const m = h.conditions.match(/\[Màu lông:\s*([^\]]+)\]/);
      if (m) color = m[1].trim();
    }
    return { ...h, color, unsupportedFields: unsupported };
  },
  getSupportedRoutes: () => contractClient<FormOptions['supportedRoutes']>('get', '/master/supported-routes'),
  getChecklist: (id: string) => contractClient<{ requestId: string; canSubmit: boolean; issues: Array<{ message: string }> }>('get', `/customer/requests/${id}/document-checklist`),
  getNotifications: () => contractClient<CustomerNotification[]>('get', '/customer/notifications'),
  markNotificationRead: (id: string) => contractClient('post', `/customer/notifications/${id}/read`),
  markAllNotificationsRead: () => contractClient('post', '/customer/notifications/read-all'),
  getFormOptions: (origin?: string, destination?: string, mode?: string) => contractClient<FormOptions>('get', '/customer/request-form-options', undefined, {
    ...(origin ? { originCountry: city(origin).country } : {}), ...(destination ? { destinationCountry: city(destination).country } : {}),
    ...(mode || destination ? { mode: mode || (city(destination!).country === 'JP' ? 'AIR' : 'ROAD') } : {}),
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
  createRequest: async (body: TripInfoInput, idempotencyKey: string = crypto.randomUUID()) => requestFromWire(await contractClient<WireRequest>('post', '/customer/requests', routeBody(body), undefined, { headers: { 'Idempotency-Key': idempotencyKey } })),
  saveRequest: async (r: TransportRequest) => requestFromWire(await contractClient<WireRequest>('put', `/customer/requests/${r.id}`, requestBody(r))),
  submitRequest: async (id: string, body: TransportRequest) => {
    try {
      await customerApi.saveRequest(body);
      const checklist = await contractClient<{ canSubmit: boolean; issues: Array<{ message: string }> }>('get', `/customer/requests/${id}/document-checklist`);
      if (!checklist.canSubmit) throw new Error(checklist.issues[0]?.message || 'Hồ sơ chưa đủ điều kiện gửi.');
      const request = requestFromWire(await contractClient<WireRequest>('post', `/customer/requests/${id}/submit`));
      return { ok: true, requestId: request.id, request };
    } catch (error) { return { ok: false, message: apiMessage(error) }; }
  },
  cancelRequest: (id: string, reason: string) => contractClient<{ requestStatus: TransportRequest['status'] }>('post', `/customer/requests/${id}/cancel`, { reason }),
  uploadDocument: async (requestId: string, key: string, scope: string, file: FileRef, expiryDate?: string) => {
    if (!file.file) throw new Error('Chọn tệp thật từ máy trước khi tải lên.');
    const documentType = DOCUMENT_TYPES[key];
    if (!documentType) throw new Error('Loại giấy tờ không có trong contract Flow 1.');
    if (scope === 'request') throw new Error('Contract Flow 1 chưa có API nộp giấy tờ chung.');
    const data = new FormData(); data.append('file', file.file); data.append('documentType', documentType);
    if (expiryDate) data.append('expiryDate', expiryDate);
    return contractClient<DocRecord>('post', `/customer/requests/${requestId}/horses/${scope}/documents`, data);
  },
  getContractVersion: (contractId: string, versionNo: number) => contractClient<ContractVersion>('get', `/customer/contracts/${contractId}/versions/${versionNo}`),
  getDeposit: (requestId: string) => contractClient<{ invoiceId: string; canPay: boolean }>('get', `/customer/requests/${requestId}/deposit`),
  createPaymentSession: (invoiceId: string) => contractClient<PaymentSession>('post', `/customer/invoices/${invoiceId}/payment-session`, { method: 'VNPAY' }),
  getPayment: (paymentId: string) => contractClient<Payment>('get', `/customer/payments/${paymentId}`),
  getContract: (requestId: string) => contractClient<{ currentVersion: ContractVersion | null }>('get', `/customer/requests/${requestId}/contract`),
  acceptTerms: (id: string, versionNo: number) => contractClient<{ termsAcceptedAt: string }>('post', `/customer/contracts/${id}/accept-terms`, { versionNo }),
  requestContractChange: (id: string, body: ContractChangeInput, versionNo: number) => contractClient('post', `/customer/contracts/${id}/feedback`, {
    versionNo, text: [body.text, body.proposedDate && `Ngày đề xuất: ${body.proposedDate}`, body.proposedNotes, body.commercial, body.other].filter(Boolean).join('\n'),
  }),
  sendSignOtp: (id: string, versionNo: number) => contractClient<{ expiresInSeconds: number; resendAfterSeconds: number; sentTo: string }>('post', `/customer/contracts/${id}/sign-otp`, { versionNo }),
  signContract: (id: string, otp: string, versionNo: number) => contractClient<{ requestId: string; requestStatus: 'ACTIVATED'; tripId: string; tripStatus: 'PLANNING'; signedAt: string }>('post', `/customer/contracts/${id}/sign`, { versionNo, otp }),
  payDeposit: async (requestId: string) => {
    try {
      const deposit = await customerApi.getDeposit(requestId);
      if (!deposit.canPay) throw new Error('Chưa thể tạo phiên thanh toán cho hợp đồng này.');
      const session = await customerApi.createPaymentSession(deposit.invoiceId);
      if (!session.paymentUrl) throw new Error('Máy chủ chưa trả đường dẫn thanh toán.');
      sessionStorage.setItem('last_deposit_payment_id', session.id);
      return { ok: true, paymentUrl: session.paymentUrl };
    } catch (error) { return { ok: false, message: apiMessage(error) }; }
  },
  // Other flows remain outside the Flow 1 contract.
  payBalance: (id: string) => apiRequest('post', CUSTOMER_ENDPOINTS.BALANCE_PAYMENT(id)),
  confirmAcceptance: (id: string) => apiRequest('post', CUSTOMER_ENDPOINTS.ACCEPTANCE(id)),
  raiseComplaint: (_id: string, body: ComplaintInput) => apiRequest('post', CUSTOMER_ENDPOINTS.COMPLAINTS, body),
  mockDeposit: async (_id: string) => false,

  // ==========================================================================
  // Flow 2 Integration (Hồ sơ bổ sung & Kiểm dịch)
  // ==========================================================================
  /** F2: Danh sách yêu cầu bổ sung hồ sơ cho đơn vận chuyển */
  getSupplements: (requestId: string) => flow2Api.getCustomerSupplements(requestId),

  /** F2: Tải lên chứng từ phản hồi yêu cầu bổ sung */
  uploadSupplementDocument: async (requestId: string, supplementId: string, file: File) => {
    const data = new FormData();
    data.append('file', file);
    return apiRequest('post', CUSTOMER_ENDPOINTS.SUPPLEMENT_DOCUMENT(requestId, supplementId), data);
  },

  /** F2: Xác nhận hoàn tất bổ sung hồ sơ */
  submitSupplement: (requestId: string, supplementId: string) =>
    apiRequest('post', CUSTOMER_ENDPOINTS.SUPPLEMENT_SUBMIT(requestId, supplementId)),
};
export default customerApi;

