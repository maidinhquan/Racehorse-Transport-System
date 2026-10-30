// ============================================================================
// Transport Specialist – kiểu dữ liệu (bám theo phần Specialist trong bản demo CBN Transport)
// Ngày giờ: 'YYYY-MM-DD' hoặc 'YYYY-MM-DD HH:mm' (giờ Việt Nam)
// ============================================================================

export type CountryCode = 'VN' | 'JP' | 'TH' | 'KH' | 'SG' | 'UK' | 'AE';
export type Direction = 'EXPORT' | 'IMPORT' | 'DOMESTIC';
export type TransportMode = 'ROAD' | 'AIR';

// ---------------------------------------------------------------------------
// Quy định & thiết lập
// ---------------------------------------------------------------------------
export type DocGroup = 'IDENTITY' | 'MEDICAL' | 'QUARANTINE' | 'CUSTOMS' | 'OTHER';
export type DocScope = 'PER_HORSE' | 'PER_TRIP';
export type Provider = 'CUSTOMER' | 'CBN';
export type RequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL';
export type RequirementStage = 'BEFORE_SUBMIT' | 'BEFORE_DEPART' | 'AT_CHECKPOINT';
export type ConfigStatus = 'ACTIVE' | 'RETIRED';

/** Loại giấy tờ (danh mục) */
export interface DocType {
  id: string;
  name: string;
  group: DocGroup;
  scope: DocScope;
  provider: Provider;
  /** Hiệu lực mặc định (ngày); null = theo hạn ghi trên giấy tờ */
  validityDays: number | null;
  status: ConfigStatus;
}

/** Một dòng yêu cầu: cần giấy tờ gì, ai cung cấp, từng ngựa hay toàn chuyến, mức độ, giai đoạn */
export interface RequirementLine {
  typeId: string;
  provider: Provider;
  scope: DocScope;
  level: RequirementLevel;
  stage: RequirementStage;
  condition: string;
}

/** Yêu cầu theo quốc gia / hướng (xuất khẩu, nhập khẩu, nội địa) */
export interface Regulation {
  id: string;
  country: CountryCode;
  direction: Direction;
  lines: RequirementLine[];
  note: string;
  v: number;
  effectiveFrom: string;
  status: ConfigStatus;
}

/** Bộ yêu cầu hồ sơ áp dụng cho một tuyến + phương thức */
export interface RegPackage {
  id: string;
  name: string;
  items: Array<[CountryCode, Direction]>;
  origin: CountryCode;
  dest: CountryCode;
  modes: TransportMode[];
  note: string;
  v: number;
  effectiveFrom: string;
  status: ConfigStatus;
}

/** Bản chụp bộ yêu cầu mà chuyến giữ khi áp dụng (sửa bộ sau này không làm đổi chuyến cũ) */
export interface ReqSetSnapshot {
  pkgId: string;
  pkgV: number;
  name: string;
  at: string;
  by: string;
  rules: Array<{ country: CountryCode; direction: Direction; regId: string | null; regV?: number; lines: RequirementLine[] }>;
}

// ---------------------------------------------------------------------------
// Chuyến được giao
// ---------------------------------------------------------------------------
export type TripStatus = 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';
export type DeploymentStatus = 'NOT_CONFIRMED' | 'CONFIRMED' | 'ON_HOLD';
export type ClearanceResult = 'PASSED' | 'HELD' | 'FAILED';

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
  checkedBy?: string;
  checkedAt?: string;
}

export interface RouteCheckpoint {
  name: string;
  type: 'LAND_BORDER' | 'AIRPORT' | 'QUARANTINE_STATION';
  country: CountryCode;
  plannedAt: string;
  arrivedAt?: string;
  clearance?: { result: ClearanceResult; at: string; ref: string; by: string };
}

export interface SpecTrip {
  id: string;
  requestId: string;
  customerName: string;
  origin: string;
  destination: string;
  originCountry: CountryCode;
  destCountry: CountryCode;
  mode: TransportMode;
  status: TripStatus;
  deployment: DeploymentStatus;
  plannedDepart: string;
  eta: string;
  horses: SpecHorse[];
  reqSet?: ReqSetSnapshot;
  docsReady?: { at: string; by: string };
  insurance?: Insurance;
  checkpoints: RouteCheckpoint[];
}

// ---------------------------------------------------------------------------
// Giấy tờ khách hàng cung cấp (cùng dữ liệu với cổng Khách hàng)
// ---------------------------------------------------------------------------
export type CustomerDocKey =
  | 'passport' | 'ownership' | 'bio' | 'valueProof' | 'flu' | 'health' | 'conditions' | 'vet';

export type CustomerDocStatus = 'MISSING' | 'OPTIONAL' | 'SUBMITTED' | 'APPROVED' | 'ACTION_REQUIRED';

export interface CustomerDoc {
  tripId: string;
  key: CustomerDocKey;
  /** Mã ngựa (horseId) */
  scope: string;
  status: CustomerDocStatus;
  optional: boolean;
  file?: string;
  note: string;
  issue?: string;
  expiry?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/** Yêu cầu khách bổ sung giấy tờ (kèm lý do) */
export interface DocRequest {
  id: string;
  tripId: string;
  key: CustomerDocKey;
  scope: string;
  reason: string;
  dueAt?: string;
  status: 'OPEN' | 'SUBMITTED' | 'FULFILLED';
  createdAt: string;
  history: Array<[string, string]>;
}

// ---------------------------------------------------------------------------
// Chứng từ CBN Transport ghi nhận cho chuyến (giấy phép, kiểm dịch, tờ khai…)
// ---------------------------------------------------------------------------
export type TripDocStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface DocVersion {
  v: number;
  file: string;
  at: string;
  by: string;
}

export interface DocReview {
  v: number;
  decision: 'APPROVED' | 'REJECTED';
  at: string;
  by: string;
  remark: string;
}

export interface TripDocument {
  id: string;
  tripId: string;
  typeId: string;
  horseId: string | null;
  status: TripDocStatus;
  number: string;
  issuer: string;
  issuedAt: string;
  expiry: string;
  versions: DocVersion[];
  reviews: DocReview[];
  rejectReason?: string;
  physicalCopy: boolean;
}

export interface QuarantineBooking {
  id: string;
  tripId: string;
  station: string;
  slot: string;
  ref: string;
  status: 'REQUESTED' | 'BOOKED';
  notes: string;
  confirmedAt?: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  role: 'TRANSPORT_SPECIALIST' | 'LOGISTICS_MANAGER' | 'CUSTOMER' | 'SYSTEM';
  action: string;
  entity: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Checklist & kết quả
// ---------------------------------------------------------------------------
export type ChecklistStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_CONFIGURED';

export interface ChecklistItem {
  typeId: string;
  horseId: string | null;
  provider: Provider;
  level: RequirementLevel;
  stage: RequirementStage;
  condition: string;
  /** Mục bắt buộc trước khởi hành (tính vào tiến độ Docs READY) */
  counted: boolean;
  status: ChecklistStatus;
  doc?: TripDocument;
  /** Với mục chưa cấu hình: quốc gia + hướng còn thiếu */
  missingRule?: string;
}

export interface Checklist {
  items: ChecklistItem[];
  ready: number;
  total: number;
  pending: number;
  needs: number;
  status: 'READY' | 'NOT_READY';
}

export interface RecordDocInput {
  tripId: string;
  typeId: string;
  horseId: string | null;
  number: string;
  issuer: string;
  issuedAt: string;
  expiry: string;
  file: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

export type TripDetailTab = 'customer' | 'required' | 'insurance';
export type SetupTab = 'types' | 'regs' | 'sets';
