// ============================================================================
// Customer – kiểu dữ liệu (bám theo luồng Khách hàng trong bản demo CBN Transport)
// Ngày giờ: 'YYYY-MM-DD' hoặc 'YYYY-MM-DD HH:mm' (giờ Việt Nam)
// ============================================================================

export type CountryCode = 'VN' | 'JP' | 'TH' | 'SG' | 'AU' | 'AE' | 'UK';

export interface City {
  name: string;
  country: CountryCode;
  code: string;
}

/** Trạng thái yêu cầu vận chuyển theo vòng đời */
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

/** Trường Manager cho phép sửa khi yêu cầu chỉnh sửa */
export type RequestField = 'route' | 'date' | 'places' | 'horses' | 'notes';

export interface FileRef {
  name: string;
  /** Object URL khi người dùng vừa tải lên trong phiên làm việc */
  url?: string;
  file?: File;
}

export interface Place {
  name: string;
  address: string;
  postal: string;
  contact: string;
  phone: string;
  notes: string;
  latitude?: number;
  longitude?: number;
  cityId?: string;
  cityName?: string;
}

// ---------------------------------------------------------------------------
// Ngựa
// ---------------------------------------------------------------------------
export type HorseSex = 'STALLION' | 'MARE' | 'GELDING' | '';

export interface HorsePassport {
  number: string;
  authority: string;
  issueDate: string;
  expiryDate: string;
  scan?: FileRef;
}

export interface Horse {
  reproductiveStatus?: 'INTACT' | 'NOT_PREGNANT' | 'PREGNANT' | 'GELDED' | null;
  weight?: number | null;
  unsupportedFields?: string[];
  id: string;
  name: string;
  breed: string;
  sex: HorseSex;
  dob: string;
  color: string;
  microchip: string;
  value: string;
  currency: string;
  passport: HorsePassport;
  ownership?: FileRef;
  valueProof?: FileRef;
  flu?: FileRef;
  health?: FileRef;
  photo?: FileRef;
  fluDate: string;
  conditions: string;
  vetName: string;
  vetPhone: string;
}

export type HorseInput = Omit<Horse, 'id'>;

export type PassportStatus = 'MISSING' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';
export type HorseProfileStatus = 'COMPLETE' | 'NEEDS_ATTENTION' | 'INCOMPLETE';

// ---------------------------------------------------------------------------
// Hợp đồng
// ---------------------------------------------------------------------------
export type ContractState =
  | 'ISSUED'
  | 'SIGNED'
  | 'CHANGES_REQUESTED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'EFFECTIVE'
  | 'FULFILLED';

export interface ContractItem {
  desc: string;
  amount: number;
  required?: boolean;
}

export interface ContractChange {
  at: string;
  text: string;
  proposedDate?: string;
  proposedNotes?: string;
  commercial?: string;
  other?: string;
  response?: { at: string; text: string };
}

export interface DeadlineChange {
  at: string;
  from: string;
  to: string;
  by: string;
  reason: string;
}

export interface ContractVersion {
  versionNo?: number;
  contractStatus?: string;
  pdfUrl?: string | null;
  v: number;
  number: string;
  contractId?: string;
  snapshot?: ContractSnapshot;
  terms?: Array<{ title: string; text: string }>;
  mode?: TransportMode;
  departAt?: string;
  arriveAt?: string;
  depositAmount?: number;
  currency?: 'VND';
  issuedAt: string;
  /** Hạn chung: thanh toán cọc + xác minh + ký OTP (24 giờ kể từ khi phát hành) */
  validUntil: string;
  items: ContractItem[];
  total: number;
  depositPct: number;
  /** Trạng thái lưu trữ; EXPIRED được suy ra theo đồng hồ (xem versionState) */
  state: ContractState;
  note?: string;
  termsAcceptedAt?: string;
  signedAt?: string;
  change?: ContractChange;
  deadlineHistory?: DeadlineChange[];
}

// ---------------------------------------------------------------------------
// Thanh toán
// ---------------------------------------------------------------------------
export type PaymentType = 'DEPOSIT' | 'BALANCE';
export type PaymentMethod = 'QR_SANDBOX' | 'VNPAY' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING_CONFIRMATION' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED';
export type DepositState = 'NONE' | 'PENDING' | 'VERIFIED' | 'FAILED';

export interface Payment {
  contractId?: string;
  versionNo?: number;
  invoiceId?: string;
  confirmedAmount?: number;
  id: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  confirmedAt?: string;
  reason?: string;
  /** Mốc hết hạn mã QR (ms theo đồng hồ demo). QR có hiệu lực 5 phút. */
  qrExpiresAtMs?: number;
}

export interface Refund {
  amount: number;
  status: 'REQUESTED' | 'PROCESSING' | 'REFUNDED';
  at: string;
  refundedAt?: string;
  reference?: string;
}

// ---------------------------------------------------------------------------
// Giấy tờ
// ---------------------------------------------------------------------------
/** Hồ sơ theo từng ngựa */
export type HorseDocKey = 'passport' | 'ownership' | 'bio' | 'valueProof' | 'flu' | 'health' | 'conditions' | 'vet';
export type DocKey = HorseDocKey;

export type DocStatus =
  | 'MISSING'
  | 'NEEDS_INPUT'
  | 'OPTIONAL'
  | 'NOT_REQUIRED_YET'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'ACTION_REQUIRED';

/** Bản ghi giấy tờ đã nộp trong một đơn (scope = mã ngựa) */
export interface DocRecord {
  key: DocKey;
  scope: string;
  status: DocStatus;
  file?: FileRef;
  issue?: string;
  updatedAt?: string;
}

/** Một dòng giấy tờ hiển thị cho khách hàng (đã suy ra trạng thái) */
export interface DocItem {
  key: DocKey;
  scope: string;
  name: string;
  status: DocStatus;
  note: string;
  /** 'file' = tải tệp, 'info' = sửa thông tin trong hồ sơ ngựa */
  kind: 'file' | 'info';
  optional: boolean;
  file?: FileRef;
  issue?: string;
}

/** Transport Specialist yêu cầu bổ sung một giấy tờ, kèm lý do */
export interface SupplementRequest {
  id: string;
  key: DocKey;
  scope: string;
  reason: string;
  at: string;
  by: string;
  status: 'OPEN' | 'FULFILLED';
}

/** Giấy tờ do CBN Transport tự xử lý (khách hàng chỉ xem) */
export interface CompanyDoc {
  name: string;
  status: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED';
}

// ---------------------------------------------------------------------------
// Chuyến đi & bàn giao
// ---------------------------------------------------------------------------
export type TripStatus = 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';
export type TransportMode = 'ROAD' | 'AIR';
export type StopType = 'ORIGIN' | 'REST_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'DESTINATION';
export type MilestoneType = 'DEPARTED' | 'ARRIVED_STOP' | 'LEFT_STOP' | 'ARRIVED_DESTINATION';
export type HorseCondition = 'NORMAL' | 'MONITOR' | 'ABNORMAL';

export interface TripStop {
  name: string;
  type: StopType;
  plannedAt: string;
}

export interface TripMilestone {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  by?: string;
  note?: string;
}

export interface EtaChange {
  at: string;
  from: string;
  to: string;
  reason: string;
}

export interface Handover {
  completedAt: string;
  receiverName: string;
  receiverId: string;
  horses: Array<{ horseId: string; microchipOk: boolean; condition: HorseCondition; note?: string }>;
  photos: string[];
}

export interface Trip {
  id: string;
  status: TripStatus;
  mode: TransportMode;
  plannedDepart: string;
  eta: string;
  etaOriginal?: string;
  routeApproved: boolean;
  stops: TripStop[];
  milestones: TripMilestone[];
  etaHistory: EtaChange[];
  handover?: Handover;
}

export interface Acceptance {
  status: 'PENDING' | 'ACCEPTED';
  openedAt: string;
  /** Hạn chung 24 giờ cho nghiệm thu + thanh toán số dư */
  dueAt: string;
  decidedAt?: string;
}

export type ComplaintType = 'HORSE_CONDITION' | 'DELAY' | 'BILLING' | 'SERVICE' | 'OTHER';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id: string;
  title: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  response?: string;
}

// ---------------------------------------------------------------------------
// Yêu cầu vận chuyển
// ---------------------------------------------------------------------------
export type ActorRole = 'CUSTOMER' | 'LOGISTICS_MANAGER' | 'TRANSPORT_SPECIALIST' | 'FLEET_ROUTE_COORDINATOR' | 'DRIVER_ESCORT' | 'SYSTEM';

export interface HistoryEntry {
  at: string;
  actor: string;
  role: ActorRole;
  action: string;
  detail?: string;
}

export interface RequestRevision {
  v: number;
  at: string;
  origin: string;
  destination: string;
  date: string;
  horseCount: number;
  feedback?: string;
}

export interface TransportRequest {
  editingLocally?: boolean;
  mode?: TransportMode;
  purpose?: string | null;
  id: string;
  origin: string;
  destination: string;
  /** Ngày vận chuyển mong muốn */
  date: string;
  horseCount: number;
  pickupAt?: string;
  requestedAt: string;
  submittedAt?: string;
  status: RequestStatus;
  feedback?: string;
  revisionFields?: RequestField[];
  reason?: string;
  careNotes: string;
  pickup: Place;
  delivery: Place;
  /** Mã ngựa theo từng vị trí (độ dài = horseCount, '' = chưa chọn) */
  horses: string[];
  horseNotes: Record<string, string>;
  /** Bước xa nhất đã tới trong wizard (1 điểm nhận/giao, 2 ngựa & hồ sơ, 3 xem lại) */
  wizardStep: number;
  revisions: RequestRevision[];
  versions: ContractVersion[];
  payments: Payment[];
  docs: DocRecord[];
  supplements: SupplementRequest[];
  companyDocs: CompanyDoc[];
  trip?: Trip;
  acceptance?: Acceptance;
  complaints: Complaint[];
  cancelRequest?: { at: string; reason: string; prevStatus: RequestStatus };
  refund?: Refund;
  closedAt?: string;
  history: HistoryEntry[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  company: string;
}

export interface CustomerNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link: string;
}

// ---------------------------------------------------------------------------
// DTO & kết quả
// ---------------------------------------------------------------------------
export interface TripInfoInput {
  mode?: TransportMode;
  pickupAt: string;
  origin: string;
  destination: string;
  date: string;
  horseCount: number;
  careNotes: string;
}

export interface ContractChangeInput {
  text: string;
  proposedDate?: string;
  proposedNotes?: string;
  commercial?: string;
  other?: string;
}

export interface ComplaintInput {
  title: string;
  type: ComplaintType;
  description: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Mã bản ghi vừa tạo (nếu có) */
  id?: string;
}

/** Tiến độ vòng đời yêu cầu (10 giai đoạn) */
export interface Lifecycle {
  at: number;
  exc?: 'warn' | 'fail';
  note: string;
}

export type RequestDetailTab =
  | 'overview'
  | 'documents'
  | 'contract'
  | 'payment'
  | 'tracking'
  | 'handover'
  | 'complaints'
  | 'history';

/** Immutable published content; absent means the backend cannot provide a historical snapshot. */
export interface ContractSnapshot {
  pickupAt?: string;
  origin: string;
  destination: string;
  date: string;
  careNotes: string;
  pickup: Place;
  delivery: Place;
  horses: Array<{ id: string; name: string; breed: string; microchip: string; passportNo: string }>;
  customer: { id: string; name: string; company: string; email: string; phone: string };
}
