import { operationsClient as call } from './operationsClient';
import type { IncidentPlan, IncidentReport, OperationsComplaint, OperationsIncident, OperationsRole, RequestCases, ServerAcceptance, SettlementSummary, TimedDocuments } from '../types/operations';
export const operationsApi = {
  timedDocuments: (role: 'specialist' | 'coordinator', tripId: string) => call<TimedDocuments>('get', `/${role}/trips/${tripId}/timed-documents`),
  sendTimedDocuments: (tripId: string) => call<TimedDocuments>('post', `/specialist/trips/${tripId}/timed-documents/send`),
  scheduleTimedDocuments: (tripId: string, version: number, plannedDepart: string) => call<TimedDocuments>('post', `/coordinator/trips/${tripId}/timed-documents/schedule`, { version, plannedDepart }),
  incidents: (role: OperationsRole) => call<OperationsIncident[]>('get', `/${role}/incidents`),
  complaints: (role: Exclude<OperationsRole, 'driver'>) => call<OperationsComplaint[]>('get', `/${role}/complaints`),
  reportIncident: (role: OperationsRole, body: IncidentReport) => call<OperationsIncident>('post', `/${role}/incidents`, body),
  incident: (role: OperationsRole, id: string) => call<OperationsIncident>('get', `/${role}/incidents/${id}`),
  proposePlan: (role: 'specialist' | 'coordinator', id: string, body: Pick<IncidentPlan, 'kind' | 'desc' | 'cost' | 'payer'>) => call<OperationsIncident>('post', `/${role}/incidents/${id}/plans`, body),
  decidePlan: (id: string, planId: string, decision: 'APPROVED' | 'REJECTED', note: string) => call<OperationsIncident>('post', `/manager/incidents/${id}/plans/${planId}/decision`, { decision, note }),
  updateIncident: (id: string, status: 'IN_PROGRESS' | 'CLOSED') => call<OperationsIncident>('put', `/manager/incidents/${id}/status`, { status }),
  requestCases: (id: string) => call<RequestCases>('get', `/customer/requests/${id}/cases`),
  createComplaint: (body: { requestId: string; horseId?: string; type: OperationsComplaint['type']; title: string; description: string }) => call<OperationsComplaint>('post', '/customer/complaints', body),
  replyComplaint: (id: string, text: string, propose: boolean, amount: number) => call<OperationsComplaint>('post', `/manager/complaints/${id}/reply`, { text, propose, amount }),
  recordResolution: (id: string, text: string, amount: number, reference: string) => call<OperationsComplaint>('post', `/manager/complaints/${id}/resolution`, { text, amount, reference }),
  acceptResolution: (id: string, decision: 'ACCEPTED' | 'REJECTED') => call<OperationsComplaint>('post', `/customer/complaints/${id}/resolution`, { decision }),
  applySettlement: (id: string, amount: number, note: string) => call<SettlementSummary>('post', `/manager/complaints/${id}/settlement`, { amount, note }),
  settlement: (id: string) => call<SettlementSummary>('get', `/customer/requests/${id}/settlement`),
  acceptHandover: (id: string) => call<ServerAcceptance>('post', `/customer/requests/${id}/acceptance`),
};
