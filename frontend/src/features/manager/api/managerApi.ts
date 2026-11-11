import type { ChangeReview, OptionKey } from '../../../shared/api/requestReviewApi';
import { apiRequest } from '../../../shared/api/apiRequest';
import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { formatNotification } from '../../../shared/utils/notificationFormat';
import { MANAGER_ENDPOINTS as E } from './managerEndpoints';
import type { ActualCost, Complaint, ContractDraft, ContractVersion, CustomerInfo, HorseRef, Incident, ManagerNotification, RoutePlan, Staff, Transaction, TransportMode, TransportRequest, Trip } from '../types';
import { attachContractFeedback, contractFromWire, documentKey, paymentFromWire, refundFromWire, type RefundEvidence, type WireContract, type WireHorse, type WirePayment } from '../../../shared/api/flow1Wire';
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


export interface ContractEditorData {
  request: TransportRequest; customer: CustomerInfo; horses: HorseRef[];
  draft: ContractDraft | null; currentContract: ContractVersion | null;
  versions: ContractVersion[];
  defaults: FormOptions & { terms: ContractDraft['terms'] };
}
type WireRequest = Record<string, any>;
// Backend giữ versionStatus = SIGNED sau khi ký, còn trạng thái thực nằm ở contractStatus (EFFECTIVE/FULFILLED).
// Hiển thị theo contractStatus để không còn báo "Đã ký – chờ cọc" khi hợp đồng đã có hiệu lực.
const versionFromWire = (v: WireContract): ContractVersion => {
  const c = contractFromWire(v) as unknown as ContractVersion;
  if (v.versionStatus === 'SIGNED' && ['EFFECTIVE', 'FULFILLED'].includes(v.contractStatus)) c.state = v.contractStatus as ContractVersion['state'];
  return c;
};
// Older requests can have null place fields (e.g. no postal code or city); the UI expects strings.
const PLACE_TEXT = ['name', 'address', 'postal', 'contact', 'phone', 'notes', 'cityId', 'cityName'];
const placeFromWire = (p: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, v == null && PLACE_TEXT.includes(k) ? '' : v])) as unknown as TransportRequest['pickup'];

const incidentTypeMap: Record<string, Incident['type']> = {
  VEHICLE_BREAKDOWN: 'VEHICLE',
  VEHICLE_RESOURCE: 'VEHICLE',
  VEHICLE: 'VEHICLE',
  BREAKDOWN: 'VEHICLE',
  HORSE_HEALTH: 'HORSE_HEALTH',
  HEALTH: 'HORSE_HEALTH',
  TRAFFIC_ACCIDENT: 'DELAY',
  ROAD_CLOSURE: 'DELAY',
  DELAY_AIR: 'DELAY',
  FLIGHT_DELAY: 'DELAY',
  DELAY: 'DELAY',
  ACCIDENT: 'DELAY',
  BORDER_DELAY: 'BORDER',
  BORDER: 'BORDER',
  OTHER: 'OTHER',
};

const incidentStatusMap: Record<string, Incident['status']> = {
  REPORTED: 'NEW',
  NEW: 'NEW',
  PLANNING: 'IN_PROGRESS',
  PENDING_APPROVAL: 'IN_PROGRESS',
  CHANGES_REQUESTED: 'IN_PROGRESS',
  EXECUTING: 'IN_PROGRESS',
  RECOVERY_APPLIED: 'IN_PROGRESS',
  RECOVERY_APPROVED: 'IN_PROGRESS',
  RECOVERY_REJECTED: 'IN_PROGRESS',
  IN_TRANSIT: 'IN_PROGRESS',
  CONTINUE_ALLOWED: 'IN_PROGRESS',
  RESULT_REPORTED: 'IN_PROGRESS',
  ESCALATED: 'ESCALATED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'CLOSED',
  CLOSED: 'CLOSED',
  HALTED: 'CLOSED',
};

export const incidentFromWire = (r: Record<string, any>): Incident => {
  const isEscalated = r.status === 'ESCALATED' || r.resolutionType === 'ESCALATED_TO_MANAGER';
  const hasPlan = Boolean(r.approvedPlan || (r.resolutionNotes && !isEscalated));
  const status = incidentStatusMap[r.status] || (isEscalated ? 'ESCALATED' : (hasPlan ? 'IN_PROGRESS' : 'NEW'));

  return {
    id: r.incidentId || r.id,
    tripId: r.tripId,
    type: incidentTypeMap[r.category || r.incidentType || r.type] || 'OTHER',
    severity: r.severity || 'MEDIUM',
    status,
    at: r.reportedAt ? r.reportedAt.replace('T', ' ').slice(0, 16) : (r.at || ''),
    by: r.reportedByUserName || r.reportedByUserId || r.by || 'Tài xế / Áp tải',
    location: r.location || (r.locationCoordinates ? `Tọa độ: ${r.locationCoordinates}` : 'Trên đường vận chuyển'),
    horseId: r.horseId,
    description: r.description || '',
    safety: r.safety || r.immediateCare || 'Người và ngựa an toàn hoặc đã được sơ cứu',
    photos: Array.isArray(r.photos) ? r.photos : (r.imageUrl ? [r.imageUrl] : []),
    plans: Array.isArray(r.plans) && r.plans.length
      ? r.plans
      : (hasPlan && !isEscalated ? [{
          id: 'PLAN-APPROVED',
          kind: r.resolutionType || 'NO_CHANGE',
          desc: r.approvedPlan || r.resolutionNotes || 'Phương án xử lý đã được duyệt',
          cost: 0,
          payer: 'COMPANY',
          status: 'APPROVED',
          at: r.reportedAt || '',
          by: 'Điều phối viên',
        }] : []),
    log: Array.isArray(r.log) ? r.log : [],
  };
};
const requestFromWire = (r: WireRequest): TransportRequest => ({ ...r,
  id: r.id, customerId: r.customerId, origin: r.origin, destination: r.destination,
  horses: r.horses ?? [], pickup: placeFromWire(r.pickup), delivery: placeFromWire(r.delivery),
  date: r.expectedDeliveryDate ?? '', pickupAt: r.expectedTransportDate ?? '', careNotes: r.careInstructions ?? '',
  submittedAt: r.createdAt ?? '', feedback: r.revisionFeedback ?? '',
  reason: r.reason ?? r.rejectionReason ?? r.cancellation?.reason ?? '', status: r.status,
  refund: r.refund?.refundStatus ? refundFromWire(r.refund) : r.refund ?? undefined,
  history: [], collection: [], versions: attachContractFeedback((r.versions ?? []).filter((v: WireContract) => v.versionStatus !== 'DRAFT').map(versionFromWire), r.contractFeedback),
  dossier: (r.dossier ?? []).map((d: any) => ({ ...d, name: documentKey(d.key),
    status: d.status === 'SUBMITTED' ? 'PENDING_REVIEW' : d.status, file: d.file?.url,
  })),
} as TransportRequest);
/** Phương án Điều phối gửi (PlanDto của backend) → RoutePlan của trang Quản lý. Bản nháp chưa gửi thì bỏ qua. */
const routeFromPlan = (p: any): RoutePlan | undefined => {
  if (!p || !Array.isArray(p.stops) || p.status === 'DRAFT') return undefined;
  return {
    v: p.planVersion || 1,
    status: (p.status === 'RETURNED' ? 'CHANGES_REQUESTED' : p.status) as RoutePlan['status'],
    pickupAt: p.pickupAt || undefined,
    submittedAt: p.submittedAt || '',
    stops: p.stops.map((s: any) => ({ name: s.name, type: s.type, plannedAt: s.arriveAt || s.departAt || '', lat: s.geo?.lat, lng: s.geo?.lng })),
    vehicle: p.vehicleLabel || undefined,
    crew: (p.crewLabels || []).filter((x: any) => Array.isArray(x) && x.length >= 2).map((x: any) => [x[0], x[1]] as [string, string]),
    resourcesConfirmed: true,
    note: p.note || undefined,
    decisionNote: p.decisionNote || undefined,
    decidedAt: p.decidedAt || undefined,
  };
};
const tripFromWire = (t: any): Trip => ({ ...t,
  deployment: { ...t.deployment, specialistId: t.specialistId, coordinatorId: t.coordinatorId, holdReason: t.deployment?.reason },
  milestones: [], etaHistory: [],
  readiness: { insurance: 'MISSING', quarantineOk: false, ...t.readiness, docsReady: t.readiness?.docsReady ?? 0, docsTotal: t.readiness?.docsTotal ?? 0, docsReadyAt: t.readiness?.docsReadyAt || undefined },
});
const horseFromWire = (h: WireHorse): HorseRef => ({ ...h, breed: h.breed ?? '', passportNo: h.passport?.number ?? '' });
export const managerApi = {
  getCustomers: async () => (await contractClient<Array<{ id: string; fullName: string; email: string; phone: string }>>('get', '/manager/customers')).map(p => ({ ...p, name: p.fullName, company: '' })),
  getHorses: async () => (await contractClient<WireHorse[]>('get', '/manager/horses')).map(horseFromWire),
  getStaff: () => contractClient<Staff[]>('get', '/manager/staff'),
  getRequests: async () => (await contractClient<WireRequest[]>('get', '/manager/requests')).map(requestFromWire),
  getRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('get', `/manager/requests/${id}`)),
  /** Phương án Điều phối gửi cho một chuyến (undefined nếu chưa gửi / đã hủy gửi). */
  getTripPlan: async (id: string): Promise<RoutePlan | undefined> => {
    try { return routeFromPlan(await apiRequest<any>('get', E.TRIP_PLAN(id))); } catch { return undefined; }
  },
  getTrip: async (id: string) => {
    const t = tripFromWire(await contractClient('get', `/manager/trips/${id}`));
    if (!t.route) { try { const r = routeFromPlan(await apiRequest<any>('get', E.TRIP_PLAN(t.id))); if (r) t.route = r; } catch { /* chưa có phương án */ } }
    return t;
  },
  /** F1-J69: server asks VNPay first; only an expired, unconfirmed session is cancelled (customer can pay again). */
  cancelPayment: async (id: string, reason: string) => ({ ...paymentFromWire(await contractClient<WirePayment>('post', `/manager/payments/${id}/cancel`, { reason })), requestId: '' } as Transaction),
  /** Manager xác nhận tay khi VNPay không báo IPN: server hỏi VNPay trước, nếu không có kết quả thì ghi cọc và gắn cờ đối soát. */
  confirmPayment: async (id: string, reason: string) => ({ ...paymentFromWire(await contractClient<WirePayment>('post', `/manager/payments/${id}/confirm`, { reason })), requestId: '' } as Transaction),
  getPayment: async (id: string) => ({ ...paymentFromWire(await contractClient<WirePayment>('get', `/manager/payments/${id}`)), requestId: '' } as Transaction),
  getContractVersion: async (id: string, versionNo: number) => versionFromWire(await contractClient<WireContract>('get', `/manager/contracts/${id}/versions/${versionNo}`)),
  /** Chỉ lấy số liệu sẵn sàng (hồ sơ, bảo hiểm, kiểm dịch) của các chuyến để làm mới nhẹ, không gọi lại phương án tuyến */
  getTripReadiness: async () => (await contractClient<any[]>('get', '/manager/trips')).map((t) => ({ id: t.id as string, readiness: tripFromWire(t).readiness })),
  getTrips: async () => {
    const list = (await contractClient<any[]>('get', '/manager/trips')).map(tripFromWire);
    // Gắn phương án tuyến Điều phối đã gửi (lưu trên backend) cho các chuyến chưa có route
    await Promise.all(list.map(async (t) => {
      if (t.route) return;
      try { const r = routeFromPlan(await apiRequest<any>('get', E.TRIP_PLAN(t.id))); if (r) t.route = r; } catch { /* chưa có phương án */ }
    }));
    return list;
  },
  getTransactions: async () => (await contractClient<WirePayment[]>('get', '/manager/payments')).map(p => ({ ...paymentFromWire(p), requestId: '' } as Transaction)),
  // Backend sends `body` (same as customer) and customer-side links; map to the manager UI shape.
  getNotifications: async (): Promise<ManagerNotification[]> =>
    (await contractClient<Array<{ id: string; at: string; title?: string | null; body?: string | null; read: boolean; link?: string | null }>>('get', '/manager/notifications'))
      .map(n => {
        const formatted = formatNotification({ id: n.id, title: n.title, body: n.body, at: n.at, read: n.read, link: n.link });
        return {
          id: formatted.id,
          at: formatted.at,
          title: formatted.title,
          text: formatted.body,
          read: formatted.read,
          link: (formatted.link || '').replace(/^\/customer\//, '/manager/'),
        };
      }),
  markRead: (id: string) => contractClient('post', `/manager/notifications/${id}/read`),
  markAllRead: () => contractClient('post', '/manager/notifications/read-all'),
  acceptRequest: async (id: string, key: OptionKey) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/accept`, key)),
  requestRevision: async (id: string, feedback: string, key: ChangeReview) =>
    requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/request-changes`, { ...key, feedback })),
  rejectRequest: async (id: string, reason: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/reject`, { reason })),
  cancelRequest: (id: string, reason: string) => contractClient('post', `/manager/requests/${id}/cancel`, { reason }),
  decideCancellation: (id: string, approve: boolean, reason: string) => contractClient('post', `/manager/contracts/${id}/cancellation/decision`, { decision: approve ? 'APPROVED' : 'REJECTED', reason }),
  getContractEditor: async (id: string, mode?: TransportMode): Promise<ContractEditorData> => {
    const data = await contractClient<any>('get', `/manager/requests/${id}/contract-editor`, undefined, mode ? { mode } : undefined);
    const budget: ContractDraft['budget'] = { TRANSPORT: 0, STAFF: 0, PROCEDURE: 0, VET: 0, INSURANCE: 0 };
    const keys: Record<string, keyof typeof budget> = { TRANSPORT: 'TRANSPORT', CREW: 'STAFF', PERMIT: 'PROCEDURE', VET: 'VET', INSURANCE: 'INSURANCE' };
    for (const item of data.internalCosts ?? []) {
      const key = keys[item.categoryName]; if (key) budget[key] = item.totalMoney;
    }
    const draft = data.draft ? { ...versionFromWire(data.draft), budget, exception: '' } as ContractDraft : null;
    return { ...data, draft, customer: { ...data.customer, company: '' }, horses: data.horses.map(horseFromWire),
      request: requestFromWire(data.request), versions: attachContractFeedback(data.versions.map(versionFromWire), data.request?.contractFeedback), currentContract: data.currentContract ? versionFromWire(data.currentContract) : null };
  },
  saveContractDraft: (id: string, draft: ContractDraft) => contractClient<{ requestId: string; contractId: string; versionNo: number; status: string; savedAt: string }>('put', `/manager/requests/${id}/contract-draft`, {
    mode: draft.mode, departAt: draft.departAt, arriveAt: draft.arriveAt,
    // Internal cost estimate was removed from the editor; backend still expects the field.
    budget: { TRANSPORT: 0, PROCEDURE: 0, VET: 0, INSURANCE: 0, STAFF: 0 },
    // Send only the fields in the contract (UI keeps extra keys such as ids on lines/terms).
    items: draft.items.map(i => ({ desc: i.desc, amount: Math.round(Number(i.amount) || 0), required: !!i.required })),
    depositPct: draft.depositPct, note: draft.note, exception: '',
    terms: draft.terms.map(t => ({ title: t.title, text: t.text })),
  }),
  discardContractDraft: (id: string) => contractClient('delete', `/manager/requests/${id}/contract-draft`),
  publishContract: (id: string, versionNo: number) => contractClient<{ contractId: string; versionNo: number; validUntil: string }>('post', `/manager/requests/${id}/contract/publish`, { versionNo }),
  respondContractChange: (id: string, versionNo: number, decision: 'ACCEPTED' | 'REJECTED', text: string) => contractClient('post', `/manager/contracts/${id}/feedback/decision`, { versionNo, decision, text }),
  extendContract: (id: string, versionNo: number, reason: string) => contractClient<{ newDeadline: string }>('post', `/manager/contracts/${id}/extend-deadline`, { versionNo, reason }),
  remindSign: (id: string, _versionNo: number) => contractClient('post', `/manager/contracts/${id}/reminder`),
  getCostEstimate: (id: string, body: { transportMode: string; departureAt: string; deliveryAt: string }) => contractClient<CostPlanDto>('post', `/manager/requests/${id}/cost-estimate`, body),
  startRefund: (contractId: string) => contractClient('post', `/manager/contracts/${contractId}/refund/start`),
  confirmRefund: (contractId: string, evidence: RefundEvidence) =>
    contractClient('post', `/manager/contracts/${contractId}/refund/complete`, evidence),
  deployTrip: async (id: string, body: { specialistId: string; coordinatorId: string }) => tripFromWire(await contractClient('post', `/manager/trips/${id}/assignment`, body)),
  holdTrip: async (id: string, reason: string) => tripFromWire(await contractClient('post', `/manager/trips/${id}/hold`, { reason })),
  resumeTrip: async (id: string) => tripFromWire(await contractClient('post', `/manager/trips/${id}/resume`)),
  // Flow 3: Manager route review & planning endpoints
  getPlanningTrips: () => apiRequest('get', E.PLANNING),
  getTripRoute: (tripId: string) => apiRequest('get', E.TRIP_ROUTE(tripId)),
  approveRoute: async (tripId: string, routeVersionId: number, body?: { expectedVersion?: number; note?: string }) => {
    try {
      return await apiRequest('post', E.PLAN_DECISION_F3(tripId), {
        expectedVersion: body?.expectedVersion ?? 0,
        planVersion: routeVersionId,
        decision: 'APPROVE',
        reason: body?.note ?? 'Approved by Manager',
      });
    } catch {
      return await apiRequest('post', E.APPROVE_ROUTE(tripId, routeVersionId), {
        expectedVersion: body?.expectedVersion ?? routeVersionId,
        note: body?.note ?? 'Approved by Manager',
      });
    }
  },
  returnRoute: async (tripId: string, routeVersionId: number, reason: string, expectedVersion?: number) => {
    try {
      return await apiRequest('post', E.PLAN_DECISION_F3(tripId), {
        expectedVersion: expectedVersion ?? 0,
        planVersion: routeVersionId,
        decision: 'RETURN',
        reason,
      });
    } catch {
      return await apiRequest('post', E.RETURN_ROUTE(tripId, routeVersionId), {
        expectedVersion: expectedVersion ?? routeVersionId,
        reason,
      });
    }
  },
  getDepartureConditions: (tripId: string) => apiRequest('get', E.DEPARTURE_CONDITIONS(tripId)),
  // Flow 3 v3 Relocation endpoints
  sendPickupRelocation: (tripId: string, body: { expectedVersion: number; relocationId: string; proposalVersion: number }) =>
    apiRequest('post', E.SEND_RELOCATION_F3(tripId), body),
  decidePickupRelocation: (tripId: string, body: { expectedVersion: number; relocationId: string; decision: 'APPROVE' | 'RETURN'; reason?: string }) =>
    apiRequest('post', E.RELOCATION_DECISION_F3(tripId), body),
  // Out-of-scope screens keep their existing routes; no fabricated successful response.
  getIncidents: async (): Promise<Incident[]> => {
    const list = await apiRequest<Record<string, any>[]>('get', E.INCIDENTS);
    return Array.isArray(list) ? list.map(incidentFromWire) : [];
  },
  getComplaints: () => apiRequest<Complaint[]>('get', E.COMPLAINTS),
  getActualCosts: () => apiRequest<ActualCost[]>('get', E.ACTUAL_COST_LIST),
  closeRequest: (id: string) => apiRequest('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => apiRequest('post', E.COLLECTION_NOTE(id), { note }),
  decideRoute: (id: string, body: unknown) => apiRequest('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => apiRequest('post', E.FLIGHT_DECISION(id), body),
  /** F3-J17 rồi F3-J18: lấy phiên bản hiện tại của chuyến, backend kiểm tra lại điều kiện khởi hành khi duyệt */
  approveDeparture: async (id: string) => {
    const readiness = await apiRequest<{ binding?: { expectedVersion?: number }; approvedPlanVersion?: number; readinessVersion?: number }>('get', E.READINESS(id));
    return apiRequest('post', E.APPROVE_DEPARTURE(id), {
      expectedVersion: readiness.binding?.expectedVersion ?? 0,
      approvedPlanVersion: readiness.approvedPlanVersion ?? 0,
      readinessVersion: readiness.readinessVersion ?? 0,
    });
  },
  resolveHandover: (id: string, body: unknown) => apiRequest('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => apiRequest('put', E.ACTUAL_COSTS(id), body),
  setIncidentStatus: (id: string, status: string) => apiRequest('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => apiRequest('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => apiRequest('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => apiRequest('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => apiRequest('post', E.COMPLAINT_ESCALATE(id)),
};
export default managerApi;
