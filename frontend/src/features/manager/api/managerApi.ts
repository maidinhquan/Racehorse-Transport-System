import { apiRequest } from '../../../shared/api/apiRequest';
import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { MANAGER_ENDPOINTS as E } from './managerEndpoints';
import type { ActualCost, Complaint, ContractDraft, ContractVersion, CustomerInfo, HorseRef, Incident, ManagerNotification, Staff, Transaction, TransportRequest, Trip } from '../types';
import { attachContractFeedback, contractFromWire, documentKey, paymentFromWire, type WireContract, type WireHorse, type WirePayment } from '../../../shared/api/flow1Wire';
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
  defaults: Omit<FormOptions, 'supportedRoutes'> & { terms: ContractDraft['terms'] };
}
type WireRequest = Record<string, any>;
const versionFromWire = (v: WireContract): ContractVersion => contractFromWire(v) as unknown as ContractVersion;
// Older requests can have null place fields (e.g. no postal code or city); the UI expects strings.
const PLACE_TEXT = ['name', 'address', 'postal', 'contact', 'phone', 'notes', 'cityId', 'cityName'];
const placeFromWire = (p: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, v == null && PLACE_TEXT.includes(k) ? '' : v])) as unknown as TransportRequest['pickup'];
const requestFromWire = (r: WireRequest): TransportRequest => ({ ...r,
  id: r.id, customerId: r.customerId, origin: r.origin, destination: r.destination,
  horses: r.horses ?? [], pickup: placeFromWire(r.pickup), delivery: placeFromWire(r.delivery),
  date: r.expectedDeliveryDate ?? '', pickupAt: r.expectedTransportDate ?? '', careNotes: r.careInstructions ?? '',
  submittedAt: r.createdAt ?? '', feedback: r.revisionFeedback ?? '',
  reason: r.reason ?? r.rejectionReason ?? r.cancellation?.reason ?? '', status: r.status,
  history: [], collection: [], versions: attachContractFeedback((r.versions ?? []).filter((v: WireContract) => v.versionStatus !== 'DRAFT').map(versionFromWire), r.contractFeedback),
  dossier: (r.dossier ?? []).map((d: any) => ({ ...d, name: documentKey(d.key),
    status: d.status === 'SUBMITTED' ? 'PENDING_REVIEW' : d.status, file: d.file?.url,
  })),
} as TransportRequest);
const tripFromWire = (t: any): Trip => ({ ...t,
  deployment: { ...t.deployment, specialistId: t.specialistId, coordinatorId: t.coordinatorId, holdReason: t.deployment?.reason },
  milestones: [], etaHistory: [],
  readiness: { docsReady: 0, docsTotal: 0, insurance: 'MISSING', quarantineOk: false },
});
const horseFromWire = (h: WireHorse): HorseRef => ({ ...h, breed: h.breed ?? '', passportNo: h.passport?.number ?? '' });
export const managerApi = {
  getCustomers: async () => (await contractClient<Array<{ id: string; fullName: string; email: string; phone: string }>>('get', '/manager/customers')).map(p => ({ ...p, name: p.fullName, company: '' })),
  getHorses: async () => (await contractClient<WireHorse[]>('get', '/manager/horses')).map(horseFromWire),
  getStaff: () => contractClient<Staff[]>('get', '/manager/staff'),
  getRequests: async () => (await contractClient<WireRequest[]>('get', '/manager/requests')).map(requestFromWire),
  getRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('get', `/manager/requests/${id}`)),
  getTrip: async (id: string) => tripFromWire(await contractClient('get', `/manager/trips/${id}`)),
  getPayment: async (id: string) => ({ ...paymentFromWire(await contractClient<WirePayment>('get', `/manager/payments/${id}`)), requestId: '' } as Transaction),
  getContractVersion: async (id: string, versionNo: number) => versionFromWire(await contractClient<WireContract>('get', `/manager/contracts/${id}/versions/${versionNo}`)),
  getTrips: async () => (await contractClient<any[]>('get', '/manager/trips')).map(tripFromWire),
  getTransactions: async () => (await contractClient<WirePayment[]>('get', '/manager/payments')).map(p => ({ ...paymentFromWire(p), requestId: '' } as Transaction)),
  // Backend sends `body` (same as customer) and customer-side links; map to the manager UI shape.
  getNotifications: async (): Promise<ManagerNotification[]> =>
    (await contractClient<Array<{ id: string; at: string; title?: string | null; body?: string | null; read: boolean; link?: string | null }>>('get', '/manager/notifications'))
      .map(n => ({ id: n.id, at: n.at, title: n.title ?? '', text: n.body ?? '', read: n.read, link: (n.link ?? '').replace(/^\/customer\//, '/manager/') })),
  markRead: (id: string) => contractClient('post', `/manager/notifications/${id}/read`),
  markAllRead: () => contractClient('post', '/manager/notifications/read-all'),
  acceptRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/accept`)),
  requestRevision: async (id: string, feedback: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/request-changes`, { feedback })),
  rejectRequest: async (id: string, reason: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/reject`, { reason })),
  cancelRequest: (id: string, reason: string) => contractClient('post', `/manager/requests/${id}/cancel`, { reason }),
  decideCancellation: (id: string, approve: boolean, reason: string) => contractClient('post', `/manager/contracts/${id}/cancellation/decision`, { decision: approve ? 'APPROVED' : 'REJECTED', reason }),
  getContractEditor: async (id: string): Promise<ContractEditorData> => {
    const data = await contractClient<any>('get', `/manager/requests/${id}/contract-editor`);
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
    departAt: draft.departAt, arriveAt: draft.arriveAt,
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
  confirmRefund: (contractId: string) => contractClient('post', `/manager/contracts/${contractId}/refund/complete`),
  deployTrip: async (id: string, body: { specialistId: string; coordinatorId: string }) => tripFromWire(await contractClient('post', `/manager/trips/${id}/assignment`, body)),
  holdTrip: async (id: string, reason: string) => tripFromWire(await contractClient('post', `/manager/trips/${id}/hold`, { reason })),
  resumeTrip: async (id: string) => tripFromWire(await contractClient('post', `/manager/trips/${id}/resume`)),
  // Flow 3: Manager route review & planning endpoints
  getPlanningTrips: () => apiRequest('get', E.PLANNING),
  getTripRoute: (tripId: string) => apiRequest('get', E.TRIP_ROUTE(tripId)),
  approveRoute: (tripId: string, routeVersionId: number, body?: { expectedVersion?: number; note?: string }) =>
    apiRequest('post', E.APPROVE_ROUTE(tripId, routeVersionId), { expectedVersion: body?.expectedVersion ?? routeVersionId, note: body?.note ?? 'Approved by Manager' }),
  returnRoute: (tripId: string, routeVersionId: number, reason: string, expectedVersion?: number) =>
    apiRequest('post', E.RETURN_ROUTE(tripId, routeVersionId), { expectedVersion: expectedVersion ?? routeVersionId, reason }),
  getDepartureConditions: (tripId: string) => apiRequest('get', E.DEPARTURE_CONDITIONS(tripId)),
  // Out-of-scope screens keep their existing routes; no fabricated successful response.
  getIncidents: () => apiRequest<Incident[]>('get', E.INCIDENTS),
  getComplaints: () => apiRequest<Complaint[]>('get', E.COMPLAINTS),
  getActualCosts: () => apiRequest<ActualCost[]>('get', E.ACTUAL_COST_LIST),
  closeRequest: (id: string) => apiRequest('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => apiRequest('post', E.COLLECTION_NOTE(id), { note }),
  decideRoute: (id: string, body: unknown) => apiRequest('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => apiRequest('post', E.FLIGHT_DECISION(id), body),
  approveDeparture: (id: string) => apiRequest('post', E.APPROVE_DEPARTURE(id)),
  resolveHandover: (id: string, body: unknown) => apiRequest('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => apiRequest('put', E.ACTUAL_COSTS(id), body),
  setIncidentStatus: (id: string, status: string) => apiRequest('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => apiRequest('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => apiRequest('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => apiRequest('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => apiRequest('post', E.COMPLAINT_ESCALATE(id)),
};
export default managerApi;
