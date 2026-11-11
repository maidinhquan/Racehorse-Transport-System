// ============================================================================
// Nghiệp vụ dùng chung của Điều phối: chuyến, tuyến, xe, nhân sự, điều kiện khởi hành
// (chuyển từ shared/operations.js, roles/coordinator.js và các bản vá của bản HTML demo)
// ============================================================================
import type { Any } from '../store/coordinatorStore';
import { db, me, nowStamp, today } from '../store/coordinatorStore';
import { addDays, city, cityLabel, date, dt, human, stampMs } from '../utils/format';
import { QUICK_LOGIN_ACCOUNTS } from '../../auth/quickLoginAccounts';

export const ACTIVE_TRIP = [
  'PLANNING', 'READY_TO_DEPART', 'IN_TRANSIT', 'PENDING_APPROVAL', 'PLAN_APPROVED',
  'RETURNED', 'ASSIGNED', 'SCHEDULED', 'EN_ROUTE', 'HALTED', 'CUSTOMS_HOLD', 'DELIVERED', 'DRAFT'
];
export const STALE_H = 3;

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

/** Bảng liên kết định danh nhân sự (mã danh bạ EMP-xx ↔ tài khoản USER_xx từ backend / QuickLogin) */
export const STAFF_ALIASES: Record<string, string> = {
  'EMP-21': 'USER_012', 'USER_012': 'EMP-21',
  'EMP-22': 'USER_013', 'USER_013': 'EMP-22',
  'EMP-23': 'USER_015', 'USER_015': 'EMP-23',
  'EMP-25': 'USER_016', 'USER_016': 'EMP-25',
  'EMP-26': 'USER_017', 'USER_017': 'EMP-26',
  'EMP-28': 'USER_030', 'USER_030': 'EMP-28',
  'EMP-31': 'USER_018', 'USER_018': 'EMP-31',
  'EMP-32': 'USER_019', 'USER_019': 'EMP-32',
  'EMP-35': 'USER_014', 'USER_014': 'EMP-35',
  'EMP-36': 'USER_031', 'USER_031': 'EMP-36',
  'EMP-07': 'USER_007', 'USER_007': 'EMP-07',
  'EMP-08': 'USER_008', 'USER_008': 'EMP-08',
  'EMP-09': 'USER_009', 'USER_009': 'EMP-09',
  'EMP-10': 'USER_010', 'USER_010': 'EMP-10',
};

/** Nhân sự đã có tài khoản đăng nhập (mới được hiện trong danh sách để Điều phối chọn); nhân sự của chuyến demo thì miễn */
export const hasLoginAccount = (e: Any): boolean => !!e && (!!e.demoFlow3 || /^USER_/i.test(String(e.id)) || !!STAFF_ALIASES[e.id]);
export const selectableStaff = (): Any[] => db.employees.filter(hasLoginAccount);

/** So khớp xem hai mã định danh (hoặc alias) có cùng chỉ một nhân sự hay không */
export const isSameStaff = (idA?: string, idB?: string): boolean => {
  if (!idA || !idB) return false;
  const a = cleanId(idA).toUpperCase();
  const b = cleanId(idB).toUpperCase();
  if (a === b) return true;
  const aliasA = STAFF_ALIASES[idA] || STAFF_ALIASES[a];
  if (aliasA && cleanId(aliasA).toUpperCase() === b) return true;
  const aliasB = STAFF_ALIASES[idB] || STAFF_ALIASES[b];
  if (aliasB && cleanId(aliasB).toUpperCase() === a) return true;
  return false;
};

// ---------- tra cứu ----------
export const trip = (id?: string) => db.trips.find((t: Any) => t.id === id || cleanId(t.id) === cleanId(id) || t.tripId === id || cleanId(t.tripId) === cleanId(id));
export const reqById = (id?: string) => db.requests.find((r: Any) => r.id === id || cleanId(r.id) === cleanId(id));
export const reqOfTrip = (t: Any) => reqById(t?.requestId) || { id: t?.requestId, origin: t?.origin || '', destination: t?.destination || '', pickup: {}, delivery: {}, horses: t?.horses || [] };
export const tripOfReq = (rid: string) => db.trips.find((t: Any) => t.requestId === rid || cleanId(t.requestId) === cleanId(rid));
export const customer = (id?: string) => db.customers.find((c: Any) => c.id === id) || db.customers[0] || { company: '—', name: '—' };
export const custOf = (r: Any) => customer(r?.customer || 'CUS-001');
export const horse = (id: string) => db.horses.find((h: Any) => h.id === id || cleanId(h.id) === cleanId(id)) || { id, name: id };
export const emp = (id?: string) => {
  if (!id) return undefined;
  const target = cleanId(id).toUpperCase();
  const alias = STAFF_ALIASES[id] || STAFF_ALIASES[target];
  const found = db.employees.find((e: Any) => {
    const eid = cleanId(e.id).toUpperCase();
    return eid === target || (alias && cleanId(alias).toUpperCase() === eid) || (e.userId && cleanId(e.userId).toUpperCase() === target);
  });
  if (found) return found;

  const user = QUICK_LOGIN_ACCOUNTS.find((u) => cleanId(u.id).toUpperCase() === target || (alias && cleanId(u.id).toUpperCase() === cleanId(alias).toUpperCase()));
  if (user) {
    return {
      id: user.id,
      name: user.label.split('·')[0].trim(),
      role: user.role === 'DRIVER_ESCORT' ? 'DRIVER' : user.role,
      position: user.label.includes('Bác sĩ') ? 'VETERINARIAN' : 'DRIVER',
      status: 'ACTIVE',
      country: 'VN',
      avail: { status: 'AVAILABLE', from: '', to: '', note: '' },
    };
  }
  return undefined;
};
export const vehicle = (id?: string) => (id ? db.vehicles.find((v: Any) => v.id === id) : undefined);
export const placeById = (id?: string) => (id ? db.places.find((p: Any) => p.id === id) : undefined);
export const checkpoint = placeById;
export const placeByName = (n: string) => db.places.find((p: Any) => p.name === n || (p.aliases || []).includes(n));

export const curRoute = (t: Any) => (Array.isArray(t?.routes) && t.routes.length ? t.routes[t.routes.length - 1] : null);
export const approvedRoute = (t: Any) => (Array.isArray(t?.routes) ? [...t.routes].reverse().find((r: Any) => r.status === 'APPROVED') || null : null);
export const tripStops = (t: Any): Any[] => (approvedRoute(t) || curRoute(t) || { stops: [] }).stops || [];
export const lastMilestone = (t: Any) => (Array.isArray(t?.milestones) && t.milestones.length ? t.milestones[t.milestones.length - 1] : null);
export const tripHorses = (t: Any): string[] => reqOfTrip(t)?.horses || [];
export const horseCount = (r: Any) => r?.count || r?.horses?.length || 1;
export const crewOf = (t: Any): [string, string][] => (t?.crew ? (Object.entries(t.crew).filter(([, v]) => v) as [string, string][]) : []);
export const tripLabel = (t: Any) => { const r = reqOfTrip(t); return `${t.id} • ${r.origin === 'Ho Chi Minh City' ? 'HCMC' : r.origin} → ${r.destination === 'Ho Chi Minh City' ? 'HCMC' : r.destination}`; };
/** Mã người dùng đang đăng nhập, đọc từ token (rỗng nếu chưa đăng nhập hoặc không đọc được) */
export const loggedInUserId = (): string => {
  try {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('accessToken')) || (typeof localStorage !== 'undefined' && localStorage.getItem('accessToken')) || '';
    if (!token) return '';
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const pick = (v: unknown) => (typeof v === 'string' && v ? v : '');
    return pick(p.sub) || pick(p.nameid) || pick(p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']);
  } catch {
    return '';
  }
};
export const assignedOperator = (t: Any, role: 'coordinator' | 'specialist') => {
  if (role === 'coordinator') {
    // Chuyến đã có người được giao: chỉ đúng Điều phối đó mới thấy, không so với tài khoản mẫu
    const me = loggedInUserId();
    const assigned = [t?.coordinatorId, t?.deployment?.assignees?.coordinator, t?.deployment?.coordinatorId].filter(Boolean);
    if (me && assigned.length) return assigned.includes(me);
    if (t?.coordinatorId && (t.coordinatorId === db.users.coordinator?.id || t.coordinatorId === 'USER_006')) return true;
    if (t?.deployment?.assignees?.coordinator === db.users.coordinator?.id || t?.deployment?.assignees?.coordinator === 'USER_006') return true;
    if (t?.deployment?.coordinatorId === db.users.coordinator?.id || t?.deployment?.coordinatorId === 'USER_006') return true;
  }
  if (role === 'specialist') {
    if (t?.specialistId && (t.specialistId === db.users.specialist?.id || t.specialistId === 'USER_005')) return true;
    if (t?.deployment?.assignees?.specialist === db.users.specialist?.id || t?.deployment?.assignees?.specialist === 'USER_005') return true;
    if (t?.deployment?.specialistId === db.users.specialist?.id || t?.deployment?.specialistId === 'USER_005') return true;
  }
  return !t?.deployment?.assignees;
};
export const deployed = (t: Any) => !!t && (t.deployment?.status === 'CONFIRMED' || t.deployment === 'CONFIRMED');
export const coordTrips = () => db.trips.filter((t: Any) => ACTIVE_TRIP.includes(t.status) && (assignedOperator(t, 'coordinator') || !t.deployment?.assignees));

export function changeEta(t: Any, to: string, reason: string, by: string) {
  if (!to || to === t.eta) return;
  t.etaOriginal = t.etaOriginal || t.eta;
  (t.etaHistory = t.etaHistory || []).push({ at: nowStamp(), from: t.eta, to, reason, by });
  t.eta = to;
}

/** công việc chính thức chỉ bắt đầu khi Manager đã xác nhận triển khai */
export function opsBlock(t: Any, planning = true) {
  if (!t) return 'Không tìm thấy chuyến.';
  if (t.deployment?.status === 'ON_HOLD') return `Triển khai ${t.id} đang tạm dừng: ${String(t.deployment.holdReason || 'chưa ghi lý do').replace(/\.$/, '')}. Thông tin hiện có chỉ được xem cho đến khi Quản lý tiếp tục triển khai.`;
  if (t.deployment?.status !== 'CONFIRMED') return `${t.id} đang chờ Quản lý xác nhận triển khai. Công việc chính thức bắt đầu sau khi xác nhận.`;
  if (!assignedOperator(t, 'coordinator')) return 'Chuyến này không được giao cho tài khoản Điều phối của bạn.';
  if (planning && t.status !== 'PLANNING') return `${t.id} đang ở trạng thái ${human(t.status).toLowerCase()}. Thay đổi kế hoạch lúc này đi qua quy trình sự cố và điều chỉnh tuyến.`;
  return '';
}
export const canPlan = (t: Any) => !!t && t.deployment?.status === 'CONFIRMED' && t.status === 'PLANNING';

// ---------- lịch xe & nhân sự ----------
export const tripWindow = (t: Any) => [(t.plannedDepart || '').slice(0, 10), (t.eta || '').slice(0, 10)];
const overlaps = (t: Any, u: Any) => { const [a1, a2] = tripWindow(t), [b1, b2] = tripWindow(u); return a1 <= b2 && b1 <= a2; };
export const fleetCountry = (v: Any) => v.country || (v.base === 'Bangkok' ? 'TH' : 'VN');
export const groundCountry = (t: Any, leg: string): string => {
  const r = reqOfTrip(t);
  const place = leg === 'outbound' ? r?.pickup : r?.delivery;
  if (place?.country && /^[A-Z]{2}$/i.test(place.country)) {
    return place.country.toUpperCase();
  }
  const cityName = leg === 'outbound' ? (r?.origin || '') : (r?.destination || '');
  const c = city(cityName);
  if (c && c[1]) return c[1].toUpperCase();

  const fullText = `${cityName} ${place?.address || ''} ${place?.name || ''}`.toLowerCase();
  if (fullText.includes('việt nam') || fullText.includes('vietnam') || fullText.includes('hồ chí minh') || fullText.includes('hà nội') || fullText.includes('đà nẵng') || fullText.includes('tây ninh') || fullText.includes('vn')) return 'VN';
  if (fullText.includes('nhật bản') || fullText.includes('japan') || fullText.includes('tokyo') || fullText.includes('osaka') || fullText.includes('narita') || fullText.includes('jp')) return 'JP';
  if (fullText.includes('thái lan') || fullText.includes('thailand') || fullText.includes('bangkok') || fullText.includes('th')) return 'TH';
  if (fullText.includes('singapore') || fullText.includes('sg')) return 'SG';
  if (fullText.includes('campuchia') || fullText.includes('cambodia') || fullText.includes('phnom penh') || fullText.includes('kh')) return 'KH';
  if (fullText.includes('lào') || fullText.includes('laos') || fullText.includes('vientiane') || fullText.includes('la')) return 'LA';
  if (fullText.includes('úc') || fullText.includes('australia') || fullText.includes('sydney') || fullText.includes('au')) return 'AU';

  return leg === 'outbound' ? 'VN' : 'JP';
};
export const GROUND_ROLE_KEYS = ['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'];
export function groundLegs(t: Any) {
  if (!t.groundLegs) {
    const source = t.vehicleId && vehicle(t.vehicleId);
    const original = t.crew || {};
    const origin = groundCountry(t, 'outbound');
    const oldGround = Object.fromEntries(['MAIN_DRIVER', 'CO_DRIVER'].filter((k) => original[k] && emp(original[k])?.country === origin).map((k) => [k, original[k]]));
    t.groundLegs = {
      outbound: { vehicleId: source && fleetCountry(source) === origin ? source.id : '', crew: oldGround, history: [] },
      inbound: { vehicleId: '', crew: {}, history: [] },
    };
  }
  return t.groundLegs;
}
export const isTripHoldingCrew = (t: Any): boolean => {
  if (!t) return false;
  const s = String(t.status || 'PLANNING').toUpperCase();
  return !['COMPLETED', 'CANCELLED', 'REJECTED', 'CLOSED', 'TERMINATED'].includes(s);
};

export const groundAssignedEmployees = (t: Any): string[] => {
  const g = groundLegs(t);
  const outbound = Object.values(g.outbound?.crew || {});
  const inbound = Object.values(g.inbound?.crew || {});
  return [...outbound, ...inbound].filter(Boolean) as string[];
};

export const tripVehicleIds = (t: Any): string[] => {
  if (!t) return [];
  const g = t.groundLegs;
  const resVehs = Array.isArray(t.resources) ? t.resources.map((r: Any) => r.vehicleId) : [];
  return [...new Set([
    t.vehicleId,
    g?.outbound?.vehicleId,
    g?.inbound?.vehicleId,
    ...resVehs,
  ].filter(Boolean) as string[])];
};

export const tripPersonnelIds = (t: Any): string[] => {
  if (!t) return [];
  const ids: string[] = [];

  const add = (val: Any) => {
    if (!val) return;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) ids.push(trimmed);
    } else if (typeof val === 'object' && val.id) {
      ids.push(String(val.id).trim());
    }
  };

  const addCrewObj = (crewObj: Any) => {
    if (!crewObj || typeof crewObj !== 'object') return;
    Object.values(crewObj).forEach(add);
  };

  // 1. Tổ lái đường bộ / mặc định
  addCrewObj(t.crew);

  // 2. Chặng đường bộ sân bay (cả trước và sau chuyến bay)
  if (t.groundLegs) {
    addCrewObj(t.groundLegs.outbound?.crew);
    addCrewObj(t.groundLegs.inbound?.crew);
  }

  // 3. Phương án nguồn lực (resources từ draft / approvedPlan / root)
  const allResources = [
    ...(Array.isArray(t.resources) ? t.resources : []),
    ...(Array.isArray(t.approvedPlan?.resources) ? t.approvedPlan.resources : []),
    ...(Array.isArray(t.draft?.resources) ? t.draft.resources : []),
  ];
  allResources.forEach((r: Any) => {
    if (!r) return;
    addCrewObj(r.crew);
    add(r.driverId);
    add(r.coDriverId);
    add(r.veterinarianId);
    add(r.escortId);
  });

  // 4. Phân công từ backend DB
  if (Array.isArray(t.vehicleAssignments)) {
    t.vehicleAssignments.forEach((va: Any) => {
      add(va.driverId);
      add(va.coDriverId);
      add(va.veterinarianId);
      add(va.escortId);
      addCrewObj(va.crew);
    });
  }

  // 5. Chuyến bay (bác sĩ/hộ tống áp tải)
  if (t.flight) {
    add(t.flight.escortId);
    add(t.flight.veterinarianId);
    add(t.flight.vetId);
  }

  return [...new Set(ids)];
};

/** Kiểm tra xem nhân sự có đang được phân công vào chuyến hay không */
export const isStaffAssignedToTrip = (e: Any | string, t: Any): boolean => {
  const staffId = typeof e === 'string' ? e : e?.id;
  if (!staffId || !t) return false;
  const tripStaffIds = tripPersonnelIds(t);
  return tripStaffIds.some((assignedId) => isSameStaff(staffId, assignedId));
};

export const vehicleConflict = (v: Any, t: Any) => db.trips.find((u: Any) => cleanId(u.id) !== cleanId(t?.id) && tripVehicleIds(u).some(id => cleanId(id) === cleanId(v?.id)) && isTripHoldingCrew(u) && overlaps(t, u));

// tình trạng sẵn sàng của nhân sự (nghỉ phép, ốm…) – người không sẵn sàng trong thời gian chuyến không được gợi ý
export const AVAIL: Record<string, [string, string]> = { AVAILABLE: ['AVAILABLE', 'Sẵn sàng'], LEAVE: ['PENDING', 'Nghỉ phép'], SICK: ['FAILED', 'Nghỉ ốm'], SUSPENDED: ['CANCELLED', 'Tạm ngưng phân công'], INACTIVE: ['CANCELLED', 'Ngừng hoạt động'] };
const unavailableIn = (e: Any, from: string, to: string) => e.avail && e.avail.status !== 'AVAILABLE' && (e.avail.status === 'INACTIVE' || !e.avail.from || (e.avail.from <= to && (!e.avail.to || e.avail.to >= from)));
export const availLabel = (e: Any) => AVAIL[e.avail.status][1] + (e.avail.status !== 'AVAILABLE' && e.avail.status !== 'INACTIVE' && e.avail.from ? ` ${date(e.avail.from)}${e.avail.to ? '–' + date(e.avail.to) : ''}` : '');

/** Nhân sự đang giữ chuyến khác theo máy chủ (máy chủ thấy cả chuyến mà bản sao trên trình duyệt chưa có): [mã nhân sự, mã chuyến đang giữ] */
let serverBusyCrew: Array<[string, string]> = [];
export const setServerBusyCrew = (entries: Array<[string, string]>) => { serverBusyCrew = entries; };

/** một tài xế / áp tải / bác sĩ chỉ được gắn vào một chuyến đang hoạt động; người đang nghỉ cũng tính là trùng lịch */
export function crewConflict(e: Any, t: Any): Any {
  if (!e) return null;
  const serverHit = serverBusyCrew.find(([id, tripId]) => isSameStaff(e.id, id) && (!t || cleanId(tripId) !== cleanId(t.id)));
  if (serverHit) return { id: serverHit[1] };
  // Bận cho đến khi chuyến kia bàn giao xong (COMPLETED), không phụ thuộc ngày chuyến: mỗi người chỉ một chuyến chưa bàn giao
  const busy = db.trips.find((u: Any) => {
    if (!u) return false;
    if (t && cleanId(u.id) === cleanId(t.id)) return false;
    if (!isTripHoldingCrew(u)) return false;
    return isStaffAssignedToTrip(e, u);
  });
  if (busy) return busy;
  if (t && e.avail && unavailableIn(e, tripWindow(t)[0], tripWindow(t)[1])) return { id: availLabel(e) };
  return null;
}
export const isDriver = (e: Any) => !!e && !['ON_LEAVE', 'INACTIVE'].includes(e.status) && e.position === 'DRIVER';
export const isVet = (e: Any) => !!e && !['ON_LEAVE', 'INACTIVE'].includes(e.status) && e.role === 'ESCORT' && e.position === 'VETERINARIAN';
export const vetOk = (t: Any) => { const v = emp((t.crew || {}).VETERINARIAN); return !!v && v.position === 'VETERINARIAN' && v.certExpiry >= t.eta.slice(0, 10); };

export const groundLegEndDate = (t: Any, leg: string) => {
  if (leg === 'inbound') return t.eta.slice(0, 10);
  const f = t.flight;
  if (f?.departAt) return f.departAt.slice(0, 10);
  const airport = curRoute(t)?.stops?.find((s: Any) => s.type === 'AIRPORT');
  return (airport?.plannedAt || t.plannedDepart).slice(0, 10);
};
export const groundServiceArea = (obj: Any, country: string, cityCode: string) => {
  if (!obj) return false;
  const regions = obj.serviceAreas || obj.serviceCountries || null;
  if (!Array.isArray(regions) || !regions.length) return true;
  return regions.includes(country) || regions.includes(cityCode);
};
export function groundLegCheck(t: Any, leg: string) {
  const data = groundLegs(t)[leg], c = groundCountry(t, leg), r = reqOfTrip(t);
  const area = leg === 'outbound' ? r.origin : r.destination, n = Math.max(1, tripHorses(t).length);
  const v = vehicle(data.vehicleId), cr = data.crew || {}, md = emp(cr.MAIN_DRIVER), cd = emp(cr.CO_DRIVER), vet = emp(cr.VETERINARIAN);
  const ids = GROUND_ROLE_KEYS.map((k) => cr[k]).filter(Boolean), other = groundLegs(t)[leg === 'outbound' ? 'inbound' : 'outbound'];
  const vehicleOk = !!v && fleetCountry(v) === c && groundServiceArea(v, c, area) && v.status === 'READY' && v.stalls >= n && !vehicleConflict(v, t) && other.vehicleId !== v.id;
  const usable = (e: Any) => !!e && !['ON_LEAVE', 'INACTIVE'].includes(e.status) && e.country === c && groundServiceArea(e, c, area) && !crewConflict(e, t) && !Object.values(other.crew || {}).includes(e.id);
  const crewOk = ids.length === 3 && new Set(ids).size === 3 && usable(md) && md.position === 'DRIVER' && usable(cd) && cd.position === 'DRIVER' && usable(vet) && isVet(vet) && vet.certExpiry >= groundLegEndDate(t, leg);
  return { vehicleOk, crewOk, ok: vehicleOk && crewOk, vehicle: v, crew: cr, country: c };
}
export const groundLegName = (l: string) => (l === 'outbound' ? 'Trước chuyến bay' : 'Sau chuyến bay');
/** Xe & nhân sự được phân công khi tuyến còn là bản nháp (hoặc bị trả lại), trước khi gửi Manager duyệt.
 *  Khi tuyến đang chờ duyệt hoặc đã duyệt thì khóa; muốn đổi phải tạo phiên bản điều chỉnh. */
export const routeApproved = (t: Any) => curRoute(t)?.status === 'APPROVED';
export const groundCanEdit = (t: Any) => canPlan(t) && (!curRoute(t) || ['DRAFT', 'RETURNED'].includes(curRoute(t).status));
export const resourceLockMsg = (t: Any) => (!canPlan(t)
  ? 'Phân công chỉ xem khi chuyến chưa được triển khai hoặc đã rời giai đoạn lập kế hoạch.'
  : curRoute(t)?.status === 'PENDING_APPROVAL' ? 'Tuyến đang chờ Manager duyệt; xe và nhân sự đang khóa.'
    : 'Tuyến đã được duyệt; muốn đổi xe hoặc nhân sự, hãy tạo phiên bản điều chỉnh ở tab Tuyến đường.');
export function recordGroundChange(t: Any, leg: string, action: string, before: string, after: string) {
  const x = groundLegs(t)[leg];
  (x.history = x.history || []).push({ at: nowStamp(), by: me().name, action, before, after });
  x.history = x.history.slice(-60); t.resourcesConfirmed = null;
}

// ---------- kích thước xe & lối vào điểm nhận/giao ----------
export function vehicleAccessIssue(t: Any, v: Any, end: 'pickup' | 'delivery') {
  const r = t && reqOfTrip(t), a = r && r[end] && r[end].access, sp = v && v.spec; if (!a || !sp) return '';
  const over = ([['maxHeightM', 'heightM', 'cao', 'm'], ['maxWidthM', 'widthM', 'rộng', 'm'], ['maxLengthM', 'lengthM', 'dài', 'm'], ['maxWeightT', 'grossT', 'nặng', ' tấn']] as string[][]).filter(([lim, k]) => a[lim] && sp[k] > a[lim]);
  return over.length ? `${v.plate} không vào được ${end === 'pickup' ? 'điểm nhận' : 'điểm giao'}: ${over.map(([lim, k, l, u]) => `${l} ${sp[k]}${u} > giới hạn ${a[lim]}${u}`).join(', ')}${a.note ? ' (' + a.note + ')' : ''}.` : '';
}

// ---------- điều kiện khởi hành (phần Điều phối cần biết) ----------
export function readiness(t: Any) {
  const r = reqOfTrip(t), rt = curRoute(t), crew = t.crew || {}, f = t.flight;
  const n = Math.max(1, tripHorses(t).length || horseCount(r)), arr = t.eta.slice(0, 10);
  const veh = t.vehicleId ? vehicle(t.vehicleId) : null, vet = emp(crew.VETERINARIAN), md = emp(crew.MAIN_DRIVER), cd = emp(crew.CO_DRIVER);
  const conflicts = [t.mode === 'ROAD' && veh && vehicleConflict(veh, t) ? `${veh.plate} → ${vehicleConflict(veh, t).id}` : '',
    ...crewOf(t).map(([, id]) => emp(id)).filter((e) => e && crewConflict(e, t)).map((e: Any) => `${e.name} → ${crewConflict(e, t).id}`)].filter(Boolean);
  const vehOk = !!veh && veh.status === 'READY' && veh.stalls >= n;
  const it = (group: string, label: string, ok: Any, tab: string, detail = '') => ({ group, label, ok: !!ok, tab, detail });
  const list = [
    it('shared', 'Quản lý đã xác nhận triển khai', t.deployment.status === 'CONFIRMED', 'overview', human(t.deployment.status)),
    it('shared', 'Chuyến đang lập kế hoạch', t.status === 'PLANNING', 'overview', human(t.status)),
    it('shared', 'Phiên bản tuyến hiện tại đã được phê duyệt & áp dụng', rt && rt.status === 'APPROVED', 'route', rt ? `Phiên bản ${rt.v} • ${human(rt.status)}` : 'Chưa có tuyến'),
    it('shared', 'Coordinator đã xác nhận bố trí xe và nhân sự', !!t.resourcesConfirmed, 'resources', t.resourcesConfirmed ? `Xác nhận lúc ${dt(t.resourcesConfirmed.at)}` : 'Đang chờ Coordinator xác nhận'),
  ];
  if (t.mode === 'AIR') {
    const ground: Any = { outbound: groundLegCheck(t, 'outbound'), inbound: groundLegCheck(t, 'inbound') };
    list.push(
      it('air', 'Chuyến bay thẳng giữa nước đi và nước đến', f && f.direct !== false && f.from && f.to && placeById(f.from)?.country === city(r.origin)[1] && placeById(f.to)?.country === city(r.destination)[1] && f.stalls >= n, 'resources', f ? `${f.airline} ${f.flightNo} • ${f.stalls} ô` : 'Chưa có phương án bay'),
      it('air', 'Flight budget approved by the Manager', f && ['BUDGET_APPROVED', 'BOOKED'].includes(f.status), 'resources', f ? human(f.status) : '—'),
      it('air', 'Flight booking confirmed by the Coordinator', f && f.status === 'BOOKED', 'resources', f && f.bookingRef ? 'Mã ' + f.bookingRef : f ? human(f.status) : '—'),
      it('air', 'Đã lập chặng đường bộ đón và giao trên tuyến', rt && rt.stops.some((s: Any) => s.type === 'ORIGIN') && rt.stops.filter((s: Any) => s.type === 'AIRPORT').length === 2, 'route', rt ? `${rt.stops.length} điểm dừng` : 'Chưa có tuyến'),
      ...['outbound', 'inbound'].flatMap((l) => {
        const g = ground[l], label = l === 'outbound' ? 'Departure airport ground leg' : 'Arrival airport ground leg';
        return [it('air', `${label}: vehicle in ${g.country}, ready with sufficient stalls`, g.vehicleOk, 'resources', g.vehicle ? `${g.vehicle.plate} • ${g.vehicle.model}` : 'Chưa phân xe'),
          it('air', `${label}: main driver + co-driver + veterinarian in ${g.country}`, g.crewOk, 'resources', GROUND_ROLE_KEYS.map((k) => emp(g.crew[k])?.name || 'Còn thiếu').join(' • '))];
      }),
      it('air', 'Hãng hàng không phụ trách chăm sóc ngựa trong chuyến bay', !!(f && f.status === 'BOOKED'), 'resources', f?.airline || 'Chưa đặt hãng bay'));
  } else {
    list.push(
      it('road', 'Xe phù hợp sẵn sàng và đủ ngăn ngựa', vehOk, 'resources', veh ? `${veh.plate} • ${human(veh.status)} • ${veh.stalls} ngăn cho ${n} ngựa` : 'Chưa phân công'),
      it('road', 'Đã phân tài xế chính', isDriver(md), 'resources', md ? md.name : 'Chưa phân công'),
      it('road', 'Đã phân phụ xe (đồng thời đáp ứng yêu cầu người áp tải)', isDriver(cd) && (!md || cd.id !== md.id), 'resources', cd ? cd.name : 'Chưa phân công'),
      it('road', 'Đã phân bác sĩ thú y làm người áp tải', isVet(vet) && ![crew.MAIN_DRIVER, crew.CO_DRIVER].includes(vet.id), 'resources', vet ? vet.name : 'Chưa phân công'),
      it('road', 'Chứng chỉ bác sĩ thú y còn hiệu lực cho chuyến', isVet(vet) && vet.certExpiry >= arr, 'resources', vet ? `${vet.name}${vet.certExpiry ? ` • hiệu lực đến ${date(vet.certExpiry)}` : ''}` : 'Chưa phân công'));
  }
  list.push(it('shared', 'Không trùng lịch xe hoặc nhân sự', !conflicts.length, 'resources', conflicts.join('; ') || 'Không có'));
  return list;
}

// ---------- tình trạng lập kế hoạch ----------
export function planGaps(t: Any): string[] {
  const g: string[] = [], rt = curRoute(t);
  if (!rt) g.push('Tuyến đường'); else if (rt.status === 'DRAFT' || rt.status === 'RETURNED') g.push(rt.status === 'DRAFT' ? 'Tuyến (nháp)' : 'Tuyến (bị trả lại)');
  if (t.mode === 'AIR' && (!t.flight || t.flight.status !== 'BOOKED')) g.push('Flight');
  if (t.mode === 'AIR') {
    for (const k of ['outbound', 'inbound']) {
      const check = groundLegCheck(t, k);
      if (!check.vehicleOk) g.push(`${groundLegName(k)}: xe theo quốc gia ${check.country}`);
      if (!check.crewOk) g.push(`${groundLegName(k)}: tài xế, phụ lái, bác sĩ thú y`);
    }
  } else {
    if (!t.vehicleId) g.push('Xe');
    if (!(t.crew || {}).MAIN_DRIVER) g.push('Tài xế chính');
    if (!(t.crew || {}).CO_DRIVER) g.push('Phụ xe');
    if (!vetOk(t)) g.push('Bác sĩ thú y');
  }
  return g;
}
/** Chỉ phần xe & nhân sự (không gồm tuyến và hợp đồng bay) – điều kiện để gửi Manager duyệt. */
export const crewGaps = (t: Any): string[] => planGaps(t).filter((g) => !g.startsWith('Tuyến') && g !== 'Flight');
export const resourceGaps = (t: Any): string[] => [...new Set([
  ...planGaps(t).filter((g) => !g.startsWith('Tuyến')),
  ...readiness(t).filter((i) => i.tab === 'resources' && !i.ok && i.label !== 'Coordinator đã xác nhận bố trí xe và nhân sự').map((i) => i.label),
])];
export const routeState = (t: Any) => { const rt = curRoute(t); return rt ? rt.status : 'NONE'; };
export function planState(t: Any) {
  if (t.status !== 'PLANNING') return t.status;
  const depStatus = typeof t.deployment === 'string' ? t.deployment : t.deployment?.status;
  if (depStatus === 'ON_HOLD') return 'ON_HOLD';
  if (!deployed(t)) return 'AWAITING_DEPLOYMENT';
  // Backend chỉ biết trạng thái tuyến; xe/nhân sự còn thiếu thì vẫn là MISSING_RESOURCES dù tuyến đã duyệt
  if (t.planningState === 'READY') return 'READY';
  const rs = routeState(t);
  if (rs === 'NONE' || rs === 'DRAFT') return 'AWAITING_ROUTE';
  if (rs === 'PENDING_APPROVAL') return 'ROUTE_PENDING';
  if (rs === 'RETURNED') return 'ROUTE_RETURNED';
  return resourceGaps(t).length || !t.resourcesConfirmed ? 'MISSING_RESOURCES' : 'PLANNED';
}
export const PLAN_STATE: Record<string, [string, string]> = {
  AWAITING_DEPLOYMENT: ['NOT_CONFIRMED', 'Chờ triển khai'], ON_HOLD: ['ON_HOLD', 'Tạm dừng triển khai'], AWAITING_ROUTE: ['PENDING', 'Chờ lập tuyến'],
  ROUTE_PENDING: ['PENDING_APPROVAL', 'Tuyến chờ duyệt'], ROUTE_RETURNED: ['RETURNED', 'Tuyến bị trả lại'], MISSING_RESOURCES: ['NOT_READY', 'Chưa xác nhận nguồn lực'], PLANNED: ['READY', 'Hoàn tất lập kế hoạch'],
};
/** các nhãn trạng thái dạng [giá trị màu, chữ] */
export const planPill = (t: Any): [string, string?] => (PLAN_STATE[planState(t)] ? PLAN_STATE[planState(t)] : [t.status]);
export const deployPill = (t: Any): [string, string] => [t.deployment.status, t.deployment.status === 'CONFIRMED' ? 'Đã triển khai' : t.deployment.status === 'ON_HOLD' ? 'Tạm dừng' : 'Chưa xác nhận'];
export const routePill = (t: Any): [string, string] => (curRoute(t) ? [curRoute(t).status, `v${curRoute(t).v} ${human(curRoute(t).status)}`] : ['MISSING', 'Chưa bắt đầu']);
export const resourcePill = (t: Any): [string, string] => { const g = resourceGaps(t); return g.length ? ['NOT_READY', `${g.length} còn thiếu`] : t.resourcesConfirmed ? ['READY', 'Điều phối đã xác nhận'] : ['PENDING', 'Chờ Điều phối xác nhận']; };

export function tripNextAction(t: Any) {
  if (t.status === 'COMPLETED') return 'Chuyến đã hoàn tất. Xác nhận, thanh toán và đóng yêu cầu được xử lý trên yêu cầu.';
  if (t.status === 'IN_TRANSIT') return 'Theo dõi các mốc và sự cố. Thay đổi tuyến thực hiện qua quy trình sự cố và điều chỉnh tuyến.';
  if (t.status === 'READY_TO_DEPART') return 'Đang chờ đội vận chuyển xác nhận mốc khởi hành. Chỉ khi đó chuyến mới chuyển sang Đang vận chuyển.';
  return '';
}

// ---------- theo dõi hành trình (không có GPS: suy ra từ mốc tổ xe xác nhận) ----------
export const etaOverdue = (t: Any) => t.status === 'IN_TRANSIT' && t.eta < nowStamp() && !t.milestones.some((m: Any) => m.type === 'ARRIVED_DESTINATION');
export const handoverState = (t: Any) => (t.handover ? 'COMPLETED' : (t.handoverStatus === 'REFUSED' && t.status === 'IN_TRANSIT') ? 'REFUSED'
  : t.status === 'IN_TRANSIT' && t.milestones.some((m: Any) => m.type === 'ARRIVED_DESTINATION') ? 'PENDING' : null);
export const clearanceFor = (t: Any, cp: string) => [...((db as Any).clearances || [])].reverse().find((c: Any) => c.tripId === t.id && c.cp === cp);
/** sự cố đang chặn chặng hiện tại (Flow 5) */
export const legHolds = (t: Any) => (!t ? [] : db.incidents.filter((i: Any) => i.tripId === t.id && i.blocking && !['CLOSED', 'HALTED'].includes(i.status) && !i.continueAt));
export const tripHalted = (t: Any) => t && t.halted;
export const holdText = (t: Any) => (tripHalted(t) ? 'Chuyến đang dừng theo quyết định của Manager.' : `Chặng tạm dừng do ${legHolds(t).map((i: Any) => i.id).join(', ')}. Chỉ ghi mốc tiếp khi Điều phối cho phép tiếp tục.`);
export function nextMilestone(t: Any): Any {
  const stops = tripStops(t), m = lastMilestone(t);
  let n: Any = null;
  if ((t.status === 'READY_TO_DEPART' || t.status === 'IN_TRANSIT') && !m) n = stops.length ? { type: 'DEPARTED', stop: 0 } : null;
  else if (t.status !== 'IN_TRANSIT' || !m || m.type === 'ARRIVED_DESTINATION') n = null;
  else if (m.type === 'ARRIVED_STOP') n = { type: 'LEFT_STOP', stop: m.stop };
  else if (m.type === 'ARRIVED_CHECKPOINT') { const cp = stops[m.stop]?.cp, cl = cp && clearanceFor(t, cp); n = { type: 'PASSED_CHECKPOINT', stop: m.stop, blocked: !cl || cl.result !== 'PASSED', clearance: cl }; }
  else {
    const j = m.stop + 1, s = stops[j];
    n = s ? { type: s.type === 'DESTINATION' ? 'ARRIVED_DESTINATION' : ['CHECKPOINT', 'AIRPORT', 'QUARANTINE_STATION'].includes(s.type) ? 'ARRIVED_CHECKPOINT' : 'ARRIVED_STOP', stop: j } : null;
  }
  if (!n) return n;
  const h = legHolds(t);
  if (h.length || tripHalted(t)) return { ...n, blocked: true, hold: h, halted: !!tripHalted(t) };
  return n;
}
export const hoursSince = (at?: string) => (at ? (stampMs(nowStamp()) - stampMs(at)) / 3600000 : null);
export const agoText = (h: number | null) => (h == null ? '—' : h < 1 / 60 ? 'vừa xong' : h < 1 ? `${Math.round(h * 60)} phút trước` : h < 48 ? `${Math.floor(h)} giờ ${Math.round((h % 1) * 60)} phút trước` : `${Math.round(h / 24)} ngày trước`);
export function livePos(t: Any) {
  const stops = tripStops(t), m = lastMilestone(t), n = stops.length;
  if (!n) return { idx: 0, frac: 0, text: 'Chưa có tuyến', pct: 0 };
  if (!m) return { idx: 0, frac: 0, text: `Chờ khởi hành tại ${stops[0].name}`, pct: 0 };
  if (m.type === 'ARRIVED_DESTINATION') return { idx: n - 1, frac: 0, text: `Đã đến ${stops[n - 1].name}`, pct: 100 };
  const atStop = ['ARRIVED_STOP', 'ARRIVED_CHECKPOINT'].includes(m.type);
  if (atStop || !stops[m.stop + 1]) return { idx: m.stop, frac: 0, text: `Đang ở ${stops[m.stop].name}`, pct: Math.round(m.stop / (n - 1) * 100) };
  const a = stampMs(m.at), b = stampMs(stops[m.stop + 1].plannedAt), now = stampMs(nowStamp());
  const frac = b > a ? Math.max(0, Math.min(0.95, (now - a) / (b - a))) : 0.5;
  return { idx: m.stop, frac, text: `Ước tính ~${Math.round(frac * 100)}% đoạn ${stops[m.stop].name} → ${stops[m.stop + 1].name}`, pct: Math.round((m.stop + frac) / (n - 1) * 100) };
}
export const healthFlag = (t: Any) => { const h = (t.health || []).slice(-3).reverse().find((x: Any) => x.condition !== 'NORMAL' || Number(x.temp) >= 38.6); return h && (hoursSince(h.at) as number) < 12 ? h : null; };
/** vị trí tổ xe theo mốc cuối (dùng khi Điều phối ghi nhận sự cố thay tổ xe) */
export function dWhere(t: Any) {
  const stops = tripStops(t), m = lastMilestone(t), name = (i: number) => (stops[i] && stops[i].name) || '';
  if (!m) return `Tại điểm nhận ${name(0) || cityLabel(reqOfTrip(t).origin)}`;
  if (['ARRIVED_STOP', 'ARRIVED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(m.type)) return `Tại ${name(m.stop)}`;
  return name(m.stop + 1) ? `Trên tuyến ${name(m.stop)} → ${name(m.stop + 1)}` : `Gần ${name(m.stop)}`;
}
export const legOf = (t: Any, from: number) => { const s = tripStops(t); return s[from] && s[from + 1] ? `Chặng ${from + 1}: ${s[from].name} → ${s[from + 1].name}` : s[from] ? `Tại ${s[from].name}` : 'Trước khởi hành'; };

/** kiểm tra một nhân sự cho một vị trí trên chuyến (F3Rules.staffError của bản HTML) */
export function staffError(e: Any, t: Any, role: string, wholeCrew = false) {
  if (!e) return 'Chọn đủ nhân sự.';
  if (e.status !== 'ACTIVE') return `${e.name} không ở trạng thái đang làm việc.`;
  if (role === 'VETERINARIAN' ? !isVet(e) : !isDriver(e)) return `${e.name} không đúng vị trí được phân công.`;
  if (role === 'VETERINARIAN' && e.certExpiry < t.eta.slice(0, 10)) return 'Chứng chỉ thú y không còn hiệu lực đến cuối chuyến.';
  const busy = crewConflict(e, t); if (busy) return `${e.name} đã được gán cho ${busy.id}. Mỗi nhân sự chỉ được gán một chuyến đang hoạt động.`;
  if (!wholeCrew && t.mode === 'AIR' && groundAssignedEmployees(t).some((id) => isSameStaff(id, e.id))) return 'Nhân sự này đã thuộc một chặng xe sân bay của chuyến; không phân thêm vị trí khác.';
  if (!wholeCrew && Object.entries(t.crew || {}).some(([k, id]) => k !== role && isSameStaff(id as string, e.id))) return 'Một người không kiêm hai vị trí trong cùng chuyến.';
  return '';
}
export const editableF3 = (t: Any) => !!t && canPlan(t) && !opsBlock(t, true) && (!curRoute(t) || curRoute(t).status === 'DRAFT');
export const horseCountError = (r: Any) => { const n = Math.max(Number(r?.count || 0), (r?.horses || []).length); return !Number.isInteger(n) || n < 1 || n > 4 ? 'Mỗi yêu cầu vận chuyển chỉ được có từ 1 đến 4 ngựa.' : ''; };

// ---------- lịch nhân sự / xe ----------
export const busyTrips = (e: Any) => db.trips.filter((t: Any) => isStaffAssignedToTrip(e, t) && isTripHoldingCrew(t));
export const certSoon = (e: Any) => e.certExpiry && e.certExpiry < addDays(today(), 30);
