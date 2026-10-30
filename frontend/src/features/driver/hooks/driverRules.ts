import type {
  ClearanceResult,
  CrewSlot,
  DelayStatus,
  HandoverDraft,
  HorseCondition,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  Milestone,
  MilestoneType,
  NextMilestone,
  RefuseCategory,
  RefuseNextStep,
  StopType,
  Trip,
  TripStatus,
} from '../types';
import { MS_COOLDOWN_SEC } from '../data/mockData';

// ============================================================================
// Nhãn hiển thị (VI)
// ============================================================================
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PLANNING: 'Đang lập kế hoạch', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Hoàn tất',
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
  DEPARTED: 'Xuất phát', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng',
  ARRIVED_CHECKPOINT: 'Đến cửa khẩu / trạm', PASSED_CHECKPOINT: 'Qua cửa khẩu / trạm', ARRIVED_DESTINATION: 'Đến điểm giao',
};
export const SLOT_LABEL: Record<CrewSlot, string> = {
  MAIN_DRIVER: 'Tài xế chính', CO_DRIVER: 'Phụ lái kiêm hộ tống', VETERINARIAN: 'Bác sĩ thú y',
};
export const CONDITION_LABEL: Record<HorseCondition, string> = { NORMAL: 'Bình thường', MONITOR: 'Cần theo dõi', ABNORMAL: 'Bất thường' };
export const CLEARANCE_LABEL: Record<ClearanceResult, string> = { PASSED: 'Thông quan đạt', HELD: 'Tạm giữ', REJECTED: 'Bị từ chối' };
export const DELAY_LABEL: Record<DelayStatus, string> = {
  REPORTED: 'Đã báo Coordinator', PENDING_APPROVAL: 'Chờ Manager duyệt lịch mới', APPROVED: 'Đã duyệt lịch mới', REJECTED: 'Bị từ chối',
};
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe', BORDER_DELAY: 'Chậm tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu', TRAFFIC_ACCIDENT: 'Tai nạn giao thông',
  HORSE_HEALTH: 'Sức khoẻ ngựa', CUSTOMS_HOLD: 'Hải quan tạm giữ', ROAD_CLOSURE: 'Đường bị chặn', OTHER: 'Khác',
};
export const SEVERITY_LABEL: Record<IncidentSeverity, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' };
export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã khắc phục', CLOSED: 'Đã đóng' };
export const REFUSE_CATEGORY_LABEL: Record<RefuseCategory, string> = {
  RECEIVER_UNAVAILABLE: 'Người nhận vắng mặt hoặc không nhận',
  STABLE_NOT_READY: 'Chuồng nhận chưa sẵn sàng',
  IDENTITY_AUTHORIZATION: 'Không xác minh được danh tính / uỷ quyền',
  HORSE_COUNT: 'Sai số lượng ngựa',
  CONDITION_DISPUTE: 'Tranh chấp tình trạng ngựa',
  OTHER: 'Lý do khác (có ghi chép)',
};
export const REFUSE_NEXT_LABEL: Record<RefuseNextStep, string> = {
  CONTACT_CUSTOMER: 'Liên hệ khách hàng', RESCHEDULE: 'Hẹn lại lịch giao',
  TEMPORARY_STABLING: 'Gửi chuồng tạm an toàn', MANAGER_DECISION: 'Chuyển Logistics Manager quyết định',
};

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
export const toInputValue = (s: string) => s.replace(' ', 'T');
export const fromInputValue = (s: string) => s.replace('T', ' ');
const stampMs = (s: string) => new Date(s.replace(' ', 'T')).getTime();
export const minutesBetween = (a: string, b: string) => (stampMs(b) - stampMs(a)) / 60000;

// ============================================================================
// Quy tắc nghiệp vụ
// ============================================================================
export const isActiveTrip = (t: Trip) => t.status !== 'COMPLETED';

/** Một nhân sự chỉ có MỘT chuyến đang hoạt động – nhưng vẫn hỗ trợ danh sách */
export const tripsOf = (trips: Trip[], userId: string) =>
  trips.filter((t) => Object.values(t.crew).includes(userId));

export const myPosition = (t: Trip, userId: string) => {
  const slot = (Object.keys(t.crew) as CrewSlot[]).find((k) => t.crew[k] === userId);
  return slot ? SLOT_LABEL[slot] : '';
};

export const crewList = (t: Trip) =>
  (Object.entries(t.crew) as Array<[CrewSlot, string | undefined]>).filter((x): x is [CrewSlot, string] => !!x[1]);

export const lastMilestone = (t: Trip): Milestone | undefined => t.milestones[t.milestones.length - 1];

export const clearanceFor = (t: Trip, stopIndex: number) =>
  [...t.clearances].reverse().find((c) => c.stopIndex === stopIndex);

const CROSSING: StopType[] = ['CHECKPOINT', 'AIRPORT', 'QUARANTINE_STATION'];

/** Mốc tiếp theo dựa trên mốc vừa xác nhận; qua cửa khẩu cần có kết quả thông quan */
export function nextMilestone(t: Trip): NextMilestone | null {
  const m = lastMilestone(t);
  if (t.status === 'READY_TO_DEPART' && !m) return { type: 'DEPARTED', stopIndex: 0 };
  if (t.status !== 'IN_TRANSIT' || !m) return null;
  if (m.type === 'ARRIVED_DESTINATION') return null;
  if (m.type === 'ARRIVED_STOP') return { type: 'LEFT_STOP', stopIndex: m.stopIndex };
  if (m.type === 'ARRIVED_CHECKPOINT') {
    const cl = clearanceFor(t, m.stopIndex);
    return { type: 'PASSED_CHECKPOINT', stopIndex: m.stopIndex, blocked: !cl || cl.result !== 'PASSED', clearance: cl };
  }
  const j = m.stopIndex + 1;
  const s = t.stops[j];
  if (!s) return null;
  const type: MilestoneType = s.type === 'DESTINATION' ? 'ARRIVED_DESTINATION' : CROSSING.includes(s.type) ? 'ARRIVED_CHECKPOINT' : 'ARRIVED_STOP';
  return { type, stopIndex: j };
}

export const milestoneText = (t: Trip, n: { type: MilestoneType; stopIndex: number }) =>
  `${MILESTONE_LABEL[n.type]}${t.stops[n.stopIndex] ? ' – ' + t.stops[n.stopIndex].name : ''}`;

/** Đang có báo chậm khởi hành chưa xử lý xong */
export const delayPending = (t: Trip) => !!t.departureDelay && ['REPORTED', 'PENDING_APPROVAL'].includes(t.departureDelay.status);

/** Đã đến điểm giao, đang chờ bàn giao */
export const handoverReady = (t: Trip) => t.status === 'IN_TRANSIT' && lastMilestone(t)?.type === 'ARRIVED_DESTINATION';

/** Số giây còn phải chờ trước khi ghi mốc tiếp theo */
export const cooldownLeft = (lastRecordedMs: number | undefined, now = Date.now()) => {
  if (!lastRecordedMs) return 0;
  const left = Math.ceil((lastRecordedMs + MS_COOLDOWN_SEC * 1000 - now) / 1000);
  return left > 0 ? left : 0;
};

/** Vị trí hiện tại suy ra từ mốc gần nhất: đang ở trạm → tên trạm, đang chạy → đoạn tuyến */
export function whereNow(t: Trip): string {
  const m = lastMilestone(t);
  const name = (i: number) => t.stops[i]?.name ?? '';
  if (!m) return `Tại điểm nhận ${name(0) || t.pickup.name || t.origin}`;
  if (['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type)) return `Tại ${name(m.stopIndex)}`;
  return name(m.stopIndex + 1) ? `Trên tuyến ${name(m.stopIndex)} → ${name(m.stopIndex + 1)}` : `Gần ${name(m.stopIndex)}`;
}

/** Trạng thái từng điểm dừng để vẽ danh sách */
export function stopState(t: Trip, i: number): 'done' | 'now' | '' {
  const m = lastMilestone(t);
  if (!m) return '';
  const atStop = ['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type);
  if (i === m.stopIndex && atStop) return 'now';
  if (i < m.stopIndex || i === m.stopIndex) return 'done';
  return '';
}

// ============================================================================
// Bàn giao tại điểm đích
// ============================================================================
export const emptyHandoverDraft = (t: Trip): HandoverDraft => ({
  receiver: { name: (t.altReceiver ?? t.receiver).name, idType: 'Căn cước công dân', idNumber: '', checked: false, authorized: false },
  horses: {},
  photos: [],
  signature: null,
});

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Mọi điều kiện của một lần bàn giao hợp lệ (dùng cho màn hình và kiểm tra lại khi gửi) */
export function handoverCheck(t: Trip, d: HandoverDraft) {
  const auth = t.altReceiver ?? t.receiver;
  const nameOk = !!d.receiver.name && (!auth.name || sameName(d.receiver.name, auth.name));
  const verified = t.horses.filter((h) => d.horses[h]?.ok).length;
  const horsesOk = t.horses.length > 0 && verified === t.horses.length;
  const receiverOk = nameOk && !!d.receiver.idNumber.trim() && d.receiver.checked;
  const list: Array<[string, boolean]> = [
    ['Đã đến điểm giao (đang chờ bàn giao)', handoverReady(t)],
    ['Không có lần từ chối chưa được Manager xử lý', t.handoverStatus !== 'REFUSED'],
    [`Người nhận khớp ${t.altReceiver ? 'người nhận thay thế được Manager duyệt' : 'người nhận đã đăng ký'} và đã ghi số giấy tờ`, receiverOk],
    ['Đã xác nhận người nhận có quyền nhận ngựa', d.receiver.authorized],
    [`Đã đối chiếu microchip từng con (${verified}/${t.horses.length})`, horsesOk],
    ['Có ảnh bàn giao', d.photos.length > 0],
    ['Có chữ ký người nhận', !!d.signature],
  ];
  return {
    list,
    errors: list.filter((x) => !x[1]).map((x) => x[0]),
    receiver: receiverOk && d.receiver.authorized,
    horses: horsesOk,
    verified,
  };
}
