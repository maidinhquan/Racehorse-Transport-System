import type {
  ActorRole,
  ActualCost,
  ActualKey,
  Budget,
  BudgetKey,
  Complaint,
  ComplaintStatus,
  ComplaintType,
  ContractDraft,
  ContractItem,
  ContractState,
  ContractTerm,
  ContractVersion,
  CustomerInfo,
  DeploymentStatus,
  DossierStatus,
  FlightStatus,
  HorseRef,
  Incident,
  IncidentStatus,
  IncidentType,
  ManagerNotification,
  MilestoneType,
  Payer,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PlanStatus,
  RequestStatus,
  RevisionField,
  RouteStatus,
  Severity,
  Staff,
  StopType,
  Transaction,
  TransportMode,
  TransportRequest,
  Trip,
  TripStatus,
} from '../types';

// ============================================================================
// Đồng hồ chạy theo thời gian thực (đồng bộ với Backend C#)
// ============================================================================
const VN_OFFSET = 7 * 3600000;
export const clockMs = () => Date.now();
const msToStamp = (ms: number) => new Date(ms + VN_OFFSET).toISOString().slice(0, 16).replace('T', ' ');
export const nowStamp = () => msToStamp(clockMs());
export const today = () => nowStamp().slice(0, 10);
export const stampToMs = (s: string) => Date.parse(`${(s.length <= 10 ? `${s} 00:00` : s).replace(' ', 'T')}:00Z`) - VN_OFFSET;
export const addDays = (d: string, n: number) => msToStamp(stampToMs(d) + n * 86400000).slice(0, 10);
export const addHours = (s: string, h: number) => msToStamp(stampToMs(s) + h * 3600000);
export const isPast = (s?: string) => !!s && stampToMs(s) < clockMs();
export const daysUntil = (d: string) => Math.round((stampToMs(d.slice(0, 10)) - stampToMs(today())) / 86400000);
export const fmtDate = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
export const fmtDateTime = (s?: string) => (!s ? '—' : s.length <= 10 ? fmtDate(s) : `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`);
export const fmtMoney = (n: number, currency?: string) => {
  const curr = currency || (Math.abs(n) >= 100000 ? 'VND' : 'USD');
  if (curr === 'VND') {
    return `${Math.round(n).toLocaleString('vi-VN')} VND`;
  }
  return `${Math.round(n).toLocaleString('en-US')} USD`;
};
const pad = (n: number) => String(n).padStart(2, '0');
/** 'dd/mm/yyyy' → 'yyyy-mm-dd' ('' nếu không hợp lệ) */
export function parseViDate(text: string) {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  const d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : '';
}
/** Thời gian còn lại dạng "5 giờ 20 phút" / "quá hạn 3 giờ" */
export function timeLeft(s: string) {
  const diff = stampToMs(s) - clockMs(), abs = Math.abs(diff), h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000);
  const txt = h >= 48 ? `${Math.floor(h / 24)} ngày` : h ? `${h} giờ ${m} phút` : `${m} phút`;
  return diff >= 0 ? `còn ${txt}` : `quá hạn ${txt}`;
}

// ============================================================================
// Nhãn (VI)
// ============================================================================
export const CITY_VI: Record<string, string> = {
  'Ho Chi Minh City': 'TP. Hồ Chí Minh', Hanoi: 'Hà Nội', 'Da Nang': 'Đà Nẵng', Tokyo: 'Tokyo', Osaka: 'Osaka', Bangkok: 'Bangkok', London: 'London', Dubai: 'Dubai',
};
const VN_CITIES = ['Ho Chi Minh City', 'Hanoi', 'Da Nang'];
export const cityLabel = (c: string) => CITY_VI[c] ?? c;
export const isInternational = (o: string, d: string) => !VN_CITIES.includes(o) || !VN_CITIES.includes(d);
export const routeText = (r?: Pick<TransportRequest, 'origin' | 'destination'> | null) =>
  r ? `${cityLabel(r.origin)} → ${cityLabel(r.destination)}` : '—';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ xét duyệt', CHANGES_REQUESTED: 'Chờ khách chỉnh sửa', REJECTED: 'Đã từ chối', CONTRACT_PREPARATION: 'Đang soạn hợp đồng',
  CONTRACT_READY: 'Hợp đồng đã phát hành', CONTRACT_CHANGES_REQUESTED: 'Khách yêu cầu sửa hợp đồng', AWAITING_DEPOSIT: 'Đã ký – chờ đặt cọc', DEPOSIT_VERIFIED: 'Đã xác minh cọc (cũ)',
  CANCELLATION_REQUESTED: 'Khách yêu cầu hủy', ACTIVATED: 'Đã kích hoạt', SCHEDULED: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã bàn giao', CLOSED: 'Đã đóng', CANCELLED: 'Đã hủy',
};
export const CONTRACT_STATE_LABEL: Record<ContractState, string> = {
  SIGNED: 'Đã ký – chờ cọc', ISSUED: 'Đã phát hành', CHANGES_REQUESTED: 'Khách yêu cầu sửa', EXPIRED: 'Quá hạn chung', SUPERSEDED: 'Đã thay thế',
  EFFECTIVE: 'Đã ký – có hiệu lực', FULFILLED: 'Đã hoàn thành', VOID: 'Đã hủy',
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING_CONFIRMATION: 'Chờ xác minh', PROCESSING: 'Cổng đang xử lý', SUCCESS: 'Thành công', FAILED: 'Thất bại', REJECTED: 'Bị từ chối',
};
export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = { DEPOSIT: 'Tiền cọc', BALANCE: 'Số dư', REFUND: 'Hoàn tiền' };
export const METHOD_LABEL: Record<PaymentMethod, string> = { QR_SANDBOX: 'QR Sandbox (cổng)', BANK_TRANSFER: 'Chuyển khoản', VNPAY: 'VNPay (cổng)' };
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = { PLANNING: 'Đang chuẩn bị', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Hoàn thành' };
export const DEPLOYMENT_LABEL: Record<DeploymentStatus, string> = { NOT_CONFIRMED: 'Chờ phân công', CONFIRMED: 'Đã phân công', ON_HOLD: 'Tạm dừng' };
export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = { PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', CHANGES_REQUESTED: 'Yêu cầu làm lại' };
export const FLIGHT_STATUS_LABEL: Record<FlightStatus, string> = { BUDGET_PENDING: 'Chờ duyệt ngân sách', APPROVED: 'Đã duyệt ngân sách', REJECTED: 'Từ chối ngân sách', BOOKED: 'Đã đặt chỗ' };
export const STOP_TYPE_LABEL: Record<StopType, string> = {
  ORIGIN: 'Điểm nhận', REST_STOP: 'Trạm nghỉ', CHECKPOINT: 'Cửa khẩu / kiểm soát', AIRPORT: 'Sân bay', QUARANTINE_STATION: 'Trạm kiểm dịch', DESTINATION: 'Điểm giao',
};
export const MILESTONE_LABEL: Record<MilestoneType, string> = { DEPARTED: 'Xuất phát', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng', ARRIVED_DESTINATION: 'Đến điểm giao' };
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = { DELAY: 'Chậm trễ', HORSE_HEALTH: 'Sức khỏe ngựa', VEHICLE: 'Sự cố xe', BORDER: 'Thông quan / cửa khẩu', OTHER: 'Khác' };
export const SEVERITY_LABEL: Record<Severity, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' };
export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', CLOSED: 'Đã đóng' };
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { PENDING_APPROVAL: 'Chờ Manager quyết định', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' };
export const PAYER_LABEL: Record<Payer, string> = { COMPANY: 'CBN Transport', CUSTOMER: 'Khách hàng', INSURANCE: 'Bảo hiểm' };
export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', PROPOSED: 'Chờ khách xác nhận', ESCALATED: 'Đã chuyển cấp trên', RESOLVED: 'Đã giải quyết',
};
export const COMPLAINT_TYPE_LABEL: Record<ComplaintType, string> = { HORSE_CONDITION: 'Tình trạng ngựa', DELAY: 'Chậm trễ', SERVICE: 'Chất lượng dịch vụ', BILLING: 'Thanh toán' };
export const DOSSIER_LABEL: Record<DossierStatus, string> = { APPROVED: 'Đã duyệt', PENDING_REVIEW: 'Chờ Specialist duyệt', ACTION_REQUIRED: 'Cần nộp lại', MISSING: 'Chưa nộp' };
export const BUDGET_LABEL: Record<BudgetKey, string> = {
  TRANSPORT: 'Phí vận chuyển',
  PROCEDURE: 'Thủ tục & giấy phép',
  VET: 'Bác sĩ thú y',
  INSURANCE: 'Bảo hiểm',
  STAFF: 'Nhân sự tổ xe',
};
export const ACTUAL_LABEL: Record<ActualKey, string> = {
  TRANSPORT: 'Cước xe / hàng không', PROCEDURE: 'Thủ tục & giấy phép', VET: 'Bác sĩ thú y', INSURANCE: 'Bảo hiểm', STAFF: 'Nhân sự tổ xe', FUEL: 'Nhiên liệu & phí đường',
};
export const REVISION_FIELD_LABEL: Record<RevisionField, string> = { route: 'Tuyến đường', date: 'Ngày vận chuyển', places: 'Điểm nhận / giao', horses: 'Danh sách ngựa', notes: 'Ghi chú chăm sóc' };
export const ROLE_LABEL: Record<ActorRole, string> = {
  CUSTOMER: 'Khách hàng', LOGISTICS_MANAGER: 'Logistics Manager', TRANSPORT_SPECIALIST: 'Transport Specialist', FLEET_ROUTE_COORDINATOR: 'Fleet Coordinator', DRIVER_ESCORT: 'Tổ xe', SYSTEM: 'Hệ thống',
};
export const MODE_LABEL: Record<TransportMode, string> = { ROAD: 'Đường bộ', AIR: 'Hàng không' };

// ============================================================================
// Dữ liệu dùng chung của trang Manager
// ============================================================================
export interface ManagerData {
  customers: CustomerInfo[];
  horses: HorseRef[];
  staff: Staff[];
  requests: TransportRequest[];
  trips: Trip[];
  transactions: Transaction[];
  incidents: Incident[];
  complaints: Complaint[];
  actualCosts: ActualCost[];
  notifications: ManagerNotification[];
}

export const customerOf = (d: Pick<ManagerData, 'customers'>, r?: TransportRequest) => {
  if (!r) return undefined;
  const found = d.customers.find((c) => c.id === r.customerId || (r.customerId && c.name === r.customerId));
  if (found) return found;
  const custName = (r as any).customerName || r.history?.find(h => h.role === 'CUSTOMER')?.actor || 'Nguyễn Văn A';
  const custCompany = (r as any).customerCompany || `${custName} (Cá nhân)`;
  return {
    id: r.customerId || 'CUS-001',
    name: custName,
    company: custCompany,
    email: `${custName.toLowerCase().replace(/\s+/g, '')}@example.com`,
    phone: r.pickup?.phone || '0901234567',
  };
};
const cleanId = (x?: string) => (x || '').replace(/-/g, '_');
export const horseName = (d: Pick<ManagerData, 'horses'>, id: string) => d.horses.find((h) => h.id === id || cleanId(h.id) === cleanId(id))?.name ?? id;
export const tripOfReq = (d: Pick<ManagerData, 'trips'>, id: string) => d.trips.find((t) => t.requestId === id || cleanId(t.requestId) === cleanId(id));
export const reqOfTrip = (d: Pick<ManagerData, 'requests'>, t: Trip): TransportRequest =>
  d.requests.find((r) => r.id === t.requestId || cleanId(r.id) === cleanId(t.requestId)) || ({
    id: t.requestId,
    origin: '',
    destination: '',
    horses: [],
    status: 'IN_TRANSIT',
    versions: [],
    history: [],
    dossier: [],
    pickup: { name: '', address: '', contact: '', phone: '', notes: '' },
    delivery: { name: '', address: '', contact: '', phone: '', notes: '' },
  } as unknown as TransportRequest);
export const staffName = (d: Pick<ManagerData, 'staff'>, id?: string) => d.staff.find((s) => s.id === id)?.name ?? '—';

// ============================================================================
// Hợp đồng & giá
// ============================================================================
export const DEPOSIT_PCT = 40;
export const MARGIN_FLOOR = 1.15;

export const DEFAULT_TERMS: ContractTerm[] = [
  { title: 'Căn cứ pháp lý', text: 'Hợp đồng được lập theo Bộ luật Dân sự 2015, Luật Thương mại 2005 và các quy định thú y hiện hành về vận chuyển động vật.' },
  { title: 'Đối tượng hợp đồng', text: 'CBN Transport vận chuyển số ngựa ghi trong yêu cầu từ điểm nhận đến điểm giao theo phương án đã thống nhất.' },
  { title: 'Phạm vi dịch vụ', text: 'Bao gồm vận chuyển, chăm sóc cơ bản trong hành trình, hỗ trợ thủ tục giấy tờ do CBN Transport cung cấp và bàn giao có xác minh.' },
  { title: 'Nghĩa vụ của khách hàng', text: 'Cung cấp đầy đủ, trung thực hồ sơ ngựa và giấy tờ theo yêu cầu của Transport Specialist trước hạn.' },
  { title: 'Giá hợp đồng', text: 'Giá hợp đồng là tổng các khoản mục trong bảng giá. Không phát sinh chi phí ngoài bảng giá nếu không có thỏa thuận bằng văn bản.' },
  { title: 'Thanh toán', text: 'Khách hàng thanh toán tiền cọc theo tỷ lệ ghi trong hợp đồng; số dư thanh toán trong 24 giờ sau khi nghiệm thu bàn giao.' },
  { title: 'Hạn chung & ký OTP', text: 'Thanh toán cọc, xác minh và ký OTP phải hoàn tất trong hạn hoàn tất ghi trong hợp đồng; Manager có thể gia hạn.' },
  { title: 'Trách nhiệm của CBN Transport', text: 'Bảo đảm phương tiện, nhân sự và điều kiện chăm sóc phù hợp; mua bảo hiểm vận chuyển cho toàn bộ hành trình.' },
  { title: 'Sự cố trong hành trình', text: 'Các biện pháp an toàn khẩn cấp được thực hiện ngay; chi phí phát sinh được Manager phê duyệt và thông báo cho khách hàng.' },
  { title: 'Bàn giao & nghiệm thu', text: 'Bàn giao chỉ hoàn tất khi người nhận đăng ký hoặc người thay thế được Manager duyệt xuất trình giấy tờ tùy thân.' },
  { title: 'Hủy hợp đồng & hoàn tiền', text: 'Khách hàng có thể yêu cầu hủy trước khi ký; khoản tiền đã xác minh được đối soát và hoàn trả theo quyết định của Manager.' },
  { title: 'Hiệu lực', text: 'Hợp đồng có hiệu lực khi khách hàng ký OTP thành công và chấm dứt khi yêu cầu vận chuyển được đóng.' },
];

export const curVersion = (r: TransportRequest): ContractVersion | undefined => r.versions[r.versions.length - 1];
/** Trạng thái thực tế: phiên bản đã phát hành mà quá hạn chung thì hết hạn */
export function versionState(v: ContractVersion): ContractState {
  if (v.state === 'ISSUED' && !v.signedAt && isPast(v.validUntil)) return 'EXPIRED';
  return v.state;
}
export const ctRef = (v: Pick<ContractVersion, 'number' | 'v'>) => `${v.number} v${v.v}`;
export const sumItems = (items: ContractItem[]) => items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
export const sumBudget = (b: Budget) =>
  (Number(b.TRANSPORT) || 0) +
  (Number(b.PROCEDURE) || 0) +
  (Number(b.VET) || 0) +
  (Number(b.INSURANCE) || 0) +
  (Number(b.STAFF) || 0) +
  (Number(b.FUEL) || 0);
export const floorPrice = (b: Budget) => Math.ceil(sumBudget(b) * MARGIN_FLOOR);
export const depositOf = (r: TransportRequest) => { const v = curVersion(r); return v ? Math.round((v.total * v.depositPct) / 100) : 0; };
export const totalOf = (r: TransportRequest) => curVersion(r)?.total ?? 0;
export const isSigned = (r: TransportRequest) => r.versions.some((v) => !!v.signedAt);

export function defaultItems(r: Pick<TransportRequest, 'origin' | 'destination' | 'horses'>): ContractItem[] {
  const intl = isInternational(r.origin, r.destination);
  return [
    { desc: intl ? 'Cước vận chuyển hàng không & đường bộ' : 'Cước vận chuyển đường bộ', amount: 0, required: true },
    { desc: intl ? 'Thủ tục xuất nhập khẩu & kiểm dịch' : 'Giấy phép vận chuyển nội địa', amount: 0, required: true },
    { desc: 'Bác sĩ thú y đi kèm', amount: 0 },
    { desc: 'Bảo hiểm vận chuyển', amount: 0 },
  ];
}
export function defaultBudget(_r: Pick<TransportRequest, 'origin' | 'destination' | 'horses'>): Budget {
  return { TRANSPORT: 0, PROCEDURE: 0, VET: 0, INSURANCE: 0, STAFF: 0 };
}
export const defaultMode = (r: Pick<TransportRequest, 'origin' | 'destination'>): TransportMode =>
  isInternational(r.origin, r.destination) && !['Bangkok'].includes(r.destination) ? 'AIR' : 'ROAD';

/** Bản nháp ban đầu: bản đã lưu → phiên bản hiện hành → mặc định */
export function initialDraft(r: TransportRequest): ContractDraft {
  if (r.draft) {
    const d = JSON.parse(JSON.stringify(r.draft)) as ContractDraft;
    if (d.budget && (d.budget as any).FUEL) {
      d.budget.TRANSPORT = (d.budget.TRANSPORT || 0) + (d.budget as any).FUEL;
      delete (d.budget as any).FUEL;
    }
    if (d.budget && sumBudget(d.budget) < 100000) {
      d.budget = defaultBudget(r);
    }
    return d;
  }
  const v = curVersion(r);
  if (v) {
    const b = { ...v.budget };
    if ((b as any).FUEL) {
      b.TRANSPORT = (b.TRANSPORT || 0) + ((b as any).FUEL as number);
      delete (b as any).FUEL;
    }
    if (sumBudget(b) < 100000) {
      const fresh = defaultBudget(r);
      b.TRANSPORT = fresh.TRANSPORT;
      b.PROCEDURE = fresh.PROCEDURE;
      b.VET = fresh.VET;
      b.INSURANCE = fresh.INSURANCE;
      b.STAFF = fresh.STAFF;
    }
    const mode = v.mode || defaultMode(r);
    const minPrep = 0;
    const minDepartDate = addDays(today(), minPrep);

    let departAt = v.departAt || `${r.date || minDepartDate} 06:00`;
    if (departAt.slice(0, 10) < minDepartDate) {
      departAt = `${minDepartDate} 08:00`;
    }
    let arriveAt = v.arriveAt || `${mode === 'AIR' ? addDays(departAt.slice(0, 10), 1) : departAt.slice(0, 10)} ${mode === 'AIR' ? '18:00' : '20:00'}`;
    if (arriveAt <= departAt) {
      arriveAt = `${addDays(departAt.slice(0, 10), mode === 'AIR' ? 1 : 2)} 18:00`;
    }

    const items = (v.items && v.items.length > 0) ? v.items.map((i) => ({ ...i })) : defaultItems(r);
    const terms = (v.terms && v.terms.length > 0) ? v.terms.map((t) => ({ ...t })) : DEFAULT_TERMS.map((t) => ({ ...t }));

    return {
      mode,
      departAt,
      arriveAt,
      budget: b,
      items,
      depositPct: v.depositPct || DEPOSIT_PCT,
      note: v.note ?? '',
      exception: v.exception ?? '',
      terms,
    };
  }
  const mode = defaultMode(r);
  const minPrep = 0;
  const minDepartDate = addDays(today(), minPrep);
  let departAt = `${r.date || minDepartDate} 06:00`;
  if (departAt.slice(0, 10) < minDepartDate) {
    departAt = `${minDepartDate} 08:00`;
  }
  let arriveAt = `${mode === 'AIR' ? addDays(departAt.slice(0, 10), 1) : departAt.slice(0, 10)} ${mode === 'AIR' ? '18:00' : '20:00'}`;
  return {
    mode, departAt, arriveAt,
    budget: defaultBudget(r), items: defaultItems(r), depositPct: DEPOSIT_PCT, note: '', exception: '', terms: DEFAULT_TERMS.map((t) => ({ ...t })),
  };
}

/** Kiểm tra bản nháp trước khi phát hành; trả về '' nếu hợp lệ */
export function draftError(d: ContractDraft): string {
  if (!d.departAt || !d.arriveAt) return 'Nhập ngày giờ khởi hành và đến dự kiến (Bước 1).';
  if (d.arriveAt <= d.departAt) return 'Thời gian đến phải sau thời gian khởi hành (Bước 1).';

  if (!d.budget.VET || !d.budget.INSURANCE) return 'Dự toán nội bộ phải có chi phí bác sĩ thú y và bảo hiểm (Bước 2).';
  if (d.items.some((i) => i.required && !(Number(i.amount) > 0))) return 'Các khoản bắt buộc trong bảng giá phải lớn hơn 0 (Bước 2).';
  if (d.items.some((i) => Number(i.amount) < 0)) return 'Giá các khoản mục không được âm (Bước 2).';
  if (!(d.depositPct >= 1 && d.depositPct <= 100)) return 'Tỷ lệ cọc phải từ 1% đến 100% (Bước 2).';
  if (sumItems(d.items) < floorPrice(d.budget) && d.exception.trim().length < 10) return `Giá bán thấp hơn giá sàn ${fmtMoney(floorPrice(d.budget))}: nhập lý do ngoại lệ (ít nhất 10 ký tự, Bước 2).`;
  const bad = d.terms.findIndex((t) => !t.title.trim() || t.text.trim().length < 10);
  if (bad >= 0) return `Điều ${bad + 1} cần có tiêu đề và nội dung (ít nhất 10 ký tự, Bước 3).`;
  return '';
}

// ============================================================================
// Thanh toán
// ============================================================================
const sumTx = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest, type: PaymentType, statuses: PaymentStatus[]) =>
  d.transactions.filter((x) => x.requestId === r.id && x.type === type && statuses.includes(x.status)).reduce((s, x) => s + x.amount, 0);
export const verifiedDeposit = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest) => {
  const v = curVersion(r);
  return d.transactions.filter(x => x.requestId === r.id && x.type === 'DEPOSIT' && x.status === 'SUCCESS' && !!v?.contractId && x.contractId === v.contractId && x.versionNo === v.v)
    .reduce((sum, x) => sum + (x.confirmedAmount ?? (x.method === 'BANK_TRANSFER' ? 0 : x.amount)), 0);
};
export const depositPaid = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest) => depositOf(r) > 0 && verifiedDeposit(d, r) >= depositOf(r);
export const pendingTx = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest, type: PaymentType = 'DEPOSIT') =>
  d.transactions.find((x) => x.requestId === r.id && x.type === type && (type !== 'DEPOSIT' || (x.contractId === curVersion(r)?.contractId && x.versionNo === curVersion(r)?.v)) && ['PENDING_CONFIRMATION', 'PROCESSING'].includes(x.status));
export const balanceDue = (r: TransportRequest) => Math.max(0, totalOf(r) - depositOf(r));
export const verifiedBalance = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest) => sumTx(d, r, 'BALANCE', ['SUCCESS']);
export const outstanding = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest) => Math.max(0, balanceDue(r) - verifiedBalance(d, r));
/** Tổng tiền khách đã trả và được xác minh, trừ phần đã hoàn */
export const moneyHeld = (d: Pick<ManagerData, 'transactions'>, r: TransportRequest) =>
  sumTx(d, r, 'DEPOSIT', ['SUCCESS']) + sumTx(d, r, 'BALANCE', ['SUCCESS']) - sumTx(d, r, 'REFUND', ['SUCCESS', 'PENDING_CONFIRMATION']);

/** Đơn đang chờ cọc: hợp đồng phát hành, chưa xác minh đủ cọc */
export const awaitingDeposit = (d: ManagerData) => d.requests.filter((r) => r.status === 'CONTRACT_READY' && !depositPaid(d, r));

// ============================================================================
// Yêu cầu
// ============================================================================
/** Trạng thái còn hủy được bởi Manager (trước khi kích hoạt) */
export const CANCELLABLE: RequestStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'DEPOSIT_VERIFIED', 'AWAITING_DEPOSIT'];
export const CONTRACT_OPEN: RequestStatus[] = ['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'DEPOSIT_VERIFIED', 'AWAITING_DEPOSIT'];
export const ACTIVE_REQ: RequestStatus[] = ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED'];
const NOT_ACCEPTED: RequestStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'];
/** Manager đã chấp thuận yêu cầu (mở bước hợp đồng) */
export const isAccepted = (r: TransportRequest) => !NOT_ACCEPTED.includes(r.status) && !(r.status === 'CANCELLED' && !r.versions.length);
/** Đơn gửi gấp: ngày vận chuyển cách hôm nay dưới 7 ngày */
export const shortLeadTime = (r: TransportRequest) => daysUntil(r.date) < 7;

/** Việc Manager cần làm tiếp theo với một yêu cầu */
export function nextStep(d: Pick<ManagerData, 'transactions'>, r: TransportRequest): string {
  switch (r.status) {
    case 'PENDING_REVIEW': return 'Xét duyệt yêu cầu';
    case 'CHANGES_REQUESTED': return 'Chờ khách chỉnh sửa';
    case 'CONTRACT_PREPARATION': return 'Soạn & phát hành hợp đồng';
    case 'CONTRACT_CHANGES_REQUESTED': return 'Phản hồi yêu cầu sửa hợp đồng';
    case 'CONTRACT_READY': return d.transactions.some((x) => x.requestId === r.id && x.status === 'PENDING_CONFIRMATION') ? 'Xác minh chuyển khoản cọc' : 'Chờ khách cọc & ký';
    case 'AWAITING_DEPOSIT': return 'Hợp đồng đã ký – chờ xác minh cọc';
    case 'DEPOSIT_VERIFIED': return 'Cọc đã xác minh (dữ liệu cũ)';
    case 'CANCELLATION_REQUESTED': return 'Quyết định yêu cầu hủy';
    case 'ACTIVATED': return 'Điều hành chuẩn bị chuyến';
    case 'SCHEDULED': return 'Chờ tài xế xuất phát';
    case 'IN_TRANSIT': return 'Theo dõi hành trình';
    case 'DELIVERED': return 'Nghiệm thu, thanh toán & đóng đơn';
    default: return '—';
  }
}

// ============================================================================
// Chuyến đi
// ============================================================================
export interface ReadyCheck {
  key: 'deploy' | 'docs' | 'insurance' | 'quarantine' | 'route' | 'resources' | 'flight';
  label: string;
  ok: boolean;
}
export function readinessChecks(t: Trip): ReadyCheck[] {
  const r = t.readiness;
  const checks: ReadyCheck[] = [
    { key: 'deploy', label: 'Đã phân công Specialist và Coordinator', ok: t.deployment.status === 'CONFIRMED' },
    { key: 'docs', label: `Specialist xác nhận hồ sơ READY (${r.docsReady}/${r.docsTotal})`, ok: r.docsReady >= r.docsTotal && !!r.docsReadyAt },
    { key: 'insurance', label: 'Bảo hiểm đã được Specialist xác minh', ok: r.insurance === 'VERIFIED' },
    { key: 'quarantine', label: 'Lịch kiểm dịch theo tuyến đã xác nhận', ok: r.quarantineOk },
    { key: 'route', label: t.route ? `Phương án tuyến v${t.route.v} được Manager duyệt` : 'Phương án tuyến được Manager duyệt', ok: t.route?.status === 'APPROVED' },
    { key: 'resources', label: 'Coordinator xác nhận xe và nhân sự', ok: !!t.route?.resourcesConfirmed },
  ];
  if (t.mode === 'AIR') checks.push({ key: 'flight', label: 'Chuyến bay đã duyệt ngân sách và đặt chỗ', ok: t.flight?.status === 'BOOKED' });
  return checks;
}
export const isReady = (t: Trip) => readinessChecks(t).every((c) => c.ok);
/** Bước hiện tại trên timeline: 0 phân công, 1 chuẩn bị, 2 duyệt khởi hành, 3 vận chuyển */
export const tripStage = (t: Trip) => (['IN_TRANSIT', 'COMPLETED'].includes(t.status) ? 3 : t.status === 'READY_TO_DEPART' ? 2 : t.deployment.status === 'CONFIRMED' ? 1 : 0);
export const STAGE_KEYS = ['assign', 'prepare', 'depart', 'progress'] as const;
export type StageKey = (typeof STAGE_KEYS)[number];
export const STAGE_LABELS = ['Phân công', 'Chuẩn bị', 'Duyệt khởi hành', 'Vận chuyển'];

/** Danh sách mốc theo thứ tự cần xác nhận */
export function milestonePlan(t: Trip): Array<{ type: MilestoneType; stopIndex: number }> {
  const n = t.route?.stops.length ?? 0;
  if (n < 2) return [];
  const plan: Array<{ type: MilestoneType; stopIndex: number }> = [{ type: 'DEPARTED', stopIndex: 0 }];
  for (let i = 1; i < n - 1; i += 1) plan.push({ type: 'ARRIVED_STOP', stopIndex: i }, { type: 'LEFT_STOP', stopIndex: i });
  plan.push({ type: 'ARRIVED_DESTINATION', stopIndex: n - 1 });
  return plan;
}
export const nextMilestone = (t: Trip) => milestonePlan(t)[t.milestones.length];
export const lastMilestone = (t: Trip) => t.milestones[t.milestones.length - 1];
export const arrived = (t: Trip) => lastMilestone(t)?.type === 'ARRIVED_DESTINATION';
export const milestoneText = (t: Trip, m: { type: MilestoneType; stopIndex: number }) =>
  `${MILESTONE_LABEL[m.type]} • ${t.route?.stops[m.stopIndex]?.name ?? ''}`;

// ============================================================================
// Bàn giao & đóng đơn
// ============================================================================
export function handoverChecks(r: TransportRequest, t?: Trip): Array<[string, boolean]> {
  const h = t?.handover;
  if (!t || !h) return [['Tổ xe hoàn tất bàn giao', false]];
  const receiverOk = h.receiverName.trim().toLowerCase() === r.delivery.contact.trim().toLowerCase()
    || (!!t.refusal?.resolution && t.refusal.resolution.toLowerCase().includes(h.receiverName.trim().toLowerCase()));
  const everyHorse = r.horses.every((id) => h.horses.some((x) => x.horseId === id && x.microchipOk));
  return [
    ['Chuyến đã hoàn thành sau bàn giao', t.status === 'COMPLETED'],
    ['Người nhận đúng người đăng ký (hoặc người thay thế được duyệt)', receiverOk],
    ['Đã ghi giấy tờ tùy thân người nhận', !!h.receiverId],
    [`Đủ ngựa, đã kiểm tra microchip (${h.horses.length}/${r.horses.length})`, everyHorse],
    ['Có ảnh bàn giao', h.photos.length > 0],
    ['Có chữ ký người nhận', h.signature],
  ];
}

export function closureChecks(d: ManagerData, r: TransportRequest): Array<[string, boolean]> {
  const t = tripOfReq(d, r.id);
  const openCmp = d.complaints.filter((c) => c.requestId === r.id && c.status !== 'RESOLVED');
  const openInc = t ? d.incidents.filter((i) => i.tripId === t.id && i.status !== 'CLOSED') : [];
  return [
    ['Bàn giao có xác minh đầy đủ', handoverChecks(r, t).every((c) => c[1])],
    ['Khách hàng đã nghiệm thu', r.acceptance?.status === 'ACCEPTED'],
    [`Số dư đã được xác minh (${fmtMoney(outstanding(d, r))} còn lại)`, outstanding(d, r) === 0],
    [`Không còn khiếu nại mở (${openCmp.length})`, openCmp.length === 0],
    [`Không còn sự cố mở (${openInc.length})`, openInc.length === 0],
    ['Đã nhập chi phí thực tế của chuyến', !!t && d.actualCosts.some((a) => a.tripId === t.id)],
  ];
}

// ============================================================================
// Chi phí & báo cáo
// ============================================================================
export const sumActual = (a?: ActualCost) => (a ? Object.values(a.costs).reduce((s, x) => s + x, 0) + a.extra.filter((e) => e.payer === 'COMPANY').reduce((s, e) => s + e.amount, 0) : 0);
export const budgetOfReq = (r: TransportRequest) => { const v = r.versions.find((x) => x.signedAt) ?? curVersion(r); return v ? sumBudget(v.budget) : 0; };

export interface CostRow {
  trip: Trip;
  request: TransportRequest;
  revenue: number;
  budget: number;
  actual: number;
  entered: boolean;
  variance: number;
  extra: ActualCost['extra'];
}
export function costRows(d: ManagerData): CostRow[] {
  return d.trips
    .filter((t) => t.status === 'COMPLETED' || d.actualCosts.some((a) => a.tripId === t.id))
    .map((t) => {
      const r = reqOfTrip(d, t), a = d.actualCosts.find((x) => x.tripId === t.id), budget = budgetOfReq(r), actual = sumActual(a);
      return { trip: t, request: r, revenue: totalOf(r), budget, actual, entered: !!a, variance: a ? actual - budget : 0, extra: a?.extra ?? [] };
    });
}

// ============================================================================
// Cảnh báo cho dashboard
// ============================================================================
export interface Alert {
  tone: 'bad' | 'warn' | 'info';
  title: string;
  text: string;
  link: string;
}
export function buildAlerts(d: ManagerData): Alert[] {
  const out: Alert[] = [];
  d.requests.filter((r) => r.status === 'PENDING_REVIEW' && shortLeadTime(r)).forEach((r) =>
    out.push({ tone: 'warn', title: `${r.id}: đơn gấp chờ xét duyệt`, text: `Ngày vận chuyển ${fmtDate(r.date)} – còn ${Math.max(0, daysUntil(r.date))} ngày.`, link: `/manager/requests/${r.id}` }));
  d.requests.filter((r) => r.status === 'CANCELLATION_REQUESTED').forEach((r) =>
    out.push({ tone: 'bad', title: `${r.id}: khách yêu cầu hủy`, text: r.cancellation?.reason ?? '', link: `/manager/requests/${r.id}` }));
  d.requests.filter((r) => r.status === 'CONTRACT_CHANGES_REQUESTED').forEach((r) =>
    out.push({ tone: 'warn', title: `${r.id}: khách yêu cầu sửa hợp đồng`, text: curVersion(r)?.change?.text ?? '', link: `/manager/contracts/${r.id}` }));
  awaitingDeposit(d).filter((r) => { const v = curVersion(r); return v && versionState(v) === 'EXPIRED'; }).forEach((r) =>
    out.push({ tone: 'bad', title: `${r.id}: quá hạn chung 24 giờ`, text: 'Khách chưa hoàn tất cọc và ký – gia hạn hoặc hủy yêu cầu.', link: `/manager/payments/overdue` }));
  d.transactions.filter((x) => x.status === 'PENDING_CONFIRMATION' && x.method === 'BANK_TRANSFER').forEach((x) =>
    out.push({ tone: 'info', title: `${x.id}: chuyển khoản chờ xác minh`, text: `${x.requestId} • ${fmtMoney(x.amount)}`, link: '/manager/payments' }));
  d.trips.filter((t) => t.deployment.status === 'NOT_CONFIRMED').forEach((t) =>
    out.push({ tone: 'warn', title: `${t.id}: chưa phân công người phụ trách`, text: `Khởi hành ${fmtDateTime(t.plannedDepart)}`, link: `/manager/trips/${t.id}/assign` }));
  d.trips.filter((t) => t.route?.status === 'PENDING_APPROVAL').forEach((t) =>
    out.push({ tone: 'info', title: `${t.id}: phương án tuyến v${t.route!.v} chờ duyệt`, text: 'Coordinator đã gửi tuyến, xe và nhân sự.', link: `/manager/trips/${t.id}/prepare` }));
  d.trips.filter((t) => t.flight?.status === 'BUDGET_PENDING').forEach((t) =>
    out.push({ tone: 'info', title: `${t.id}: ngân sách chuyến bay chờ duyệt`, text: `${t.flight!.airline} ${t.flight!.flightNo} • ${fmtMoney(t.flight!.budget)}`, link: `/manager/trips/${t.id}/prepare` }));
  d.trips.filter((t) => t.status === 'PLANNING' && t.deployment.status === 'CONFIRMED' && isReady(t)).forEach((t) =>
    out.push({ tone: 'info', title: `${t.id}: đủ điều kiện duyệt khởi hành`, text: `Khởi hành ${fmtDateTime(t.plannedDepart)}`, link: `/manager/trips/${t.id}/depart` }));
  d.incidents.filter((i) => i.plans.some((p) => p.status === 'PENDING_APPROVAL')).forEach((i) =>
    out.push({ tone: 'bad', title: `${i.id}: phương án xử lý chờ quyết định`, text: `${i.tripId} • ${INCIDENT_TYPE_LABEL[i.type]}`, link: `/manager/incidents/${i.id}` }));
  d.trips.filter((t) => t.refusal && !t.refusal.resolvedAt).forEach((t) =>
    out.push({ tone: 'bad', title: `${t.id}: người nhận từ chối bàn giao`, text: t.refusal!.reason, link: `/manager/requests/${t.requestId}/closure` }));
  d.complaints.filter((c) => c.status === 'NEW').forEach((c) =>
    out.push({ tone: 'warn', title: `${c.id}: khiếu nại mới`, text: `${c.requestId} • ${c.title}`, link: `/manager/complaints/${c.id}` }));
  d.requests.filter((r) => r.status === 'DELIVERED' && closureChecks(d, r).every((c) => c[1])).forEach((r) =>
    out.push({ tone: 'info', title: `${r.id}: đủ điều kiện đóng đơn`, text: 'Mọi điều kiện đóng đã đạt.', link: `/manager/requests/${r.id}/closure` }));
  return out;
}
