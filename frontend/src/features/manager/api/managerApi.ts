import { apiRequest } from '../../../shared/api/apiRequest';
import { contractClient, type FormOptions } from '../../../shared/api/contractClient';
import { MANAGER_ENDPOINTS as E } from './managerEndpoints';
import type { ActualCost, Complaint, ContractDraft, ContractVersion, CustomerInfo, HorseRef, Incident, ManagerNotification, Staff, Transaction, TransportRequest, Trip } from '../types';
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
type WireRequest = Omit<TransportRequest, 'history' | 'status' | 'versions'> & { status: TransportRequest['status'] | 'IN_PROGRESS'; versions: Array<Omit<ContractVersion, 'extensions'>> };
const versionFromWire = (v: Omit<ContractVersion, 'extensions'>): ContractVersion => ({ ...v, extensions: [] });
const requestFromWire = (r: WireRequest): TransportRequest => ({ ...r, status: r.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : r.status, history: [], versions: r.versions.map(versionFromWire) });
export const managerApi = {
  getCustomers: () => contractClient<CustomerInfo[]>('get', '/manager/customers'),
  getHorses: () => contractClient<HorseRef[]>('get', '/manager/horses'),
  getStaff: () => contractClient<Staff[]>('get', '/manager/staff'),
  getRequests: async () => (await contractClient<WireRequest[]>('get', '/manager/requests')).map(requestFromWire),
  getRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('get', `/manager/requests/${id}`)),
  getTrip: (id: string) => contractClient<Trip>('get', `/manager/trips/${id}`),
  getPayment: (id: string) => contractClient<Transaction>('get', `/manager/payments/${id}`),
  getContractVersion: async (id: string, versionNo: number) => versionFromWire(await contractClient<Omit<ContractVersion, 'extensions'>>('get', `/manager/contracts/${id}/versions/${versionNo}`)),
  getTrips: () => contractClient<Trip[]>('get', '/manager/trips'),
  getTransactions: () => contractClient<Transaction[]>('get', '/manager/payments'),
  getNotifications: () => contractClient<ManagerNotification[]>('get', '/manager/notifications'),
  markRead: (id: string) => contractClient('post', `/manager/notifications/${id}/read`),
  markAllRead: () => contractClient('post', '/manager/notifications/read-all'),
  acceptRequest: async (id: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/accept`)),
  requestRevision: async (id: string, feedback: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/request-changes`, { feedback })),
  rejectRequest: async (id: string, reason: string) => requestFromWire(await contractClient<WireRequest>('post', `/manager/requests/${id}/reject`, { reason })),
  cancelRequest: (id: string, reason: string) => contractClient('post', `/manager/requests/${id}/cancel`, { reason }),
  decideCancellation: (id: string, approve: boolean, reason: string) => contractClient('post', `/manager/contracts/${id}/cancellation/decision`, { decision: approve ? 'APPROVED' : 'REJECTED', reason }),
  getContractEditor: async (id: string, mode?: string): Promise<ContractEditorData> => {
    const data = await contractClient<Omit<ContractEditorData, 'request' | 'versions' | 'currentContract'> & { request: WireRequest; versions: Array<Omit<ContractVersion, 'extensions'>>; currentContract: Omit<ContractVersion, 'extensions'> | null }>('get', `/manager/requests/${id}/contract-editor`, undefined, mode ? { mode } : undefined);
    return { ...data, request: requestFromWire(data.request), versions: data.versions.map(versionFromWire), currentContract: data.currentContract ? versionFromWire(data.currentContract) : null };
  },
  saveContractDraft: (id: string, draft: ContractDraft) => contractClient<{ requestId: string; contractId: string; versionNo: number; draft: ContractDraft }>('put', `/manager/requests/${id}/contract-draft`, {
    mode: draft.mode, departAt: draft.departAt, arriveAt: draft.arriveAt, budget: draft.budget,
    items: draft.items, depositPct: draft.depositPct, note: draft.note, exception: draft.exception, terms: draft.terms,
  }),
  discardContractDraft: (id: string) => contractClient('delete', `/manager/requests/${id}/contract-draft`),
  publishContract: (id: string, versionNo: number) => contractClient<{ contractId: string; versionNo: number; validUntil: string }>('post', `/manager/requests/${id}/contract/publish`, { versionNo }),
  respondContractChange: (id: string, versionNo: number, decision: 'ACCEPTED' | 'REJECTED', text: string) => contractClient('post', `/manager/contracts/${id}/feedback/decision`, { versionNo, decision, text }),
  extendContract: (id: string, versionNo: number, reason: string) => contractClient<{ validUntil: string }>('post', `/manager/contracts/${id}/extend-deadline`, { versionNo, reason }),
  remindSign: (id: string, _versionNo: number) => contractClient('post', `/manager/contracts/${id}/reminder`),
  getCostEstimate: (id: string, body: { transportMode: string; departureAt: string; deliveryAt: string }) => contractClient<CostPlanDto>('post', `/manager/requests/${id}/cost-estimate`, body),
  confirmRefund: (contractId: string) => contractClient('post', `/manager/contracts/${contractId}/refund/complete`),
  deployTrip: (id: string, body: { specialistId: string; coordinatorId: string }) => contractClient<Trip>('post', `/manager/trips/${id}/assignment`, body),
  holdTrip: (id: string, reason: string) => contractClient<Trip>('post', `/manager/trips/${id}/hold`, { reason }),
  resumeTrip: (id: string) => contractClient<Trip>('post', `/manager/trips/${id}/resume`),
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
