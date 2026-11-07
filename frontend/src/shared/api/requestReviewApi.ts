import { contractClient } from './contractClient';
import { downloadFile } from './downloadFile';

export type Reviewer = 'coordinator' | 'specialist';
export type Mode = 'ROAD' | 'AIR';
export type Feasibility = 'FEASIBLE' | 'NOT_FEASIBLE';
export type SpecialistResult = Feasibility | 'NEEDS_SUPPLEMENT';
export type ItemStatus = 'VERIFIED' | 'MISSING' | 'INVALID' | 'NEEDS_FOLLOW_UP';
export interface ReviewKey { reviewId: string; requestRevision: number }
export interface OptionKey extends ReviewKey { scheduleOptionId: string }
export interface QueueItem extends ReviewKey {
  requestId: string; origin: string; destination: string; expectedTransportDate: string;
}
export interface Schedule {
  mode: Mode; expectedTransportDate: string; expectedDeliveryDate: string;
}
export interface ChecklistSource {
  checklistItemId: string; horseId: string; horseName: string; documentType: string;
  stage: 'BEFORE_CONTRACT' | 'BEFORE_DEPARTURE' | 'OPTIONAL'; fileAvailable: boolean;
  expiryDate: string | null; usable: boolean;
}
export interface ChecklistAssessment {
  checklistItemId: string; status: ItemStatus; reason: string | null;
  requiredByDate: string | null; estimatedProcessingDays: number | null;
}
export interface ScheduleOption extends Schedule {
  scheduleOptionId: string; isOriginal: boolean; coordinatorResult: Feasibility; coordinatorReason: string;
  specialistResult: SpecialistResult | null; specialistNote: string | null; checklistVersion: string | null;
  checklist: ChecklistSource[] | null; assessment: ChecklistAssessment[] | null;
}
export interface ReviewDetail extends QueueItem, Schedule {
  status: string; selectedOptionId: string | null; customerDeadlineUtc: string | null;
  coordinatorId: string; specialistId: string; horseCount: number; options: ScheduleOption[];
  resources: null | {
    vehicles: Array<{ id: string; type: string | null; plateNumber: string | null; operatingCountry: string; capacityStalls: number }>;
    flights: Array<{ id: string; airline: string; providerFlightCode: string; originAirportPlaceId: string; destinationAirportPlaceId: string;
      departureDate?: string | null; arrivalDate?: string | null;
      departureTime: string; arrivalTime: string; departureTimeZone: string; arrivalTimeZone: string; capacityHorses: number }>;
  };
}
interface Staff { id: string; name: string }
interface ManagerReview {
  requestRevision: number; review: ReviewDetail | null; coordinators: Staff[]; specialists: Staff[];
}
export type CustomerReview =
  | (Schedule & OptionKey & { action: 'CONFIRM_SCHEDULE'; customerDeadlineUtc: string; feedback: string })
  | (ReviewKey & { action: 'SUPPLEMENT_DOCUMENTS'; customerDeadlineUtc: string; feedback: string; scheduleOptionId: null });
export interface CoordinatorResult { result: Feasibility; reason: string }
export interface ChangeReview extends ReviewKey {
  action: CustomerReview['action']; scheduleOptionId?: string;
}

const managerPath = (id: string) => `/manager/requests/${id}/reviews`;
const staffPath = (role: Reviewer, id?: string) => `/${role}/request-reviews${id ? `/${id}` : ''}`;
const customerPath = (id: string) => `/customer/requests/${id}/schedule-response`;
const optionPath = (id: string, optionId: string) => `${staffPath('specialist', id)}/options/${optionId}`;

export const requestReviewApi = {
  manager: (id: string) => contractClient<ManagerReview>('get', managerPath(id)),
  assign: (id: string, requestRevision: number, coordinatorId: string, specialistId: string) =>
    contractClient<ReviewDetail>('post', managerPath(id), { requestRevision, coordinatorId, specialistId }),
  queue: (role: Reviewer) => contractClient<QueueItem[]>('get', staffPath(role)),
  detail: (role: Reviewer, id: string) => contractClient<ReviewDetail>('get', staffPath(role, id)),
  coordinator: (id: string, requestRevision: number, original: CoordinatorResult, alternative: (Schedule & { result: 'FEASIBLE'; reason: string }) | null) =>
    contractClient<ReviewDetail>('post', `${staffPath('coordinator', id)}/assessment`, { requestRevision, original, alternative }),
  specialist: (id: string, optionId: string, input: { requestRevision: number; checklistVersion: string; result: SpecialistResult; note: string; items: ChecklistAssessment[] }) =>
    contractClient<ReviewDetail>('post', `${optionPath(id, optionId)}/assessment`, input),
  file: (id: string, optionId: string, item: ChecklistSource) =>
    downloadFile(`${optionPath(id, optionId)}/checklist/${encodeURIComponent(item.checklistItemId)}/file`, item.documentType),
  customer: (id: string) => contractClient<{ proposal: CustomerReview | null }>('get', customerPath(id)),
  respond: (id: string, key: OptionKey, decision: 'ACCEPTED' | 'REJECTED') =>
    contractClient('post', customerPath(id), { ...key, decision }),
};
