import { apiClient } from '../../../shared/api/apiClient';
import { MANAGER_ENDPOINTS as E } from './managerEndpoints';
import { defaultBudget, sumItems } from '../hooks/managerRules';
import type {
  ActualCost,
  ApiResponse,
  Complaint,
  ContractVersion,
  CustomerInfo,
  HorseRef,
  Incident,
  ManagerNotification,
  RequestStatus,
  Staff,
  Transaction,
  TransportRequest,
  Trip,
} from '../types';
import {
  mockActualCosts,
  mockComplaints,
  mockCustomers,
  mockHorses,
  mockIncidents,
  mockNotifications,
  mockRequests,
  mockStaff,
  mockTransactions,
  mockTrips,
} from '../data/mockData';

export interface CostPlanDto {
  costs: {
    transport: number;
    crew: number;
    permit: number;
    vet: number;
    insurance: number;
    total: number;
  };
  days: number;
  stableNights: number;
  crewCount: number;
  doctorCount: number;
  vehicleCount: number;
  roadDistanceKm: number;
  insuredValueVnd: number | null;
  minimumInsuranceAssumed?: boolean;
  currency?: string;
}

export interface FlowContractCardDto {
  contractId: string;
  version: string;
  status: string;
  totalPrice: number;
  depositAmount: number;
  paidAmount: number;
  contractCode?: string;
  pdfSha256?: string;
  publishedAtUtc?: string;
  signDeadline?: string;
  depositDeadline?: string;
  depositRate?: number;
  commercialNotes?: string;
  costs?: {
    transport: number;
    crew: number;
    permit: number;
    vet: number;
    insurance: number;
    total: number;
  };
}

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

/** POST/PUT: true nếu Backend nhận; false khi đang chạy mock (giao diện vẫn cập nhật các bước) */
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

/** Chuyển đổi dữ liệu FlowRequestCard của Backend C# sang TransportRequest của Frontend Manager */
function mapFlowRequestCard(item: any, idx: number): TransportRequest {
  if (item.id && Array.isArray(item.versions)) return item as TransportRequest;
  const id = item.requestId || item.id || `REQ-${1000 + idx}`;
  const origin = item.departure || item.origin || 'Hồ Chí Minh';
  const destination = item.destination || 'Hà Nội';

  const latestContract = Array.isArray(item.contracts) && item.contracts.length > 0 ? item.contracts[0] : null;

  // Map trạng thái Backend sang trạng thái Manager UI
  let status: RequestStatus = 'PENDING_REVIEW';
  const rawStatus = (item.status || '').toUpperCase();
  if (latestContract?.cancellationStatus === 'PENDING') status = 'CANCELLATION_REQUESTED';
  else if (latestContract?.status === 'CANCELLED' || rawStatus === 'CANCELLED') status = 'CANCELLED';
  else if (rawStatus === 'PENDING') status = 'PENDING_REVIEW';
  else if (rawStatus === 'ACCEPTED') status = 'CONTRACT_PREPARATION';
  else if (rawStatus === 'CHANGES_REQUESTED') status = 'CHANGES_REQUESTED';
  else if (rawStatus === 'REJECTED') status = 'REJECTED';
  else if (rawStatus === 'CONTRACT_DRAFTED') status = 'CONTRACT_PREPARATION';
  else if (rawStatus === 'CONTRACT_PUBLISHED' || rawStatus === 'AWAITING_DEPOSIT' || rawStatus === 'AWAITING_SIGNATURE') status = 'CONTRACT_READY';
  else if (rawStatus === 'SIGNED' || rawStatus === 'DEPOSIT_PAID') status = 'DEPOSIT_VERIFIED';
  else if (rawStatus === 'CLOSED') status = 'CLOSED';
  else if (rawStatus) status = rawStatus as RequestStatus;

  const cancellation = latestContract?.cancellationId ? {
    id: latestContract.cancellationId,
    status: (latestContract.cancellationStatus || 'PENDING') as any,
    reason: latestContract.cancellationReason || '',
    decisionNote: latestContract.cancellationDecision || undefined,
    at: latestContract.publishedAtUtc ? latestContract.publishedAtUtc.slice(0, 16).replace('T', ' ') : '2026-10-22 09:00',
    prevStatus: 'CONTRACT_READY' as RequestStatus,
  } : undefined;

  // Horses
  const horses: string[] = Array.isArray(item.horses)
    ? item.horses.map((h: any) => (typeof h === 'string' ? h : h.horseId || h.name || 'Ngựa đua'))
    : ['HRS_001'];

  // Versions / Contracts
  const versions: ContractVersion[] = Array.isArray(item.contracts) && item.contracts.length > 0
    ? item.contracts.map((c: any, vIdx: number) => ({
        v: vIdx + 1,
        number: c.contractCode || c.contractId || `HD-CBN-${id}-${vIdx + 1}`,
        contractId: c.contractId,
        contractVersion: c.version,
        issuedAt: c.publishedAtUtc ? c.publishedAtUtc.slice(0, 16).replace('T', ' ') : '2026-10-22 09:00',
        validUntil: c.signDeadline ? c.signDeadline.slice(0, 16).replace('T', ' ') : '2026-10-23 09:00',
        mode: (c.transportMode as any) || (item.input?.trip?.mode as any) || 'ROAD',
        departAt: c.departureAt ? c.departureAt.slice(0, 16).replace('T', ' ') : `${item.departureAt ? item.departureAt.slice(0, 10) : item.date || '2026-10-31'} 06:00`,
        arriveAt: c.deliveryAt ? c.deliveryAt.slice(0, 16).replace('T', ' ') : `${item.deliveryAt ? item.deliveryAt.slice(0, 10) : item.date || '2026-10-31'} 20:00`,
        items: [{ desc: 'Chi phí vận chuyển & dịch vụ trọn gói', amount: c.totalPrice || 50000000, required: true }],
        total: c.totalPrice || 50000000,
        depositPct: c.depositRate ? Math.round(c.depositRate) : 30,
        state: c.status === 'SIGNED' ? 'EFFECTIVE' : (c.status === 'WITHDRAWN' || c.status === 'CANCELLED' ? 'VOID' : (c.status === 'EXPIRED' ? 'EXPIRED' : 'ISSUED')),
        budget: c.costs ? {
          TRANSPORT: Math.round(c.costs.transport || 0),
          PROCEDURE: Math.round(c.costs.permit || 0),
          VET: Math.round(c.costs.vet || 0),
          INSURANCE: Math.round(c.costs.insurance || 0),
          STAFF: Math.round(c.costs.crew || 0),
        } : defaultBudget({ origin, destination, horses }),
        terms: [],
        extensions: [],
      }))
    : [];

  const contractId = latestContract?.contractId;
  const tripInfo = latestContract?.trip;
  const tripId = tripInfo?.tripId;

  return {
    id,
    version: item.version,
    contractId,
    tripId,
    trip: tripInfo,
    customerId: item.customerId || (item.customerEmail ? 'USR_CUST_01' : 'USR_CUST_01'),
    origin,
    destination,
    date: item.departureAt ? item.departureAt.slice(0, 10) : item.date || '2026-10-26',
    status,
    horses,
    pickup: {
      name: item.departure || origin,
      address: item.departure || origin,
      contact: item.pickupContactName || 'Nguyễn Văn A',
      phone: item.pickupContactPhone || '0901234567',
    },
    delivery: {
      name: item.destination || destination,
      address: item.destination || destination,
      contact: item.receiverName || 'Người nhận',
      phone: item.receiverPhone || '0908889999',
    },
    careNotes: item.careNotes || item.input?.careNotes || '',
    submittedAt: item.departureAt ? item.departureAt.slice(0, 16).replace('T', ' ') : '2026-10-22 08:00',
    feedback: item.managerNotes || undefined,
    reason: item.managerNotes || undefined,
    cancellation,
    versions,
    dossier: Array.isArray(item.documents)
      ? item.documents.map((d: any) => ({
          key: d.documentType,
          scope: d.horseId || 'request',
          status: d.status === 'UPLOADED' ? 'APPROVED' : 'PENDING',
        }))
      : [],
    collection: [],
    history: [
      {
        at: item.departureAt ? item.departureAt.slice(0, 16).replace('T', ' ') : '2026-10-22 08:00',
        actor: item.customerName || 'Khách hàng',
        role: 'CUSTOMER',
        action: 'Gửi yêu cầu vận chuyển',
        detail: `Tuyến ${origin} → ${destination} (${horses.length} cá thể)`,
      },
    ],
  };
}

/** Đảm bảo tổng 5 nhóm chi phí (costs.Total) luôn bằng chính xác giá bán (price) 100% theo quy chuẩn Backend C# */
function alignCostsWithPrice(draft: any): { price: number; costs: { transport: number; crew: number; permit: number; vet: number; insurance: number } } {
  const salePrice = Math.round(Number(sumItems(draft.items)) || 0);
  const budget = draft.budget || {};

  let transport = Math.round(Number(budget.TRANSPORT) || 0);
  let crew = Math.round(Number(budget.STAFF) || 0);
  let permit = Math.round(Number(budget.PROCEDURE) || 0);
  let vet = Math.max(100000, Math.round(Number(budget.VET) || 1000000));
  let insurance = Math.max(100000, Math.round(Number(budget.INSURANCE) || 1000000));

  let finalPrice = salePrice > 0 ? salePrice : (transport + crew + permit + vet + insurance);
  if (finalPrice < 100000) finalPrice = 50000000;

  if (salePrice > 0) {
    const rawSum = transport + crew + permit + vet + insurance;
    if (rawSum > 0) {
      const rVet = Math.max(0.01, vet / rawSum);
      const rIns = Math.max(0.01, insurance / rawSum);
      const rCrew = Math.max(0.01, crew / rawSum);
      const rPermit = Math.max(0.01, permit / rawSum);

      vet = Math.max(100000, Math.round(finalPrice * rVet));
      insurance = Math.max(100000, Math.round(finalPrice * rIns));
      crew = Math.round(finalPrice * rCrew);
      permit = Math.round(finalPrice * rPermit);
      transport = finalPrice - (vet + insurance + crew + permit);
      if (transport < 0) {
        transport = Math.round(finalPrice * 0.7);
        crew = Math.round(finalPrice * 0.05);
        permit = Math.round(finalPrice * 0.1);
        vet = Math.max(100000, Math.round(finalPrice * 0.08));
        insurance = finalPrice - (transport + crew + permit + vet);
      }
    } else {
      transport = Math.round(finalPrice * 0.7);
      crew = Math.round(finalPrice * 0.05);
      permit = Math.round(finalPrice * 0.1);
      vet = Math.max(100000, Math.round(finalPrice * 0.08));
      insurance = finalPrice - (transport + crew + permit + vet);
    }
  }

  // Đảm bảo vet và insurance luôn > 0 theo quy định bắt buộc của C#
  if (vet <= 0) vet = 100000;
  if (insurance <= 0) insurance = 100000;

  // Bù chênh lệch vào transport để tổng 5 nhóm BẰNG CHÍNH XÁC finalPrice
  const sum5 = transport + crew + permit + vet + insurance;
  transport += (finalPrice - sum5);

  return {
    price: finalPrice,
    costs: {
      transport: Math.round(transport),
      crew: Math.round(crew),
      permit: Math.round(permit),
      vet: Math.round(vet),
      insurance: Math.round(insurance),
    },
  };
}

/** Tính toán số ngày chuẩn bị và mốc thời gian khởi hành/đến hợp lệ theo đúng quy chuẩn Backend C# */
function resolvePlanSchedule(draft: any) {
  const mode = draft.mode || 'ROAD';
  // Backend rule: mode == "AIR" ? 7 : km > 500 ? 3 : 2
  const minPrepDays = mode === 'AIR' ? 7 : (draft.distanceKm && Number(draft.distanceKm) > 500 ? 3 : 2);
  const prepDays = Math.max(minPrepDays, Number(draft.preparationDays) || minPrepDays);

  // Backend C# rule: Now.AddHours(24) <= departure.AddDays(-preparation)
  // => departure >= Now + 24h (1 ngày) + preparation ngày
  const minDepMs = Date.now() + (prepDays + 1) * 86400000;

  const parsedDep = draft.departAt ? Date.parse(draft.departAt.replace(' ', 'T')) : NaN;
  const depMs = !isNaN(parsedDep) && parsedDep >= minDepMs ? parsedDep : minDepMs;

  const parsedArr = draft.arriveAt ? Date.parse(draft.arriveAt.replace(' ', 'T')) : NaN;
  const defaultTripDays = mode === 'AIR' ? 2 : 3;
  const delMs = !isNaN(parsedArr) && parsedArr > depMs ? parsedArr : (depMs + defaultTripDays * 86400000);

  return {
    mode,
    prepDays,
    depMs,
    delMs,
    departureAt: new Date(depMs).toISOString(),
    deliveryAt: new Date(delMs).toISOString(),
  };
}

export const managerApi = {
  // ----- Đọc dữ liệu -----
  getCustomers: () => getOr<CustomerInfo[]>(E.CUSTOMERS, mockCustomers),
  getHorses: () => getOr<HorseRef[]>(E.HORSES, mockHorses),
  getStaff: () => getOr<Staff[]>(E.STAFF, mockStaff),

  getRequests: async (): Promise<TransportRequest[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(E.REQUESTS);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        const dbRequests = data.map(mapFlowRequestCard);
        // Ưu tiên hiển thị đơn thật từ database C#, kết hợp với mock data nếu cần
        const mockFiltered = mockRequests.filter((m) => !dbRequests.some((d) => d.id === m.id));
        return [...dbRequests, ...mockFiltered];
      }
      return clone(mockRequests);
    } catch {
      return clone(mockRequests);
    }
  },

  getTrips: () => getOr<Trip[]>(E.TRIPS, mockTrips),
  getTransactions: () => getOr<Transaction[]>(E.TRANSACTIONS, mockTransactions),
  getIncidents: () => getOr<Incident[]>(E.INCIDENTS, mockIncidents),
  getComplaints: () => getOr<Complaint[]>(E.COMPLAINTS, mockComplaints),
  getActualCosts: () => getOr<ActualCost[]>(E.ACTUAL_COST_LIST, mockActualCosts),
  getNotifications: () => getOr<ManagerNotification[]>(E.NOTIFICATIONS, mockNotifications),

  // ----- Dự toán chi phí (Backend C#) -----
  getCostEstimate: async (id: string, input?: Record<string, unknown>): Promise<CostPlanDto | null> => {
    try {
      const res = await apiClient.post<ApiResponse<CostPlanDto>>(E.COST_ESTIMATE(id), input ?? {});
      return res.data?.data ?? null;
    } catch (err) {
      console.warn(`[getCostEstimate] Không thể lấy chi phí dự toán từ backend cho ${id}:`, err);
      return null;
    }
  },

  // ----- Xét duyệt yêu cầu -----
  acceptRequest: (id: string, version?: string) =>
    send('post', E.ACCEPT_REQUEST(id), {
      version: version || 'AAAAAAADkh8=',
      reason: 'Manager chấp thuận yêu cầu vận chuyển',
    }),

  requestRevision: (id: string, body: unknown, version?: string) => {
    const reason = typeof body === 'object' && body !== null && 'feedback' in body
      ? (body as any).feedback
      : typeof body === 'string'
      ? body
      : 'Vui lòng bổ sung hồ sơ và điều chỉnh thời gian';
    return send('post', E.REQUEST_REVISION(id), {
      version: version || 'AAAAAAADkh8=',
      reason,
    });
  },

  rejectRequest: (id: string, reason: string, version?: string) =>
    send('post', E.REJECT_REQUEST(id), {
      version: version || 'AAAAAAADkh8=',
      reason,
    }),

  cancelRequest: (id: string, reason: string, version?: string) =>
    send('post', E.REJECT_REQUEST(id), {
      version: version || 'AAAAAAADkh8=',
      reason,
    }),

  /** Quản lý duyệt hoặc từ chối đề nghị hủy của khách hàng */
  decideCancellation: (
    contractId: string,
    operation: 'approve' | 'reject',
    data: { version?: string; cancellationId?: string; reason: string }
  ) =>
    send('post', E.CANCELLATION_DECISION(contractId, operation), {
      version: data.version || 'AAAAAAADkh8=',
      cancellationId: data.cancellationId,
      reason: data.reason,
    }),

  /** Quản lý hủy hợp đồng quá hạn ký OTP */
  cancelOverdueContract: (contractId: string, version: string, reason: string) =>
    send('post', E.CONTRACT_CANCEL_OVERDUE(contractId), {
      version,
      reason,
    }),

  /** Quản lý rút lại hợp đồng chưa ký để chỉnh sửa lại */
  withdrawContract: (contractId: string, version: string, reason: string) =>
    send('post', E.CONTRACT_WITHDRAW(contractId), {
      version,
      reason,
    }),

  /** Bắt đầu xử lý hoàn tiền */
  startRefund: (contractId: string, version: string, cancellationId: string, reason: string) =>
    send('post', E.REFUND_START(contractId), {
      version,
      cancellationId,
      reason,
    }),

  /** Xác nhận hoàn tiền xong, chuyển trạng thái hợp đồng và yêu cầu sang CANCELLED */
  completeRefund: (contractId: string, version: string, cancellationId: string, reason: string, targetRef: string) =>
    send('post', E.REFUND_COMPLETE(contractId), {
      version,
      cancellationId,
      reason,
      target: targetRef,
    }),
  closeRequest: (id: string) => send('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => send('post', E.COLLECTION_NOTE(id), { note }),

  // ----- Hợp đồng (Lưu trực tiếp vào SQL Server qua Backend C#) -----
  createContractDraft: async (
    requestId: string,
    draft: any,
    requestVersion?: string
  ): Promise<{ ok: boolean; data?: FlowContractCardDto; error?: string }> => {
    try {
      const schedule = resolvePlanSchedule(draft);
      const aligned = alignCostsWithPrice(draft);

      const body = {
        version: requestVersion || 'AAAAAAADkh8=',
        transportMode: schedule.mode,
        preparationDays: schedule.prepDays,
        departureAt: schedule.departureAt,
        deliveryAt: schedule.deliveryAt,
        costs: aligned.costs,
        price: aligned.price,
        depositRate: Number(draft.depositPct) || 30,
        commercialNotes: draft.note?.trim() || 'Hợp đồng vận chuyển ngựa',
      };

      const res = await apiClient.post<ApiResponse<FlowContractCardDto>>(
        E.CONTRACT_DRAFT(requestId),
        body,
        {
          headers: {
            'Idempotency-Key': `draft-${requestId}-${Date.now()}`,
          },
        }
      );

      if (res.data?.data) {
        return { ok: true, data: res.data.data };
      }
      return { ok: false, error: res.data?.message || 'Không thể tạo bản nháp hợp đồng.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi kết nối Backend C#';
      return { ok: false, error: msg };
    }
  },

  updateContractDraft: async (
    contractId: string,
    contractVersion: string,
    draft: any
  ): Promise<{ ok: boolean; data?: FlowContractCardDto; error?: string }> => {
    try {
      const schedule = resolvePlanSchedule(draft);
      const aligned = alignCostsWithPrice(draft);

      const body = {
        version: contractVersion,
        transportMode: schedule.mode,
        preparationDays: schedule.prepDays,
        departureAt: schedule.departureAt,
        deliveryAt: schedule.deliveryAt,
        costs: aligned.costs,
        price: aligned.price,
        depositRate: Number(draft.depositPct) || 30,
        commercialNotes: draft.note?.trim() || 'Hợp đồng vận chuyển ngựa',
      };
      const res = await apiClient.put<ApiResponse<FlowContractCardDto>>(
        E.CONTRACT_UPDATE_DRAFT(contractId),
        body
      );
      if (res.data?.data) {
        return { ok: true, data: res.data.data };
      }
      return { ok: false, error: res.data?.message || 'Không thể cập nhật hợp đồng.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi cập nhật hợp đồng';
      return { ok: false, error: msg };
    }
  },

  publishContract: async (
    contractId: string,
    contractVersion: string,
    additionalClauses?: string[]
  ): Promise<{ ok: boolean; data?: FlowContractCardDto; error?: string }> => {
    try {
      const res = await apiClient.post<ApiResponse<FlowContractCardDto>>(
        E.ISSUE_CONTRACT(contractId),
        {
          version: contractVersion,
          additionalClauses: additionalClauses ?? [],
        }
      );
      if (res.data?.data) {
        return { ok: true, data: res.data.data };
      }
      return { ok: false, error: res.data?.message || 'Không thể phát hành hợp đồng.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi phát hành hợp đồng';
      return { ok: false, error: msg };
    }
  },

  /** Phát hành lại hợp đồng đã thu hồi/hết hạn theo chuẩn Reissue của Backend C# */
  reissueContract: async (
    contractId: string,
    draft: any,
    version?: string,
    reason = 'Phát hành lại hợp đồng phiên bản mới'
  ): Promise<{ ok: boolean; data?: FlowContractCardDto; error?: string }> => {
    try {
      const schedule = resolvePlanSchedule(draft);
      const { price, costs } = alignCostsWithPrice(draft);

      const payload = {
        version: version || 'AAAAAAADkh8=',
        price,
        preparationDays: schedule.prepDays,
        departureAt: schedule.departureAt,
        deliveryAt: schedule.deliveryAt,
        clauseIds: draft.terms ? draft.terms.map((t: any) => t.id || t.key).filter(Boolean) : [],
        reason: reason || 'Phát hành lại hợp đồng',
        additionalClauses: [],
        depositRate: draft.depositPct ? Number(draft.depositPct) : 30,
        commercialNotes: draft.note || '',
        costs,
        transportMode: schedule.mode,
      };

      const res = await apiClient.post<ApiResponse<FlowContractCardDto>>(
        E.REISSUE_CONTRACT(contractId),
        payload
      );
      if (res.data?.data) {
        return { ok: true, data: res.data.data };
      }
      return { ok: false, error: res.data?.message || 'Không thể phát hành lại hợp đồng.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi phát hành lại hợp đồng';
      return { ok: false, error: msg };
    }
  },

  issueContractFull: async (
    requestId: string,
    draft: any,
    requestVersion?: string,
    existingContractId?: string,
    existingContractVersion?: string
  ): Promise<{ ok: boolean; data?: FlowContractCardDto; error?: string }> => {
    let cId = existingContractId;
    let cVer = existingContractVersion;

    if (!cId) {
      const draftRes = await managerApi.createContractDraft(requestId, draft, requestVersion);
      if (!draftRes.ok || !draftRes.data) {
        return { ok: false, error: draftRes.error || 'Lỗi tạo dự thảo hợp đồng' };
      }
      cId = draftRes.data.contractId;
      cVer = draftRes.data.version;
    } else if (cVer) {
      // Thử cập nhật draft trước, nếu thất bại (do contract đã phát hành hoặc thu hồi) thì dùng API Reissue
      const updRes = await managerApi.updateContractDraft(cId, cVer, draft);
      if (updRes.ok && updRes.data) {
        cVer = updRes.data.version;
      } else {
        const reissueRes = await managerApi.reissueContract(cId, draft, cVer);
        if (reissueRes.ok && reissueRes.data) {
          // Reissue trong Backend C# đã tự động Publish PDF sang AWAITING_DEPOSIT
          return { ok: true, data: reissueRes.data };
        } else {
          return { ok: false, error: reissueRes.error || updRes.error || 'Không thể tạo bản phát hành lại' };
        }
      }
    }

    return await managerApi.publishContract(cId, cVer || 'AAAAAAADkh8=');
  },
  respondContractChange: (id: string, body: unknown) => send('post', E.CONTRACT_CHANGE_RESPONSE(id), body),
  extendContract: (id: string) => send('post', E.EXTEND_CONTRACT(id)),
  remindSign: (id: string) => send('post', E.REMIND_SIGN(id)),

  // ----- Thanh toán -----
  verifyTransaction: (id: string) => send('post', E.VERIFY_TRANSACTION(id)),
  rejectTransaction: (id: string, reason: string) => send('post', E.REJECT_TRANSACTION(id), { reason }),
  confirmRefund: (id: string) => send('post', E.CONFIRM_REFUND(id)),

  // ----- Chuyến đi -----
  confirmDeploymentBackend: (contractId: string, body: unknown) =>
    send('post', `/manager/contracts/${contractId}/deployment/confirm`, body),
  deployTrip: (id: string, body: unknown) => send('post', E.DEPLOY_TRIP(id), body),
  holdTrip: (id: string, reason: string) => send('post', E.HOLD_TRIP(id), { reason }),
  resumeTrip: (id: string) => send('post', E.RESUME_TRIP(id)),
  decideRoute: (id: string, body: unknown) => send('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => send('post', E.FLIGHT_DECISION(id), body),
  approveDeparture: (id: string) => send('post', E.APPROVE_DEPARTURE(id)),
  resolveHandover: (id: string, body: unknown) => send('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => send('put', E.ACTUAL_COSTS(id), body),

  // ----- Sự cố & khiếu nại -----
  setIncidentStatus: (id: string, status: string) => send('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => send('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => send('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => send('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => send('post', E.COMPLAINT_ESCALATE(id)),
};

export default managerApi;
