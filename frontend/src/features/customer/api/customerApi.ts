import { apiRequest } from '../../../shared/api/apiRequest';
import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { apiMessage } from '../../../shared/api/apiError';
import type { ComplaintInput, ContractChangeInput, CustomerNotification, CustomerProfile, FileRef, Horse, HorseInput, Place, TransportRequest, TripInfoInput, ContractVersion, DocRecord, Payment } from '../types';
import { city, getCityId, getDefaultCoordinates } from '../hooks/customerRules';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';

export const DEFAULT_FORM_OPTIONS: FormOptions = {
  currency: 'VND',
  preparationDays: 3,
  defaultDepositPct: 30,
  contractDeadlineHours: 24,
  supportedRoutes: [
    { id: 'ROUTE_001', originCountry: 'VN', destinationCountry: 'VN', mode: 'ROAD' },
    { id: 'ROUTE_002', originCountry: 'VN', destinationCountry: 'VN', mode: 'AIR' },
    { id: 'ROUTE_003', originCountry: 'VN', destinationCountry: 'JP', mode: 'AIR' },
  ],
};

const horseBody = (h: HorseInput) => ({
  name: h.name.trim(), breed: h.breed.trim(), sex: h.sex, dob: h.dob,
  microchip: h.microchip.trim(), value: h.value, currency: 'VND', conditions: h.conditions,
  passport: { number: h.passport.number, authority: h.passport.authority, issueDate: h.passport.issueDate, expiryDate: h.passport.expiryDate },
});
type WireRequest = any;
const requestFromWire = (r: any): TransportRequest => {
  const versions: ContractVersion[] = Array.isArray(r?.versions)
    ? r.versions.map((v: any) => ({ ...v, deadlineHistory: Array.isArray(v.deadlineHistory) ? v.deadlineHistory : [] }))
    : [];

  const rawDate = r?.date || r?.expectedTransportDate || r?.expectedDeliveryDate || (r?.createdAt ? String(r.createdAt).slice(0, 10) : '') || '';
  const date = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
  const requestedAt = r?.requestedAt || r?.createdAt || '';
  const status = r?.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : (r?.status || 'DRAFT');

  return {
    ...r,
    id: r?.id || '',
    origin: r?.origin || '',
    destination: r?.destination || '',
    date,
    horseCount: r?.horseCount ?? (Array.isArray(r?.horses) ? r.horses.length : 1),
    pickupAt: r?.pickupAt || r?.expectedTransportDate || '',
    requestedAt,
    submittedAt: r?.submittedAt || r?.createdAt || requestedAt,
    status,
    feedback: r?.feedback || r?.revisionFeedback || '',
    revisionFields: Array.isArray(r?.revisionFields) ? r.revisionFields : [],
    reason: r?.reason || r?.cancellation?.reason || '',
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
    payments: Array.isArray(r?.payments) ? r.payments : [],
    docs: Array.isArray(r?.docs) ? r.docs : [],
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
export type HorseFileType = 'photo' | 'passport' | 'ownership' | 'value-proof';
const DOCUMENT_TYPES: Record<string, string> = { passport: 'PASSPORT', ownership: 'OWNERSHIP', valueProof: 'VALUATION', flu: 'VACCINATION', health: 'HEALTH_CERTIFICATE' };
const contactBody = (p?: Partial<Place>, fallbackCity?: string) => ({
  name: p?.name?.trim() || '',
  address: p?.address?.trim() || '',
  postal: p?.postal?.trim() || '',
  contact: p?.contact?.trim() || '',
  phone: p?.phone?.trim() || '',
  notes: p?.notes?.trim() || '',
  latitude: p?.latitude ?? getDefaultCoordinates(fallbackCity).latitude,
  longitude: p?.longitude ?? getDefaultCoordinates(fallbackCity).longitude,
  cityId: p?.cityId || getCityId(fallbackCity),
});

const routeBody = (r: TripInfoInput | TransportRequest) => ({
  origin: r.origin, destination: r.destination,
  originCountry: city(r.origin).country, destinationCountry: city(r.destination).country,
  pickupAt: r.pickupAt ?? '', mode: city(r.destination).country === 'JP' ? 'AIR' : 'ROAD', date: r.date, careNotes: r.careNotes || '',
});

export const requestBody = (r: TransportRequest) => ({
  ...routeBody(r),
  pickup: contactBody(r.pickup, r.origin),
  delivery: contactBody(r.delivery, r.destination),
  horses: (r.horses || []).filter(Boolean),
  horseNotes: r.horseNotes || {},
});
async function uploadHorseFiles(id: string, h: HorseInput) {
  const files: Array<[HorseFileType, FileRef | undefined]> = [['photo', h.photo], ['passport', h.passport.scan], ['ownership', h.ownership], ['value-proof', h.valueProof]];
  for (const [fileType, ref] of files) {
    if (!ref?.file) continue;
    const form = new FormData(); form.append('file', ref.file);
    await contractClient<FileRef>('post', `/customer/horses/${id}/files/${fileType}`, form);
  }
}
const mapHorse = (h: Horse): Horse => {
  const actualValue = (h as any)._originalValue !== undefined ? (h as any)._originalValue : h.value;
  return {
    ...h,
    color: h.color ?? '',
    fluDate: h.fluDate ?? '',
    conditions: h.conditions ?? '',
    vetName: h.vetName ?? '',
    vetPhone: h.vetPhone ?? '',
    value: actualValue != null ? String(actualValue) : '',
    passport: {
      number: h.passport?.number ?? '',
      authority: h.passport?.authority ?? '',
      issueDate: h.passport?.issueDate ?? '',
      expiryDate: h.passport?.expiryDate ?? '',
      scan: h.passport?.scan,
    },
    ...Object.fromEntries((h.unsupportedFields ?? []).map(key => [key, ''])),
  };
};

export const customerApi = {
  getProfile: () => contractClient<CustomerProfile>('get', '/customer/profile'),
  getHorses: async () => {
    const horses = await contractClient<Horse[]>('get', '/customer/horses');
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
  getSelectableHorses: async (date: string, excludeRequestId?: string, pickupAt?: string) => {
    try {
      return await contractClient<Array<{ id: string; name: string; selectable: boolean; conflict: unknown; documentWarnings: string[] }>>('get', '/customer/horses/selectable', undefined, { date, ...(excludeRequestId ? { excludeRequestId } : {}), ...(pickupAt ? { pickupAt } : {}) });
    } catch {
      return [];
    }
  },
  getRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('get', `/customer/requests/${id}`)),
  getHorse: async (id: string) => {
    const h = await contractClient<Horse>('get', `/customer/horses/${id}`);
    return mapHorse(h);
  },
  getSupportedRoutes: () => contractClient<FormOptions['supportedRoutes']>('get', '/master/supported-routes'),
  getChecklist: (id: string) => contractClient<{ requestId: string; canSubmit: boolean; issues: Array<{ message: string }> }>('get', `/customer/requests/${id}/document-checklist`),
  getNotifications: () => contractClient<CustomerNotification[]>('get', '/customer/notifications'),
  markNotificationRead: (id: string) => contractClient('post', `/customer/notifications/${id}/read`),
  markAllNotificationsRead: () => contractClient('post', '/customer/notifications/read-all'),
  getFormOptions: async (origin?: string, destination?: string, mode?: string): Promise<FormOptions> => {
    try {
      return await contractClient<FormOptions>('get', '/customer/request-form-options', undefined, {
        ...(origin ? { originCountry: city(origin).country } : {}), ...(destination ? { destinationCountry: city(destination).country } : {}),
        ...(mode || destination ? { mode: mode || (city(destination!).country === 'JP' ? 'AIR' : 'ROAD') } : {}),
      });
    } catch {
      return {
        ...DEFAULT_FORM_OPTIONS,
        preparationDays: destination && city(destination).country === 'JP' ? 7 : 3,
      };
    }
  },
  getCities: async (country = 'VN', q = '') => {
    try {
      const res = await contractClient<Array<{ cityId: string; label: string; countryCode: string }>>('get', '/locations/cities', undefined, { country, q });
      if (res && res.length > 0) return res;
    } catch {
      // Fallback
    }
    return [];
  },
  searchLocations: async (address: string, country = 'VN', cityName?: string, cityId?: string) => {
    try {
      const targetCityId = cityId || (cityName ? getCityId(cityName) : undefined);
      const queryParams: Record<string, string> = { q: address, country };
      if (targetCityId) queryParams.cityId = targetCityId;
      const res = await contractClient<Array<{ label: string; point: { latitude: number; longitude: number; countryCode: string } }>>('get', '/locations/search', undefined, queryParams);
      if (res && res.length > 0) return res;
    } catch {
      // Backend /locations/search not found or failed, fallback below
    }

    const q = address.trim();
    const cityUpper = (cityName || '').toLowerCase();

    if (country === 'JP' || cityUpper.includes('tokyo') || cityUpper.includes('chiba') || cityUpper.includes('osaka')) {
      const jpList = [
        { label: 'Tokyo Racecourse, 1-1 Hiyoshicho, Fuchu, Tokyo', point: { latitude: 35.6631, longitude: 139.4831, countryCode: 'JP' } },
        { label: 'Oi Racecourse, 2-1-2 Katsushima, Shinagawa-ku, Tokyo', point: { latitude: 35.5947, longitude: 139.7431, countryCode: 'JP' } },
        { label: 'Nakayama Racecourse, 1-1-1 Kosaku, Funabashi, Chiba', point: { latitude: 35.7272, longitude: 139.9619, countryCode: 'JP' } },
        { label: 'JRA Equestrian Park, Kamiyoga, Setagaya-ku, Tokyo', point: { latitude: 35.6358, longitude: 139.6309, countryCode: 'JP' } },
      ];
      if (!q) return jpList;
      const matched = jpList.filter(item => item.label.toLowerCase().includes(q.toLowerCase()));
      return matched.length > 0 ? matched : [
        { label: `${q}, Fuchu, Tokyo`, point: { latitude: 35.6631, longitude: 139.4831, countryCode: 'JP' } },
        { label: `${q}, Shinagawa-ku, Tokyo`, point: { latitude: 35.5947, longitude: 139.7431, countryCode: 'JP' } },
        { label: `${q}, Funabashi, Chiba`, point: { latitude: 35.7272, longitude: 139.9619, countryCode: 'JP' } },
      ];
    }

    const vnDirectory: Record<string, Array<{ label: string; point: { latitude: number; longitude: number; countryCode: string } }>> = {
      hcmc: [
        { label: 'CLB Cưỡi ngựa Saigon, Phường An Phú, TP. Thủ Đức, TP.HCM', point: { latitude: 10.8015, longitude: 106.7465, countryCode: 'VN' } },
        { label: 'Trường đua Phú Thọ, Phường 15, Quận 11, TP. Hồ Chí Minh', point: { latitude: 10.7686, longitude: 106.6534, countryCode: 'VN' } },
        { label: 'Trang trại ngựa Củ Chi, Xã An Nhơn Tây, Huyện Củ Chi, TP. Hồ Chí Minh', point: { latitude: 11.0825, longitude: 106.4952, countryCode: 'VN' } },
        { label: 'Trung tâm huấn luyện Thủ Thiêm, Phường An Khánh, TP. Thủ Đức, TP.HCM', point: { latitude: 10.7716, longitude: 106.7212, countryCode: 'VN' } },
        { label: 'Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', point: { latitude: 10.7769, longitude: 106.7009, countryCode: 'VN' } },
      ],
      hanoi: [
        { label: 'Trường đua ngựa Sóc Sơn, Xã Tân Minh, Huyện Sóc Sơn, TP. Hà Nội', point: { latitude: 21.2721, longitude: 105.8475, countryCode: 'VN' } },
        { label: 'CLB Cưỡi ngựa Hà Nội, Phường Quảng An, Quận Tây Hồ, TP. Hà Nội', point: { latitude: 21.0664, longitude: 105.8282, countryCode: 'VN' } },
        { label: 'Trang trại ngựa Gia Lâm, Thị trấn Trâu Quỳ, Huyện Gia Lâm, TP. Hà Nội', point: { latitude: 21.0069, longitude: 105.9318, countryCode: 'VN' } },
        { label: 'Khu liên hợp thể thao Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội', point: { latitude: 21.0205, longitude: 105.7642, countryCode: 'VN' } },
      ],
      bd: [
        { label: 'Trường đua Đại Nam, Phường Hiệp An, TP. Thủ Dầu Một, Bình Dương', point: { latitude: 11.0268, longitude: 106.6269, countryCode: 'VN' } },
        { label: 'Trang trại ngựa Dĩ An, Phường Tân Bình, TP. Dĩ An, Bình Dương', point: { latitude: 10.9258, longitude: 106.7685, countryCode: 'VN' } },
        { label: 'CLB Ngựa Bến Cát, Xã An Điền, Thị xã Bến Cát, Bình Dương', point: { latitude: 11.1345, longitude: 106.5824, countryCode: 'VN' } },
      ],
      danang: [
        { label: 'Trung tâm thể thao cưỡi ngựa Hòa Vang, Xã Hòa Khương, Huyện Hòa Vang, TP. Đà Nẵng', point: { latitude: 16.0125, longitude: 108.1458, countryCode: 'VN' } },
        { label: 'Khu liên hợp thể thao Hòa Xuân, Quận Cẩm Lệ, TP. Đà Nẵng', point: { latitude: 15.9984, longitude: 108.2198, countryCode: 'VN' } },
        { label: 'Bạch Đằng, Phường Hải Châu 1, Quận Hải Châu, TP. Đà Nẵng', point: { latitude: 16.0544, longitude: 108.2022, countryCode: 'VN' } },
      ],
    };

    let targetList: Array<{ label: string; point: { latitude: number; longitude: number; countryCode: string } }> = [];
    if (cityUpper.includes('ho chi minh') || cityUpper.includes('hcmc') || cityUpper.includes('sài gòn')) {
      targetList = vnDirectory.hcmc;
    } else if (cityUpper.includes('hanoi') || cityUpper.includes('hà nội')) {
      targetList = vnDirectory.hanoi;
    } else if (cityUpper.includes('binh duong') || cityUpper.includes('bình dương')) {
      targetList = vnDirectory.bd;
    } else if (cityUpper.includes('da nang') || cityUpper.includes('đà nẵng')) {
      targetList = vnDirectory.danang;
    } else {
      targetList = [...vnDirectory.hcmc, ...vnDirectory.hanoi, ...vnDirectory.bd, ...vnDirectory.danang];
    }

    if (!q) return targetList;

    const matched = targetList.filter(item => item.label.toLowerCase().includes(q.toLowerCase()));
    if (matched.length > 0) return matched;

    const basePoint = targetList[0]?.point ?? { latitude: 10.7769, longitude: 106.7009, countryCode: 'VN' };
    const citySuffix = cityName ? `, ${cityName}` : ', TP. Hồ Chí Minh';
    return [
      { label: `${q}${q.includes(cityName || '') ? '' : citySuffix}`, point: basePoint },
      ...targetList.slice(0, 3),
    ];
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
  createRequest: async (body: TripInfoInput, idempotencyKey: string = crypto.randomUUID()) => requestFromWire(await contractClient<WireRequest>('post', '/customer/requests', routeBody(body), undefined, { headers: { 'Idempotency-Key': idempotencyKey } })),
  saveRequest: async (r: TransportRequest) => requestFromWire(await contractClient<WireRequest>('put', `/customer/requests/${r.id}`, requestBody(r))),
  submitRequest: async (id: string, body: TransportRequest) => {
    try {
      let request: TransportRequest;
      if (body.status === 'CHANGES_REQUESTED' && !id.startsWith('TRN-')) {
        request = requestFromWire(await contractClient<WireRequest>('put', `/customer/requests/${id}`, requestBody(body)));
      } else {
        request = requestFromWire(await contractClient<WireRequest>('post', '/customer/requests', requestBody(body), undefined, {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        }));
      }
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
  signContract: (id: string, otp: string, versionNo: number) => contractClient<{ requestId: string; requestStatus: 'AWAITING_DEPOSIT'; tripId: null; tripStatus: null; signedAt: string }>('post', `/customer/contracts/${id}/sign`, { versionNo, otp }),
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
};
export default customerApi;
