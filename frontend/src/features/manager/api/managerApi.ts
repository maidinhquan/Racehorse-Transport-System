import { flow1, type PaymentConfirmation, type FormOptions } from '../../../shared/api/flow1';
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
  getCustomers: () => flow1<CustomerInfo[]>('get', '/manager/customers'),
  getHorses: () => flow1<HorseRef[]>('get', '/manager/horses'),
  getStaff: () => flow1<Staff[]>('get', '/manager/staff'),
  getRequests: () => flow1<TransportRequest[]>('get', '/manager/requests'),
  getRequest: (id: string) => flow1<TransportRequest>('get', `/manager/requests/${id}`),
  getTrips: () => flow1<Trip[]>('get', '/manager/trips'),
  getTransactions: () => flow1<Transaction[]>('get', '/manager/payments'),
  getNotifications: () => flow1<ManagerNotification[]>('get', '/manager/notifications'),
  markRead: (id: string) => flow1('post', `/manager/notifications/${id}/read`),
  markAllRead: () => flow1('post', '/manager/notifications/read-all'),
  acceptRequest: (id: string) => flow1<TransportRequest>('post', `/manager/requests/${id}/accept`),
  requestRevision: (id: string, feedback: string, fields: string[]) => flow1<TransportRequest>('post', `/manager/requests/${id}/request-changes`, { feedback, fields }),
  rejectRequest: (id: string, reason: string) => flow1<TransportRequest>('post', `/manager/requests/${id}/reject`, { reason }),
  cancelRequest: (id: string, reason: string) => flow1('post', `/manager/requests/${id}/cancel`, { reason }),
  decideCancellation: (id: string, approve: boolean, reason: string) => flow1('post', `/manager/contracts/${id}/cancellation/decision`, { decision: approve ? 'APPROVED' : 'REJECTED', reason }),
  getContractEditor: (id: string, mode?: string) => flow1<ContractEditorData>('get', `/manager/requests/${id}/contract-editor`, undefined, mode ? { mode } : undefined),
  saveContractDraft: (id: string, draft: ContractDraft) => flow1<{ requestId: string; contractId: string; versionNo: number; draft: ContractDraft }>('put', `/manager/requests/${id}/contract-draft`, {
    mode: draft.mode, departAt: draft.departAt, arriveAt: draft.arriveAt, budget: draft.budget,
    items: draft.items, depositPct: draft.depositPct, note: draft.note, exception: draft.exception, terms: draft.terms,
  }),
  discardContractDraft: (id: string) => flow1('delete', `/manager/requests/${id}/contract-draft`),
  publishContract: (id: string, versionNo: number) => flow1<{ contractId: string; versionNo: number; validUntil: string }>('post', `/manager/requests/${id}/contract/publish`, { versionNo }),
  respondContractChange: (id: string, versionNo: number, decision: 'ACCEPTED' | 'REJECTED', text: string) => flow1('post', `/manager/contracts/${id}/feedback/decision`, { versionNo, decision, text }),
  extendContract: (id: string, versionNo: number, reason: string) => flow1<{ validUntil: string }>('post', `/manager/contracts/${id}/extend-deadline`, { versionNo, reason }),
  remindSign: (id: string, _versionNo: number) => flow1('post', `/manager/contracts/${id}/reminder`),
  getCostEstimate: (id: string, body: { transportMode: string; departureAt: string; deliveryAt: string }) => flow1<CostPlanDto>('post', `/manager/requests/${id}/cost-estimate`, body),
  verifyTransaction: (id: string, body: PaymentConfirmation) => flow1('post', `/manager/payments/${id}/confirm`, body),
  rejectTransaction: (id: string, reason: string) => flow1('post', `/manager/payments/${id}/reject`, { reason }),
  confirmRefund: (contractId: string, reference: string, note: string) => flow1('post', `/manager/contracts/${contractId}/refund/complete`, { reference, note }),
  deployTrip: (id: string, body: { specialistId: string; coordinatorId: string }) => flow1<Trip>('post', `/manager/trips/${id}/assignment`, body),
  // Out-of-scope screens keep their existing routes; no fabricated successful response.
  getIncidents: () => flow1<Incident[]>('get', E.INCIDENTS),
  getComplaints: () => flow1<Complaint[]>('get', E.COMPLAINTS),
  getActualCosts: () => flow1<ActualCost[]>('get', E.ACTUAL_COST_LIST),
  closeRequest: (id: string) => flow1('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => flow1('post', E.COLLECTION_NOTE(id), { note }),
  decideRoute: (id: string, body: unknown) => flow1('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => flow1('post', E.FLIGHT_DECISION(id), body),
  approveDeparture: (id: string) => flow1('post', E.APPROVE_DEPARTURE(id)),
  resolveHandover: (id: string, body: unknown) => flow1('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => flow1('put', E.ACTUAL_COSTS(id), body),
  setIncidentStatus: (id: string, status: string) => flow1('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => flow1('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => flow1('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => flow1('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => flow1('post', E.COMPLAINT_ESCALATE(id)),
};
export default managerApi;
