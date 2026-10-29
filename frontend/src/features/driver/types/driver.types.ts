// ============================================================================
// DRIVER / ESCORT – Models, DTO, Status
// Dùng union type thay cho enum (tsconfig bật erasableSyntaxOnly).
// ============================================================================

export type TransportMode = 'ROAD' | 'AIR';

/** Trạng thái vận hành của chuyến (giống Coordinator) */
export type TripStatus = 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';

export type StopType =
  | 'ORIGIN'
  | 'REST_STOP'
  | 'FUEL_STOP'
  | 'CHECKPOINT'
  | 'AIRPORT'
  | 'QUARANTINE_STATION'
  | 'DESTINATION';

export type MilestoneType =
  | 'DEPARTED'
  | 'ARRIVED_STOP'
  | 'LEFT_STOP'
  | 'ARRIVED_CHECKPOINT'
  | 'PASSED_CHECKPOINT'
  | 'ARRIVED_DESTINATION';

/** Vị trí của nhân sự trên chuyến */
export type CrewSlot = 'MAIN_DRIVER' | 'CO_DRIVER' | 'VETERINARIAN';

/** Vai trò tài khoản tổ xe: tài xế ghi mốc, hộ tống/bác sĩ ghi sức khoẻ ngựa */
export type CrewRole = 'DRIVER' | 'ESCORT' | 'VETERINARIAN';

export type HorseCondition = 'NORMAL' | 'MONITOR' | 'ABNORMAL';

export type ClearanceResult = 'PASSED' | 'HELD' | 'REJECTED';

export type IncidentType =
  | 'VEHICLE_BREAKDOWN'
  | 'BORDER_DELAY'
  | 'BAD_WEATHER'
  | 'TRAFFIC_ACCIDENT'
  | 'HORSE_HEALTH'
  | 'CUSTOMS_HOLD'
  | 'ROAD_CLOSURE'
  | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type DelayStatus = 'REPORTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type RefuseCategory =
  | 'RECEIVER_UNAVAILABLE'
  | 'STABLE_NOT_READY'
  | 'IDENTITY_AUTHORIZATION'
  | 'HORSE_COUNT'
  | 'CONDITION_DISPUTE'
  | 'OTHER';
export type RefuseNextStep = 'CONTACT_CUSTOMER' | 'RESCHEDULE' | 'TEMPORARY_STABLING' | 'MANAGER_DECISION';

export type ReceiverIdType = 'Căn cước công dân' | 'Hộ chiếu' | 'Giấy phép lái xe';

export type TripDetailTab = 'overview' | 'stops' | 'docs' | 'health' | 'handover';

// ---------------------------------------------------------------------------
// MODELS
// ---------------------------------------------------------------------------
export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  phone: string;
}

export interface Horse {
  id: string;
  name: string;
  breed: string;
  sex: string;
  age: number;
  color: string;
  microchip: string;
}

export interface RouteStop {
  id: string;
  name: string;
  type: StopType;
  country: string;
  plannedAt: string; // 'YYYY-MM-DD HH:mm'
  lat?: number;
  lng?: number;
}

export interface Milestone {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  by: string; // crew id
  note?: string;
}

/** Kết quả thông quan do Transport Specialist ghi nhận tại cửa khẩu / trạm */
export interface Clearance {
  stopIndex: number;
  result: ClearanceResult;
  notes: string;
  at: string;
  by: string;
}

export interface Place {
  name: string;
  address: string;
}

export interface Receiver {
  name: string;
  phone: string;
}

export interface HealthLog {
  id: string;
  horseId: string;
  at: string;
  temp: number;
  hr: number;
  condition: HorseCondition;
  notes: string;
  by: string;
}

export interface DocumentItem {
  name: string;
  horseId?: string;
  version: number;
  number?: string;
  expiry?: string;
}

/** Bộ hồ sơ Transport Specialist bàn giao cho tổ xe (chỉ xem) */
export interface DocumentPackage {
  id: string;
  title: string;
  checkpoint?: string;
  releasedAt: string;
  releasedBy: string;
  items: DocumentItem[];
}

export interface DepartureDelay {
  status: DelayStatus;
  at: string;
  by: string;
  reason: string;
  proposedDepart?: string;
}

export interface Incident {
  id: string;
  tripId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  at: string;
  by: string;
  location: string;
  description: string;
  photos: string[];
  approvedPlan?: string;
}

export interface Photo {
  name: string;
  url: string;
}

export interface HandoverHorse {
  horseId: string;
  condition: HorseCondition;
  notes: string;
}

export interface HandoverRecord {
  completedAt: string;
  receiver: { name: string; idType: ReceiverIdType; idNumber: string };
  horses: HandoverHorse[];
  photos: string[];
  signature: string;
  by: string;
}

export interface HandoverAttempt {
  at: string;
  status: 'COMPLETED' | 'REFUSED';
  by: string;
  category?: RefuseCategory;
  reason?: string;
  next?: RefuseNextStep;
  note?: string;
}

export interface Trip {
  id: string;
  requestId: string;
  customer: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  pickup: Place;
  delivery: Place;
  receiver: Receiver;
  /** Người nhận thay thế do Manager phê duyệt */
  altReceiver?: Receiver & { by: string; at: string };
  notes?: string;
  horses: string[];
  plannedDepart: string;
  eta: string;
  status: TripStatus;
  vehicle?: { plate: string; model: string };
  flight?: { airline: string; flightNo: string; departAt: string };
  crew: Partial<Record<CrewSlot, string>>;
  stops: RouteStop[];
  milestones: Milestone[];
  clearances: Clearance[];
  health: HealthLog[];
  documents: DocumentPackage[];
  departureDelay?: DepartureDelay;
  pingAt?: string;
  handover?: HandoverRecord;
  handoverAttempts: HandoverAttempt[];
  handoverStatus?: 'COMPLETED' | 'REFUSED';
}

/** Bản nháp bàn giao đang nhập trên thiết bị (chưa gửi) */
export interface HandoverDraft {
  receiver: { name: string; idType: ReceiverIdType; idNumber: string; checked: boolean; authorized: boolean };
  horses: Record<string, { chip: string; condition: HorseCondition; notes: string; ok: boolean; err: string }>;
  photos: Photo[];
  signature: string | null;
}

// ---------------------------------------------------------------------------
// REQUEST DTO
// ---------------------------------------------------------------------------
export interface RecordMilestoneRequestDto {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  note?: string;
}

export interface HealthLogRequestDto {
  horseId: string;
  at: string;
  temp: number;
  hr: number;
  condition: HorseCondition;
  notes: string;
}

export interface ReportIncidentRequestDto {
  type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  description: string;
  photos: string[];
}

export interface DepartureDelayRequestDto {
  reason: string;
}

export interface CompleteHandoverRequestDto {
  receiver: HandoverRecord['receiver'];
  horses: HandoverHorse[];
  photos: string[];
  signature: string;
}

export interface RefuseHandoverRequestDto {
  category: RefuseCategory;
  reason: string;
  next: RefuseNextStep;
  welfare?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// RESPONSE DTO
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface NextMilestone {
  type: MilestoneType;
  stopIndex: number;
  /** Đang chờ Specialist ghi kết quả thông quan */
  blocked?: boolean;
  clearance?: Clearance;
}
