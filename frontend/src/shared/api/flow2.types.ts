// ============================================================================
// FLOW 2: QUẢN LÝ HỒ SƠ Y TẾ, KIỂM DỊCH, BẢO HIỂM VÀ DANH MỤC (API Types)
// Nguồn chuẩn: contracts/API-Flow/Flow2/FLOW2.md & FLOW2-API-JSON.md
// ============================================================================

export type Flow2Country = 'VN' | 'JP' | 'TH' | 'KH' | 'SG' | 'UK' | 'AE';
export type Direction = 'EXPORT' | 'IMPORT' | 'DOMESTIC';
export type DocScope = 'PER_HORSE' | 'PER_TRIP';
export type Provider = 'CUSTOMER' | 'CBN';
export type RequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL';
export type RequirementStage = 'BEFORE_SUBMIT' | 'BEFORE_DEPART' | 'AT_CHECKPOINT';

// ----------------------------------------------------------------------------
// F2-J01: Capabilities
// ----------------------------------------------------------------------------
export interface Flow2Capabilities {
  version: string;
  features: {
    checklist: boolean;
    quarantineBooking: boolean;
    insuranceVerification: boolean;
    supplements: boolean;
    auditTrail: boolean;
  };
}

// ----------------------------------------------------------------------------
// Checklist & Requirements (F2-J12, J13, J14)
// ----------------------------------------------------------------------------
export interface ChecklistIssue {
  code: string;
  scope: DocScope;
  horseId?: string;
  key: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface TripChecklist {
  tripId: string;
  packageId: string | null;
  packageName?: string;
  allApproved: boolean;
  canConfirmDocsReady: boolean;
  issues: ChecklistIssue[];
  items: Array<{
    typeId: string;
    typeName: string;
    scope: DocScope;
    horseId?: string;
    horseName?: string;
    provider: Provider;
    status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTION_REQUIRED' | 'EXPIRING_SOON' | 'EXPIRED';
    documentRef?: string;
    fileUrl?: string;
    validUntil?: string;
  }>;
}

export interface RequirementSetPreview {
  pkgId: string;
  pkgName: string;
  applicable: boolean;
  reason?: string;
  addedCount: number;
  removedCount: number;
  sampleChecklist: ChecklistIssue[];
}

// ----------------------------------------------------------------------------
// Customer Documents & Supplements (F2-J15, J16, J17, J52)
// ----------------------------------------------------------------------------
export interface CustomerDocReviewInput {
  scope: DocScope;
  horseId?: string;
  key: string;
  decision: 'APPROVED' | 'ACTION_REQUIRED';
  feedback?: string;
}

export interface CustomerDocRequestInput {
  tripId: string;
  scope: DocScope;
  horseId?: string;
  title: string;
  instructions: string;
  dueAt: string;
}

export interface CustomerSupplement {
  supplementRef: string;
  requestId: string;
  tripId: string;
  scope: DocScope;
  horseId?: string;
  title: string;
  instructions: string;
  dueAt: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  fileUrl?: string;
}

// ----------------------------------------------------------------------------
// Company Documents & Versioning (F2-J19, J20, J22, J23)
// ----------------------------------------------------------------------------
export interface CompanyDocumentInput {
  tripId: string;
  docType: string;
  scope: DocScope;
  horseId?: string;
  title: string;
  docNumber?: string;
  issuedAt?: string;
  validUntil?: string;
  file: File;
}

export interface CompanyDocumentVersionInput {
  versionNo: number;
  reason: string;
  file: File;
}

export interface PhysicalCopyInput {
  holderName: string;
  storageLocation: string;
  verifiedAt: string;
}

// ----------------------------------------------------------------------------
// Insurance (F2-J24, J25)
// ----------------------------------------------------------------------------
export interface InsuranceInput {
  policyNumber: string;
  provider: string;
  insuredValueVnd: number;
  premiumVnd: number;
  startDate: string;
  endDate: string;
  termsDocUrl?: string;
}

export interface InsuranceVerifyResult {
  verified: boolean;
  verifiedAt: string;
  verifiedBy: string;
  policyNumber: string;
  active: boolean;
}

// ----------------------------------------------------------------------------
// Quarantine Bookings (F2-J26, J27)
// ----------------------------------------------------------------------------
export interface QuarantineBookingInput {
  tripId: string;
  facilityId: string;
  facilityName: string;
  checkInDate: string;
  checkOutDate: string;
  horseCount: number;
  specialCareNotes?: string;
}

export interface QuarantineBookingConfirmInput {
  bookingRef: string;
  stationContact: string;
  costVnd?: number;
  notes?: string;
}

// ----------------------------------------------------------------------------
// Customs & Checkpoint Clearances
// ----------------------------------------------------------------------------
export interface ClearanceRecordInput {
  checkpointId: number;
  checkpointName: string;
  certNumber: string;
  passedAt: string;
  officerName?: string;
  status: 'CLEARED' | 'CONDITIONAL' | 'DETAINED';
  notes?: string;
}
