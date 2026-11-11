/**
 * Flow 2 Types — Transport Specialist (Legal, Medical & Quarantine)
 * Generated according to contracts/API-Flow/Flow2/FLOW2.md and Specialist OpenAPI specification
 * Fully aligned with ID_NAME_RULE_Reviewed and DATABASE_STATUS_CONVENTION
 */

export type CountryCode = 'VN' | 'JP' | 'TH' | 'KH' | 'SG' | 'UK' | 'AE';
export type Direction = 'EXPORT' | 'IMPORT' | 'DOMESTIC';
export type TransportMode = 'ROAD' | 'AIR';

export interface Flow2Capabilities {
  version: string;
  role: 'TRANSPORT_SPECIALIST';
  insuranceSupported: boolean;
  clearanceSupported: boolean;
  docsReadyGate: string;
}

export interface SpecHorse {
  id: string;
  name: string;
  microchip: string;
  passportNo: string;
}

export interface Insurance {
  insurer: string;
  policy: string;
  validFrom: string;
  validTo: string;
  coverage: number;
  status: 'PENDING' | 'VERIFIED';
  checkedBy: string | null;
  checkedAt: string | null;
}

export interface ClearanceDetail {
  result: 'PASSED' | 'HELD' | 'FAILED';
  at: string;
  ref: string;
  by: string;
}

export interface RouteCheckpoint {
  name: string;
  type: 'LAND_BORDER' | 'AIRPORT' | 'QUARANTINE_STATION';
  country: string;
  plannedAt: string;
  arrivedAt: string | null;
  clearance?: ClearanceDetail | null;
}

export interface DocsReady {
  at: string;
  by: string;
}

export interface RequirementLine {
  typeId: string;
  provider: 'CUSTOMER' | 'CBN';
  scope: 'PER_HORSE' | 'PER_TRIP';
  level: 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL';
  stage: 'BEFORE_SUBMIT' | 'BEFORE_DEPART' | 'AT_CHECKPOINT';
  condition: string;
}

export interface ReqRule {
  country: string;
  direction: 'DOMESTIC' | 'EXPORT' | 'IMPORT';
  regId: string | null;
  regV?: number | null;
  lines: RequirementLine[];
}

export interface ReqSetSnapshot {
  pkgId: string;
  pkgV: number;
  name: string;
  at: string;
  by: string;
  rules: ReqRule[];
}

export interface SpecTrip {
  id: string;
  requestId: string;
  customerName: string;
  origin: string;
  destination: string;
  originCountry: string;
  destCountry: string;
  mode: 'ROAD' | 'AIR';
  status: 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';
  deployment: 'PENDING' | 'CONFIRMED' | 'ON_HOLD';
  plannedDepart: string;
  eta: string;
  horses: SpecHorse[];
  reqSet?: ReqSetSnapshot | null;
  docsReady?: DocsReady | null;
  insurance?: Insurance | null;
  checkpoints: RouteCheckpoint[];
}

export interface CustomerDoc {
  tripId: string;
  key: string;
  scope: string;
  status: 'SUBMITTED' | 'APPROVED' | 'ACTION_REQUIRED' | 'MISSING' | 'OPTIONAL';
  optional: boolean;
  file: string | null;
  note: string;
  issue?: string | null;
  expiry?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface DocRequest {
  id: string;
  tripId: string;
  key: string;
  scope: string;
  reason: string;
  dueAt: string | null;
  status: 'OPEN' | 'SUBMITTED' | 'FULFILLED';
  createdAt: string;
  createdBy: string;
}

export interface TripDocument {
  id: string;
  tripId: string;
  typeId: string;
  horseId: string | null;
  number: string;
  issuer: string;
  issuedAt: string;
  expiry: string;
  file: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'REPLACED';
}

export interface QuarantineBooking {
  id: string;
  tripId: string;
  station: string;
  slot: string;
  ref: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
  notes: string;
}

export interface DocType {
  id: string;
  name: string;
  group: 'IDENTITY' | 'MEDICAL' | 'QUARANTINE' | 'CUSTOMS' | 'OTHER';
  scope: 'PER_HORSE' | 'PER_TRIP';
  provider: 'CUSTOMER' | 'CBN';
  validityDays: number | null;
  status: 'ACTIVE' | 'RETIRED';
}

export interface Regulation {
  id: string;
  country: string;
  direction: 'DOMESTIC' | 'EXPORT' | 'IMPORT';
  lines: RequirementLine[];
  note: string;
  v: number;
  effectiveFrom: string;
  status: 'ACTIVE' | 'RETIRED';
}

export interface RegPackage {
  id: string;
  name: string;
  items: Array<[string, string]>;
  origin: string;
  dest: string;
  modes: Array<'ROAD' | 'AIR'>;
  note: string;
  v: number;
  effectiveFrom: string;
  status: 'ACTIVE' | 'RETIRED';
}

export interface AuditEntry {
  id: string;
  tripId: string | null;
  at: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  detail: string | null;
}

// ================= Input DTOs =================

export interface ReviewCustomerDocInput {
  key: string;
  scope: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string | null;
}

export interface CreateDocRequestInput {
  tripId: string;
  key: string;
  scope: string;
  reason: string;
  dueAt?: string | null;
}

export interface RecordDocInput {
  tripId: string;
  typeId: string;
  horseId?: string | null;
  number: string;
  issuer: string;
  issuedAt: string;
  expiry: string;
  file: string;
}

export interface SaveInsuranceInput {
  insurer: string;
  policy: string;
  validFrom: string;
  validTo: string;
  coverage: number;
}

export interface ApplyRequirementSetInput {
  pkgId: string;
}

export interface SaveBookingInput {
  tripId: string;
  station: string;
  slot: string;
  ref?: string;
  notes?: string;
}

export interface RecordClearanceInput {
  checkpointIndex: number;
  result: 'PASSED' | 'HELD' | 'FAILED';
  ref?: string | null;
  by?: string | null;
}

export interface ErrorEnvelope {
  success: false;
  message: string;
  errorCode: string;
  data: null;
  errors?: Record<string, string[]>;
}

