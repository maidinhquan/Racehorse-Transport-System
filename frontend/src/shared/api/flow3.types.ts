// ============================================================================
// FLOW 3: ĐÁNH GIÁ KHẢ THI, LẬP PHƯƠNG ÁN VÀ DUYỆT KHỞI HÀNH (API Types)
// Nguồn chuẩn: contracts/API-Flow/Flow3/FLOW3.md & FLOW3-API-JSON.md
// ============================================================================

export type Flow3Mode = 'ROAD' | 'AIR';

export type PlanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'RETURNED'
  | 'WITHDRAWN'
  | 'SUPERSEDED';

export type ConstraintUseAt =
  | 'DEPARTURE'
  | 'ARRIVAL'
  | 'CHECKPOINT'
  | 'FLIGHT_DEPARTURE'
  | 'FLIGHT_ARRIVAL';

export type ConstraintBasis =
  | 'ESTIMATED_ISSUANCE'
  | 'DOCUMENT_STAMP'
  | 'OFFICIAL_RULE';

export type DependencyNeeds =
  | 'OFFICIAL_SCHEDULE'
  | 'FLIGHT_BOOKING'
  | 'IMPORT_PERMIT';

export type DependencyOwner =
  | 'TRANSPORT_SPECIALIST'
  | 'FLEET_ROUTE_COORDINATOR';

// ----------------------------------------------------------------------------
// F3-J01: Master Capabilities
// ----------------------------------------------------------------------------
export interface Flow3Capabilities {
  features: {
    feasibility: boolean;
    planVersioning: boolean;
    reservations: boolean;
    flightCatalog: boolean;
    demoBooking: boolean;
    readyBindings: boolean;
    departureApproval: boolean;
    idempotency: boolean;
  };
  airHandoverBeforeMinutes: number | null;
  airHandoverAfterMinutes: number | null;
  continuousDriveLimitMinutes: number | null;
  minimumRestMinutes: number | null;
  reason?: string;
}

// ----------------------------------------------------------------------------
// Feasibility Assessment (Specialist)
// ----------------------------------------------------------------------------
export interface FeasibilityConstraint {
  key: string;
  typeId: string;
  horseId: string | null;
  validFrom: string;
  validUntil: string;
  useAt: ConstraintUseAt;
  checkpointId?: number | null;
  mustCoverWholeTrip: boolean;
  basis: ConstraintBasis;
  note?: string;
}

export interface FeasibilityDependency {
  key: string;
  description: string;
  needs: DependencyNeeds;
  owner: DependencyOwner;
  expectedLeadMinutes: number;
  completionRule: string;
  resolved: boolean;
}

export interface FeasibilityBlocker {
  code: string;
  field?: string;
  message: string;
  constraintKey?: string;
  useTime?: string;
}

export interface FeasibilityAssessment {
  version: number;
  contextVersion: number;
  documentSetVersion: number;
  earliestReadyAt: string;
  constraints: FeasibilityConstraint[];
  dependencies: FeasibilityDependency[];
  planningAllowed: boolean;
  blockers: FeasibilityBlocker[];
  assessed: {
    by: string;
    at: string;
  };
}

export interface SubmitFeasibilityRequest {
  expectedVersion: number | null;
  contextVersion: number;
  earliestReadyAt: string;
  constraints: FeasibilityConstraint[];
  dependencies: FeasibilityDependency[];
}

// ----------------------------------------------------------------------------
// Plan Draft & Structure (Coordinator)
// ----------------------------------------------------------------------------
export interface PlanStop {
  checkpointId?: number | null;
  name: string;
  type: 'ORIGIN' | 'REST_STOP' | 'FUEL_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'QUARANTINE_STATION' | 'DESTINATION';
  country: string;
  lat?: number;
  lng?: number;
  plannedAt: string;
}

export interface PlanCrew {
  MAIN_DRIVER: string;
  CO_DRIVER: string;
  VETERINARIAN: string;
}

export interface PlanLeg {
  key: 'road' | 'outbound' | 'inbound';
  country: string;
  startStopIndex: number;
  endStopIndex: number;
  vehicleId: string;
  crew: PlanCrew;
}

export interface PlanFlightProposal {
  catalogRef?: string;
  catalogVersion?: number;
  airline: string;
  flightNo: string;
  fromCheckpointId: number;
  toCheckpointId: number;
  departAt: string;
  arriveAt: string;
  cost: number;
  currency: string;
  stalls?: number;
  direct?: boolean;
}

export interface PlanDraftInput {
  expectedVersion: number | null;
  contextVersion: number;
  feasibilityVersion: number;
  plannedDepart: string;
  eta: string;
  stops: PlanStop[];
  legs: PlanLeg[];
  flight?: PlanFlightProposal | null;
}

export interface TripPlan {
  version: number;
  contextVersion: number;
  feasibilityVersion: number;
  status: PlanStatus;
  replacesPlanVersion: number | null;
  mode: Flow3Mode;
  plannedDepart: string;
  eta: string;
  stops: PlanStop[];
  legs: PlanLeg[];
  flight?: PlanFlightProposal | null;
  submittedAt?: string;
  reviewedAt?: string;
  returnReason?: string;
}

export interface PlanValidationResult {
  valid: boolean;
  blockers: FeasibilityBlocker[];
  warnings?: string[];
}

// ----------------------------------------------------------------------------
// F3-J02 / F3-J04: Planning Context
// ----------------------------------------------------------------------------
export interface PlanningContext {
  tripId: string;
  requestId: string;
  tripStatus: string;
  requestStatus: string;
  contractStatus: string;
  contextVersion: number;
  contractId: string;
  contractVersion: number;
  deliveryDeadline: string;
  originCountry: string;
  destinationCountry: string;
  mode: Flow3Mode;
  horseIds: string[];
  deploymentStatus: string;
  specialistId: string;
  coordinatorId: string;
  documentSetVersion: number;
  evidenceVersion: number;
  feasibility: FeasibilityAssessment | null;
  draft: TripPlan | null;
  approvedPlan: TripPlan | null;
  docsReady?: {
    binding: {
      contextVersion: number;
      feasibilityVersion: number;
      planVersion: number;
      evidenceVersion: number;
    };
    confirmed: {
      by: string;
      at: string;
    };
    documentSetVersion: number;
    insuranceVersion: number;
  };
  opsReady?: {
    binding: {
      contextVersion: number;
      feasibilityVersion: number;
      planVersion: number;
      evidenceVersion: number;
    };
    confirmed: {
      by: string;
      at: string;
    };
    documentSetVersion: number;
    insuranceVersion: number;
  };
  blockers?: FeasibilityBlocker[];
}

// ----------------------------------------------------------------------------
// F3-J05: Flight Catalog
// ----------------------------------------------------------------------------
export interface FlightCatalogItem {
  catalogRef: string;
  catalogVersion: number;
  provider: string;
  airline: string;
  flightNo: string;
  fromCheckpointId: number;
  toCheckpointId: number;
  originCountry: string;
  destinationCountry: string;
  departAt: string;
  arriveAt: string;
  stalls: number;
  cost: number;
  currency: string;
  direct: boolean;
  fullCare: boolean;
}

// ----------------------------------------------------------------------------
// F3-J11: Manager Plan Decision
// ----------------------------------------------------------------------------
export interface PlanDecisionInput {
  decision: 'APPROVED' | 'RETURNED';
  planVersion: number;
  feasibilityVersion: number;
  reason?: string;
}

// ----------------------------------------------------------------------------
// F3-J13: Flight Booking Confirmation
// ----------------------------------------------------------------------------
export interface FlightBookingInput {
  planVersion: number;
  bookingRef: string;
  confirmedCost?: number;
  source?: 'DEMO' | 'PARTNER_REFERENCE';
  notes?: string;
}

// ----------------------------------------------------------------------------
// F3-J14: Resources Confirmation
// ----------------------------------------------------------------------------
export interface ResourcesConfirmInput {
  planVersion: number;
  evidenceNotes?: string;
}

// ----------------------------------------------------------------------------
// F3-J15 / F3-J16: READY Bindings
// ----------------------------------------------------------------------------
export interface ReadyConfirmInput {
  planVersion: number;
  feasibilityVersion: number;
  notes?: string;
}

// ----------------------------------------------------------------------------
// F3-J10 / F3-J17: Preparation & Readiness
// ----------------------------------------------------------------------------
export interface TripPreparation {
  tripId: string;
  feasibility: FeasibilityAssessment | null;
  plan: TripPlan | null;
  dependencies: FeasibilityDependency[];
  readyStatus: {
    docsReady: boolean;
    opsReady: boolean;
  };
}

export interface TripReadiness {
  tripId: string;
  tripStatus: string;
  readyToDepart: boolean;
  docsReady: boolean;
  opsReady: boolean;
  approvedPlanVersion: number | null;
  blockers: FeasibilityBlocker[];
}

export interface DepartureApprovalResult {
  tripId: string;
  tripStatus: 'READY_TO_DEPART';
  requestStatus: 'SCHEDULED';
  approvedAt: string;
  approvedBy: string;
}

// ----------------------------------------------------------------------------
// F3-J19: Planning History
// ----------------------------------------------------------------------------
export interface PlanningHistoryItem {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  detail?: string;
  version?: number;
}
