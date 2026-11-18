import { apiRequest } from '../../../shared/api/core/apiRequest';
import { contractClient, withRouteList, type FormOptions } from '../../../shared/api/contracts/contractClient';
import { apiMessage } from '../../../shared/api/core/apiError';
import type { ComplaintInput, ContractChangeInput, CustomerNotification, CustomerProfile, FileRef, Horse, HorseInput, Place, TransportRequest, TripInfoInput, ContractVersion, Payment } from '../types';
import { city, registerBackendCity } from '../hooks/customerRules';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';
import { attachContractFeedback, contractFromWire, documentKey, fileFromWire, paymentFromWire, refundFromWire, utcMs, type WirePayment, type WireHorse, type WireContract } from '../../../shared/api/contracts';

const horseBody = (h: HorseInput) => ({
  name: h.name.trim(), breed: h.breed.trim(), sex: h.sex, dob: h.dob,
  microchip: h.microchip.trim(), value: h.value.trim(), currency: 'VND', healthNotes: h.conditions || '',
  ...(h.reproductiveStatus != null ? { reproductiveStatus: h.reproductiveStatus } : {}),
  ...(h.weight != null ? { weight: h.weight } : {}),
  passport: { number: h.passport.number, authority: h.passport.authority, issueDate: h.passport.issueDate, expiryDate: h.passport.expiryDate },
});
type WireRequest = any;
export const requestFromWire = (r: any): TransportRequest => {
  const origin = r?.pickup?.cityName || r?.origin || '';
  const destination = r?.delivery?.cityName || r?.destination || '';
  if (r?.pickup?.cityName && r?.originCountry) registerBackendCity(origin, r.originCountry);
  if (r?.delivery?.cityName && r?.destinationCountry) registerBackendCity(destination, r.destinationCountry);
  const versions: ContractVersion[] = attachContractFeedback(Array.isArray(r?.versions)
    ? r.versions.map((v: WireContract) => contractFromWire(v) as ContractVersion)
    : [], r?.contractFeedback);

  const rawDate = r?.expectedDeliveryDate || '';
  const date = rawDate.length >= 0 ? rawDate.slice(0, 10) : rawDate;
  const requestedAt = r?.requestedAt || r?.createdAt || '';
  const status = r?.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : (r?.status || 'DRAFT');

  return {
    ...r,
    id: r?.id || '',
    origin,
    destination,
    date,
    horseCount: r?.horseCount ?? (Array.isArray(r?.horses) ? r.horses.length : 1),
    pickupAt: r?.pickupAt || r?.expectedTransportDate || '',
    requestedAt,
    submittedAt: r?.submittedAt || r?.createdAt || requestedAt,
    status,
    feedback: r?.feedback || r?.revisionFeedback || '',
    revisionFields: Array.isArray(r?.revisionFields) ? r.revisionFields : undefined,
    reason: r?.reason || r?.rejectionReason || r?.cancellation?.reason || '',
    careNotes: r?.careNotes || r?.careInstructions || '',
    pickup: {
      name: r?.pickup?.name || '',
      address: r?.pickup?.address || r?.origin || '',
      contact: r?.pickup?.contact || '',
      phone: r?.pickup?.phone || '',
      postal: r?.pickup?.postal || '',
      notes: r?.pickup?.notes || '',
      cityId: r?.pickup?.cityId || undefined,
      cityName: r?.pickup?.cityName || undefined,
      latitude: r?.pickup?.latitude ?? undefined,
      longitude: r?.pickup?.longitude ?? undefined,
    },
    delivery: {
      name: r?.delivery?.name || '',
      address: r?.delivery?.address || r?.destination || '',
      contact: r?.delivery?.contact || '',
      phone: r?.delivery?.phone || '',
      email: r?.delivery?.email || '',
      postal: r?.delivery?.postal || '',
      notes: r?.delivery?.notes || '',
      cityId: r?.delivery?.cityId || undefined,
      cityName: r?.delivery?.cityName || undefined,
      latitude: r?.delivery?.latitude ?? undefined,
      longitude: r?.delivery?.longitude ?? undefined,
    },
    horses: Array.isArray(r?.horses) ? r.horses.filter(Boolean) : [],
    horseNotes: r?.horseNotes || {},
    wizardStep: r?.wizardStep ?? (Array.isArray(r?.horses) && r.horses.length ? 3 : 1),
    revisions: Array.isArray(r?.revisions) ? r.revisions : [],
    versions,
    refund: r?.refund?.refundStatus ? refundFromWire(r.refund) : r?.refund ?? undefined,
    payments: Array.isArray(r?.payments) ? r.payments.map((p: any) => ({
      ...p,
      type: 'DEPOSIT', contractId: p.contractId,
      versionNo: p.versionNo, confirmedAmount: p.receivedAmount ?? 0,
      status: p.paymentOutcome === 'UNCONFIRMED' || p.status === 'PENDING_GATEWAY' || p.status === 'REVIEW_REQUIRED' ? 'PROCESSING' : p.paymentOutcome ?? p.status,
      createdAt: p.createdAt ?? '', confirmedAt: p.paidAt, qrExpiresAtMs: utcMs(p.expiresAt),
    })) : [],
    docs: Array.isArray(r?.docs) ? r.docs.map((d: any) => ({ ...d, key: documentKey(d.key), file: fileFromWire(d.file, documentKey(d.key)) })) : [],
    supplements: Array.isArray(r?.supplements) ? r.supplements : [],
    companyDocs: Array.isArray(r?.companyDocs) ? r.companyDocs : [],
    complaints: Array.isArray(r?.complaints) ? r.complaints : [],
    history: Array.isArray(r?.history) ? r.history : [],
    cancelRequest: r?.cancellation ? {
      at: r.cancellation.requestedAt || '',
      reason: r.cancellation.reason || '',
      prevStatus: r.cancellation.previousStatus || 'DRAFT',
    } : undefined,
  };
};
export interface PaymentSession { id: string; invoiceId: string; amount: number; currency: 'VND'; method: 'VNPAY'; status: string; paymentUrl: string; expiresAt: string }
export const toContractId = (id: string): string => {
  if (!id || typeof id !== 'string') return id;
  return id.replace(/^([A-Z_]+)-(\d+)$/, (_, prefix, num) => `${prefix}_${num.padStart(3, '0')}`);
};
export const toHorseContractId = (id: string): string => {
  if (!id || typeof id !== 'string') return id;
  const trimmed = id.trim();
  if (/^HORSE_\d{3,}$/.test(trimmed)) return trimmed;
  const contract = toContractId(trimmed);
  if (/^HORSE_\d{3,}$/.test(contract)) return contract;
  if (/^HOR_\d{3,}$/.test(contract)) return contract.replace(/^HOR_/, 'HORSE_');
  const numMatch = trimmed.match(/\d+/);
  if (numMatch) return `HORSE_${numMatch[0].padStart(3, '0')}`;
  return trimmed;
};

export type HorseFileType = 'photo' | 'passport' | 'ownership' | 'value-proof' | 'flu' | 'health';
const DOCUMENT_FILE_TYPES: Record<string, HorseFileType> = { passport: 'passport', ownership: 'ownership', valueProof: 'value-proof', flu: 'flu', health: 'health' };

const contactBody = (p?: Partial<Place>, fallbackCity?: string, isDelivery = false) => {
  void fallbackCity;
  const body: Record<string, any> = {
    name: p?.name?.trim() || '',
    address: p?.address?.trim() || '',
    postal: p?.postal?.trim() || '',
    contact: p?.contact?.trim() || '',
    phone: p?.phone?.trim() || '',
    notes: p?.notes?.trim() || '',
    cityId: p?.cityId || '',
    latitude: p?.latitude,
    longitude: p?.longitude,
  };
  if (isDelivery && p?.email?.trim()) {
    body.email = p.email.trim();
  }
  return body;
};

const routeBody = (r: TripInfoInput | TransportRequest) => ({
  origin: r.origin, destination: r.destination,
  originCountry: city(r.origin).country, destinationCountry: city(r.destination).country,
  expectedTransportDate: r.pickupAt ?? '', mode: r.mode || (city(r.destination).country === 'JP' ? 'AIR' : 'ROAD'), expectedDeliveryDate: r.date, careInstructions: r.careNotes || '',
});

export const requestBody = (r: TransportRequest) => ({
  ...routeBody(r),
  ...(r.purpose != null ? { purpose: r.purpose } : {}),
  pickup: contactBody(r.pickup, r.origin, false),
  delivery: contactBody(r.delivery, r.destination, true),
  horses: (r.horses || []).filter(Boolean).map(toHorseContractId),
  horseNotes: Object.fromEntries(
    Object.entries(r.horseNotes || {})
      .filter(([id, v]) => r.horses.includes(id) && typeof v === 'string')
      .map(([k, v]) => [toHorseContractId(k), v])
  ),
});
async function uploadHorseFiles(id: string, h: HorseInput) {
  const files: Array<[HorseFileType, FileRef | undefined]> = [
    ['photo', h.photo],
    ['passport', h.passport.scan],
    ['ownership', h.ownership],
    ['value-proof', h.valueProof],
    ['flu', h.flu],
    ['health', h.health],
  ];
  for (const [fileType, ref] of files) {
    if (!ref?.file) continue;
    const form = new FormData(); form.append('file', ref.file);
    await contractClient<FileRef>('post', `/customer/horses/${id}/files/${fileType}`, form);
  }
}
const mapHorse = (h: WireHorse): Horse => {
  return {
    ...h,
    breed: h.breed ?? '', sex: (h.sex ?? '') as Horse['sex'], dob: h.dob ?? '',
    color: '', fluDate: '', vetName: '', vetPhone: '', conditions: h.healthNotes ?? '',
    unsupportedFields: ['color', 'fluDate', 'vetName', 'vetPhone'],
    value: h.value != null ? String(h.value) : '',
    photo: fileFromWire(h.photo, 'Ảnh ngựa'), ownership: fileFromWire(h.ownership, 'Giấy sở hữu'),
    valueProof: fileFromWire(h.valueProof, 'Chứng từ định giá'),
    flu: fileFromWire((h as any).flu, 'Sổ tiêm ngừa'),
    health: fileFromWire((h as any).health, 'Giấy chứng nhận sức khỏe'),
    reproductiveStatus: h.reproductiveStatus as Horse['reproductiveStatus'],
    passport: {
      number: h.passport?.number ?? '',
      authority: h.passport?.authority ?? '',
      issueDate: h.passport?.issueDate ?? '',
      expiryDate: h.passport?.expiryDate ?? '',
      scan: fileFromWire(h.passport?.scan, 'Hộ chiếu'),
    },
  };
};

export const customerApi = {
  uploadHorseFile: (id: string, type: HorseFileType, file: File) => {
    const form = new FormData(); form.append('file', file);
    return contractClient<FileRef>('post', `/customer/horses/${id}/files/${type}`, form);
  },
  getProfile: async (): Promise<CustomerProfile> => {
    const p = await contractClient<{ id: string; fullName: string; email: string; phone: string }>('get', '/customer/profile');
    return { ...p, name: p.fullName, company: '', initials: p.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(-2) };
  },
  getHorses: async () => {
    const horses = await contractClient<WireHorse[]>('get', '/customer/horses');
    return (horses || []).map(mapHorse);
  },
  getRequests: async () => {
    const raw = await contractClient<WireRequest[]>('get', '/customer/requests');
    const requests = (Array.isArray(raw) ? raw : []).map(requestFromWire);
    return requests.map(r => {
      if (r.status !== 'DRAFT') return r;
      try {
        const saved = JSON.parse(sessionStorage.getItem(`flow1-progress:${r.id}`) || 'null');
        if (saved && saved.horseCount >= 1 && saved.horseCount <= 6) return { ...r, horseCount: Math.max(saved.horseCount, r.horses.length), horses: Array.from({ length: Math.max(saved.horseCount, r.horses.length) }, (_, i) => r.horses[i] || ''), wizardStep: saved.wizardStep ?? r.wizardStep };
      } catch { /* Invalid UI metadata must not affect server data. */ }
      return { ...r, horseCount: Math.max(1, r.horses.length), horses: r.horses.length ? r.horses : [''] };
    });
  },
  getSelectableHorses: (date: string, pickupAt?: string) =>
    contractClient<Array<{ id: string; name: string; selectable: boolean; conflict: { code: string } | null; availabilityStatus?: string; documentWarnings: string[] }>>('get', '/customer/horses/selectable', undefined,
      { expectedTransportDate: pickupAt || date, expectedDeliveryDate: date }),
  getRequest: async (id: string) => {
    const request = requestFromWire(await contractClient<WireRequest>('get', `/customer/requests/${id}`));
    if (request.versions.length) {
      const deposit = await customerApi.getDeposit(id);
      request.payments = deposit.transactions.map(p => ({ ...p, type: 'DEPOSIT', confirmedAmount: p.receivedAmount ?? 0, createdAt: '', confirmedAt: p.paidAt, qrExpiresAtMs: utcMs((p as { expiresAt?: string }).expiresAt) } as Payment));
    }
    return request;
  },
  getHorse: async (id: string) => {
    const h = await contractClient<WireHorse>('get', `/customer/horses/${id}`);
    return mapHorse(h);
  },
  getSupportedRoutes: () => contractClient<FormOptions['supportedRoutes']>('get', '/master/supported-routes'),
  getChecklist: (id: string) => contractClient<{ requestId: string; horses: Array<{ horseId: string; documents: Array<{ key: string; scope: string; required: boolean; status: string; file?: { url: string } }>; medical: Array<{ id: string; type: string; status: string; expiryDate?: string }> }> }>('get', `/customer/requests/${id}/document-checklist`),
  getNotifications: () => contractClient<CustomerNotification[]>('get', '/customer/notifications'),
  markNotificationRead: (id: string) => contractClient('post', `/customer/notifications/${id}/read`),
  markAllNotificationsRead: () => contractClient('post', '/customer/notifications/read-all'),
  getFormOptions: async (origin?: string, destination?: string, mode?: string): Promise<FormOptions> => {
    return withRouteList(await contractClient<FormOptions>('get', '/customer/request-form-options', undefined, {
      ...(origin ? { originCountry: city(origin).country } : {}), ...(destination ? { destinationCountry: city(destination).country } : {}),
      ...(mode || destination ? { mode: mode || (city(destination!).country === 'JP' ? 'AIR' : 'ROAD') } : {}),
    }));
  },
  getCities: async (country = 'VN', q = '') => {
    const res = await contractClient<Array<{ cityId: string; label: string; countryCode: string }>>('get', '/locations/cities', undefined, { country, q });
    return res && res.length > 0 ? res : [];
  },
  searchLocations: async (address: string, country = 'VN', _cityName?: string, cityId?: string) => {
    const queryParams: Record<string, string> = { q: address, country };
    if (cityId) queryParams.cityId = cityId;
    return contractClient<Array<{ label: string; point: { latitude: number; longitude: number; countryCode: string } }>>('get', '/locations/search', undefined, queryParams);
  },
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
  createRequest: async (body: TransportRequest, idempotencyKey: string = crypto.randomUUID()) => requestFromWire(await contractClient<WireRequest>('post', '/customer/requests', requestBody(body), undefined, { headers: { 'Idempotency-Key': idempotencyKey } })),
  saveRequest: async (r: TransportRequest) => requestFromWire(await contractClient<WireRequest>('put', `/customer/requests/${r.id}`, requestBody(r))),
  submitRequest: async (id: string, body: TransportRequest) => {
    try {
      let request: TransportRequest;
      if (body.status === 'CHANGES_REQUESTED') {
        request = requestFromWire(await contractClient<WireRequest>('put', `/customer/requests/${id}`, requestBody(body)));
      } else {
        const storageKey = `flow1-submit:${id}`;
        const fingerprint = JSON.stringify(requestBody(body));
        const previous = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
        sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
        request = await customerApi.createRequest(body, key);
        sessionStorage.removeItem(storageKey);
      }
      return { ok: true, requestId: request.id, request };
    } catch (error) { return { ok: false, message: apiMessage(error) }; }
  },
  cancelRequest: (id: string, reason: string) => contractClient<{ requestStatus: TransportRequest['status'] }>('post', `/customer/requests/${id}/cancel`, { reason }),
  uploadDocument: async (_requestId: string, key: string, scope: string, file: FileRef) => {
    if (!file.file) throw new Error('Chọn tệp thật từ máy trước khi tải lên.');
    const fileType = DOCUMENT_FILE_TYPES[key];
    if (!fileType) throw new Error('Loại giấy tờ không có trong contract Flow 1.');
    const saved = await customerApi.uploadHorseFile(toContractId(scope), fileType, file.file);
    return { file: saved };
  },
  getContractVersion: async (contractId: string, versionNo: number) => contractFromWire(await contractClient<WireContract>('get', `/customer/contracts/${contractId}/versions/${versionNo}`)) as ContractVersion,
  getDeposit: (requestId: string) => contractClient<{ invoiceId: string; canPay: boolean; transactions: Array<Payment & { receivedAmount?: number; paidAt?: string }> }>('get', `/customer/requests/${requestId}/deposit`),
  createPaymentSession: (invoiceId: string) => contractClient<PaymentSession>('post', `/customer/invoices/${invoiceId}/payment-session`, { method: 'VNPAY' }),
  getPayment: async (paymentId: string, refresh = false) => paymentFromWire(await contractClient<WirePayment>('get', `/customer/payments/${paymentId}`, undefined, refresh ? { refresh: true } : undefined)) as Payment,
  getContract: async (requestId: string) => {
    const result = await contractClient<{ currentVersion: WireContract | null }>('get', `/customer/requests/${requestId}/contract`);
    return { ...result, currentVersion: result.currentVersion ? contractFromWire(result.currentVersion) as ContractVersion : null };
  },
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
  // Flow 3: Customer relocation consent
  getPickupRelocation: (tripId: string) =>
    contractClient<any>('get', CUSTOMER_ENDPOINTS.PICKUP_RELOCATION(tripId)),
  decidePickupRelocation: (tripId: string, body: { relocationId: string; proposalVersion: number; decision: 'ACCEPT' | 'REJECT'; note: string; acknowledged: boolean }) =>
    contractClient<any>('post', CUSTOMER_ENDPOINTS.PICKUP_RELOCATION_DECISION(tripId), body),
  // Flow 5: Pickup Access Exception Decision
  getPickupAccessStatus: (tripId: string) =>
    apiRequest<any>('get', `/customer/trips/${tripId}/pickup-access-status`),
  decidePickupAccess: (tripId: string, body: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    apiRequest<any>('post', `/customer/trips/${tripId}/pickup-access-decision`, body),
};
export default customerApi;
