// ============================================================================
// COORDINATOR (Fleet & Route Coordinator) – Models, DTO, Status
// Dùng union type thay cho enum (tsconfig bật erasableSyntaxOnly).
// ============================================================================

export type TransportMode = 'ROAD' | 'AIR';

/** Trạng thái vận hành của chuyến */
export type TripStatus = 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';

/** Manager đã giao chuyến cho Coordinator/Specialist hay chưa */
export type DeploymentStatus = 'NOT_CONFIRMED' | 'CONFIRMED' | 'ON_HOLD';

/** Trạng thái phương án tuyến đường (Manager phê duyệt) */
export type RouteStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RETURNED';

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

export type VehicleStatus = 'READY' | 'MAINTENANCE' | 'INACTIVE';

export type StaffRole = 'DRIVER' | 'ESCORT' | 'VETERINARIAN';

/** Vị trí nhân sự trên một xe / một chặng */
export type CrewSlot = 'MAIN_DRIVER' | 'CO_DRIVER' | 'VETERINARIAN';

/** Chuyến hàng không có 2 chặng xe: trước và sau chuyến bay */
export type LegKey = 'outbound' | 'inbound';

export type FlightStatus = 'DRAFT' | 'BUDGET_PENDING' | 'BUDGET_APPROVED' | 'BOOKED' | 'REJECTED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/** Phương án giải cứu / thay thế khi có sự cố */
export type RescueKind = 'VEHICLE_CHANGE' | 'EXTERNAL_RESCUE' | 'EMERGENCY_VET' | 'ROUTE_ADJUSTMENT' | 'CREW_CHANGE';
export type PlanPayer = 'COMPANY' | 'CUSTOMER' | 'INSURANCE';
export type PlanStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED';

/** Tài xế báo chậm khởi hành → Coordinator đề xuất lịch mới → Manager duyệt */
export type DelayStatus = 'REPORTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type TripDetailTab = 'overview' | 'route' | 'resources' | 'flight' | 'tracking';

/** Địa điểm cấu hình sẵn: cửa khẩu, sân bay, trạm kiểm dịch, điểm nghỉ */
export type PlaceType = 'AIRPORT' | 'LAND_BORDER' | 'QUARANTINE_STATION' | 'REST_STOP' | 'DESTINATION' | string;

// ---------------------------------------------------------------------------
// MODELS
// ---------------------------------------------------------------------------
export interface RouteStop {
  lat?: number;
  lng?: number;
  checkpointId?: number;
  id: string;
  name: string;
  type: StopType;
  country: string; // mã quốc gia: VN, TH, SG, JP...
  plannedAt: string; // 'YYYY-MM-DD HH:mm'
}

export interface RoutePlan {
  version: number;
  status: RouteStatus;
  stops: RouteStop[];
  submittedAt?: string;
  reviewedAt?: string;
  returnReason?: string;
}

export type CrewAssignment = Partial<Record<CrewSlot, string>>;

export interface GroundLeg {
  key: LegKey;
  title: string;
  country: string;
  from: string;
  to: string;
  vehicleId?: string;
  crew: CrewAssignment;
}

export interface FlightPlan {
  airline: string;
  flightNo: string;
  fromAirport: string;
  toAirport: string;
  departAt: string;
  arriveAt: string;
  cost: number;
  status: FlightStatus;
  bookingRef?: string;
}

export interface Milestone {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  by: string;
  note?: string;
}

export interface EtaChange {
  from: string;
  to: string;
  at: string;
  by: string;
  reason: string;
}

export interface DepartureDelay {
  status: DelayStatus;
  at: string;
  by: string;
  reason: string;
  oldDepart: string;
  oldEta: string;
  proposedDepart?: string;
  proposedEta?: string;
  proposal?: string;
  proposedBy?: string;
}

export interface Trip {
  id: string;
  requestId: string;
  customer: string;
  origin: string;
  destination: string;
  originCountry: string;
  destinationCountry: string;
  mode: TransportMode;
  horses: string[];
  plannedDepart: string;
  eta: string;
  status: TripStatus;
  deploymentStatus: DeploymentStatus;
  route: RoutePlan;
  /** Chuyến đường bộ: 1 xe + tổ lái */
  vehicleId?: string;
  crew: CrewAssignment;
  /** Chuyến hàng không: 2 chặng xe trước/sau chuyến bay */
  legs?: Record<LegKey, GroundLeg>;
  flight?: FlightPlan;
  resourcesConfirmed?: { at: string; by: string };
  milestones: Milestone[];
  etaHistory: EtaChange[];
  departureDelay?: DepartureDelay;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  stalls: number;
  country: string;
  base: string;
  status: VehicleStatus;
  nextService: string;
  features: string;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  country: string;
  phone: string;
  licence?: string;
  certExpiry?: string; // chứng chỉ thú y
}

export interface Incident {
  id: string;
  tripId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  reportedBy: string;
  description: string;
  location?: string;
  plans?: RescuePlan[];
  log?: IncidentLog[];
  ackBy?: string;
  ackAt?: string;
  resolvedAt?: string;
  resolveNote?: string;
}

export interface RescuePlan {
  id: string;
  kind: RescueKind;
  desc: string;
  cost: number;
  payer: PlanPayer;
  etaHours: number;
  status: PlanStatus;
  at: string;
  by: string;
  backupVehicleId?: string;
  decisionNote?: string;
}

export interface IncidentLog {
  at: string;
  text: string;
}

// ---------------------------------------------------------------------------
// REQUEST DTO
// ---------------------------------------------------------------------------
export interface SubmitRouteRequestDto {
  stops: RouteStop[];
}

export interface AssignResourcesRequestDto {
  leg?: LegKey; // chỉ dùng cho chuyến AIR
  vehicleId?: string;
  crew: CrewAssignment;
}

export interface UpdateEtaRequestDto {
  eta: string;
  reason: string;
}

export interface RecordMilestoneRequestDto {
  type: MilestoneType;
  stopIndex: number;
  at: string;
  note?: string;
}

export type RescuePlanRequestDto = Pick<RescuePlan, 'kind' | 'desc' | 'cost' | 'payer' | 'etaHours' | 'backupVehicleId'>;

export interface DelayProposalRequestDto {
  plannedDepart: string;
  eta: string;
  proposal: string;
}

export type FlightProposalRequestDto = Omit<FlightPlan, 'status' | 'bookingRef'>;

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

export interface CoordinatorDashboardStats {
  needRoute: number;
  needResources: number;
  readyVehicles: number;
  totalVehicles: number;
  inTransit: number;
  openIncidents: number;
  delaysToHandle: number;
}
