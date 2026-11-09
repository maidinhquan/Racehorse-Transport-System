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
  RouteStop,
  StopType,
  Trip,
  TripStatus,
} from '../types';
import { cleanStopName } from '../../tracking/utils/progress';

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
/** '2026-11-19 06:00' → '19/11/2026 06:00' (ngày/tháng/năm, có số 0 đứng đầu) */
export const fmtDateTime = (s?: string) => {
  if (!s) return '—';
  const [d, t] = s.replace('T', ' ').split(' ');
  return t ? `${fmtDate(d)} ${t.slice(0, 5)}` : fmtDate(d);
};
/** '2026-11-19' → '19/11/2026' */
export function fmtDate(s?: string) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return d ? `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}` : s;
}
/** '2026-11-19 06:00' → '06:00' */
export const fmtTime = (s?: string) => {
  const t = s?.replace('T', ' ').split(' ')[1];
  return t ? t.slice(0, 5) : '';
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


export function stopRequiresHealthCheck(stop?: RouteStop): boolean {
  if (!stop) return false;
  return !!stop.requiresHealthCheck || stop.type === 'QUARANTINE_STATION';
}

export function hasHealthLogForStop(t: Trip, stopIndex: number, horseId?: string): boolean {
  const stop = t.stops[stopIndex];
  if (!stop) return false;
  const arrived = t.milestones.find((m) =>
    (m.type === 'ARRIVED_STOP' || m.type === 'ARRIVED_CHECKPOINT' || (m.type === 'DEPARTED' && stopIndex === 0)) &&
    m.stopIndex === stopIndex
  );
  if (!arrived) return false;

  const norm = (id?: string) => (id || '').trim().toLowerCase();
  const ids = [stop.id, stop.departureMilestoneId].filter(Boolean).map(norm);
  const horses = horseId ? [horseId] : t.horses;

  const safeMs = (s?: string) => {
    if (!s) return 0;
    const ms = stampMs(s);
    return isNaN(ms) ? 0 : ms;
  };

  const arrivedStamp = safeMs(arrived.at);
  const nextStop = t.stops[stopIndex + 1];
  const nextMilestoneRecorded = nextStop ? t.milestones.find((m) => m.stopIndex === stopIndex + 1) : null;
  const nextStamp = nextMilestoneRecorded ? safeMs(nextMilestoneRecorded.at) : Infinity;

  return horses.length > 0 && horses.every((id) => t.health.some((h) => {
    if (h.horseId !== id) return false;
    // 1. Khi co milestoneId (du lieu backend/that): BAT BUOC phai khop ma moc den hoac moc roi cua chinh tram nay
    if (h.milestoneId) {
      return ids.includes(norm(h.milestoneId));
    }
    // 2. Du phong khi khong co milestoneId (demo/mock): so sanh thoi diem trong thoi gian dung tai tram nay
    if (arrivedStamp > 0 && h.at) {
      const logStamp = safeMs(h.at);
      if (logStamp > 0) {
        return logStamp >= (arrivedStamp - 60 * 1000) && (nextStamp === Infinity || logStamp < nextStamp);
      }
      return h.at.slice(0, 16) >= arrived.at.slice(0, 16);
    }
    return false;
  }));
}

const CROSSING: StopType[] = ['CHECKPOINT', 'AIRPORT', 'QUARANTINE_STATION'];

/** Mốc tiếp theo dựa trên mốc vừa xác nhận; qua cửa khẩu cần có kết quả thông quan */
export function nextMilestone(t: Trip): NextMilestone | null {
  const m = lastMilestone(t);
  if (t.status === 'READY_TO_DEPART' && !m) return { type: 'DEPARTED', stopIndex: 0 };
  if (t.status !== 'IN_TRANSIT' || !m) return null;
  if (m.type === 'ARRIVED_DESTINATION') return null;
  if (m.type === 'ARRIVED_STOP') {
    const stop = t.stops[m.stopIndex];
    const reqHealth = stopRequiresHealthCheck(stop);
    const hasHealth = reqHealth ? hasHealthLogForStop(t, m.stopIndex) : true;
    const blocked = reqHealth && !hasHealth;
    const res: NextMilestone = { type: 'LEFT_STOP', stopIndex: m.stopIndex };
    if (blocked) {
      res.blocked = true;
      res.healthCheckRequired = true;
    }
    return res;
  }
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

export const milestoneText = (t: Trip, n: { type: MilestoneType; stopIndex: number }) => {
  const stop = t.stops[n.stopIndex];
  const name = stop ? cleanStopName(stop.name) : '';
  return `${MILESTONE_LABEL[n.type]}${name ? ' – ' + name : ''}`;
};

/** Đang có báo chậm khởi hành chưa xử lý xong */
export const delayPending = (t: Trip) => !!t.departureDelay && ['REPORTED', 'PENDING_APPROVAL'].includes(t.departureDelay.status);

/** Đã đến điểm giao, đang chờ bàn giao */
export const handoverReady = (t: Trip) => t.status === 'IN_TRANSIT' && lastMilestone(t)?.type === 'ARRIVED_DESTINATION';

/** Vị trí hiện tại suy ra từ mốc gần nhất: đang ở trạm → tên trạm, đang chạy → đoạn tuyến */
export function whereNow(t: Trip): string {
  const m = lastMilestone(t);
  const name = (i: number) => (t.stops[i]?.name ? cleanStopName(t.stops[i].name) : '');
  if (!m) return `Tại điểm nhận ${name(0) || t.pickup.name || t.origin}`;
  if (['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type)) return `Tại ${name(m.stopIndex)}`;
  return name(m.stopIndex + 1) ? `Trên tuyến ${name(m.stopIndex)} → ${name(m.stopIndex + 1)}` : `Gần ${name(m.stopIndex)}`;
}

const validGeo = (s?: RouteStop): s is RouteStop & { lat: number; lng: number } =>
  !!s && typeof s.lat === 'number' && Number.isFinite(s.lat) && Math.abs(s.lat) <= 90
  && typeof s.lng === 'number' && Number.isFinite(s.lng) && Math.abs(s.lng) <= 180;

/** Đoạn đường tài xế đang đi: A = trạm mới rời (hoặc đang đứng), B = trạm sắp tới */
export function incidentSegment(t: Trip): { a?: RouteStop; b?: RouteStop; aIndex: number } {
  const m = lastMilestone(t);
  const aIndex = m ? Math.min(m.stopIndex, Math.max(t.stops.length - 1, 0)) : 0;
  return { a: t.stops[aIndex], b: t.stops[aIndex + 1], aIndex };
}

/** Tài xế có thể chọn vị trí trên đoạn A–B khi cả hai trạm đều có tọa độ */
export const segmentPickable = (t: Trip) => {
  const { a, b } = incidentSegment(t);
  return validGeo(a) && validGeo(b);
};

/** Tỷ lệ mặc định: đang ở trạm thì 0 (tại trạm), đang chạy thì giữa đoạn */
export const defaultSegmentRatio = (t: Trip) => {
  const m = lastMilestone(t);
  return !m || ['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type) ? 0 : 0.5;
};

/** Điểm nằm ở ratio (0–1) trên đường nối A và B */
export function pointOnSegment(a: RouteStop, b: RouteStop, ratio: number): { lat: number; lng: number } | null {
  if (!validGeo(a) || !validGeo(b)) return null;
  const r = Math.min(1, Math.max(0, ratio));
  return { lat: a.lat + (b.lat - a.lat) * r, lng: a.lng + (b.lng - a.lng) * r };
}

/** Chiếu một điểm bấm trên bản đồ vào đoạn A–B, trả về tỷ lệ 0–1 */
export function ratioOnSegment(a: RouteStop, b: RouteStop, lat: number, lng: number): number | null {
  if (!validGeo(a) || !validGeo(b)) return null;
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dx = (b.lng - a.lng) * k, dy = b.lat - a.lat;
  const len = dx * dx + dy * dy;
  if (len === 0) return 0;
  return Math.min(1, Math.max(0, (((lng - a.lng) * k) * dx + (lat - a.lat) * dy) / len));
}

/** Mô tả vị trí sự cố: đã rời trạm A thì ghi đoạn A → B kèm phần trăm quãng đường */
export function incidentWhere(t: Trip, ratio: number): string {
  const { a, b } = incidentSegment(t);
  if (!a || !b || ratio <= 0) return whereNow(t);
  const name = (s: RouteStop) => cleanStopName(s.name);
  const pct = Math.round(Math.min(1, ratio) * 100);
  return ratio >= 1 ? `Sát ${name(b)}` : `Trên tuyến ${name(a)} → ${name(b)}, khoảng ${pct}% đoạn đường`;
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
