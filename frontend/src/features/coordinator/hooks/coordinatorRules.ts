import type {
  CrewAssignment,
  DelayStatus,
  Incident,
  PlanPayer,
  PlanStatus,
  RescueKind,
  RescuePlan,
  CrewSlot,
  FlightStatus,
  IncidentSeverity,
  IncidentStatus,
  LegKey,
  Milestone,
  MilestoneType,
  RouteStatus,
  Staff,
  StaffRole,
  StopType,
  Trip,
  TripStatus,
  DeploymentStatus,
  Vehicle,
  VehicleStatus,
} from '../types';
import { COUNTRY_NAME } from '../data/mockData';

// ============================================================================
// Nhãn hiển thị (VI)
// ============================================================================
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PLANNING: 'Lập kế hoạch', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Hoàn tất',
};
export const DEPLOYMENT_LABEL: Record<DeploymentStatus, string> = {
  NOT_CONFIRMED: 'Chờ Manager giao', CONFIRMED: 'Đã giao việc', ON_HOLD: 'Tạm dừng',
};
export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ Manager duyệt', APPROVED: 'Đã duyệt', RETURNED: 'Bị trả về',
};
export const STOP_LABEL: Record<StopType, string> = {
  ORIGIN: 'Điểm đi', REST_STOP: 'Điểm nghỉ', FUEL_STOP: 'Điểm đổ nhiên liệu', CHECKPOINT: 'Cửa khẩu',
  AIRPORT: 'Sân bay', QUARANTINE_STATION: 'Trạm kiểm dịch', DESTINATION: 'Điểm đến',
};
export const STOP_COLOR: Record<StopType, string> = {
  ORIGIN: '#0f172a', REST_STOP: '#d97706', FUEL_STOP: '#64748b', CHECKPOINT: '#dc2626',
  AIRPORT: '#2563eb', QUARANTINE_STATION: '#7c3aed', DESTINATION: '#16a34a',
};
export const MILESTONE_LABEL: Record<MilestoneType, string> = {
  DEPARTED: 'Rời điểm đi', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng',
  ARRIVED_CHECKPOINT: 'Đến trạm kiểm soát', PASSED_CHECKPOINT: 'Qua trạm kiểm soát', ARRIVED_DESTINATION: 'Đến điểm giao',
};
export const FLIGHT_STATUS_LABEL: Record<FlightStatus, string> = {
  DRAFT: 'Bản nháp', BUDGET_PENDING: 'Chờ Manager duyệt ngân sách', BUDGET_APPROVED: 'Đã duyệt ngân sách • chờ đặt chỗ',
  BOOKED: 'Đã xác nhận đặt chỗ', REJECTED: 'Bị từ chối',
};
export const ROLE_LABEL: Record<StaffRole, string> = { DRIVER: 'Tài xế', ESCORT: 'Áp tải', VETERINARIAN: 'Bác sĩ thú y' };
export const SLOT_LABEL: Record<CrewSlot, string> = { MAIN_DRIVER: 'Tài xế chính', CO_DRIVER: 'Phụ lái kiêm Escort', VETERINARIAN: 'Bác sĩ thú y' };
export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = { READY: 'Sẵn sàng', MAINTENANCE: 'Bảo dưỡng', INACTIVE: 'Ngừng hoạt động' };
export const SEVERITY_LABEL: Record<IncidentSeverity, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' };
export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý', CLOSED: 'Đã đóng' };
export const SLOTS: CrewSlot[] = ['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'];
export const INCIDENT_TYPE_LABEL: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe', BORDER_DELAY: 'Chậm tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu', TRAFFIC_ACCIDENT: 'Tai nạn giao thông',
  HORSE_HEALTH: 'Sức khoẻ ngựa', CUSTOMS_HOLD: 'Hải quan tạm giữ', ROAD_CLOSURE: 'Đường bị chặn', OTHER: 'Khác',
};
export const RESCUE_KIND_LABEL: Record<RescueKind, string> = {
  VEHICLE_CHANGE: 'Đổi xe dự phòng', EXTERNAL_RESCUE: 'Thuê cứu hộ bên ngoài (xe cẩu / sửa chữa lưu động)',
  EMERGENCY_VET: 'Đưa ngựa tới trạm thú y cấp cứu gần nhất', ROUTE_ADJUSTMENT: 'Đổi lộ trình', CREW_CHANGE: 'Thay nhân sự',
};
export const PAYER_LABEL: Record<PlanPayer, string> = { COMPANY: 'CBN Transport', CUSTOMER: 'Khách hàng', INSURANCE: 'Bảo hiểm (dự kiến)' };
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { PENDING_APPROVAL: 'Chờ Manager duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', APPLIED: 'Đã áp dụng' };
export const DELAY_LABEL: Record<DelayStatus, string> = {
  REPORTED: 'Tài xế báo chậm khởi hành', PENDING_APPROVAL: 'Chờ Manager duyệt lịch mới', APPROVED: 'Đã duyệt lịch mới', REJECTED: 'Lịch mới bị từ chối',
};
export const PLACE_TYPE_LABEL: Record<string, string> = {
  AIRPORT: 'Sân bay', LAND_BORDER: 'Cửa khẩu đường bộ', QUARANTINE_STATION: 'Trạm kiểm dịch', REST_STOP: 'Điểm nghỉ', DESTINATION: 'Điểm tiếp nhận',
};
export const fmtUsd = (n: number) => `$${n.toLocaleString('en-US')}`;

export const countryName = (c: string) => COUNTRY_NAME[c] || c;
export const modeLabel = (m: Trip['mode']) => (m === 'AIR' ? 'Hàng không' : 'Đường bộ');

// ============================================================================
// Thời gian ('YYYY-MM-DD HH:mm')
// ============================================================================
export const fmtDateTime = (s?: string) => {
  if (!s) return '—';
  const [d, t] = s.replace('T', ' ').split(' ');
  const [, m, day] = d.split('-');
  return `${Number(day)}/${Number(m)}${t ? ', ' + t.slice(0, 5) : ''}`;
};
export const fmtDate = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};
export const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ============================================================================
// Quy tắc nghiệp vụ
// ============================================================================
export const isActiveTrip = (t: Trip) => t.status !== 'COMPLETED';

/** Coordinator chỉ lập kế hoạch khi Manager đã giao và chuyến còn ở bước lập kế hoạch */
export const canPlan = (t: Trip) => t.deploymentStatus === 'CONFIRMED' && t.status === 'PLANNING';
export const routeEditable = (t: Trip) => canPlan(t) && ['DRAFT', 'RETURNED'].includes(t.route.status);

export const crewList = (c?: CrewAssignment) => (c ? Object.values(c).filter((x): x is string => !!x) : []);

export const tripPersonnelIds = (t: Trip): string[] => [
  ...new Set([...crewList(t.crew), ...(t.legs ? [...crewList(t.legs.outbound?.crew), ...crewList(t.legs.inbound?.crew)] : [])]),
];
export const tripVehicleIds = (t: Trip): string[] =>
  [t.vehicleId, t.legs?.outbound?.vehicleId, t.legs?.inbound?.vehicleId].filter((x): x is string => !!x);

/** BR: một nhân sự chỉ được gắn vào MỘT chuyến đang hoạt động */
export const crewConflict = (staffId: string, trip: Trip, trips: Trip[]) =>
  trips.find((u) => u.id !== trip.id && isActiveTrip(u) && tripPersonnelIds(u).includes(staffId));

/** Một xe chỉ phục vụ một chuyến đang hoạt động */
export const vehicleConflict = (vehicleId: string, trip: Trip, trips: Trip[]) =>
  trips.find((u) => u.id !== trip.id && isActiveTrip(u) && tripVehicleIds(u).includes(vehicleId));

/** Quốc gia phục vụ: chuyến bộ theo nơi đi; chặng xe AIR theo quốc gia của chặng */
export const serviceCountry = (t: Trip, leg?: LegKey) => (leg && t.legs && t.legs[leg] ? t.legs[leg].country : t.originCountry);

/** Lý do xe không dùng được ('' = dùng được) */
export function vehicleBlock(v: Vehicle, t: Trip, trips: Trip[], leg?: LegKey): string {
  if (v.status !== 'READY') return `Xe đang ${VEHICLE_STATUS_LABEL[v.status]?.toLowerCase() ?? v.status}.`;
  if (v.country !== serviceCountry(t, leg)) return `Xe đăng ký tại ${countryName(v.country)}.`;
  if (v.stalls < (t.horses?.length ?? 0)) return `Chỉ có ${v.stalls} ngăn cho ${t.horses?.length ?? 0} ngựa.`;
  const c = vehicleConflict(v.id, t, trips);
  if (c) return `Đang phục vụ chuyến ${c.id}.`;
  return '';
}

/** Lý do nhân sự không dùng được cho vị trí ('' = dùng được) */
export function staffBlock(s: Staff, slot: CrewSlot, t: Trip, trips: Trip[], leg?: LegKey): string {
  if (slot === 'VETERINARIAN' && s.role !== 'VETERINARIAN') return 'Không phải bác sĩ thú y.';
  if (slot === 'MAIN_DRIVER' && s.role !== 'DRIVER') return 'Không phải tài xế.';
  if (slot === 'CO_DRIVER' && s.role === 'VETERINARIAN') return 'Bác sĩ thú y không làm phụ lái.';
  if (s.country !== serviceCountry(t, leg)) return `Nhân sự tại ${countryName(s.country)}.`;
  if (slot === 'VETERINARIAN' && (!s.certExpiry || (t.eta && s.certExpiry < t.eta.slice(0, 10)))) return 'Chứng chỉ thú y hết hạn trước khi chuyến kết thúc.';
  const c = crewConflict(s.id, t, trips);
  if (c) return `Đã được gắn vào chuyến ${c.id}.`;
  return '';
}

/** Các mục còn thiếu của một xe/chặng */
export function unitGaps(t: Trip, vehicles: Vehicle[], staff: Staff[], trips: Trip[], leg?: LegKey): string[] {
  const unit = leg && t.legs && t.legs[leg] ? t.legs[leg] : { vehicleId: t.vehicleId, crew: t.crew || {} };
  const crew = unit.crew || {};
  const prefix = leg ? (leg === 'outbound' ? 'Chặng 1: ' : 'Chặng 2: ') : '';
  const gaps: string[] = [];
  const v = vehicles.find((x) => x.id === unit.vehicleId);
  if (!v) gaps.push(`${prefix}chưa phân công xe`);
  else { const b = vehicleBlock(v, t, trips, leg); if (b) gaps.push(`${prefix}xe ${v.plate} – ${b}`); }
  SLOTS.forEach((slot) => {
    const id = crew[slot];
    const s = staff.find((x) => x.id === id);
    if (!s) gaps.push(`${prefix}thiếu ${SLOT_LABEL[slot]?.toLowerCase() ?? slot}`);
    else { const b = staffBlock(s, slot, t, trips, leg); if (b) gaps.push(`${prefix}${s.name} – ${b}`); }
  });
  return gaps;
}

export function resourceGaps(t: Trip, vehicles: Vehicle[], staff: Staff[], trips: Trip[]): string[] {
  if (t.mode === 'AIR') {
    const gaps = [...unitGaps(t, vehicles, staff, trips, 'outbound'), ...unitGaps(t, vehicles, staff, trips, 'inbound')];
    if (!t.flight) gaps.push('Chưa có phương án bay');
    else if (t.flight.status !== 'BOOKED') gaps.push(`Chuyến bay: ${FLIGHT_STATUS_LABEL[t.flight.status]?.toLowerCase() ?? t.flight.status}`);
    return gaps;
  }
  return unitGaps(t, vehicles, staff, trips);
}

/** Việc còn mở của chuyến (hiển thị ở Dashboard / Tổng quan) */
export function planGaps(t: Trip, vehicles: Vehicle[], staff: Staff[], trips: Trip[]): string[] {
  if (t.deploymentStatus !== 'CONFIRMED') return ['Chờ Manager giao chuyến'];
  if (t.status !== 'PLANNING') return [];
  const gaps: string[] = [];
  if (!t.route?.stops?.length) gaps.push('Chưa lập tuyến đường');
  else if (t.route.status !== 'APPROVED') gaps.push(`Tuyến: ${(ROUTE_STATUS_LABEL[t.route.status] ?? t.route.status).toLowerCase()}`);
  gaps.push(...resourceGaps(t, vehicles, staff, trips));
  if (!t.resourcesConfirmed) gaps.push('Chưa xác nhận bố trí xe & nhân sự');
  return gaps;
}

// ============================================================================
// Mốc hành trình (tài xế ghi thủ công, không có GPS)
// ============================================================================
export const lastMilestone = (t: Trip): Milestone | undefined => t.milestones[t.milestones.length - 1];

export function nextMilestone(t: Trip): { type: MilestoneType; stopIndex: number } | null {
  const stops = t.route.stops;
  const m = lastMilestone(t);
  if (t.status === 'READY_TO_DEPART' && !m) return { type: 'DEPARTED', stopIndex: 0 };
  if (t.status !== 'IN_TRANSIT' || !m) return null;
  if (m.type === 'ARRIVED_DESTINATION') return null;
  if (m.type === 'ARRIVED_STOP') return { type: 'LEFT_STOP', stopIndex: m.stopIndex };
  if (m.type === 'ARRIVED_CHECKPOINT') return { type: 'PASSED_CHECKPOINT', stopIndex: m.stopIndex };
  const j = m.stopIndex + 1;
  const s = stops[j];
  if (!s) return null;
  const type: MilestoneType = s.type === 'DESTINATION' ? 'ARRIVED_DESTINATION'
    : ['CHECKPOINT', 'AIRPORT', 'QUARANTINE_STATION'].includes(s.type) ? 'ARRIVED_CHECKPOINT' : 'ARRIVED_STOP';
  return { type, stopIndex: j };
}

export const milestoneText = (t: Trip, m: { type: MilestoneType; stopIndex: number }) =>
  `${MILESTONE_LABEL[m.type]}${t.route.stops[m.stopIndex] ? ' – ' + t.route.stops[m.stopIndex].name : ''}`;

// ============================================================================
// Giám sát hành trình & sự cố
// ============================================================================
/** Vị trí suy ra từ mốc gần nhất (không có GPS): đang ở trạm → tên trạm, đang chạy → đoạn tuyến */
export function whereNow(t: Trip): string {
  const m = lastMilestone(t);
  const name = (i: number) => t.route.stops[i]?.name ?? '';
  if (!m) return t.status === 'READY_TO_DEPART' ? `Chờ xuất phát tại ${name(0) || t.origin}` : t.origin;
  if (['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type)) return `Tại ${name(m.stopIndex)}`;
  return name(m.stopIndex + 1) ? `Trên tuyến ${name(m.stopIndex)} → ${name(m.stopIndex + 1)}` : `Gần ${name(m.stopIndex)}`;
}

/** ETA hiện tại muộn hơn ETA ban đầu */
export const etaSlipped = (t: Trip) => t.etaHistory.length > 0 && t.eta > t.etaHistory[0].from;

export const delayPending = (t: Trip) => !!t.departureDelay && ['REPORTED', 'PENDING_APPROVAL'].includes(t.departureDelay.status);

export const isOpenIncident = (i: Incident) => !['RESOLVED', 'CLOSED'].includes(i.status);

/** Phương án có chi phí, làm trễ ETA, đổi xe, đổi lộ trình hoặc thuê cứu hộ ngoài phải chờ Manager duyệt */
export const planNeedsApproval = (p: Pick<RescuePlan, 'kind' | 'cost' | 'etaHours'>) =>
  p.cost > 0 || p.etaHours > 0 || ['VEHICLE_CHANGE', 'ROUTE_ADJUSTMENT', 'EXTERNAL_RESCUE'].includes(p.kind);

/** Gợi ý loại phương án theo loại sự cố */
export const suggestKind = (type: string): RescueKind =>
  /BREAKDOWN|ACCIDENT/.test(type) ? 'VEHICLE_CHANGE'
    : /HEALTH/.test(type) ? 'EMERGENCY_VET'
      : /BORDER|WEATHER|ROAD_CLOSURE|TRAFFIC|CUSTOMS/.test(type) ? 'ROUTE_ADJUSTMENT' : 'VEHICLE_CHANGE';

/** Xe dự phòng hợp lệ: sẵn sàng, đủ ngăn, không trùng chuyến khác */
export const backupVehicles = (t: Trip, vehicles: Vehicle[], trips: Trip[]) =>
  vehicles.filter((v) => v.id !== t.vehicleId && v.status === 'READY' && v.stalls >= t.horses.length && !vehicleConflict(v.id, t, trips));
