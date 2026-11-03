/**
 * Flow 5 Types — Xử lý sự cố vận chuyển (Incident Management & Recovery)
 * Compliant with FLOW5_capnhat.md (v1.1.0 — 03/11/2026) and IncidentsController.cs
 * Fully aligned with ID_NAME_RULE_Reviewed and DATABASE_STATUS_CONVENTION
 */

export type IncidentCategory = 'VEHICLE_RESOURCE' | 'DELAY_AIR' | 'HORSE_HEALTH' | 'OTHER';
export type IncidentStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'NEW';
export type ResolutionType = 'RECOVERED' | 'TERMINATION_REFERRED';

/**
 * DTO đầu vào gửi báo cáo sự cố (Tài xế / Nhân sự hiện trường)
 * Tương ứng ReportIncidentInputDto trong Backend C#
 */
export interface ReportIncidentInput {
  tripId?: string;
  category: IncidentCategory;
  description?: string;
  immediateCare?: string;
  locationCoordinates?: string;
  imageUrl?: string;
  occurredAt?: string;
}

/**
 * DTO phản hồi chi tiết/danh sách sự cố từ Backend C#
 * Tương ứng IncidentResponseDto trong Backend C#
 */
export interface IncidentResponse {
  incidentId: string;
  tripId: string;
  category: string;
  status: IncidentStatus | string;
  description?: string | null;
  locationCoordinates?: string | null;
  imageUrl?: string | null;
  coordinatorId?: string | null;
  reportedByUserId?: string | null;
  reportedByUserName?: string | null;
  reportedAt: string;
  safetyBlockerActive: boolean;
}

/**
 * DTO giải quyết / đóng sự cố (Coordinator)
 */
export interface ResolveIncidentInput {
  resolutionType: ResolutionType;
  resolutionNotes?: string;
}

// ============================================================================
// Extended Flow 5 Domain & Lifecycle Types (Kế thừa từ quy trình đầy đủ)
// ============================================================================

export type Actor = {
  userId: string;
  name: string;
  role: 'FLEET_ROUTE_COORDINATOR' | 'LOGISTICS_MANAGER' | 'DRIVER_ESCORT' | 'TRANSPORT_SPECIALIST' | 'CUSTOMER';
  crewDuty: 'MAIN_DRIVER' | 'CO_DRIVER' | 'VETERINARIAN' | null;
};

export type Blocker = {
  code: string;
  field: string;
  message: string;
};

export type Error = {
  success: false;
  message: string;
  errorCode: string;
  data: null;
  blockers?: Array<Blocker>;
  errors?: { [key: string]: Array<string> };
};

export type Binding = {
  incidentVersion: number;
  recoveryVersion: number | null;
  approvedPlanVersion: number;
  executionVersion: number;
  assignmentVersion: number;
};

export type Command = {
  expectedVersion?: number;
  reason?: string;
};

export type Capabilities = {
  version: '1.0.0';
  implementationStatus: 'DESIGNED_NOT_IMPLEMENTED' | 'AVAILABLE';
  persistenceAvailable: boolean;
  filesAvailable: boolean;
  notificationsAvailable: boolean;
  recoveryApplyAvailable: boolean;
  terminationSettlementAvailable: boolean;
  currency: 'VND';
  timezone: 'Asia/Ho_Chi_Minh';
};

export type Scope = {
  leg: 'road' | 'outbound' | 'air' | 'inbound';
  horseIds: Array<string>;
  milestoneIds: Array<string>;
};

export type ReportInput = {
  tripId: string;
  expectedExecutionVersion?: number;
  category: IncidentCategory;
  scope?: Scope;
  occurredAt?: string;
  description?: string;
  immediateCare?: string;
  locationCoordinates?: string;
  imageUrl?: string;
  evidenceFileIds?: Array<string>;
  healthLogIds?: Array<string>;
};

export type IncidentSummary = IncidentResponse & {
  id?: string;
  requestId?: string;
  scope?: Scope;
  occurredAt?: string;
  reportedBy?: Actor;
  hasBlockingScope?: boolean;
  resolutionOutcome?: ResolutionType | null;
  resolvedAt?: string | null;
};

export type ActionFlags = {
  canAccept: boolean;
  canAssessImpact: boolean;
  canSubmitRecovery: boolean;
  canDecideRecovery: boolean;
  canApplyRecovery: boolean;
  canContinue: boolean;
  canResolve: boolean;
  blockers: Array<Blocker>;
};

export type ImpactArea =
  | 'RESOURCES'
  | 'SCHEDULE'
  | 'BOOKING'
  | 'DOCUMENTS'
  | 'INSURANCE'
  | 'HEALTH'
  | 'DELIVERY_DEADLINE'
  | 'INTERNAL_COST';

export type Impact = {
  area: ImpactArea;
  status: 'AFFECTED' | 'NOT_AFFECTED' | 'UNASSESSED';
  reason: string;
  blockedMilestoneIds: Array<string>;
  blockedHorseIds: Array<string>;
};

export type AssessmentInput = {
  expectedVersion: number;
  impacts: Array<Impact>;
  reason: string;
};

export type Task = {
  id: string;
  area: ImpactArea;
  assignee: Actor;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  instruction: string;
  result: string | null;
  evidenceFileIds: Array<string>;
  updatedAt: string;
};

export type TaskInput = {
  expectedVersion: number;
  area: ImpactArea;
  assigneeUserId: string;
  instruction: string;
};

export type TaskProgress = {
  expectedVersion: number;
  status: 'IN_PROGRESS' | 'DONE';
  result: string;
  evidenceFileIds: Array<string>;
};

export type UpdateInput = {
  expectedVersion: number;
  occurredAt: string;
  kind: 'FIELD_REPORT' | 'EMERGENCY_CARE' | 'WORK_PROGRESS';
  message: string;
  evidenceFileIds: Array<string>;
};

export type Update = {
  id: string;
  kind: 'FIELD_REPORT' | 'EMERGENCY_CARE' | 'WORK_PROGRESS';
  occurredAt: string;
  recordedAt: string;
  actor: Actor;
  message: string;
  evidenceFileIds: Array<string>;
};

export type Crew = {
  mainDriverId: string;
  coDriverId: string;
  veterinarianId: string;
};

export type ResourceChange = {
  leg: 'road' | 'outbound' | 'air' | 'inbound';
  oldVehicleId: string | null;
  vehicleId: string;
  crew: Crew;
  availableFrom: string;
  availableUntil: string;
  reason: string;
};

export type ScheduleChange = {
  milestoneId: string;
  plannedAt: string;
};

export type FlightChange = {
  oldBookingId: string;
  partnerId: string;
  serviceId: string;
  catalogVersion: number;
  flightCode: string;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  quotedCostVnd: number;
};

export type RecoveryContent = {
  reason: string;
  scope: Scope;
  resources: Array<ResourceChange>;
  schedule: Array<ScheduleChange>;
  flight: FlightChange | null;
  proposedEta: string | null;
  internalCostVnd: number;
  customerAdditionalChargeVnd: 0;
  careInstructions: string;
  evidenceFileIds: Array<string>;
};

export type RecoveryInput = {
  expectedVersion: number;
  baseApprovedPlanVersion: number;
  baseExecutionVersion: number;
  baseAssignmentVersion: number;
  content: RecoveryContent;
};

export type Recovery = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'RETURNED' | 'APPROVED' | 'APPLIED' | 'SUPERSEDED';
  content: RecoveryContent;
  requiresManager: boolean;
  approvalReasons: Array<string>;
  baseApprovedPlanVersion: number;
  baseExecutionVersion: number;
  baseAssignmentVersion: number;
  approvedBy: Actor | null;
  approvedAt: string | null;
};

export type PlanCommand = {
  expectedVersion: number;
  recoveryVersion: number;
};

export type RecoveryDecision = {
  expectedVersion: number;
  recoveryVersion: number;
  decision: 'APPROVE' | 'RETURN';
  reason: string;
};

export type Check = {
  code: string;
  area: ImpactArea;
  required: boolean;
  ok: boolean;
  detail: string;
};

export type Readiness = {
  binding: Binding;
  readinessVersion: string;
  serverTime: string;
  checks: Array<Check>;
  blockers: Array<Blocker>;
  canApplyRecovery: boolean;
  canContinue: boolean;
  canResolve: boolean;
  blockedScopes: Array<Scope>;
};

export type ContinuationInput = {
  expectedVersion: number;
  recoveryVersion: number | null;
  readinessVersion: string;
  scope: Scope;
  reason: string;
};

export type ComplianceInput = {
  expectedVersion: number;
  recoveryVersion: number;
  area: 'DOCUMENTS' | 'INSURANCE';
  result: 'SATISFIED' | 'BLOCKED' | 'NOT_AFFECTED';
  reason: string;
  sourceRecordIds: Array<string>;
  evidenceFileIds: Array<string>;
};

export type VetInput = {
  expectedVersion: number;
  horseId: string;
  examinedAt: string;
  transportFitness: 'FIT' | 'NOT_FIT' | 'NEEDS_REVIEW';
  conclusion: string;
  careInstructions: string;
  healthLogIds: Array<string>;
  evidenceFileIds: Array<string>;
};

export type ExternalActionInput = {
  expectedVersion: number;
  recoveryVersion: number;
  kind: 'PARTNER_CONTACT' | 'OLD_BOOKING_CANCELLED' | 'NEW_BOOKING_CONFIRMED' | 'RESOURCE_CONFIRMED';
  reference: string;
  bookingId: string | null;
  leg: 'road' | 'outbound' | 'air' | 'inbound' | null;
  completedAt: string;
  reason: string;
  evidenceFileIds: Array<string>;
};

export type ComplianceReview = {
  id: string;
  actor: Actor;
  recordedAt: string;
  content: {
    recoveryVersion: number;
    area: 'DOCUMENTS' | 'INSURANCE';
    result: 'SATISFIED' | 'BLOCKED' | 'NOT_AFFECTED';
    reason: string;
    sourceRecordIds: Array<string>;
    evidenceFileIds: Array<string>;
  };
  valid: boolean;
  invalidedReason: string | null;
};

export type VetAssessment = {
  id: string;
  actor: Actor;
  recordedAt: string;
  content: {
    horseId: string;
    examinedAt: string;
    transportFitness: 'FIT' | 'NOT_FIT' | 'NEEDS_REVIEW';
    conclusion: string;
    careInstructions: string;
    healthLogIds: Array<string>;
    evidenceFileIds: Array<string>;
  };
  valid: boolean;
  invalidedReason: string | null;
};

export type ExternalAction = {
  id: string;
  actor: Actor;
  recordedAt: string;
  content: {
    recoveryVersion: number;
    kind: 'PARTNER_CONTACT' | 'OLD_BOOKING_CANCELLED' | 'NEW_BOOKING_CONFIRMED' | 'RESOURCE_CONFIRMED';
    reference: string;
    bookingId: string | null;
    leg: 'road' | 'outbound' | 'air' | 'inbound' | null;
    completedAt: string;
    reason: string;
    evidenceFileIds: Array<string>;
  };
  valid: boolean;
  invalidedReason: string | null;
};

export type ResourceOption = {
  vehicleId: string;
  leg: 'road' | 'outbound' | 'air' | 'inbound';
  capacity: number;
  eligible: boolean;
  blockers: Array<Blocker>;
  availableUserIds: Array<string>;
};

export type Mutation = {
  binding?: Binding;
  incident?: IncidentSummary;
  recordId?: string;
  blockers?: Array<Blocker>;
};

export type IncidentDetail = {
  binding?: Binding;
  incident: IncidentResponse | IncidentSummary;
  impacts?: Array<Impact>;
  tasks?: Array<Task>;
  recovery?: Recovery | null;
  readiness?: Readiness;
  complianceReviews?: Array<ComplianceReview>;
  vetAssessments?: Array<VetAssessment>;
  externalActions?: Array<ExternalAction>;
  actions?: ActionFlags;
  evidenceFileIds?: Array<string>;
};

export type History = {
  id: string;
  action: string;
  actor: Actor | null;
  systemActor: boolean;
  recordedAt: string;
  reason: string;
  beforeVersion: number | null;
  afterVersion: number;
  targetId: string;
};

export type CommunicationInput = {
  expectedVersion: number;
  type: 'NOTICE' | 'AGREEMENT_REQUEST';
  recoveryVersion: number | null;
  message: string;
  proposedDeliveryAt: string | null;
  evidenceFileIds: Array<string>;
};

export type Communication = {
  id: string;
  version: number;
  type: 'NOTICE' | 'AGREEMENT_REQUEST';
  message: string;
  proposedDeliveryAt: string | null;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED';
  sentBy: Actor;
  sentAt: string;
  replyBy: Actor | null;
  repliedAt: string | null;
};

export type CustomerReply = {
  expectedVersion: number;
  messageVersion: number;
  decision: 'ACCEPT' | 'REJECT';
  message: string;
};

export type ExternalAgreementInput = {
  expectedVersion: number;
  messageId: string;
  messageVersion: number;
  reference: string;
  agreedAt: string;
  reason: string;
  evidenceFileIds: Array<string>;
};

export type PublicIncident = {
  id: string;
  tripId: string;
  category: IncidentCategory;
  status: IncidentStatus;
  horseIds: Array<string>;
  customerSummary: string;
  customerImpact: string;
  latestDeliveryAt: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  evidenceFileIds: Array<string>;
  communications: Array<Communication>;
};

export type PublicContext = {
  incidentVersion: number;
  incident: PublicIncident;
};

export type TerminationInput = {
  expectedVersion: number;
  reason: string;
  careAndCustodyPlan: string;
  proposedRefundVnd: number;
  basis: string;
  evidenceFileIds: Array<string>;
};

export type TerminationProposal = {
  id: string;
  version: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'REFERRED';
  reason: string;
  careAndCustodyPlan: string;
  proposedRefundVnd: number;
  basis: string;
  proposedBy: Actor;
  proposedAt: string;
  respondedBy: Actor | null;
  respondedAt: string | null;
  settlementCaseId: string | null;
  financiallySettled: boolean;
};

export type TerminationReply = {
  expectedVersion: number;
  proposalVersion: number;
  decision: 'ACCEPT' | 'REJECT';
  message: string;
};

export type TerminationReferInput = {
  expectedVersion: number;
  proposalVersion: number;
  readinessVersion: string;
  custodyEvidenceFileIds: Array<string>;
  reason: string;
};

export type File = {
  id: string;
  tripId: string;
  incidentId: string | null;
  filename: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  visibility: 'INTERNAL' | 'CUSTOMER';
  uploadedAt: string;
};

export type Upload = {
  file: string;
  purpose: 'INCIDENT' | 'HEALTH' | 'PARTNER' | 'CUSTODY' | 'AGREEMENT';
};

export type ShareFileInput = {
  expectedVersion: number;
  reason: string;
};
