import type {
  AuditEntry,
  Checklist,
  ChecklistItem,
  ChecklistStatus,
  CountryCode,
  CustomerDoc,
  CustomerDocKey,
  CustomerDocStatus,
  DeploymentStatus,
  Direction,
  DocGroup,
  DocRequest,
  DocScope,
  DocType,
  Provider,
  QuarantineBooking,
  RegPackage,
  Regulation,
  ReqSetSnapshot,
  RequirementLevel,
  RequirementStage,
  SpecTrip,
  TransportMode,
  TripDocument,
  TripStatus,
} from '../types';

// ============================================================================
// Đồng hồ demo: bắt đầu 04/10/2026 11:30 (giờ VN) rồi chạy theo thời gian thực
// ============================================================================
const DEMO_CLOCK_START = Date.UTC(2026, 9, 4, 4, 30);
const CLOCK_T0 = Date.now();
const VN_OFFSET = 7 * 3600000;
export const clockMs = () => DEMO_CLOCK_START + (Date.now() - CLOCK_T0);
const msToStamp = (ms: number) => new Date(ms + VN_OFFSET).toISOString().slice(0, 16).replace('T', ' ');
export const nowStamp = () => msToStamp(clockMs());
export const today = () => nowStamp().slice(0, 10);
export const stampToMs = (s: string) => Date.parse(`${(s.length <= 10 ? `${s} 00:00` : s).replace(' ', 'T')}:00Z`) - VN_OFFSET;
export const addDays = (d: string, n: number) => msToStamp(stampToMs(d) + n * 86400000).slice(0, 10);
export const fmtDate = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
export const fmtDateTime = (s?: string) => (!s ? '—' : s.length <= 10 ? fmtDate(s) : `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`);
const pad = (n: number) => String(n).padStart(2, '0');
/** 'dd/mm/yyyy' → 'yyyy-mm-dd' ('' nếu không hợp lệ) */
export function parseViDate(text: string) {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  const d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : '';
}

// ============================================================================
// Nhãn (VI)
// ============================================================================
export const COUNTRY_VI: Record<CountryCode, string> = { VN: 'Việt Nam', JP: 'Nhật Bản', TH: 'Thái Lan', KH: 'Campuchia', SG: 'Singapore', UK: 'Anh', AE: 'UAE' };
export const DIRECTION_VI: Record<Direction, string> = { EXPORT: 'Xuất khẩu', IMPORT: 'Nhập khẩu', DOMESTIC: 'Nội địa' };
export const GROUP_VI: Record<DocGroup, string> = { IDENTITY: 'Nhận dạng ngựa', MEDICAL: 'Thú y / sức khỏe', QUARANTINE: 'Kiểm dịch', CUSTOMS: 'Hải quan / giấy phép', OTHER: 'Khác' };
export const LEVEL_VI: Record<RequirementLevel, string> = { REQUIRED: 'Bắt buộc', CONDITIONAL: 'Có điều kiện', OPTIONAL: 'Tùy chọn' };
export const STAGE_VI: Record<RequirementStage, string> = { BEFORE_SUBMIT: 'Trước khi gửi đơn', BEFORE_DEPART: 'Trước khởi hành', AT_CHECKPOINT: 'Tại điểm kiểm tra' };
export const PROVIDER_VI: Record<Provider, string> = { CUSTOMER: 'Khách hàng', CBN: 'CBN Transport' };
export const SCOPE_VI: Record<DocScope, string> = { PER_HORSE: 'Từng ngựa', PER_TRIP: 'Toàn chuyến' };
export const MODE_VI: Record<TransportMode, string> = { ROAD: 'Đường bộ', AIR: 'Hàng không' };
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = { PLANNING: 'Lập kế hoạch', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Hoàn tất' };
export const DEPLOYMENT_LABEL: Record<DeploymentStatus, string> = { NOT_CONFIRMED: 'Chờ Manager giao', CONFIRMED: 'Đã giao việc', ON_HOLD: 'Tạm dừng' };
export const CHECKLIST_LABEL: Record<ChecklistStatus, string> = {
  NOT_SUBMITTED: 'Chưa nộp', SUBMITTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', EXPIRED: 'Hết hạn', NOT_CONFIGURED: 'Chưa cấu hình',
};
export const CUSTOMER_DOC_LABEL: Record<CustomerDocStatus, string> = {
  MISSING: 'Còn thiếu', OPTIONAL: 'Không bắt buộc', SUBMITTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', ACTION_REQUIRED: 'Cần bổ sung',
};
export const CUSTOMER_DOC_NAME: Record<CustomerDocKey, string> = {
  invite: 'Thư mời thi đấu', raceReg: 'Giấy đăng ký giải đua', ataCarnet: 'ATA Carnet (nếu áp dụng)',
  passport: 'Hộ chiếu ngựa', ownership: 'Chứng nhận sở hữu ngựa', bio: 'Thông tin sinh học', valueProof: 'Giá trị thương mại',
  flu: 'Sổ tiêm ngừa', health: 'Giấy chứng nhận sức khỏe', conditions: 'Ghi chú sức khỏe đặc biệt', vet: 'Bác sĩ thú y riêng',
};
/** Giấy tờ của khách tương ứng với loại giấy tờ trong checklist chuyến */
export const CUSTOMER_KEY_TYPE: Partial<Record<CustomerDocKey, string>> = { passport: 'DT-1', health: 'DT-2', flu: 'DT-3' };
export const TYPE_CUSTOMER_KEY: Record<string, CustomerDocKey> = { 'DT-1': 'passport', 'DT-2': 'health', 'DT-3': 'flu' };
export const REQUEST_STATUS_LABEL: Record<DocRequest['status'], string> = { OPEN: 'Đang chờ khách', SUBMITTED: 'Khách đã nộp lại', FULFILLED: 'Đã hoàn tất' };
export const ROLE_LABEL: Record<AuditEntry['role'], string> = { TRANSPORT_SPECIALIST: 'Transport Specialist', LOGISTICS_MANAGER: 'Logistics Manager', CUSTOMER: 'Khách hàng', SYSTEM: 'Hệ thống' };

// ============================================================================
// Dữ liệu dùng chung cho các quy tắc
// ============================================================================
export interface SpecialistData {
  trips: SpecTrip[];
  docTypes: DocType[];
  regulations: Regulation[];
  packages: RegPackage[];
  customerDocs: CustomerDoc[];
  documents: TripDocument[];
  requests: DocRequest[];
  bookings: QuarantineBooking[];
  audit: AuditEntry[];
}

export const docType = (data: SpecialistData, id: string) => data.docTypes.find((d) => d.id === id);
export const typeName = (data: SpecialistData, id: string) => docType(data, id)?.name ?? id;
export const horseName = (t: SpecTrip, id: string | null) => (id ? t.horses.find((h) => h.id === id)?.name ?? id : 'Toàn chuyến');
export const deployed = (t: SpecTrip) => t.deployment === 'CONFIRMED';
export const shortName = (city: string) => (city === 'Ho Chi Minh City' ? 'HCMC' : city);
export const ruleLabel =(c: CountryCode, d: Direction) => `${COUNTRY_VI[c]} • ${DIRECTION_VI[d]}`;

// ============================================================================
// Bộ yêu cầu hồ sơ
// ============================================================================
/** Các yêu cầu tuyến cần: nội địa, hoặc xuất khẩu nước đi + nhập khẩu nước đến */
export const routeNeeds = (t: SpecTrip): Array<[CountryCode, Direction]> =>
  t.originCountry === t.destCountry ? [[t.originCountry, 'DOMESTIC']] : [[t.originCountry, 'EXPORT'], [t.destCountry, 'IMPORT']];
export const regFor = (data: SpecialistData, c: CountryCode, d: Direction) =>
  data.regulations.find((g) => g.country === c && g.direction === d && g.status === 'ACTIVE');

/** Lý do bộ không phù hợp chuyến ('' = phù hợp): phải cùng nơi đi, nơi đến và phương thức */
export function pkgWhyNot(p: RegPackage, t: SpecTrip) {
  if (p.status === 'RETIRED') return 'Bộ đã ngừng áp dụng.';
  if (p.origin !== t.originCountry || p.dest !== t.destCountry) return `Bộ dành cho ${COUNTRY_VI[p.origin]} → ${COUNTRY_VI[p.dest]}, chuyến đi ${COUNTRY_VI[t.originCountry]} → ${COUNTRY_VI[t.destCountry]}.`;
  if (!p.modes.includes(t.mode)) return `Bộ không áp dụng cho phương thức ${MODE_VI[t.mode].toLowerCase()}.`;
  return '';
}
const rpKey = (items: Array<[CountryCode, Direction]>) => items.map((x) => x.join('-')).sort().join('|');
export function suggestPackage(data: SpecialistData, t: SpecTrip) {
  const k = rpKey(routeNeeds(t));
  const fit = data.packages.filter((p) => !pkgWhyNot(p, t));
  return fit.find((p) => rpKey(p.items) === k) ?? fit[0];
}
export const pkgName = (items: Array<[CountryCode, Direction]>) => {
  const dom = items.find((x) => x[1] === 'DOMESTIC');
  if (dom && items.length === 1) return `Nội địa ${COUNTRY_VI[dom[0]]}`;
  const ex = items.find((x) => x[1] === 'EXPORT'), im = items.find((x) => x[1] === 'IMPORT');
  return `${ex ? COUNTRY_VI[ex[0]] : '…'} → ${im ? COUNTRY_VI[im[0]] : '…'}`;
};
export const pkgEnds = (items: Array<[CountryCode, Direction]>): [CountryCode, CountryCode] => {
  const dom = items.find((x) => x[1] === 'DOMESTIC');
  if (dom) return [dom[0], dom[0]];
  const ex = items.find((x) => x[1] === 'EXPORT'), im = items.find((x) => x[1] === 'IMPORT');
  return [ex?.[0] ?? 'VN', im?.[0] ?? 'VN'];
};
/** Bản chụp bộ yêu cầu + phiên bản và dòng yêu cầu của từng quốc gia/hướng */
export function snapshot(data: SpecialistData, p: RegPackage, by: string): ReqSetSnapshot {
  return {
    pkgId: p.id, pkgV: p.v, name: p.name, at: nowStamp(), by,
    rules: p.items.map(([c, d]) => {
      const g = regFor(data, c, d);
      return g ? { country: c, direction: d, regId: g.id, regV: g.v, lines: JSON.parse(JSON.stringify(g.lines)) } : { country: c, direction: d, regId: null, lines: [] };
    }),
  };
}
/** Yêu cầu áp dụng cho chuyến: theo bản chụp nếu đã áp dụng bộ, nếu chưa thì gợi ý tự động theo tuyến */
export function tripRules(data: SpecialistData, t: SpecTrip): ReqSetSnapshot['rules'] {
  if (t.reqSet) return t.reqSet.rules;
  return routeNeeds(t).map(([c, d]) => {
    const g = regFor(data, c, d);
    return g ? { country: c, direction: d, regId: g.id, regV: g.v, lines: g.lines } : { country: c, direction: d, regId: null, lines: [] };
  });
}

// ============================================================================
// Checklist của chuyến
// ============================================================================
export const findDoc = (data: SpecialistData, t: SpecTrip, typeId: string, horseId: string | null) =>
  [...data.documents].reverse().find((d) => d.tripId === t.id && d.typeId === typeId && d.horseId === horseId);
export const customerDoc = (data: SpecialistData, tripId: string, key: CustomerDocKey, scope: string) =>
  data.customerDocs.find((d) => d.tripId === tripId && d.key === key && d.scope === scope);
export const latestVersion = (d?: TripDocument) => d?.versions[d.versions.length - 1];

/** Trạng thái thực tế của chứng từ: đã duyệt nhưng hết hạn trước khi chuyến đến nơi thì là hết hạn */
export function docEffective(d: TripDocument | undefined, t?: SpecTrip): ChecklistStatus {
  if (!d) return 'NOT_SUBMITTED';
  if (d.status === 'APPROVED' && d.expiry && (d.expiry < today() || (t && d.expiry < t.eta.slice(0, 10)))) return 'EXPIRED';
  return d.status;
}
const CUSTOMER_TO_CHECK: Record<CustomerDocStatus, ChecklistStatus> = {
  MISSING: 'NOT_SUBMITTED', OPTIONAL: 'NOT_SUBMITTED', SUBMITTED: 'SUBMITTED', APPROVED: 'APPROVED', ACTION_REQUIRED: 'REJECTED',
};

export function checklist(data: SpecialistData, t: SpecTrip): Checklist {
  const LV: Record<RequirementLevel, number> = { REQUIRED: 3, CONDITIONAL: 2, OPTIONAL: 1 };
  const SG: Record<RequirementStage, number> = { BEFORE_SUBMIT: 1, BEFORE_DEPART: 2, AT_CHECKPOINT: 3 };
  const map = new Map<string, ChecklistItem>();
  const rules = tripRules(data, t);
  rules.filter((x) => x.regId).forEach((x) => x.lines.forEach((l) => {
    (l.scope === 'PER_HORSE' ? t.horses.map((h) => h.id) : [null]).forEach((horseId) => {
      const k = `${l.typeId}|${horseId ?? ''}`, cur = map.get(k);
      if (!cur) {
        map.set(k, { typeId: l.typeId, horseId, provider: l.provider, level: l.level, stage: l.stage, condition: l.condition, counted: false, status: 'NOT_SUBMITTED' });
      } else {
        // trùng giữa hai quốc gia: lấy mức nghiêm nhất và giai đoạn sớm nhất
        if (LV[l.level] > LV[cur.level]) cur.level = l.level;
        if (SG[l.stage] < SG[cur.stage]) cur.stage = l.stage;
        if (l.condition && !cur.condition) cur.condition = l.condition;
      }
    });
  }));
  const items = [...map.values()].sort((a, b) => a.typeId.localeCompare(b.typeId, undefined, { numeric: true }));
  items.forEach((i) => {
    i.counted = i.level === 'REQUIRED' && i.stage !== 'AT_CHECKPOINT';
    const d = findDoc(data, t, i.typeId, i.horseId);
    if (d) { i.doc = d; i.status = docEffective(d, t); return; }
    // giấy tờ khách hàng: dùng lại hồ sơ khách đã nộp trong Request và kết quả xét duyệt của nó
    const key = TYPE_CUSTOMER_KEY[i.typeId];
    const cd = i.provider === 'CUSTOMER' && key ? customerDoc(data, t.id, key, i.horseId ?? 'request') : undefined;
    if (cd) {
      i.status = CUSTOMER_TO_CHECK[cd.status];
      if (i.status === 'APPROVED' && cd.expiry && cd.expiry < t.eta.slice(0, 10)) i.status = 'EXPIRED';
    }
  });
  rules.filter((x) => !x.regId).forEach((x) => items.push({
    typeId: `RULE:${x.country}:${x.direction}`, horseId: null, provider: 'CBN', level: 'REQUIRED', stage: 'BEFORE_DEPART', condition: '',
    counted: true, status: 'NOT_CONFIGURED', missingRule: ruleLabel(x.country, x.direction),
  }));
  const req = items.filter((i) => i.counted), ready = req.filter((i) => i.status === 'APPROVED').length;
  return {
    items, ready, total: req.length,
    pending: req.filter((i) => i.status === 'SUBMITTED').length,
    needs: req.filter((i) => ['NOT_SUBMITTED', 'REJECTED', 'EXPIRED', 'NOT_CONFIGURED'].includes(i.status)).length,
    status: items.length && ready === req.length ? 'READY' : 'NOT_READY',
  };
}

/** Giấy tờ khách hàng của chuyến (bắt buộc = không phải mục tùy chọn) */
export function customerDocCount(data: SpecialistData, t: SpecTrip) {
  const list = data.customerDocs.filter((d) => d.tripId === t.id && !d.optional);
  return { total: list.length, done: list.filter((d) => d.status === 'APPROVED').length };
}
/** Tổng giấy tờ hiển thị ngoài chuyến: khách cung cấp + công ty phải làm */
export function tripTotals(data: SpecialistData, t: SpecTrip) {
  const cu = customerDocCount(data, t);
  const co = checklist(data, t).items.filter((i) => i.counted && i.provider === 'CBN');
  const coDone = co.filter((i) => i.status === 'APPROVED').length;
  return { cu, coDone, coTotal: co.length, done: cu.done + coDone, total: cu.total + co.length };
}
export const insuranceState = (t: SpecTrip) => (!t.insurance ? 'MISSING' : t.insurance.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING');

/** Vì sao Specialist chưa thể thao tác chính thức trên chuyến */
export function opsBlock(t: SpecTrip) {
  if (t.deployment === 'NOT_CONFIRMED') return `${t.id} chưa được Logistics Manager giao.`;
  if (t.deployment === 'ON_HOLD') return `${t.id} đang tạm dừng.`;
  return '';
}

/** Lý do chưa xác nhận được Docs READY ('' = xác nhận được) */
export function docsReadyBlock(data: SpecialistData, t: SpecTrip) {
  const ob = opsBlock(t);
  if (ob) return ob;
  if (t.status !== 'PLANNING') return 'Chuyến đã qua bước chuẩn bị.';
  if (!t.reqSet) return 'Chưa áp dụng bộ yêu cầu hồ sơ cho chuyến.';
  const c = checklist(data, t), cu = customerDocCount(data, t);
  if (cu.done < cu.total) return `Còn ${cu.total - cu.done} giấy tờ khách hàng chưa được duyệt.`;
  if (c.ready < c.total) return `Còn ${c.total - c.ready} mục bắt buộc trong checklist chưa duyệt.`;
  if (insuranceState(t) !== 'VERIFIED') return 'Bảo hiểm vận chuyển chưa được xác minh.';
  return '';
}

/** Danh sách điều đang chặn chuyến (hiển thị ở thẻ Docs READY) */
export function blockingOf(data: SpecialistData, t: SpecTrip): Array<[boolean, string]> {
  const c = checklist(data, t), list: Array<[boolean, string]> = [];
  const by = (s: ChecklistStatus) => c.items.filter((i) => i.counted && i.status === s);
  by('NOT_CONFIGURED').forEach((i) => list.push([true, `${i.missingRule}: chưa cấu hình yêu cầu`]));
  ([['NOT_SUBMITTED', 'còn thiếu'], ['SUBMITTED', 'chờ duyệt'], ['REJECTED', 'bị từ chối'], ['EXPIRED', 'hết hạn']] as const)
    .forEach(([s, l]) => { const n = by(s).length; if (n) list.push([s !== 'SUBMITTED', `${n} mục checklist ${l}`]); });
  const cu = customerDocCount(data, t);
  if (cu.done < cu.total) list.push([true, `${cu.total - cu.done} giấy tờ khách hàng chưa duyệt`]);
  if (insuranceState(t) !== 'VERIFIED') list.push([true, insuranceState(t) === 'MISSING' ? 'Chưa có hợp đồng bảo hiểm' : 'Bảo hiểm chưa xác minh']);
  data.bookings.filter((b) => b.tripId === t.id && b.status === 'REQUESTED').forEach((b) => list.push([false, `Chưa xác nhận lịch kiểm dịch: ${b.station}`]));
  t.checkpoints.filter((cp) => cp.clearance && cp.clearance.result !== 'PASSED').forEach((cp) => list.push([true, `${cp.name}: ${cp.clearance!.result === 'HELD' ? 'bị giữ' : 'không đạt'}`]));
  return list;
}

export const openRequestFor = (data: SpecialistData, tripId: string, key: CustomerDocKey, scope: string) =>
  data.requests.find((x) => x.tripId === tripId && x.key === key && x.scope === scope && x.status !== 'FULFILLED');
export const expiringOrExpired = (d: TripDocument) =>
  !!d.expiry && d.status === 'APPROVED' && (stampToMs(d.expiry) - stampToMs(today())) / 86400000 <= 30;

/** Các mục bắt buộc còn thiếu trên những chuyến đã được giao */
export const missingItems = (data: SpecialistData) => data.trips.filter((t) => deployed(t) && t.status !== 'COMPLETED')
  .flatMap((t) => checklist(data, t).items.filter((i) => i.counted && i.status === 'NOT_SUBMITTED').map((i) => ({ t, i })));
/** Chuyến cần chuẩn bị hồ sơ: đã giao, đang lập kế hoạch, chưa đủ hồ sơ */
export const prepTrips = (data: SpecialistData) => data.trips.filter((t) => deployed(t) && t.status === 'PLANNING' && !t.docsReady);

/** Bảng chữ mục checklist (tên + ngựa) */
export const itemName = (data: SpecialistData, t: SpecTrip, i: ChecklistItem) =>
  i.missingRule ? `Yêu cầu ${i.missingRule}` : `${typeName(data, i.typeId)}${i.horseId ? ` – ${horseName(t, i.horseId)}` : ''}`;
