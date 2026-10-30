// ============================================================================
// Kiểu dữ liệu cho trang Logistics Manager
// Dùng chung mã yêu cầu / chuyến / ngựa với các trang Khách hàng, Specialist, Coordinator.
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Kết quả một thao tác: ok = thành công, message hiển thị cho người dùng */
export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

export type ActorRole =
  | 'CUSTOMER'
  | 'LOGISTICS_MANAGER'
  | 'TRANSPORT_SPECIALIST'
  | 'FLEET_ROUTE_COORDINATOR'
  | 'DRIVER_ESCORT'
  | 'SYSTEM';

export interface HistoryEntry {
  at: string;
  role: ActorRole;
  actor: string;
  action: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Khách hàng & ngựa
// ---------------------------------------------------------------------------
export interface CustomerInfo {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}

export interface HorseRef {
  id: string;
  name: string;
  breed: string;
  microchip: string;
  passportNo: string;
}

export interface Place {
  name: string;
  address: string;
  contact: string;
  phone: string;
}

/** Hồ sơ khách hàng nộp (Manager chỉ xem – Specialist duyệt) */
export type DossierStatus = 'APPROVED' | 'PENDING_REVIEW' | 'ACTION_REQUIRED' | 'MISSING';
export interface DossierItem {
  name: string;
  /** Mã ngựa hoặc 'request' cho giấy tờ theo đơn */
  scope: string;
  status: DossierStatus;
  file?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Yêu cầu vận chuyển
// ---------------------------------------------------------------------------
export type RequestStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'CONTRACT_PREPARATION'
  | 'CONTRACT_READY'
  | 'CONTRACT_CHANGES_REQUESTED'
  | 'DEPOSIT_VERIFIED'
  | 'AWAITING_DEPOSIT'
  | 'CANCELLATION_REQUESTED'
  | 'ACTIVATED'
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

/** Trường Manager có thể yêu cầu khách sửa */
export type RevisionField = 'route' | 'date' | 'places' | 'horses' | 'notes';

export interface Cancellation {
  reason: string;
  at: string;
  status: 'REQUESTED' | 'APPROVED' | 'REFUSED';
  decidedAt?: string;
  decisionNote?: string;
  /** Trạng thái trước khi khách gửi yêu cầu hủy (để trả lại nếu Manager từ chối hủy) */
  prevStatus?: RequestStatus;
}

export interface Acceptance {
  status: 'PENDING' | 'ACCEPTED';
  openedAt: string;
  dueAt: string;
  decidedAt?: string;
}

export interface CollectionNote {
  at: string;
  note: string;
  by: string;
}

export interface TransportRequest {
  id: string;
  contractId?: string;
  tripId?: string;
  trip?: any;
  customerId: string;
  origin: string;
  destination: string;
  mode?: TransportMode;
  /** Ngày vận chuyển mong muốn (YYYY-MM-DD) */
  date: string;
  status: RequestStatus;
  horses: string[];
  pickup: Place;
  delivery: Place;
  careNotes: string;
  pickupAt?: string;
  submittedAt: string;
  feedback?: string;
  revisionFields?: RevisionField[];
  /** Lý do từ chối / hủy */
  reason?: string;
  versions: ContractVersion[];
  /** Bản nháp hợp đồng chưa phát hành */
  draft?: ContractDraft;
  dossier: DossierItem[];
  refund?: { status: 'REQUESTED' | 'PROCESSING' | 'REFUNDED'; amount?: number; at?: string | null; refundedAt?: string | null; reference?: string };
  cancellation?: Cancellation;
  acceptance?: Acceptance;
  collection: CollectionNote[];
  closedAt?: string;
  history: HistoryEntry[];
}

// ---------------------------------------------------------------------------
// Hợp đồng & giá
// ---------------------------------------------------------------------------
export type ContractState = 'SIGNED' | 'ISSUED' | 'CHANGES_REQUESTED' | 'EXPIRED' | 'SUPERSEDED' | 'EFFECTIVE' | 'FULFILLED' | 'VOID';
export type TransportMode = 'ROAD' | 'AIR';

export interface ContractItem {
  desc: string;
  amount: number;
  required?: boolean;
}

/** Dự toán chi phí nội bộ – chỉ Manager xem */
export type BudgetKey = 'TRANSPORT' | 'PROCEDURE' | 'VET' | 'INSURANCE' | 'STAFF';
export type Budget = Record<BudgetKey, number> & { FUEL?: number };

export interface ContractTerm {
  title: string;
  text: string;
}

export interface ContractChange {
  at: string;
  text: string;
  proposedDate?: string;
  commercial?: string;
  response?: { at: string; text: string; decision: 'REVISED' | 'KEPT' | 'RETURNED' };
}

export interface DeadlineExtension {
  at: string;
  from: string;
  to: string;
}

export interface ContractVersion {
  v: number;
  number: string;
  contractId?: string;
  snapshot?: import('../../customer/types').ContractSnapshot;
  tripId?: string;
  trip?: any;
  issuedAt: string;
  /** Hạn chung 24 giờ: thanh toán cọc + xác minh + ký OTP */
  validUntil: string;
  mode?: TransportMode;
  modeDeferred?: boolean;
  departAt: string;
  arriveAt: string;
  items: ContractItem[];
  total: number;
  depositPct: number;
  terms: ContractTerm[];
  note?: string;
  budget: Budget;
  /** Lý do bán dưới giá sàn (nếu có) */
  exception?: string;
  state: ContractState;
  termsAcceptedAt?: string;
  signedAt?: string;
  change?: ContractChange;
  extensions: DeadlineExtension[];
}

/** Bản nháp trong trình soạn hợp đồng 4 bước */
export interface ContractDraft {
  mode?: TransportMode;
  departAt: string;
  arriveAt: string;
  budget: Budget;
  items: ContractItem[];
  depositPct: number;
  note: string;
  exception: string;
  terms: ContractTerm[];
  savedAt?: string;
}

// ---------------------------------------------------------------------------
// Thanh toán
// ---------------------------------------------------------------------------
export type PaymentType = 'DEPOSIT' | 'BALANCE' | 'REFUND';
export type PaymentMethod = 'QR_SANDBOX' | 'BANK_TRANSFER' | 'VNPAY';
export type PaymentStatus = 'PENDING_CONFIRMATION' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED';

export interface Transaction {
  id: string;
  requestId: string;
  contractId?: string;
  versionNo?: number;
  confirmedAmount?: number;
  type: PaymentType;
  method: PaymentMethod;
  /** Số tiền khách khai báo / số tiền giao dịch */
  amount: number;
  ref?: string;
  receipt?: string;
  status: PaymentStatus;
  createdAt: string;
  confirmedAt?: string;
  rejectReason?: string;
  /** VNPay session expiry (ms) and reconciliation flags from the server */
  qrExpiresAtMs?: number;
  reviewRequired?: boolean;
  reviewReason?: string | null;
}

// ---------------------------------------------------------------------------
// Chuyến đi
// ---------------------------------------------------------------------------
export type TripStatus = 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';
export type DeploymentStatus = 'NOT_CONFIRMED' | 'CONFIRMED' | 'ON_HOLD';
export type StopType = 'ORIGIN' | 'REST_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'QUARANTINE_STATION' | 'DESTINATION';

export interface Staff {
  id: string;
  name: string;
  role: 'TRANSPORT_SPECIALIST' | 'FLEET_ROUTE_COORDINATOR';
  load?: number;
}

export interface RouteStop {
  name: string;
  type: StopType;
  plannedAt: string;
}

export type RouteStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'CHANGES_REQUESTED';
export interface RoutePlan {
  v: number;
  status: RouteStatus;
  pickupAt?: string;
  submittedAt: string;
  stops: RouteStop[];
  vehicle?: string;
  crew: Array<[string, string]>;
  resourcesConfirmed: boolean;
  note?: string;
  decisionNote?: string;
  decidedAt?: string;
}

export type FlightStatus = 'BUDGET_PENDING' | 'APPROVED' | 'REJECTED' | 'BOOKED';
export interface FlightPlan {
  airline: string;
  flightNo: string;
  budget: number;
  status: FlightStatus;
  decidedAt?: string;
}

export interface TripReadiness {
  docsReady: number;
  docsTotal: number;
  docsReadyAt?: string;
  insurance: 'VERIFIED' | 'PENDING' | 'MISSING';
  quarantineOk: boolean;
}

export type MilestoneType = 'DEPARTED' | 'ARRIVED_STOP' | 'LEFT_STOP' | 'ARRIVED_DESTINATION';
export interface Milestone {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  by: string;
  note?: string;
}

export interface HandoverHorse {
  horseId: string;
  microchipOk: boolean;
  condition: 'NORMAL' | 'MINOR_ISSUE' | 'INJURED';
}
export interface Handover {
  completedAt: string;
  receiverName: string;
  receiverId: string;
  horses: HandoverHorse[];
  photos: string[];
  signature: boolean;
}
export interface HandoverRefusal {
  at: string;
  reason: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface EtaChange {
  at: string;
  from: string;
  to: string;
  reason: string;
}

export interface Trip {
  id: string;
  requestId: string;
  mode?: TransportMode;
  status: TripStatus;
  deployment: {
    status: DeploymentStatus;
    specialistId?: string;
    coordinatorId?: string;
    at?: string;
    holdReason?: string;
  };
  plannedDepart: string;
  eta: string;
  readiness: TripReadiness;
  route?: RoutePlan;
  flight?: FlightPlan;
  departureApprovedAt?: string;
  milestones: Milestone[];
  etaHistory: EtaChange[];
  handover?: Handover;
  refusal?: HandoverRefusal;
}

// ---------------------------------------------------------------------------
// Sự cố & khiếu nại
// ---------------------------------------------------------------------------
export type IncidentType = 'DELAY' | 'HORSE_HEALTH' | 'VEHICLE' | 'BORDER' | 'OTHER';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'CLOSED';
export type PlanStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type Payer = 'COMPANY' | 'CUSTOMER' | 'INSURANCE';

export interface ResponsePlan {
  id: string;
  kind: string;
  desc: string;
  cost: number;
  payer: Payer;
  status: PlanStatus;
  at: string;
  decisionNote?: string;
}

export interface Incident {
  id: string;
  tripId: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  at: string;
  by: string;
  location: string;
  horseId?: string;
  description: string;
  safety: string;
  photos: string[];
  plans: ResponsePlan[];
  log: Array<[string, string]>;
}

export type ComplaintStatus = 'NEW' | 'IN_PROGRESS' | 'PROPOSED' | 'ESCALATED' | 'RESOLVED';
export type ComplaintType = 'HORSE_CONDITION' | 'DELAY' | 'SERVICE' | 'BILLING';

export interface ComplaintMessage {
  from: 'CUSTOMER' | 'MANAGER';
  name: string;
  at: string;
  text: string;
  files?: string[];
}

export interface Complaint {
  id: string;
  requestId: string;
  type: ComplaintType;
  title: string;
  horseId?: string;
  status: ComplaintStatus;
  createdAt: string;
  messages: ComplaintMessage[];
  resolution?: { proposal: string; amount: number };
  resolvedAt?: string;
}

// ---------------------------------------------------------------------------
// Chi phí thực tế
// ---------------------------------------------------------------------------
export type ActualKey = 'FUEL' | 'STAFF' | 'PROCEDURE' | 'VET' | 'INSURANCE' | 'TRANSPORT';
export interface ExtraCost {
  label: string;
  amount: number;
  payer: Payer;
}
export interface ActualCost {
  tripId: string;
  costs: Record<ActualKey, number>;
  extra: ExtraCost[];
  enteredAt: string;
}

// ---------------------------------------------------------------------------
// Thông báo
// ---------------------------------------------------------------------------
export interface ManagerNotification {
  id: string;
  at: string;
  title: string;
  text: string;
  link: string;
  read: boolean;
}
