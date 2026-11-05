/**
 * Flow 5 Types — Xử lý sự cố vận chuyển (Incident Management & Recovery)
 * Compliant with Backend C# (Flow5ExtendedDtos.cs, IncidentDtos.cs) & test api_flow5.md
 * Fully aligned with ID_NAME_RULE_Reviewed and DATABASE_STATUS_CONVENTION
 */

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export type IncidentCategory =
  | 'VEHICLE_BREAKDOWN'
  | 'VEHICLE_RESOURCE'
  | 'DELAY_AIR'
  | 'ROAD_CLOSURE'
  | 'TRAFFIC_ACCIDENT'
  | 'HORSE_HEALTH'
  | 'DOCUMENT_CUSTOMS_HOLD'
  | 'OTHER';

export type IncidentStatus =
  | 'REPORTED'
  | 'IN_PROGRESS'
  | 'RECOVERY_APPLIED'
  | 'IN_TRANSIT'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'NEW';

export type ResolutionType =
  | 'RESOLVED_CONTINUE_CURRENT'
  | 'RESOLVED_REPLACED_VEHICLE'
  | 'RESOLVED_REROUTED'
  | 'RESOLVED_CHARTER_FLIGHT'
  | 'TERMINATED_EARLY'
  | 'RECOVERED'
  | 'TERMINATION_REFERRED';

export type TaskType =
  | 'TECHNICAL_REPAIR'
  | 'VETERINARY_CHECK'
  | 'ROUTE_SURVEY'
  | 'CUSTOMS_LIAISON'
  | 'CUSTOMER_CARE'
  | 'CHARTER_BOOKING';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type PlanType = 'REPLACE_VEHICLE' | 'REROUTE' | 'REBOOK_FLIGHT' | 'EMERGENCY_REST';
export type RecoveryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'APPLIED';
export type ManagerDecision = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export type UpdateType = 'FIELD_LOG' | 'MEDICAL_TREATMENT' | 'LOGISTICS_PROGRESS' | 'POLICE_REPORT';
export type FitnessStatus = 'FIT' | 'UNFIT' | 'FIT_WITH_REST';
export type ComplianceStatus = 'VALID' | 'PERMIT_REISSUED' | 'REJECTED';
export type PartnerType = 'RESCUE_TOWING' | 'TOWING_SERVICE' | 'CHARTER_FLIGHT_BOOKED' | 'AIRLINE_CARGO' | 'LOCAL_STABLE_RENTAL' | 'VET_CLINIC' | 'STABLE_STATION';
export type ContactChannel = 'PHONE' | 'EMAIL' | 'DIRECT_MEETING';
export type IncidentFileType = 'SCENE_PHOTO' | 'VET_REPORT' | 'POLICE_RECORD' | 'PARTNER_INVOICE';
export type TerminationAction = 'CANCEL_AND_RETURN' | 'TRANSFER_TO_LOCAL_CARE' | 'HANDOVER_TO_BUYER';
export type TerminationStatus = 'PENDING_CUSTOMER' | 'ACCEPTED' | 'REJECTED' | 'REFERRED';

// ============================================================================
// 2. BASE INCIDENT LIFECYCLE (F5-J01 - F5-J06, F5-J44)
// ============================================================================

export interface Flow5Capabilities {
  incidentCategories: string[];
  resolutionTypes: string[];
  taskTypes: string[];
  impactScopes: string[];
}

export interface ReportIncidentInput {
  tripId?: string;
  category: IncidentCategory | string;
  description?: string;
  immediateCare?: string;
  locationCoordinates?: string;
  imageUrl?: string;
  occurredAt?: string;
}

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

// ============================================================================
// 3. IMPACT ASSESSMENT & FIELD UPDATES (F5-J07 - F5-J09)
// ============================================================================

export interface AssessmentInput {
  affectedVehicle: boolean;
  affectedSchedule: boolean;
  affectedFlight: boolean;
  affectedPaperwork: boolean;
  affectedInsurance: boolean;
  affectedHorseHealth: boolean;
  affectedDeadlines: boolean;
  estimatedExtraCost: number;
  summary?: string;
}

export interface ImpactAssessmentResult {
  incidentId: string;
  affectedVehicle: boolean;
  affectedSchedule: boolean;
  affectedFlight: boolean;
  affectedPaperwork: boolean;
  affectedInsurance: boolean;
  affectedHorseHealth: boolean;
  affectedDeadlines: boolean;
  estimatedExtraCost: number;
  summary?: string;
  assessedByUserId: string;
  assessedAt: string;
}

export interface UpdateInput {
  updateType: UpdateType | string;
  notes: string;
  immediateCare?: string;
  imageUrl?: string;
  locationCoordinates?: string;
}

export interface IncidentUpdate {
  updateId: string;
  incidentId: string;
  updateType: string;
  notes: string;
  immediateCare?: string | null;
  imageUrl?: string | null;
  locationCoordinates?: string | null;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

// ============================================================================
// 4. TASKS & PROGRESS (F5-J10 - F5-J12)
// ============================================================================

export interface TaskInput {
  title: string;
  taskType?: TaskType | string;
  assignedToUserId: string;
  priority?: TaskPriority | string;
  notes?: string;
  dueAt?: string;
}

export interface TaskProgressInput {
  status: TaskStatus | string;
  notes?: string;
  completionProofUrl?: string;
}

export interface IncidentTask {
  taskId: string;
  incidentId: string;
  title: string;
  taskType: string;
  assignedToUserId: string;
  assignedToUserName?: string | null;
  priority: string;
  status: string;
  notes?: string | null;
  completionProofUrl?: string | null;
  dueAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

// ============================================================================
// 5. RECOVERY PLAN LIFECYCLE (F5-J13 - F5-J18, F5-J43, F5-J24)
// ============================================================================

export interface RecoveryContext {
  incidentId: string;
  tripId: string;
  currentLocation: string;
  destinationLocation: string;
  safetyBlockerActive: boolean;
  impactedLegs: string[];
  pendingTasks: IncidentTask[];
  currentPlanStatus?: string | null;
}

export interface RecoveryInput {
  planType: PlanType | string;
  summary: string;
  newVehicleId?: string;
  newDriverUserId?: string;
  newRouteSummary?: string;
  estimatedDelayHours: number;
  costEstimate: number;
}

export interface RecoveryValidateResult {
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  resourceAvailable: boolean;
  safetyStandardMet: boolean;
}

export interface RecoveryDecisionInput {
  decision: ManagerDecision | string;
  reason?: string;
  managerNotes?: string;
}

export interface RecoveryRevisionInput {
  revisionNotes: string;
}

export interface RecoveryPlan {
  planId: string;
  incidentId: string;
  version: number;
  planType: string;
  summary: string;
  newVehicleId?: string | null;
  newDriverUserId?: string | null;
  newRouteSummary?: string | null;
  estimatedDelayHours: number;
  costEstimate: number;
  status: RecoveryStatus | string;
  managerDecision?: string | null;
  managerNotes?: string | null;
  createdByUserId: string;
  createdAt: string;
  decidedAt?: string | null;
}

export interface RecoveryApply {
  incidentId: string;
  appliedPlanId: string;
  appliedSuccessfully: boolean;
  message: string;
appliedAt: string;
}

// ============================================================================
// 6. HISTORY & RESOURCE OPTIONS (F5-J19, F5-J20)
// ============================================================================

export interface HistoryRecord {
  eventType: string;
  description: string;
  performedByUserId: string;
  timestamp: string;
  referenceId?: string | null;
}

export interface IncidentHistory {
  incidentId: string;
  records: HistoryRecord[];
}

export interface VehicleOption {
  vehicleId: string;
licensePlate: string;
vehicleType: string;
capacityStalls: number;
currentLocation: string;
isAvailable: boolean;
distanceKmFromIncident: number;
}

export interface DriverOption {
  userId: string;
  fullName: string;
  phoneNumber: string;
  isAvailable: boolean;
  status: string;
}

export interface ResourceOption {
  vehicles: VehicleOption[];
  drivers: DriverOption[];
}

// ============================================================================
// 7. SPECIALIST, VET & EXTERNAL ACTIONS (F5-J21 - F5-J23)
// ============================================================================

export interface ComplianceInput {
  status: ComplianceStatus | string;
  findings: string;
  requiresPermitReissue: boolean;
  notes?: string;
}

export interface ComplianceReview {
  reviewId: string;
  incidentId: string;
  status: string;
  findings: string;
  requiresPermitReissue: boolean;
  notes?: string | null;
  reviewedByUserId: string;
  reviewedAt: string;
}

export interface VetInput {
  fitnessStatus: FitnessStatus | string;
  assessmentNotes: string;
  temperature?: number;
  heartRate?: number;
  recommendation?: string;
  reportUrl?: string;
}

export interface VetAssessment {
  assessmentId: string;
  incidentId: string;
  fitnessStatus: string;
  assessmentNotes: string;
  temperature: number;
  heartRate: number;
  recommendation?: string | null;
  reportUrl?: string | null;
  examinedByUserId: string;
  examinedAt: string;
}

export interface ExternalActionInput {
  actionType: PartnerType | string;
  partnerName: string;
  referenceCode?: string;
  confirmedCost: number;
  notes?: string;
}

export interface ExternalAction {
  actionId: string;
  incidentId: string;
  actionType: string;
  partnerName: string;
  referenceCode?: string | null;
  confirmedCost: number;
  notes?: string | null;
  loggedByUserId: string;
  loggedAt: string;
}

// ============================================================================
// 8. CONTINUATION & CLOSURE (F5-J25 - F5-J28)
// ============================================================================

export interface ContinuationReadiness {
  incidentId: string;
  isReadyToContinue: boolean;
  vetCleared: boolean;
  complianceCleared: boolean;
  resourceReady: boolean;
  safetyBlockerCanBeRemoved: boolean;
  pendingBlockerReasons: string[];
}

export interface ContinuationInput {
  notes?: string;
  clearedSafetyBlocker?: boolean;
}

export interface IncidentResolutionInput {
  resolutionType: ResolutionType | string;
  notes: string;
  finalCost?: number;
}

export interface IncidentReopenInput {
  reopenReason: string;
}

// ============================================================================
// 9. CUSTOMER COMMUNICATIONS & AGREEMENTS (F5-J29 - F5-J33)
// ============================================================================

export interface CustomerIncidentSummary {
  incidentId: string;
  requestId: string;
  title: string;
  status: string;
  severity: string;
  occurredAt: string;
  estimatedDelayNotice?: string | null;
}

export interface CustomerIncidentDetail {
  incidentId: string;
  requestId: string;
  title: string;
  status: string;
  description: string;
  horseStatusNotice?: string | null;
  proposedNewEta?: string | null;
  communications: IncidentCommunication[];
  sharedFiles: IncidentFile[];
}

export interface CommunicationInput {
  title: string;
  content: string;
  requiresCustomerApproval: boolean;
  proposedNewEta?: string;
  proposedCostAdjustment: number;
}

export interface CustomerReply {
  approved: boolean;
  customerNotes?: string;
}

export interface ExternalAgreementInput {
  contactChannel: ContactChannel | string;
  agreedSummary: string;
  evidenceUrl?: string;
  agreedAt?: string;
}

export interface IncidentCommunication {
  messageId: string;
  incidentId: string;
  title: string;
  content: string;
  requiresCustomerApproval: boolean;
  proposedNewEta?: string | null;
  proposedCostAdjustment: number;
  customerApproved?: boolean | null;
  customerNotes?: string | null;
  repliedAt?: string | null;
  sentByUserId: string;
  sentAt: string;
}

// ============================================================================
// 10. FILES & EVIDENCE (F5-J34 - F5-J36, F5-J42)
// ============================================================================

export interface IncidentFileUploadInput {
  fileName: string;
  fileUrl: string;
  fileType?: IncidentFileType | string;
  description?: string;
}

export interface IncidentFile {
  fileId: string;
  incidentId: string;
  tripId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  description?: string | null;
  isSharedWithCustomer: boolean;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface ShareFileInput {
  isSharedWithCustomer: boolean;
  displayName?: string;
}

// ============================================================================
// 11. TERMINATION PROPOSALS (F5-J37 - F5-J41)
// ============================================================================

export interface TerminationInput {
  reason: string;
proposedAction ?: TerminationAction | string;
horseCareArrangement: string;
estimatedRefundOrFee: number;
}

export interface TerminationReply {
  accepted: boolean;
  customerNotes?: string;
}

export interface TerminationReferInput {
  referralDepartment?: string;
  handoffNotes: string;
}

export interface TerminationProposal {
  proposalId: string;
  incidentId: string;
  reason: string;
proposedAction: string;
horseCareArrangement: string;
estimatedRefundOrFee: number;
status: TerminationStatus | string;
customerAccepted ?: boolean | null;
customerNotes ?: string | null;
referralDepartment ?: string | null;
handoffNotes ?: string | null;
createdByUserId: string;
createdAt: string;
}

// ============================================================================
// 12. ENVELOPES & BACKWARD COMPATIBILITY ALIASES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string | null;
}

export interface ErrorEnvelope {
  success: false;
  message: string;
  errorCode: string;
  data: null;
  blockers?: Array<{ code: string; field: string; message: string }>;
  errors?: Record<string, string[]>;
}

// Aliases for compatibility
export type Capabilities = Flow5Capabilities;
export type ResolveIncidentInput = IncidentResolutionInput;
export type Task = IncidentTask;
export type Update = IncidentUpdate;
export type Recovery = RecoveryPlan;
export type History = HistoryRecord;
export type HistoryEnvelope = IncidentHistory;
export type ResourceOptionDto = ResourceOption;
export type File = IncidentFile;
export type Communication = IncidentCommunication;
export type Binding = RecoveryContext;
export type Readiness = ContinuationReadiness;
export type Mutation = IncidentResponse;
export type PublicIncident = CustomerIncidentSummary;
export type PublicContext = CustomerIncidentDetail;
export type Command = Record<string, unknown>;
export type PlanCommand = RecoveryInput | Record<string, unknown>;
export type RecoveryDecision = RecoveryDecisionInput;
export type TaskProgress = TaskProgressInput;
