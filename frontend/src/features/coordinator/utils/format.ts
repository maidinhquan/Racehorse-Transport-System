// ============================================================================
// Định dạng & nhãn hiển thị (tiếng Việt) – theo bản HTML demo
// ============================================================================
import type { Any } from '../store/coordinatorStore';
import { db } from '../store/coordinatorStore';

const HUMAN_VI: Record<string, string> = {
  PENDING: 'Đang chờ', PENDING_APPROVAL: 'Chờ phê duyệt', PENDING_CONFIRMATION: 'Chờ xác nhận', SUBMITTED: 'Đã nộp', DRAFT: 'Bản nháp', SENT: 'Đã gửi',
  ADJUSTMENT_REQUESTED: 'Yêu cầu điều chỉnh', ACCEPTED: 'Đã chấp nhận', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', RETURNED: 'Bị trả lại', SUPERSEDED: 'Đã thay thế',
  EXPIRED: 'Hết hạn', PLANNING: 'Lập kế hoạch', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Đã hoàn tất', CONFIRMED: 'Đã xác nhận',
  ON_HOLD: 'Tạm dừng', NOT_CONFIRMED: 'Chưa xác nhận', READY: 'Sẵn sàng', NOT_READY: 'Chưa sẵn sàng', NOT_SUBMITTED: 'Chưa nộp', VERIFIED: 'Đã xác minh', MISSING: 'Còn thiếu',
  SUCCESS: 'Thành công', FAILED: 'Không thành công', CANCELLED: 'Đã hủy', NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', PLAN_APPROVED: 'Đã duyệt phương án', CLOSED: 'Đã đóng',
  APPLIED: 'Đã áp dụng', LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng', ESCALATED: 'Đã chuyển cấp trên', RESOLVED: 'Đã giải quyết',
  PENDING_CUSTOMER_CONFIRMATION: 'Chờ khách hàng xác nhận', OPEN: 'Đang mở', MAINTENANCE: 'Đang bảo dưỡng', INACTIVE: 'Ngừng hoạt động', AVAILABLE: 'Sẵn sàng',
  ASSIGNED: 'Đã phân công', BOOKED: 'Đã đặt', BUDGET_PENDING: 'Chờ duyệt ngân sách', BUDGET_APPROVED: 'Đã duyệt ngân sách', REQUESTED: 'Đã yêu cầu', NORMAL: 'Bình thường',
  MONITOR: 'Theo dõi', ABNORMAL: 'Bất thường', ACTIVE: 'Đang hoạt động', EXPIRING_SOON: 'Sắp hết hạn', ROAD: 'Đường bộ', AIR: 'Hàng không', DRIVER: 'Tài xế',
  ESCORT: 'Áp tải', VETERINARIAN: 'Bác sĩ thú y', MAIN_DRIVER: 'Tài xế chính', CO_DRIVER: 'Phụ xe', ORIGIN: 'Điểm đi', DESTINATION: 'Điểm đến',
  CHECKPOINT: 'Trạm kiểm soát', AIRPORT: 'Sân bay', QUARANTINE_STATION: 'Trạm kiểm dịch', REST_STOP: 'Điểm nghỉ', FUEL_STOP: 'Điểm đổ nhiên liệu',
  VEHICLE_BREAKDOWN: 'Hỏng xe', BORDER_DELAY: 'Chậm trễ tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu', TRAFFIC_ACCIDENT: 'Tai nạn giao thông', HORSE_HEALTH: 'Sức khỏe ngựa',
  CUSTOMS_HOLD: 'Bị giữ tại hải quan', ROAD_CLOSURE: 'Kẹt / cấm đường', OTHER: 'Khác', FLIGHT_DELAY: 'Hoãn / đổi chuyến bay', COMPANY: 'Công ty', CUSTOMER: 'Khách hàng',
  INSURANCE: 'Bảo hiểm', DEPARTED: 'Đã khởi hành', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng', ARRIVED_CHECKPOINT: 'Đến trạm kiểm soát',
  PASSED_CHECKPOINT: 'Qua trạm kiểm soát', ARRIVED_DESTINATION: 'Đến nơi', WITHDRAWN: 'Đã rút lại', NOT_REQUIRED: 'Không cần duyệt', CHANGES_REQUESTED: 'Yêu cầu chỉnh sửa',
  HALTED: 'Đã dừng', LOGISTICS_MANAGER: 'Quản lý vận hành', FLEET_COORDINATOR: 'Điều phối đội xe', TRANSPORT_SPECIALIST: 'Chuyên viên vận chuyển',
  UNAVAILABLE: 'Chưa thể tiếp nhận', HEALTH_CONDITION: 'Tình trạng sức khỏe', ON_LEAVE: 'Tạm nghỉ', SUSPENDED: 'Tạm ngừng', DONE: 'Hoàn tất',
};
const titleCase = (v: Any) => String(v ?? '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
/** enum → nhãn tiếng Việt (giống human() + bản dịch của bản HTML) */
export const human = (v: Any) => HUMAN_VI[String(v)] ?? titleCase(v);

/** lớp màu cho nhãn trạng thái */
export const ST_CLASS: Record<string, string> = {
  PENDING: 'pending', PENDING_APPROVAL: 'pending', PENDING_CONFIRMATION: 'processing', SUBMITTED: 'processing', DRAFT: 'draft', SENT: 'approved',
  ADJUSTMENT_REQUESTED: 'pending', ACCEPTED: 'ok', APPROVED: 'ok', REJECTED: 'action', RETURNED: 'action', SUPERSEDED: 'draft', EXPIRED: 'action',
  PLANNING: 'processing', READY_TO_DEPART: 'approved', IN_TRANSIT: 'transit', COMPLETED: 'ok', CONFIRMED: 'ok', ON_HOLD: 'action', NOT_CONFIRMED: 'pending',
  READY: 'ok', NOT_READY: 'pending', NOT_SUBMITTED: 'action', VERIFIED: 'ok', MISSING: 'action', SUCCESS: 'ok', FAILED: 'action', CANCELLED: 'draft',
  NEW: 'action', IN_PROGRESS: 'processing', PLAN_APPROVED: 'approved', CLOSED: 'ok', APPLIED: 'ok', LOW: 'draft', MEDIUM: 'pending', HIGH: 'action', CRITICAL: 'action',
  ESCALATED: 'action', RESOLVED: 'ok', PENDING_CUSTOMER_CONFIRMATION: 'pending', OPEN: 'pending', FULFILLED: 'ok', MAINTENANCE: 'pending', INACTIVE: 'draft',
  AVAILABLE: 'ok', ASSIGNED: 'approved', BOOKED: 'ok', BUDGET_PENDING: 'pending', BUDGET_APPROVED: 'approved', REQUESTED: 'pending', NORMAL: 'ok', MONITOR: 'pending',
  ABNORMAL: 'action', ACTIVE: 'ok', EXPIRING_SOON: 'pending',
};
export const pillClass = (v: string) => ST_CLASS[v] || 'draft';
export const pillLabel = (v: string, label?: string) => label || (ST_CLASS[v] ? human(v) : v);

// ---------- thời gian ----------
const pad = (n: number) => String(n).padStart(2, '0');
/** '2026-10-18 06:00' → '18/10, 06:00'; '2026-10-18' → '18/10/2026' */
export const date = (s?: string | null) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  if (!d) return String(s);
  return `${Number(d)}/${Number(m)}/${y}`;
};
export const dt = (s?: string | null) => {
  if (!s) return '—';
  const [d, t] = String(s).split(' ');
  if (!t) return date(d);
  const [, m, day] = d.split('-');
  return `${Number(day)}/${Number(m)}, ${t}`;
};
export const stampMs = (s: string) => Date.parse(String(s).replace(' ', 'T') + (String(s).length > 10 ? ':00Z' : 'T00:00:00Z'));
const fromMs = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const addHours = (s: string, h: number) => fromMs(stampMs(s) + Math.round(h * 60) * 60000);
export const addDays = (iso: string, n: number) => fromMs(stampMs(iso.slice(0, 10)) + n * 86400000).slice(0, 10);
export const usd = (n: Any) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ---------- thành phố ----------
export const city = (name: string): string[] => db.cities.find((c: Any) => c[0] === name) || [name || '—', '', name || '—'];
export const cityLabel = (name: string) => (name ? `${name}, ${city(name)[1]}` : '—');
export const shortCity = (name: string) => (name === 'Ho Chi Minh City' ? 'HCMC' : name || '—');

// ---------- điểm dừng & mốc ----------
export const STOP_COLOR: Record<string, string> = {
  ORIGIN: '#0f172a', DESTINATION: '#16a34a', CHECKPOINT: '#dc2626', AIRPORT: '#2563eb', QUARANTINE_STATION: '#7c3aed', REST_STOP: '#d97706', FUEL_STOP: '#64748b',
};
export const STOP_LABEL: Record<string, string> = {
  ORIGIN: 'Điểm đi', DESTINATION: 'Điểm đến', CHECKPOINT: 'Cửa khẩu', AIRPORT: 'Sân bay', QUARANTINE_STATION: 'Trạm kiểm dịch', REST_STOP: 'Điểm nghỉ', FUEL_STOP: 'Điểm đổ nhiên liệu',
};
export const MILESTONE_LABEL: Record<string, string> = {
  DEPARTED: 'Rời điểm đi', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng', ARRIVED_CHECKPOINT: 'Đến trạm kiểm soát', PASSED_CHECKPOINT: 'Qua trạm kiểm soát',
  ARRIVED_DESTINATION: 'Đã tới nơi giao', FLIGHT_DEPARTED: 'Máy bay đã cất cánh', FLIGHT_ARRIVED: 'Máy bay đã hạ cánh',
};
export const MS_VI: Record<string, string> = {
  DEPARTED: 'Khởi hành từ điểm nhận', LEFT_STOP: 'Rời điểm dừng', ARRIVED_STOP: 'Đến điểm dừng', ARRIVED_CHECKPOINT: 'Đến cửa khẩu / trạm', PASSED_CHECKPOINT: 'Đã thông quan',
  ARRIVED_DESTINATION: 'Đã giao đến điểm giao',
};
export const INC_TYPE_VI: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe', BORDER_DELAY: 'Chậm trễ tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu', TRAFFIC_ACCIDENT: 'Tai nạn giao thông',
  HORSE_HEALTH: 'Sức khỏe ngựa', CUSTOMS_HOLD: 'Hải quan tạm giữ', ROAD_CLOSURE: 'Đường bị phong tỏa', CLEARANCE_HELD: 'Kiểm soát tạm giữ', OTHER: 'Sự cố khác',
  FLIGHT_DELAY: 'Hoãn / đổi chuyến bay',
};
export const incTypeVi = (t: string) => INC_TYPE_VI[t] || human(t);
