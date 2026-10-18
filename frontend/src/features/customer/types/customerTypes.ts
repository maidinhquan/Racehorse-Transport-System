// ==========================================
// Customer Domain Types (Flow 1 -> Flow 6)
// ==========================================

export type SupportedCountry = 'Việt Nam' | 'Nhật Bản';

export type TransportType = 'Đường bộ' | 'Hàng không';

export interface ProfileFile {
  name: string;
  url: string;
  uploadedAt: string;
}

export interface HorseDossier {
  sex?: string;
  passportAuthority?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  value?: number;
  currency?: string;
  fluDate?: string;
  conditions?: string;
  vetName?: string;
  vetPhone?: string;
  files?: Partial<Record<'photo' | 'passport' | 'ownership' | 'valueProof' | 'flu' | 'health', ProfileFile>>;
}

export interface TransportPlace {
  name: string;
  contact: string;
  address: string;
  postal: string;
  phone: string;
  notes: string;
}

export interface HorseProfile {
  id: string;
  name: string;
  breed: string;
  microchipIso: string;
  feiPassportNo: string;
  gender: 'Đực' | 'Cái' | 'Thiến';
  weightKg: number;
  dob?: string;
  color?: string;
  photoUrl?: string;
  dossier?: HorseDossier;
  status: 'Ready' | 'InTransit' | 'Quarantine';
}

export interface BaselineDocument {
  docKey: string;
  name: string;
  scope: 'request' | 'horse';
  horseId?: string;
  status: 'Draft' | 'Submitted' | 'Pending Review' | 'Approved' | 'Action Required';
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  notes?: string;
}

export type RequestStatus =
  | 'Draft'
  | 'Pending'                      // Waiting for Manager Review
  | 'Changes Requested'            // Manager requested customer to modify request
  | 'Rejected'                     // Request rejected by Manager
  | 'Accepted – Contract Preparation' // Accepted by Manager, preparing contract
  | 'Contract Review'              // Contract issued, awaiting terms accept / revision / deposit
  | 'Deposit Verified – Awaiting Signature' // Deposit verified, waiting for OTP contract signing
  | 'Activated'                    // Contract effective, Trip created
  | 'In Transit'                   // On the road / in flight
  | 'Delivered'                    // Handover completed, awaiting balance payment
  | 'Acceptance'                   // Balance verified, 24h feedback window running
  | 'Closed'                       // Fully closed (no open complaint after 24h)
  | 'Cancelled';                   // Cancelled

export type ContractVersionStatus =
  | 'ISSUED'
  | 'CHANGES_REQUESTED'
  | 'REVISED'
  | 'EXPIRED'
  | 'EFFECTIVE'
  | 'REJECTED';

export interface ContractVersion {
  version: number;
  contractRef: string;
  issuedAt: string;
  validUntil: string; // 24h shared deadline for review, deposit, OTP sign
  totalPrice: number;
  depositRequired: number; // usually 30%
  balanceRemaining: number;
  currency: string;
  status: ContractVersionStatus;
  termsAcceptedAt?: string | null;
  changeRequests?: {
    requestedAt: string;
    sections: string[]; // ['route', 'dates', 'pricing', 'terms', 'other']
    customerNotes: string;
    managerResponse?: {
      decision: 'ACCEPTED' | 'REJECTED';
      notes: string;
      respondedAt: string;
    };
  };
  extensionHistory?: Array<{
    extendedAt: string;
    newDeadline: string;
    reason: string;
    managerId: string;
  }>;
}

export type PaymentMethod = 'VNPAY' | 'BANK_TRANSFER';

export type PaymentStatus =
  | 'INITIATED'               // đang thanh toán
  | 'PROCESSING'              // chờ đối soát / xác minh
  | 'SUCCESS'                 // thành công
  | 'FAILED'                  // thất bại đã xác nhận
  | 'CANCELLED'               // hủy đã xác nhận
  | 'OVERDUE_RECONCILIATION'; // Quá hạn — chờ đối soát

export interface PaymentTransaction {
  id: string;
  requestId: string;
  type: 'DEPOSIT' | 'BALANCE' | 'REFUND';
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  confirmedAt?: string;
  referenceCode: string;
  note?: string;
  refundInfo?: {
    status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED';
    refundAmount: number;
    requestedAt: string;
    completedAt?: string;
    reason?: string;
  };
}

export interface TripLegMilestone {
  id: string;
  type: 'PICKUP' | 'REST_STOP' | 'AIRPORT_TRANSFER_ORIGIN' | 'FLIGHT_DEPARTURE' | 'FLIGHT_ARRIVAL' | 'AIRPORT_TRANSFER_DEST' | 'FINAL_DELIVERY';
  title: string;
  location: string;
  scheduledTime: string;
  confirmedTime?: string;
  status: 'PENDING' | 'CONFIRMED';
  actorName?: string;
  actorRole?: string;
  notes?: string;
}

export interface HealthLogEntry {
  id: string;
  horseId: string;
  horseName: string;
  timestamp: string;
  recordedBy: string;
  role: 'VETERINARIAN' | 'ESCORT' | 'COORDINATOR';
  entryType: 'VITAL_SIGNS' | 'FEEDING_HYDRATION' | 'CLINICAL_OBSERVATION' | 'REST_STOP';
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  waterIntakeLiters?: number;
  foodIntakeKg?: number;
  photoUrl?: string;
  observationNotes: string;
  isDoctorConclusion: boolean;
}

export interface TransportIncident {
  id: string;
  requestId: string;
  horseId?: string;
  type: 'VEHICLE_RESOURCE' | 'HORSE_HEALTH' | 'DELAY_AIR' | 'OTHER';
  title: string;
  description: string;
  impactOnEta?: string;
  reportedAt: string;
  status: 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED';
  resolutionNotes?: string;
  customerActionRequired?: string;
}

export interface HandoverRecord {
  requestId: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  otpCode?: string;
  otpVerifiedAt?: string;
  refusalReason?: string;
  receiverSignatureNotes?: string;
  completedAt?: string;
}

export type ComplaintStatus = 'OPEN' | 'MANAGER_RESOLVED' | 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DISPUTED';

export interface CustomerComplaint {
  id: string;
  requestId: string;
  horseId?: string;
  category: 'EQUIPMENT_CONDITION' | 'HORSE_HEALTH_IMPACT' | 'DELAY_DELIVERY' | 'BILLING' | 'OTHER';
  title: string;
  content: string;
  createdAt: string;
  status: ComplaintStatus;
  managerResolution?: {
    resolvedAt: string;
    resolutionSummary: string;
    refundAdjustmentOffer?: number;
  };
  customerAgreedAt?: string;
}

export interface CustomerFeedback {
  id: string;
  requestId: string;
  rating: number; // 1-5
  comment: string;
  submittedAt: string;
}

export interface CustomerTransportRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  // Route & Dates
  originCity: string;
  originCountry: SupportedCountry;
  destinationCity: string;
  destinationCountry: SupportedCountry;
  transportType: TransportType;
  expectedDate: string;
  committedDeadline: string;

  pickupAddress: string;
  deliveryAddress: string;
  pickup?: TransportPlace;
  delivery?: TransportPlace;
  horseNotes?: Record<string, string>;
  requestedHorseCount?: number;
  horseSlots?: string[];

  // Designated Receiver
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;

  // Horses
  horseIds: string[];
  horses: HorseProfile[];
  commercialValueUsd: number;
  specialCareNotes?: string;

  // Baseline Documents
  documents: BaselineDocument[];

  // Status
  status: RequestStatus;
  rejectionReason?: string;
  changeRequestReason?: string; // Reason from manager asking customer to update request

  // Contract & Pricing
  contractVersions: ContractVersion[];
  currentVersionNumber: number;

  // Payments
  transactions: PaymentTransaction[];

  // Trip association
  tripId?: string;
  legs?: TripLegMilestone[];
  healthLogs?: HealthLogEntry[];
  incidents?: TransportIncident[];

  // Handover & Closure
  handover?: HandoverRecord;
  acceptanceWindow?: {
    startedAt: string;
    deadline: string; // 24h countdown
    closedAt?: string;
  };
  complaints: CustomerComplaint[];
  feedback?: CustomerFeedback;

  createdAt: string;
  updatedAt: string;
}
