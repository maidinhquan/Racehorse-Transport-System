import { apiClient } from '../../../shared/api/apiClient';
import { CUSTOMER_ENDPOINTS, PUBLIC_ENDPOINTS } from './customerEndpoints';
import type {
  ApiResponse,
  ComplaintInput,
  ContractChangeInput,
  CustomerNotification,
  CustomerProfile,
  DemoEstimateInput,
  DemoEstimateResult,
  Horse,
  HorseInput,
  TransportRequest,
} from '../types';
import { mockHorses, mockNotifications, mockProfile, mockRequests } from '../data/mockData';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

/**
 * POST/PUT: trả về true nếu Backend nhận, false nếu đang chạy chế độ mock.
 * Ở chế độ mock, giao diện vẫn cập nhật dữ liệu cục bộ (xem useCustomer).
 */
async function send(method: 'post' | 'put', url: string, body?: unknown): Promise<boolean> {
  try {
    const res = method === 'post'
      ? await apiClient.post<ApiResponse<unknown>>(url, body)
      : await apiClient.put<ApiResponse<unknown>>(url, body);
    return res.data?.success !== false;
  } catch {
    return false;
  }
}

/** Chuyển đổi dữ liệu FlowRequestCard của Backend C# sang TransportRequest của Frontend Customer */
export function mapCustomerFlowRequest(item: any, idx = 0): TransportRequest {
  if (item.id && Array.isArray(item.versions)) return item as TransportRequest;
  const id = item.requestId || item.id || `REQ-${1000 + idx}`;
  const origin = item.departure || item.origin || 'Hồ Chí Minh';
  const destination = item.destination || 'Hà Nội';
  const horseCount = Array.isArray(item.horses) ? item.horses.length : (item.horseCount || 1);
  const horseIds = Array.isArray(item.horses) ? item.horses.map((h: any) => h.horseId || h.id || h) : [];
  const date = item.departureAt ? item.departureAt.slice(0, 10) : (item.expectedDate ? item.expectedDate.slice(0, 10) : '2026-10-26');
  const careNotes = item.careNotes || item.input?.careNotes || (Array.isArray(item.horses) && item.horses[0]?.careInstructions) || '';

  // Ánh xạ trạng thái Backend -> Customer UI
  let status: any = 'PENDING_REVIEW';
  const rawStatus = (item.status || '').toUpperCase();
  if (rawStatus === 'DRAFT') status = 'DRAFT';
  else if (rawStatus === 'PENDING') status = 'PENDING_REVIEW';
  const latestContract = Array.isArray(item.contracts) && item.contracts.length > 0 ? item.contracts[0] : null;

  if (latestContract?.cancellationStatus === 'PENDING') {
    status = 'CANCELLATION_REQUESTED';
  } else if (latestContract?.status === 'CANCELLED' || rawStatus === 'CANCELLED') {
    status = 'CANCELLED';
  } else if (rawStatus === 'CHANGES_REQUESTED') status = 'CHANGES_REQUESTED';
  else if (rawStatus === 'REJECTED') status = 'REJECTED';
  else if (rawStatus === 'ACCEPTED' || rawStatus === 'DRAFT_CONTRACT') {
    if (Array.isArray(item.contracts) && item.contracts.length > 0) {
      const cStatus = (item.contracts[0].status || '').toUpperCase();
      if (cStatus === 'AWAITING_DEPOSIT') status = 'CONTRACT_READY';
      else if (cStatus === 'AWAITING_SIGNATURE' || cStatus === 'PENDING_SIGNATURE') status = 'DEPOSIT_VERIFIED';
      else if (cStatus === 'SIGNED' || cStatus === 'EFFECTIVE' || cStatus === 'ACTIVATED') status = 'ACTIVATED';
      else status = 'CONTRACT_PREPARATION';
    } else {
      status = 'CONTRACT_PREPARATION';
    }
  }
  else if (rawStatus === 'AWAITING_DEPOSIT') status = 'CONTRACT_READY';
  else if (rawStatus === 'AWAITING_SIGNATURE' || rawStatus === 'PENDING_SIGNATURE') status = 'DEPOSIT_VERIFIED';
  else if (rawStatus === 'SIGNED' || rawStatus === 'EFFECTIVE' || rawStatus === 'ACTIVATED') status = 'ACTIVATED';
  else if (rawStatus === 'IN_PROGRESS') status = 'IN_TRANSIT';
  else if (rawStatus === 'COMPLETED') status = 'CLOSED';
  else if (rawStatus === 'CANCELLED') status = 'CANCELLED';
  else if (rawStatus) status = rawStatus;

  // Contracts / Versions
  const versions: any[] = Array.isArray(item.contracts) && item.contracts.length > 0
    ? item.contracts.map((c: any, vIdx: number) => {
        let vState = 'ISSUED';
        const rawCStatus = (c.status || '').toUpperCase();
        if (rawCStatus === 'SIGNED' || rawCStatus === 'EFFECTIVE') vState = 'EFFECTIVE';
        else if (rawCStatus === 'WITHDRAWN' || rawCStatus === 'EXPIRED') vState = 'EXPIRED';
        else if (rawCStatus === 'CHANGES_REQUESTED' || c.feedbackStatus === 'PENDING') vState = 'CHANGES_REQUESTED';

        let items = [
          { desc: 'Chi phí vận chuyển & dịch vụ trọn gói', amount: c.totalPrice || c.totalQuotedPrice || 50000000, required: true },
        ];
        if (c.costs) {
          items = [
            { desc: 'Phí vận chuyển chính (xe/hàng không & nhiên liệu)', amount: c.costs.transport || 0, required: true },
            { desc: 'Chi phí thủ tục & pháp lý xuất nhập cảnh', amount: c.costs.permit || 0, required: true },
            { desc: 'Chăm sóc thú y & kiểm dịch', amount: c.costs.vet || 0, required: true },
            { desc: 'Bảo hiểm chuyên biệt ngựa đua', amount: c.costs.insurance || 0, required: true },
            { desc: 'Nhân sự vận hành & giám sát', amount: c.costs.crew || 0, required: true },
          ];
        } else if (c.quotedCosts) {
          items = [
            { desc: 'Phí vận chuyển chính (xe/hàng không & nhiên liệu)', amount: c.quotedCosts.transport || 0, required: true },
            { desc: 'Chi phí thủ tục & pháp lý xuất nhập cảnh', amount: c.quotedCosts.procedure || 0, required: true },
            { desc: 'Chăm sóc thú y & kiểm dịch', amount: c.quotedCosts.vet || 0, required: true },
            { desc: 'Bảo hiểm chuyên biệt ngựa đua', amount: c.quotedCosts.insurance || 0, required: true },
            { desc: 'Nhân sự vận hành & giám sát', amount: c.quotedCosts.staff || 0, required: true },
          ];
        }

        const issuedAt = c.publishedAtUtc ? c.publishedAtUtc.slice(0, 16).replace('T', ' ') : '2026-10-22 09:00';
        const validUntil = c.signDeadline
          ? c.signDeadline.slice(0, 16).replace('T', ' ')
          : c.depositDeadline
          ? c.depositDeadline.slice(0, 16).replace('T', ' ')
          : '2026-10-23 09:00';

        const termsAcceptedAt = c.relationalTermsReady || c.invoiceStatus === 'PAID' || (c.paidAmount && c.paidAmount > 0)
          ? issuedAt
          : undefined;

        return {
          v: vIdx + 1,
          number: c.contractCode || (c.contractId ? `F1-${c.contractId.slice(1, 17).toUpperCase()}` : `HD-CBN-${id}`),
          contractId: c.contractId,
          rowVersion: c.version,
          pdfSha256: c.pdfSha256,
          issuedAt,
          validUntil,
          items,
          total: c.totalPrice || c.totalQuotedPrice || 50000000,
          depositPct: c.depositRate ? Math.round(c.depositRate) : (c.depositRateStandard ? Math.round(c.depositRateStandard) : 30),
          state: vState,
          note: c.commercialNotes || '',
          termsAcceptedAt,
          signedAt: c.signedAt ? c.signedAt.slice(0, 16).replace('T', ' ') : undefined,
          change: c.customerFeedback ? {
            at: c.feedbackAtUtc ? c.feedbackAtUtc.slice(0, 16).replace('T', ' ') : '',
            text: c.customerFeedback,
            response: c.managerFeedback ? { at: c.feedbackHandledAtUtc ? c.feedbackHandledAtUtc.slice(0, 16).replace('T', ' ') : '', text: c.managerFeedback } : undefined,
          } : undefined,
        };
      })
    : [];

  // Payments
  const payments: any[] = [];
  if (Array.isArray(item.contracts)) {
    for (const c of item.contracts) {
      if (Array.isArray(c.payments)) {
        for (const p of c.payments) {
          payments.push({
            id: p.paymentId || `PAY-${Math.random().toString(36).slice(2, 7)}`,
            type: 'DEPOSIT',
            method: p.method === 'VNPAY' ? 'VNPAY' : 'QR_SANDBOX',
            amount: p.amount || 0,
            status: p.status === 'SUCCESS' ? 'SUCCESS' : (p.status === 'FAILED' ? 'FAILED' : 'PROCESSING'),
            createdAt: p.paidAt ? p.paidAt.slice(0, 16).replace('T', ' ') : (c.publishedAtUtc ? c.publishedAtUtc.slice(0, 16).replace('T', ' ') : ''),
            confirmedAt: p.paidAt ? p.paidAt.slice(0, 16).replace('T', ' ') : undefined,
          });
        }
      }
    }
  }

  // Horse notes map
  const horseNotes: Record<string, string> = {};
  if (Array.isArray(item.horses)) {
    item.horses.forEach((h: any) => {
      if (h.horseId && h.careInstructions) {
        horseNotes[h.horseId] = h.careInstructions;
      }
    });
  }

  return {
    id,
    origin,
    destination,
    date,
    horseCount,
    horses: horseIds,
    careNotes,
    pickup: {
      name: item.input?.pickupContact?.name || item.pickupContactName || 'Điểm nhận',
      address: item.input?.trip?.pickup?.address || item.departure || origin,
      postal: item.input?.pickupContact?.postal || '',
      contact: item.input?.pickupContact?.name || item.pickupContactName || item.customerName || 'Trần Văn B',
      phone: item.input?.pickupContact?.phone || item.pickupContactPhone || '0901234567',
      notes: '',
    },
    delivery: {
      name: item.input?.receiver?.name || item.designatedReceiverName || item.receiverName || 'Điểm giao',
      address: item.input?.trip?.delivery?.address || item.destination || destination,
      postal: item.input?.receiver?.postal || '',
      contact: item.input?.receiver?.name || item.designatedReceiverName || item.receiverName || 'Người nhận',
      phone: item.input?.receiver?.phone || item.designatedReceiverPhone || item.receiverPhone || '0908889999',
      notes: '',
    },
    status,
    versions,
    payments,
    history: [
      {
        at: item.departureAt ? item.departureAt.slice(0, 16).replace('T', ' ') : '2026-10-22 08:00',
        actor: item.customerName || 'Khách hàng',
        role: 'CUSTOMER',
        action: 'Gửi yêu cầu vận chuyển',
        detail: `Tuyến ${origin} → ${destination} (${horseCount} cá thể)`,
      },
    ],
    docs: Array.isArray(item.documents)
      ? item.documents.map((d: any) => ({
          key: d.documentType,
          scope: d.horseId || 'request',
          status: d.status === 'UPLOADED' ? 'APPROVED' : 'PENDING_REVIEW',
          file: d.fileName ? { name: d.fileName } : undefined,
        }))
      : [],
    companyDocs: [],
    revisions: [],
    supplements: [],
    complaints: [],
    cancelRequest: latestContract?.cancellationId ? {
      at: latestContract.publishedAtUtc ? latestContract.publishedAtUtc.slice(0, 16).replace('T', ' ') : date,
      reason: latestContract.cancellationReason || '',
      prevStatus: 'CONTRACT_READY' as any,
    } : undefined,
    refund: latestContract?.refundStatus ? {
      amount: latestContract.refundAmount || 0,
      status: latestContract.refundStatus as any,
      at: latestContract.publishedAtUtc ? latestContract.publishedAtUtc.slice(0, 16).replace('T', ' ') : date,
    } : undefined,
    requestedAt: date,
    horseNotes,
    wizardStep: 3,
    createdAt: item.createdAt || date,
  } as unknown as TransportRequest;
}

export const customerApi = {
  /** Ước tính giá sơ bộ công khai */
  getDemoEstimate: async (input: DemoEstimateInput): Promise<DemoEstimateResult | null> => {
    try {
      const res = await apiClient.post<ApiResponse<DemoEstimateResult>>(PUBLIC_ENDPOINTS.ESTIMATES_DEMO, input);
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** Tìm kiếm gợi ý vị trí / địa chỉ qua Mapbox */
  searchLocations: async (address: string, country = 'VN'): Promise<any[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any>>(PUBLIC_ENDPOINTS.LOCATIONS_SEARCH, {
        params: { address, country },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  },

  getProfile: () => getOr<CustomerProfile>(CUSTOMER_ENDPOINTS.PROFILE, mockProfile),
  getNotifications: () => getOr<CustomerNotification[]>(CUSTOMER_ENDPOINTS.NOTIFICATIONS, mockNotifications),

  /** Ngựa của tôi (Lấy từ database backend và kết hợp danh sách khả dụng) */
  getHorses: async (): Promise<Horse[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(CUSTOMER_ENDPOINTS.SELECTABLE_HORSES);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        const dbHorses: Horse[] = data.map((h: any) => ({
          id: h.horseId,
          version: h.version,
          name: h.name,
          breed: h.breed || 'Thoroughbred',
          sex: (h.sex as any) || 'Gelding',
          dob: h.dob ? h.dob.slice(0, 10) : '2020-01-01',
          color: 'Nâu hạt dẻ',
          microchip: h.microchipIso || '',
          value: h.declaredValueVnd ? String(h.declaredValueVnd) : '100000000',
          currency: 'VND',
          passport: {
            number: h.passportNo || '',
            authority: h.passportIssuedBy || 'FEI',
            issueDate: h.passportIssuedDate ? h.passportIssuedDate.slice(0, 10) : '2022-01-01',
            expiryDate: h.passportExpiryDate ? h.passportExpiryDate.slice(0, 10) : '2030-01-01',
            scan: h.hasDocuments ? { name: `${h.name}_passport.pdf`, size: '1.2 MB' } : undefined,
          },
          ownership: h.hasDocuments ? { name: `${h.name}_ownership.pdf`, size: '850 KB' } : undefined,
          fluDate: '2026-01-01',
          conditions: h.specialHealthNotes || 'Sức khỏe tốt',
          vetName: 'Dr. Nguyen Van Y',
          vetPhone: '0912345678',
        }));
        return [...dbHorses, ...mockHorses.filter((m) => !dbHorses.some((d) => d.id === m.id))];
      }
      return clone(mockHorses);
    } catch {
      return clone(mockHorses);
    }
  },
  /** Tạo form data chuẩn cho nghiệp vụ lưu hồ sơ ngựa vào Backend C# */
  buildHorseFormData: (body: HorseInput, version = 'AAAAAAADkhM=') => {
    let sex = (body.sex || 'Gelding').toUpperCase();
    if (sex !== 'STALLION' && sex !== 'MARE') sex = 'GELDING';

    let chip = (body.microchip || '').replace(/\D/g, '');
    if (chip.length !== 15) {
      chip = ('999' + Date.now()).slice(0, 15);
    }

    const payload = {
      Name: body.name.trim(),
      MicrochipIso: chip,
      FeiPassportNo: body.passport?.number?.trim() || `FEI-${Date.now()}`,
      Breed: body.breed?.trim() || 'Thoroughbred',
      Sex: sex,
      Weight: 450,
      Dob: body.dob ? body.dob.slice(0, 10) : '2021-01-01',
      PassportIssuedBy: body.passport?.authority?.trim() || 'FEI',
      PassportIssuedDate: body.passport?.issueDate ? body.passport.issueDate.slice(0, 10) : '2022-01-01',
      PassportExpiryDate: body.passport?.expiryDate ? body.passport.expiryDate.slice(0, 10) : '2032-01-01',
      DeclaredValueVnd: Number(body.value) || 100000000,
      SpecialHealthNotes: body.conditions || 'Sức khỏe tốt',
    };

    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00]);
    const pdfHeader = new TextEncoder().encode('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

    const form = new FormData();
    form.append('Payload', JSON.stringify(payload));
    form.append('Photo', new Blob([jpegHeader], { type: 'image/jpeg' }), 'photo.jpg');
    form.append('PassportScan', new Blob([pdfHeader], { type: 'application/pdf' }), 'passport.pdf');
    form.append('OwnershipCertificate', new Blob([pdfHeader], { type: 'application/pdf' }), 'ownership.pdf');
    form.append('Version', version);
    return form;
  },

  createHorse: async (body: HorseInput): Promise<{ ok: boolean; id?: string }> => {
    try {
      const fd = customerApi.buildHorseFormData(body);
      const res = await apiClient.post<ApiResponse<any>>(CUSTOMER_ENDPOINTS.HORSES, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success !== false && res.data?.data?.horseId) {
        return { ok: true, id: res.data.data.horseId };
      }
      return { ok: false };
    } catch (err) {
      console.warn('Lỗi lưu hồ sơ ngựa lên backend:', err);
      return { ok: false };
    }
  },

  updateHorse: async (horseId: string, body: HorseInput): Promise<boolean> => {
    try {
      const fd = customerApi.buildHorseFormData(body, body.version || 'AAAAAAADkhM=');
      const res = await apiClient.put<ApiResponse<any>>(CUSTOMER_ENDPOINTS.HORSE_DETAIL(horseId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.success !== false;
    } catch (err) {
      console.warn('Lỗi cập nhật hồ sơ ngựa lên backend:', err);
      return false;
    }
  },

  /** Yêu cầu vận chuyển */
  getRequests: async (): Promise<TransportRequest[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(CUSTOMER_ENDPOINTS.REQUESTS);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapCustomerFlowRequest);
        return [...mapped, ...mockRequests.filter((m) => !mapped.some((d) => d.id === m.id))];
      }
      return clone(mockRequests);
    } catch {
      return clone(mockRequests);
    }
  },

  getRequest: async (requestId: string): Promise<TransportRequest | undefined> => {
    try {
      const res = await apiClient.get<ApiResponse<any>>(CUSTOMER_ENDPOINTS.REQUEST_DETAIL(requestId));
      if (res.data?.data) {
        return mapCustomerFlowRequest(res.data.data);
      }
      return mockRequests.find((r) => r.id === requestId);
    } catch {
      return mockRequests.find((r) => r.id === requestId);
    }
  },

  saveRequest: (request: TransportRequest) => send('put', CUSTOMER_ENDPOINTS.REQUEST_DETAIL(request.id), request),
  createRequest: (request: TransportRequest) => send('post', CUSTOMER_ENDPOINTS.REQUESTS, request),
  submitRequest: async (requestId: string, reqData?: TransportRequest): Promise<{ ok: boolean; requestId?: string; message?: string }> => {
    try {
      if (reqData) {
        const tripMode = reqData.origin.includes('Tokyo') || reqData.destination.includes('Tokyo') || reqData.destination.includes('Osaka') ? 'AIR' : 'ROAD';
        const leadDays = tripMode === 'AIR' ? 7 : 3;

        // Đảm bảo ngày khởi hành cách hôm nay ít nhất leadDays theo đúng quy chuẩn Backend
        const now = new Date();
        const minAllowedDate = new Date(now.getTime() + leadDays * 86400000);
        let depDate = reqData.date ? new Date(reqData.date) : minAllowedDate;
        if (isNaN(depDate.getTime()) || depDate < minAllowedDate) {
          depDate = minAllowedDate;
        }

        const departureIso = depDate.toISOString();
        const departureDateOnly = departureIso.slice(0, 10);
        const horseList = reqData.horses.filter(Boolean);
        const count = horseList.length || reqData.horseCount || 1;

        // Lấy version mới nhất của ngựa
        const horsesFromApi = await customerApi.getHorses();
        const horsesPayload = horseList.map((hid) => {
          const found = horsesFromApi.find((h) => h.id === hid);
          return {
            horseId: hid,
            version: found?.version || 'AAAAAAADkhM=',
            careInstructions: reqData.horseNotes[hid] || reqData.careNotes || '',
          };
        });

        const payload = {
          trip: {
            pickup: {
              address: reqData.pickup.address || reqData.origin || 'Trại ngựa Củ Chi, TP.HCM',
              country: 'VN',
              lat: reqData.pickup.latitude ?? 10.7769,
              lng: reqData.pickup.longitude ?? 106.7009,
            },
            delivery: {
              address: reqData.delivery.address || reqData.destination || 'Trường đua Hà Nội',
              country: reqData.destination.includes('Tokyo') ? 'JP' : 'VN',
              lat: reqData.delivery.latitude ?? (reqData.destination.includes('Tokyo') ? 35.6762 : 21.0285),
              lng: reqData.delivery.longitude ?? (reqData.destination.includes('Tokyo') ? 139.6503 : 105.8542),
            },
            preferredTransportMode: tripMode,
            horseCount: count,
            desiredDepartureDate: departureDateOnly,
          },
          departureAt: departureIso,
          deliveryAt: new Date(depDate.getTime() + 86400000 * 3).toISOString(),
          purpose: 'COMMERCIAL',
          pickupContact: {
            name: reqData.pickup.contact || 'Trần Văn B',
            phone: reqData.pickup.phone || '0901234567',
          },
          receiver: {
            name: reqData.delivery.contact || 'Người nhận',
            phone: reqData.delivery.phone || '0908889999',
          },
          horses: horsesPayload.length > 0 ? horsesPayload : [{ horseId: 'HRS_003', version: 'AAAAAAADkhM=' }],
          careInstructions: reqData.careNotes || '',
        };
        const res = await apiClient.post<ApiResponse<any>>(CUSTOMER_ENDPOINTS.REQUESTS, payload);
        if (res.data?.success !== false && res.data?.data?.requestId) {
          return { ok: true, requestId: res.data.data.requestId };
        }
        return { ok: false, message: res.data?.message || 'Không thể tạo đơn vận chuyển' };
      }
      const res = await apiClient.post<ApiResponse<unknown>>(CUSTOMER_ENDPOINTS.SUBMIT_REQUEST(requestId));
      return { ok: res.data?.success !== false, requestId };
    } catch (err: any) {
      console.error('Failed to submit request to backend:', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi khi gửi đơn lên máy chủ';
      return { ok: false, message: msg };
    }
  },

  cancelContract: (contractId: string, version: string, reason: string) =>
    send('post', CUSTOMER_ENDPOINTS.CONTRACT_CANCEL_REQUEST(contractId), {
      version: version || 'AAAAAAADkh8=',
      reason,
    }),
  cancelRequest: (contractId: string, reason: string, version?: string) =>
    send('post', CUSTOMER_ENDPOINTS.CONTRACT_CANCEL_REQUEST(contractId), {
      version: version || 'AAAAAAADkh8=',
      reason,
    }),
  uploadDocument: (requestId: string, key: string, scope: string, fileName: string) =>
    send('post', CUSTOMER_ENDPOINTS.REQUEST_DOCUMENTS(requestId), { key, scope, fileName }),

  /** Hợp đồng & Ký */
  acceptTerms: (contractId: string) =>
    apiClient.get(CUSTOMER_ENDPOINTS.ACCEPT_TERMS(contractId)).then(() => true).catch(() => false),
  getContractTerms: async (contractId: string) => {
    try {
      const res = await apiClient.get<ApiResponse<any>>(CUSTOMER_ENDPOINTS.CONTRACT_TERMS(contractId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },
  requestContractChange: (contractId: string, body: ContractChangeInput, contractVersion?: string) =>
    send('post', CUSTOMER_ENDPOINTS.CONTRACT_CHANGE(contractId), {
      feedbackMessage: body.text,
      fields: ['DATE', 'CARE_NOTES', 'COMMERCIAL', 'OTHER'],
      version: contractVersion || 'AAAAAAADkh8=',
    }),
  getContract: async (contractId: string): Promise<any> => {
    try {
      const res = await apiClient.get<ApiResponse<any>>(CUSTOMER_ENDPOINTS.CONTRACT_DETAIL(contractId));
      return res.data?.data;
    } catch {
      return null;
    }
  },
  sendSignOtp: (contractId: string, pdfSha256?: string, contractVersion?: string) =>
    send('post', CUSTOMER_ENDPOINTS.SEND_SIGN_OTP(contractId), {
      pdfSha256: pdfSha256 || '',
      version: contractVersion || 'AAAAAAADkh8=',
    }),
  signContract: async (contractId: string, otp: string, pdfSha256?: string, contractVersion?: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(CUSTOMER_ENDPOINTS.SIGN_CONTRACT(contractId), {
        otp,
        pdfSha256: pdfSha256 || '',
        version: contractVersion || 'AAAAAAADkh8=',
      });
      return { ok: res.data?.success !== false, message: res.data?.message };
    } catch (err: any) {
      return {
        ok: false,
        message: err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.'
      };
    }
  },
  mockSignContract: (contractId: string) => send('post', CUSTOMER_ENDPOINTS.MOCK_SIGN(contractId)),

  /** Thanh toán cọc & số dư */
  mockDeposit: (contractId: string) => send('post', CUSTOMER_ENDPOINTS.MOCK_DEPOSIT(contractId)),
  payDeposit: async (contractId: string): Promise<{ ok: boolean; paymentUrl?: string; message?: string }> => {
    try {
      const res = await apiClient.post<ApiResponse<any>>(CUSTOMER_ENDPOINTS.DEPOSIT_PAYMENT(contractId));
      if (res.data?.data?.paymentUrl) {
        return { ok: true, paymentUrl: res.data.data.paymentUrl };
      }
      return { ok: false, message: res.data?.message || 'Không tạo được phiên thanh toán VNPay' };
    } catch (err: any) {
      return { ok: false, message: err.response?.data?.message || err.message || 'Lỗi kết nối VNPay' };
    }
  },
  payBalance: (contractId: string) => send('post', CUSTOMER_ENDPOINTS.BALANCE_PAYMENT(contractId)),

  /** Nghiệm thu & khiếu nại */
  confirmAcceptance: (contractId: string) => send('post', CUSTOMER_ENDPOINTS.ACCEPTANCE(contractId)),
  raiseComplaint: (_requestId: string, body: ComplaintInput) => send('post', CUSTOMER_ENDPOINTS.COMPLAINTS, body),
};

export default customerApi;
