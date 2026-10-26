import { contractClient, type PaymentConfirmation, type FormOptions } from '../../../shared/api/contractClient';
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
export const managerApi = {
  getCustomers: () => contractClient<CustomerInfo[]>('get', '/manager/customers'),
  getHorses: () => contractClient<HorseRef[]>('get', '/manager/horses'),
  getStaff: () => contractClient<Staff[]>('get', '/manager/staff'),
  getRequests: () => contractClient<TransportRequest[]>('get', '/manager/requests'),
  getRequest: (id: string) => contractClient<TransportRequest>('get', `/manager/requests/${id}`),
  getTrips: () => contractClient<Trip[]>('get', '/manager/trips'),
  getTransactions: () => contractClient<Transaction[]>('get', '/manager/payments'),
  getNotifications: () => contractClient<ManagerNotification[]>('get', '/manager/notifications'),
  markRead: (id: string) => contractClient('post', `/manager/notifications/${id}/read`),
  markAllRead: () => contractClient('post', '/manager/notifications/read-all'),
  acceptRequest: (id: string) => contractClient<TransportRequest>('post', `/manager/requests/${id}/accept`),
  requestRevision: (id: string, feedback: string, fields: string[]) => contractClient<TransportRequest>('post', `/manager/requests/${id}/request-changes`, { feedback, fields }),
  rejectRequest: (id: string, reason: string) => contractClient<TransportRequest>('post', `/manager/requests/${id}/reject`, { reason }),
  cancelRequest: (id: string, reason: string) => contractClient('post', `/manager/requests/${id}/cancel`, { reason }),
  decideCancellation: (id: string, approve: boolean, reason: string) => contractClient('post', `/manager/contracts/${id}/cancellation/decision`, { decision: approve ? 'APPROVED' : 'REJECTED', reason }),
  getContractEditor: (id: string, mode?: string) => contractClient<ContractEditorData>('get', `/manager/requests/${id}/contract-editor`, undefined, mode ? { mode } : undefined),
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
  verifyTransaction: (id: string, body: PaymentConfirmation) => contractClient('post', `/manager/payments/${id}/confirm`, body),
  rejectTransaction: (id: string, reason: string) => contractClient('post', `/manager/payments/${id}/reject`, { reason }),
  confirmRefund: (contractId: string, reference: string, note: string) => contractClient('post', `/manager/contracts/${contractId}/refund/complete`, { reference, note }),
  deployTrip: (id: string, body: { specialistId: string; coordinatorId: string }) => contractClient<Trip>('post', `/manager/trips/${id}/assignment`, body),
  // Out-of-scope screens keep their existing routes; no fabricated successful response.
  getIncidents: () => contractClient<Incident[]>('get', E.INCIDENTS),
  getComplaints: () => contractClient<Complaint[]>('get', E.COMPLAINTS),
  getActualCosts: () => contractClient<ActualCost[]>('get', E.ACTUAL_COST_LIST),
  closeRequest: (id: string) => contractClient('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => contractClient('post', E.COLLECTION_NOTE(id), { note }),
  decideRoute: (id: string, body: unknown) => contractClient('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => contractClient('post', E.FLIGHT_DECISION(id), body),
  approveDeparture: (id: string) => contractClient('post', E.APPROVE_DEPARTURE(id)),
  resolveHandover: (id: string, body: unknown) => contractClient('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => contractClient('put', E.ACTUAL_COSTS(id), body),
  setIncidentStatus: (id: string, status: string) => contractClient('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => contractClient('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => contractClient('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => contractClient('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => contractClient('post', E.COMPLAINT_ESCALATE(id)),
};
export default managerApi;
