import type {
  City,
  ContractItem,
  ContractState,
  ContractVersion,
  CountryCode,
  DepositState,
  DocItem,
  DocKey,
  DocRecord,
  DocStatus,
  Horse,
  HorseInput,
  HorseDocKey,
  HorseProfileStatus,
  Lifecycle,
  MilestoneType,
  PassportStatus,
  Payment,
  Place,
  RequestDetailTab,
  RequestField,
  RequestStatus,
  StopType,
  TransportRequest,
  Trip,
  TripStop,
} from '../types';

// ============================================================================
// Đồng hồ demo: chạy theo thời gian thực để tương thích hoàn toàn với Backend C#
// Mọi thao tác mới (gửi đơn, phát hành hợp đồng, thanh toán, mốc hành trình…) dùng chung đồng hồ này.
// ============================================================================
export const DEMO_CLOCK_START = Date.now();
const VN_OFFSET = 7 * 3600000;

export const clockMs = () => Date.now();
const msToStamp = (ms: number) => new Date(ms + VN_OFFSET).toISOString().slice(0, 16).replace('T', ' ');
export const nowStamp = () => msToStamp(clockMs());
export const today = () => nowStamp().slice(0, 10);
export const stampToMs = (s: string) => {
  const full = s.length <= 10 ? `${s} 00:00` : s;
  return Date.parse(`${full.replace(' ', 'T')}:00Z`) - VN_OFFSET;
};
export const addHours = (s: string, h: number) => msToStamp(stampToMs(s) + h * 3600000);
export const addDays = (d: string, n: number) => msToStamp(stampToMs(d) + n * 86400000).slice(0, 10);

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDate = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
export const fmtDateTime = (s?: string) => (!s ? '—' : s.length <= 10 ? fmtDate(s) : `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`);
export const fmtMoney = (n: number, currency = 'VND') =>
  currency === 'USD'
    ? `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : `${Number(n || 0).toLocaleString('vi-VN')} đ`;
export const fmtVnd = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

/** "còn 21 giờ 30 phút" / "Đã hết hạn" */
export function timeLeft(until?: string) {
  if (!until) return '—';
  const ms = stampToMs(until) - clockMs();
  if (ms <= 0) return 'Đã hết hạn';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h ? `còn ${h} giờ ${pad(m)} phút` : `còn ${m} phút`;
}
export const isPast = (s?: string) => !!s && stampToMs(s) <= clockMs();

/** Chuyển 'dd/mm/yyyy' → 'yyyy-mm-dd' (trả '' nếu không hợp lệ) */
export function parseViDate(text: string) {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${pad(mo)}-${pad(d)}`;
}

// ============================================================================
// Thành phố & tuyến
// ============================================================================
export const CITIES: City[] = [
  { name: 'Ho Chi Minh City', country: 'VN', code: 'HCMC' },
  { name: 'Hanoi', country: 'VN', code: 'HAN' },
  { name: 'Binh Duong', country: 'VN', code: 'BD' },
  { name: 'Da Nang', country: 'VN', code: 'DAD' },
  { name: 'Tokyo', country: 'JP', code: 'TYO' },
  { name: 'Osaka', country: 'JP', code: 'OSA' },
  { name: 'Nagoya', country: 'JP', code: 'NGO' },
  { name: 'Sapporo', country: 'JP', code: 'CTS' },
  { name: 'Fukuoka', country: 'JP', code: 'FUK' },
  { name: 'Bangkok', country: 'TH', code: 'BKK' },
  { name: 'Singapore', country: 'SG', code: 'SIN' },
  { name: 'Sydney', country: 'AU', code: 'SYD' },
  { name: 'Dubai', country: 'AE', code: 'DXB' },
  { name: 'London', country: 'UK', code: 'LON' },
];
export const COUNTRY_LABEL: Record<CountryCode, string> = {
  VN: 'Việt Nam', JP: 'Nhật Bản', TH: 'Thái Lan', SG: 'Singapore', AU: 'Úc', AE: 'UAE', UK: 'Anh',
};
export const city = (name: string): City => CITIES.find((c) => c.name === name) ?? { name: name || '—', country: 'VN', code: name || '—' };
export const cityLabel = (name: string) => (name ? `${name}, ${city(name).country}` : '—');
export const shortCity = (name: string) => (name === 'Ho Chi Minh City' ? 'HCMC' : name || '—');
export const isInternational = (a: string, b: string) => city(a).country !== city(b).country;

export function getDefaultCoordinates(cityName?: string): { latitude: number; longitude: number } {
  const c = (cityName || '').toLowerCase();
  if (c.includes('tokyo')) return { latitude: 35.6762, longitude: 139.6503 };
  if (c.includes('chiba')) return { latitude: 35.6074, longitude: 140.1065 };
  if (c.includes('osaka')) return { latitude: 34.6937, longitude: 135.5023 };
  if (c.includes('nagoya')) return { latitude: 35.1815, longitude: 136.9066 };
  if (c.includes('sapporo')) return { latitude: 43.0618, longitude: 141.3545 };
  if (c.includes('fukuoka')) return { latitude: 33.5904, longitude: 130.4017 };
  if (c.includes('hanoi') || c.includes('hà nội')) return { latitude: 21.0285, longitude: 105.8542 };
  if (c.includes('binh duong') || c.includes('bình dương')) return { latitude: 10.9805, longitude: 106.6519 };
  if (c.includes('da nang') || c.includes('đà nẵng')) return { latitude: 16.0544, longitude: 108.2022 };
  return { latitude: 10.7769, longitude: 106.7009 };
}

export function getCityId(cityName?: string): string {
  const c = (cityName || '').toLowerCase();
  if (c.includes('hanoi') || c.includes('hà nội')) return '51bbbbbbbbbbbbbbbbbbbb';
  if (c.includes('ho chi minh') || c.includes('hcmc') || c.includes('sài gòn')) return '51aaaaaaaaaaaaaaaaaaaa';
  if (c.includes('binh duong') || c.includes('bình dương')) return '51dddddddddddddddddddd';
  if (c.includes('da nang') || c.includes('đà nẵng')) return '51eeeeeeeeeeeeeeeeeeee';
  if (c.includes('tokyo')) return '51ffffffffffffffffffff';
  if (c.includes('osaka')) return '51111111111111111111';
  if (c.includes('nagoya')) return '51222222222222222222';
  if (c.includes('sapporo')) return '51333333333333333333';
  if (c.includes('fukuoka')) return '51444444444444444444';
  return '51aaaaaaaaaaaaaaaaaaaa';
}

/** Đơn mới chỉ nhận tuyến Việt Nam → Việt Nam và Việt Nam → Nhật Bản */
export const BOOKING_ORIGINS = CITIES.filter((c) => c.country === 'VN');
export const BOOKING_DESTINATIONS = CITIES.filter((c) => ['VN', 'JP'].includes(c.country));
/** Keep the actual city labels returned by the backend selectable during revisions. */
export function registerBackendCity(name: string, country: CountryCode) {
  if (!name || CITIES.some(c => c.name === name)) return;
  const entry = { name, country, code: name };
  CITIES.push(entry);
  if (country === 'VN') BOOKING_ORIGINS.push(entry);
  if (country === 'VN' || country === 'JP') BOOKING_DESTINATIONS.push(entry);
}
export const ROUTE_RULE = 'CBN Transport chỉ nhận đơn mới cho tuyến Việt Nam → Việt Nam và Việt Nam → Nhật Bản.';
export const isSupportedRoute = (a: string, b: string) =>
  !!a && !!b && a !== b && BOOKING_ORIGINS.some((c) => c.name === a) && BOOKING_DESTINATIONS.some((c) => c.name === b);


// ============================================================================
// Nhãn trạng thái
// ============================================================================
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ Manager xét duyệt',
  CHANGES_REQUESTED: 'Yêu cầu chỉnh sửa',
  REJECTED: 'Bị từ chối',
  CONTRACT_PREPARATION: 'Đang soạn hợp đồng',
  CONTRACT_READY: 'Hợp đồng sẵn sàng',
  CONTRACT_CHANGES_REQUESTED: 'Đã yêu cầu sửa hợp đồng',
  DEPOSIT_VERIFIED: 'Đã xác minh cọc – chờ ký',
  AWAITING_DEPOSIT: 'Đã ký – chờ đặt cọc',
  CANCELLATION_REQUESTED: 'Chờ duyệt hủy',
  ACTIVATED: 'Đã kích hoạt – chuẩn bị',
  SCHEDULED: 'Đã lên lịch',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao – chưa đóng',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};
export const ALL_STATUSES = Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[];
export const FINAL_STATUSES: RequestStatus[] = ['CLOSED', 'CANCELLED', 'REJECTED'];
export const isActive = (r: TransportRequest) => !FINAL_STATUSES.includes(r.status);

export const CONTRACT_STATE_LABEL: Record<ContractState, string> = {
  SIGNED: 'Đã ký – chờ tiền cọc',
  ISSUED: 'Đã phát hành – chờ ký',
  CHANGES_REQUESTED: 'Đang yêu cầu sửa',
  EXPIRED: 'Hết hạn',
  SUPERSEDED: 'Đã thay thế',
  EFFECTIVE: 'Đã ký – có hiệu lực',
  FULFILLED: 'Đã hoàn thành – hết hiệu lực',
};
export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  MISSING: 'Còn thiếu',
  NEEDS_INPUT: 'Cần bổ sung thông tin',
  OPTIONAL: 'Không bắt buộc',
  NOT_REQUIRED_YET: 'Chưa bắt buộc',
  SUBMITTED: 'Đã lưu',
  PENDING_REVIEW: 'Chờ Specialist duyệt',
  APPROVED: 'Đã duyệt',
  ACTION_REQUIRED: 'Cần nộp lại',
};
export const PAYMENT_STATUS_LABEL: Record<Payment['status'], string> = {
  PENDING_CONFIRMATION: 'Chờ đối soát', PROCESSING: 'Chờ xác minh', SUCCESS: 'Thành công', FAILED: 'Thất bại', REJECTED: 'Bị từ chối',
};
export const FIELD_LABEL: Record<RequestField, string> = {
  route: 'Tuyến đường', date: 'Ngày vận chuyển', places: 'Điểm nhận / giao', horses: 'Danh sách và số lượng ngựa', notes: 'Ghi chú chăm sóc',
};
export const STOP_LABEL: Record<StopType, string> = {
  ORIGIN: 'Điểm nhận', REST_STOP: 'Điểm nghỉ', CHECKPOINT: 'Cửa khẩu', AIRPORT: 'Sân bay', DESTINATION: 'Điểm giao',
};
export const STOP_COLOR: Record<StopType, string> = {
  ORIGIN: '#0f172a', REST_STOP: '#d97706', CHECKPOINT: '#dc2626', AIRPORT: '#2563eb', DESTINATION: '#16a34a',
};
export const MILESTONE_LABEL: Record<MilestoneType, string> = {
  DEPARTED: 'Đã rời điểm nhận', ARRIVED_STOP: 'Đến điểm dừng', LEFT_STOP: 'Rời điểm dừng', ARRIVED_DESTINATION: 'Đến điểm giao',
};
export const TRIP_STATUS_LABEL: Record<Trip['status'], string> = {
  PLANNING: 'Lập kế hoạch', READY_TO_DEPART: 'Sẵn sàng khởi hành', IN_TRANSIT: 'Đang vận chuyển', COMPLETED: 'Hoàn tất',
};
export const SEX_LABEL: Record<string, string> = {
  STALLION: 'Ngựa đực giống', MARE: 'Ngựa cái', GELDING: 'Ngựa thiến',
};

// ============================================================================
// Ngựa
// ============================================================================
export const horseAge = (h: Horse) =>
  h.dob ? `${Math.floor((stampToMs(today()) - stampToMs(h.dob)) / 31557600000)} tuổi` : 'Chưa có ngày sinh';
export const horseLine = (h: Horse) => [h.breed, SEX_LABEL[h.sex] ?? h.sex, horseAge(h)].filter(Boolean).join(' • ');

export function passportStatus(h: Horse): PassportStatus {
  const p = h.passport;
  if (!p.number || !p.scan) return 'MISSING';
  if (p.expiryDate && p.expiryDate <= today()) return 'EXPIRED';
  if (p.expiryDate && (stampToMs(p.expiryDate) - stampToMs(today())) / 86400000 <= 90) return 'EXPIRING_SOON';
  return 'VALID';
}
export const PASSPORT_LABEL: Record<PassportStatus, string> = {
  MISSING: 'Còn thiếu', EXPIRED: 'Hết hạn', EXPIRING_SOON: 'Sắp hết hạn', VALID: 'Hợp lệ',
};

export function horseIssues(h: Horse) {
  const list: string[] = [];
  const ps = passportStatus(h);
  if (ps === 'MISSING') list.push('Hộ chiếu ngựa còn thiếu số hoặc bản scan');
  if (ps === 'EXPIRED') list.push('Hộ chiếu ngựa đã hết hạn');
  if (!h.ownership) list.push('Chưa có giấy chứng nhận sở hữu');
  if (!h.unsupportedFields?.includes('fluDate') && !h.fluDate) list.push('Chưa có ngày tiêm cúm gần nhất');
  else if (h.fluDate && (stampToMs(today()) - stampToMs(h.fluDate)) / 86400000 > 365) list.push('Tiêm phòng cúm đã quá 12 tháng');
  return list;
}
export function profileStatus(h: Horse): HorseProfileStatus {
  if (!h.name || !h.breed || !h.sex || !h.dob || !h.microchip || !h.passport.number) return 'INCOMPLETE';
  return horseIssues(h).length ? 'NEEDS_ATTENTION' : 'COMPLETE';
}
export const PROFILE_LABEL: Record<HorseProfileStatus, string> = {
  COMPLETE: 'Đầy đủ', NEEDS_ATTENTION: 'Cần xử lý', INCOMPLETE: 'Chưa hoàn thiện',
};

/** Các đơn đã gửi (không còn là bản nháp) có dùng ngựa này */
export const horseRequests = (h: Horse, requests: TransportRequest[]) =>
  requests.filter((r) => r.status !== 'DRAFT' && r.horses.includes(h.id)).sort((a, b) => b.date.localeCompare(a.date));
/** Ngựa đã gắn với đơn đã gửi thì khóa thông tin định danh */
export const HORSE_LOCKED_FIELDS = ['name', 'breed', 'sex', 'dob', 'microchip'] as const;

export const emptyHorse = (): Omit<Horse, 'id'> => ({
  name: '', breed: '', sex: '', dob: '', color: '', microchip: '', value: '', currency: 'VND',
  passport: { number: '', authority: '', issueDate: '', expiryDate: '' },
  fluDate: '', conditions: '', vetName: '', vetPhone: '',
});

/**
 * Kiểm tra toàn bộ dữ liệu biểu mẫu ngựa và trả về bản đồ lỗi theo từng trường:
 * key -> thông báo lỗi tiếng Việt
 */
export function validateHorseForm(h: HorseInput): Record<string, string> {
  const errors: Record<string, string> = {};

  // 1. Tên ngựa (bắt buộc)
  if (!h.name || !h.name.trim()) {
    errors.name = 'Vui lòng nhập tên ngựa.';
  }

  // 2. Giống ngựa (bắt buộc)
  if (!h.breed || !h.breed.trim()) {
    errors.breed = 'Vui lòng nhập giống ngựa.';
  }

  // 3. Giới tính (bắt buộc)
  if (!h.sex) {
    errors.sex = 'Vui lòng chọn giới tính.';
  }

  // 4. Ngày sinh (bắt buộc & <= hôm nay)
  if (!h.dob) {
    errors.dob = 'Vui lòng chọn ngày sinh.';
  } else if (h.dob > today()) {
    errors.dob = 'Ngày sinh không được lớn hơn ngày hiện tại.';
  }

  // 5. Số microchip (bắt buộc 15 chữ số)
  const chip = (h.microchip || '').trim();
  if (!chip) {
    errors.microchip = 'Vui lòng nhập số microchip (15 chữ số).';
  } else if (!/^\d{15}$/.test(chip)) {
    errors.microchip = 'Microchip phải gồm đúng 15 chữ số.';
  }

  // 6. Số hộ chiếu (bắt buộc)
  if (!h.passport?.number || !h.passport.number.trim()) {
    errors.passNumber = 'Vui lòng nhập số hộ chiếu.';
  }

  // 7. Cơ quan cấp hộ chiếu (bắt buộc)
  if (!h.passport?.authority || !h.passport.authority.trim()) {
    errors.passAuth = 'Vui lòng nhập cơ quan cấp hộ chiếu.';
  }

  // 8. Ngày cấp hộ chiếu (bắt buộc & <= hôm nay)
  if (!h.passport?.issueDate) {
    errors.passIssue = 'Vui lòng chọn ngày cấp hộ chiếu.';
  } else if (h.passport.issueDate > today()) {
    errors.passIssue = 'Ngày cấp hộ chiếu không được lớn hơn hôm nay.';
  }

  // 9. Ngày hết hạn hộ chiếu (bắt buộc & >= ngày cấp)
  if (!h.passport?.expiryDate) {
    errors.passExp = 'Vui lòng chọn ngày hết hạn hộ chiếu.';
  } else if (h.passport.expiryDate <= today() || (h.passport.issueDate && h.passport.expiryDate <= h.passport.issueDate)) {
    errors.passExp = 'Hộ chiếu phải còn hạn và ngày hết hạn phải sau ngày cấp.';
  }

  // 10. Giá trị khai báo (bắt buộc > 0 VND)
  const valStr = String(h.value ?? '').trim();
  if (h.currency !== 'VND' || !/^[1-9]\d{0,9}$/.test(valStr)) {
    errors.value = 'Giá trị khai báo phải là số nguyên VND từ 1 đến 9.999.999.999.';
  }
  if (h.passport?.issueDate && h.dob && h.passport.issueDate < h.dob) errors.passIssue = 'Ngày cấp hộ chiếu không được trước ngày sinh.';
  if ((h.conditions || '').length > 2000) errors.conditions = 'Ghi chú sức khỏe tối đa 2.000 ký tự.';

  return errors;
}

/** Mapping giữa key lỗi và ID của phần tử input trong DOM để scroll & focus */
export const HORSE_FIELD_ELEMENT_IDS: Record<string, string> = {
  name: 'hf-name',
  breed: 'hf-breed',
  sex: 'hf-sex',
  dob: 'hf-dob',
  microchip: 'hf-microchip',
  passNumber: 'hf-pass-no',
  passAuth: 'hf-pass-auth',
  passIssue: 'hf-pass-issue',
  passExp: 'hf-pass-exp',
  value: 'hf-value',
};

export const emptyPlace = (): Place => ({ name: '', address: '', postal: '', contact: '', phone: '', notes: '', cityId: '', cityName: '' });

// ============================================================================
// Hợp đồng & đặt cọc
// ============================================================================
export const CONTRACT_TERMS = [
  'Phạm vi dịch vụ: vận chuyển ngựa từ điểm nhận đến điểm giao theo tuyến đã thống nhất, bao gồm chăm sóc cơ bản trong hành trình.',
  'Giá trị hợp đồng là giá chính thức trong mục B; không phát sinh chi phí ngoài các khoản đã liệt kê nếu không có thỏa thuận bằng văn bản.',
  'Khách hàng thanh toán tiền cọc theo tỷ lệ ghi trong hợp đồng. Nút ký OTP chỉ mở sau khi tiền cọc được xác minh.',
  'Hạn chung 24 giờ kể từ khi phát hành áp dụng cho thanh toán cọc, xác minh và ký OTP; Manager có thể gia hạn.',
  'Hợp đồng có hiệu lực khi ký OTP thành công. Khi đó yêu cầu được kích hoạt và hệ thống tạo đúng một chuyến đi.',
  'Khách hàng cung cấp đầy đủ, trung thực hồ sơ ngựa và giấy tờ theo yêu cầu của Transport Specialist.',
  'Tiến độ hành trình hiển thị theo mốc do tổ xe xác nhận; không có vị trí GPS trực tiếp giữa các mốc.',
  'Bàn giao chỉ hoàn tất khi người nhận đăng ký (hoặc người thay thế được Manager duyệt) xuất trình giấy tờ tùy thân.',
  'Khách hàng nghiệm thu và thanh toán số dư trong 24 giờ sau bàn giao. Khiếu nại tạm dừng hạn này.',
  'Khách hàng có thể hủy yêu cầu bất cứ lúc nào trước khi ký; nếu đã có thanh toán, CBN Transport đối soát và hoàn tiền.',
  'Mọi khiếu nại được ghi nhận, phản hồi bằng văn bản và lưu trong lịch sử yêu cầu.',
  'Hợp đồng được lập điện tử, ký bằng OTP gửi tới email đã đăng ký của khách hàng.',
];

/** Các khoản mục giá chính thức cho một đơn (dùng khi Manager phát hành hợp đồng trong demo) */
export function contractItems(r: Pick<TransportRequest, 'origin' | 'destination' | 'horseCount'>): ContractItem[] {
  const intl = isInternational(r.origin, r.destination), n = Math.max(1, r.horseCount);
  return [
    { desc: intl ? 'Cước vận chuyển hàng không & đường bộ' : 'Cước vận chuyển đường bộ', amount: (intl ? 1300 : 420) * n, required: true },
    { desc: intl ? 'Thủ tục xuất nhập khẩu & kiểm dịch' : 'Giấy phép vận chuyển nội địa', amount: intl ? 320 : 80, required: true },
    { desc: 'Bác sĩ thú y đi kèm', amount: 150 },
    { desc: 'Bảo hiểm vận chuyển', amount: 90 * n },
  ];
}
export const sumItems = (items: ContractItem[]) => items.reduce((s, i) => s + i.amount, 0);

export const curVersion = (r: TransportRequest): ContractVersion | undefined =>
  r.versions && r.versions.length > 0 ? r.versions[r.versions.length - 1] : undefined;
/** Trạng thái thực tế: tôn trọng trạng thái từ Backend */
export function versionState(v: ContractVersion): ContractState {
  if (v.state === 'EXPIRED' || (v.state === 'ISSUED' && !v.signedAt && isPast(v.validUntil))) return 'EXPIRED';
  return v.state;
}
export const ctRef = (v: ContractVersion) => `${v.number} v${v.v}`;
export const depositAmount = (r: TransportRequest) => {
  const v = curVersion(r);
  return v ? v.depositAmount ?? Math.round((v.total * v.depositPct) / 100) : 0;
};
export const contractTotal = (r: TransportRequest) => curVersion(r)?.total ?? 0;
export const signedVersion = (r: TransportRequest) => (r.versions || []).find((v) => ['SIGNED', 'EFFECTIVE', 'FULFILLED'].includes(v.state));
export const isSigned = (r: TransportRequest) => !!signedVersion(r);

export const depositPayments = (r: TransportRequest) => {
  const v = curVersion(r);
  return (r.payments || []).filter(p => p.type === 'DEPOSIT' && !!v?.contractId && p.contractId === v.contractId && p.versionNo === v.v);
};
export const verifiedPaymentAmount = (p: Payment) => p.confirmedAmount ?? (p.method === 'BANK_TRANSFER' ? 0 : p.amount);
export const balancePayments = (r: TransportRequest) => (r.payments || []).filter((p) => p.type === 'BALANCE');
const last = <T,>(list: T[]) => list[list.length - 1];

/** QR đang xử lý nhưng đã quá 5 phút thì coi như thất bại */
/** Mã QR thanh toán cọc có hiệu lực 5 phút (tách biệt với hạn chung 24 giờ của hợp đồng) */
export const QR_MINUTES = 5;
export const qrExpired = (p?: Payment) => !!p && p.status === 'PROCESSING' && !!p.qrExpiresAtMs && clockMs() >= p.qrExpiresAtMs;

export function depositState(r: TransportRequest): DepositState {
  const payments = depositPayments(r);
  const paid = payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + verifiedPaymentAmount(p), 0);
  if (depositAmount(r) > 0 && paid >= depositAmount(r)) return 'VERIFIED';
  if (payments.some(p => ['PROCESSING', 'PENDING_CONFIRMATION'].includes(p.status))) return 'PENDING';
  if (['FAILED', 'REJECTED'].includes(last(payments)?.status ?? '')) return 'FAILED';
  return 'NONE';
}
export const DEPOSIT_STATE_LABEL: Record<DepositState, string> = {
  NONE: 'Chưa đủ cọc', PENDING: 'Chờ xác minh', VERIFIED: 'Đã xác minh đủ cọc', FAILED: 'Thanh toán thất bại',
};
export const hasDepositMoney = (r: TransportRequest) => depositPayments(r).some(p => ['PROCESSING', 'PENDING_CONFIRMATION', 'SUCCESS'].includes(p.status));
export const depositPaidAmount = (r: TransportRequest) => depositPayments(r).filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + verifiedPaymentAmount(p), 0);

export const canAcceptTerms = (r: TransportRequest) => {
  const v = curVersion(r);
  return !!v?.snapshot && !!v.terms?.length && r.status === 'CONTRACT_READY' && versionState(v) === 'ISSUED' && !isPast(v.validUntil) && !v.termsAcceptedAt;
};
export const canPayDeposit = (r: TransportRequest) => {
  const v = curVersion(r);
  return !!v && r.status === 'CONTRACT_READY' && versionState(v) === 'ISSUED' && !!v.termsAcceptedAt && !v.signedAt && !isPast(v.validUntil)
    && ['NONE', 'FAILED'].includes(depositState(r));
};
export function signBlock(r: TransportRequest): string {
  const v = curVersion(r);
  if (!v) return 'Chưa có hợp đồng.';
  if (!v.snapshot || !v.terms?.length) return 'Chưa tải đủ nội dung phiên bản hợp đồng.';
  if (versionState(v) === 'EXPIRED' || isPast(v.validUntil)) return 'Đã quá hạn ký. Chờ Manager gia hạn hoặc phát hành phiên bản mới.';
  if (versionState(v) !== 'ISSUED' || v.signedAt) return 'Phiên bản này đã ký hoặc không thể ký.';
  if (!v.termsAcceptedAt) return 'Hãy đồng ý điều khoản hợp đồng trước.';
  if (r.status !== 'DEPOSIT_VERIFIED' || depositState(r) !== 'VERIFIED') return 'Tiền cọc phải được xác minh đủ trước khi ký OTP.';
  return '';
}
export const canSign = (r: TransportRequest) => r.status === 'DEPOSIT_VERIFIED' && !signBlock(r);
export const canRequestContractChange = (r: TransportRequest) => {
  const v = curVersion(r);
  return !!v && r.status === 'CONTRACT_READY' && ['ISSUED', 'EXPIRED'].includes(versionState(v)) && !hasDepositMoney(r);
};
export const canCancel = (r: TransportRequest) =>
  ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'DEPOSIT_VERIFIED', 'AWAITING_DEPOSIT']
    .includes(r.status);

// ============================================================================
// Giấy tờ (giấy tờ chung + hồ sơ từng ngựa)
// ============================================================================
export const FILE_DOC_KEYS: DocKey[] = ['passport', 'ownership', 'valueProof', 'flu', 'health'];
export const DOC_NAME: Record<DocKey, string> = {
  passport: 'Hộ chiếu ngựa',
  ownership: 'Chứng nhận sở hữu ngựa',
  bio: 'Thông tin sinh học',
  valueProof: 'Giá trị thương mại',
  flu: 'Sổ tiêm ngừa',
  health: 'Giấy chứng nhận sức khỏe',
  conditions: 'Ghi chú sức khỏe đặc biệt',
  vet: 'Bác sĩ thú y riêng',
};
/** Tệp trong hồ sơ ngựa tương ứng với từng loại giấy tờ */
export const HORSE_FILE_FIELD: Partial<Record<HorseDocKey, 'ownership' | 'valueProof' | 'flu' | 'health'>> = {
  ownership: 'ownership', valueProof: 'valueProof', flu: 'flu', health: 'health',
};

export const docRecord = (r: TransportRequest, key: DocKey, scope: string): DocRecord | undefined =>
  (r.docs || []).find((d) => d.key === key && (d.scope === scope || d.scope.replace(/-/g, '_') === scope.replace(/-/g, '_')));

/** Giấy tờ chung của đơn: Đã loại bỏ hồ sơ dùng chung theo Flow 1 */
export function sharedDocItems(_r?: TransportRequest): DocItem[] {
  return [];
}

/** Hồ sơ của một ngựa trong đơn: trạng thái lấy từ bản ghi giấy tờ, nếu chưa có thì suy ra từ hồ sơ ngựa */
export function horseDocItems(r: TransportRequest, h: Horse): DocItem[] {
  const rec = (k: DocKey) => docRecord(r, k, h.id);
  const p = h.passport;
  const fileOf = (k: HorseDocKey) => {
    if (rec(k)?.file) return rec(k)!.file;
    if (k === 'passport') return p.scan;
    const f = HORSE_FILE_FIELD[k];
    return f ? h[f] : undefined;
  };
  const item = (key: HorseDocKey, kind: 'file' | 'info', base: DocStatus, note: string, optional = false): DocItem => ({
    key, scope: h.id, name: DOC_NAME[key], kind, optional, note,
    status: rec(key)?.status ?? base, file: kind === 'file' ? fileOf(key) : undefined, issue: rec(key)?.issue,
  });
  return [
    item('passport', 'file', fileOf('passport') && p.number ? 'SUBMITTED' : 'MISSING',
      `Số: ${p.number || '—'} • Cơ quan cấp: ${p.authority || '—'} • Hết hạn: ${fmtDate(p.expiryDate)}`),
    item('ownership', 'file', fileOf('ownership') ? 'SUBMITTED' : 'MISSING', fileOf('ownership')?.name ?? 'Chưa có bản scan'),
    item('bio', 'info', h.breed && h.sex && h.dob && h.microchip ? 'SUBMITTED' : 'NEEDS_INPUT',
      `Giống: ${h.breed || '—'} • Giới tính: ${SEX_LABEL[h.sex] ?? '—'} • Sinh: ${fmtDate(h.dob)} • Microchip: ${h.microchip || '—'}`),
    item('valueProof', 'file', fileOf('valueProof') ? 'SUBMITTED' : 'OPTIONAL',
      `Giá trị khai báo: ${h.value ? `${Number(h.value).toLocaleString('en-US')} ${h.currency}` : '—'}`, true),
    item('flu', 'file', fileOf('flu') ? 'SUBMITTED' : h.unsupportedFields?.includes('flu') ? 'NOT_REQUIRED_YET' : 'MISSING', `Tiêm cúm gần nhất: ${fmtDate(h.fluDate)}`),
    item('health', 'file', fileOf('health') ? 'SUBMITTED' : 'NOT_REQUIRED_YET',
      fileOf('health') ? `Tệp: ${fileOf('health')!.name}` : 'Specialist kiểm tra yêu cầu hiệu lực trước khởi hành.'),
    item('conditions', 'info', h.conditions ? 'SUBMITTED' : 'OPTIONAL', h.conditions || 'Không khai báo tình trạng đặc biệt.', true),
    item('vet', 'info', h.unsupportedFields?.includes('vetName') ? 'NOT_REQUIRED_YET' : h.vetName && h.vetPhone ? 'SUBMITTED' : 'NEEDS_INPUT', `Tên: ${h.vetName || '—'} • SĐT: ${h.vetPhone || '—'}`),
  ];
}

export const pickedHorses = (r: TransportRequest) => [...new Set((r.horses || []).filter(Boolean))];
export const openSupplements = (r: TransportRequest) => (r.supplements || []).filter((s) => s.status === 'OPEN');
export const rejectedDocs = (r: TransportRequest) => (r.docs || []).filter((d) => d.status === 'ACTION_REQUIRED');
export const docsNeedingAction = (r: TransportRequest) => rejectedDocs(r).length + openSupplements(r).length;

/** Mọi lỗi chặn gửi đơn, kèm bước wizard sửa được (0 = thông tin chuyến) */
export function wizardErrors(r: TransportRequest, horses: Horse[]): Array<[number, string]> {
  const e: Array<[number, string]> = [];
  if (!isSupportedRoute(r.origin, r.destination)) e.push([0, 'Tuyến này không nhận đơn mới.']);
  if (!r.date || r.date < today()) e.push([0, 'Ngày giao mong muốn phải từ hôm nay trở đi.']);
  if (!r.pickupAt || r.pickupAt < today() || r.pickupAt > r.date) e.push([0, 'Ngày lấy ngựa phải từ hôm nay và không sau ngày giao mong muốn.']);
  (['pickup', 'delivery'] as const).forEach((k) => {
    const p = r[k], label = k === 'pickup' ? 'Điểm nhận' : 'Điểm giao';
    if (!String(p?.name ?? '').trim() || !String(p?.address ?? '').trim() || !String(p?.contact ?? '').trim() || !String(p?.phone ?? '').trim()) e.push([0, `${label}: còn thiếu tên, địa chỉ, người liên hệ hoặc số điện thoại.`]);
  });
  if (r.horseCount < 1 || r.horseCount > 6 || pickedHorses(r).length !== r.horseCount) e.push([2, 'Chọn đủ số ngựa, từ 1 đến 6.']);
  r.horses.forEach((id, i) => { if (!id) e.push([2, `Chưa chọn ngựa ở vị trí ${i + 1}/${r.horses.length}.`]); });
  pickedHorses(r).forEach((id) => {
    const h = horses.find((x) => x.id === id);
    if (!h) { e.push([2, `Không tìm thấy hồ sơ ${id}.`]); return; }
    if (!String(h.microchip ?? '').trim()) e.push([2, `${h.name}: thiếu số microchip.`]);
    if (!String(h.passport?.number ?? '').trim()) e.push([2, `${h.name}: thiếu số hộ chiếu ngựa.`]);
    if (!h.photo) e.push([2, `${h.name}: thiếu ảnh nhận diện.`]);
    if (!h.passport?.scan && !docRecord(r, 'passport', id)?.file) e.push([2, `${h.name}: thiếu bản scan hộ chiếu ngựa.`]);
    if (!h.ownership && !docRecord(r, 'ownership', id)?.file) e.push([2, `${h.name}: thiếu chứng nhận sở hữu.`]);
    if (passportStatus(h) === 'EXPIRED') e.push([2, `${h.name}: hộ chiếu đã hết hạn, hãy cập nhật trước khi gửi.`]);
    else if (h.passport.expiryDate && h.passport.expiryDate <= r.date) e.push([2, `${h.name}: hộ chiếu phải còn hạn qua ngày giao mong muốn.`]);
  });
  return e;
}

// ============================================================================
// Chuyến đi
// ============================================================================
export function tripTemplate(r: TransportRequest): Pick<Trip, 'mode' | 'stops' | 'plannedDepart' | 'eta'> {
  const intl = isInternational(r.origin, r.destination);
  const depart = `${r.date} 06:00`;
  const stops: TripStop[] = intl
    ? [
      { name: r.pickup.name || r.origin, type: 'ORIGIN', plannedAt: depart },
      { name: `Sân bay ${shortCity(r.origin)}`, type: 'AIRPORT', plannedAt: addHours(depart, 4) },
      { name: `Sân bay ${shortCity(r.destination)}`, type: 'AIRPORT', plannedAt: addHours(depart, 14) },
      { name: `Trạm kiểm dịch ${shortCity(r.destination)}`, type: 'CHECKPOINT', plannedAt: addHours(depart, 18) },
      { name: r.delivery.name || r.destination, type: 'DESTINATION', plannedAt: addHours(depart, 24) },
    ]
    : [
      { name: r.pickup.name || r.origin, type: 'ORIGIN', plannedAt: depart },
      { name: 'Trạm nghỉ giữa tuyến', type: 'REST_STOP', plannedAt: addHours(depart, 6) },
      { name: r.delivery.name || r.destination, type: 'DESTINATION', plannedAt: addHours(depart, 14) },
    ];
  return { mode: intl ? 'AIR' : 'ROAD', stops, plannedDepart: depart, eta: stops[stops.length - 1].plannedAt };
}

/** Tóm tắt tiến độ theo mốc tổ xe xác nhận */
export function tripSummary(t: Trip) {
  const milestones = t.milestones || [];
  const stops = t.stops || [];
  const m = milestones.length > 0 ? milestones[milestones.length - 1] : undefined;
  const at = m ? m.stopIndex : -1;
  // số điểm dừng đã có mốc xác nhận (điểm của mốc gần nhất và mọi điểm trước nó)
  const done = t.status === 'COMPLETED' ? stops.length : at + 1;
  const pct = stops.length ? Math.round((Math.min(done, stops.length) / stops.length) * 100) : 0;
  const lastLabel = m ? `${MILESTONE_LABEL[m.type]} – ${stops[m.stopIndex]?.name ?? ''}` : '';
  return {
    m, at, done: Math.min(done, stops.length), pct, lastLabel,
    dep: milestones.find((x) => x.type === 'DEPARTED'),
    arr: milestones.find((x) => x.type === 'ARRIVED_DESTINATION'),
    adjusted: !!t.etaOriginal && t.etaOriginal !== t.eta,
  };
}
export const handoverState = (t?: Trip): 'PENDING' | 'COMPLETED' | null =>
  !t ? null : t.handover ? 'COMPLETED' : (t.milestones || []).some((m) => m.type === 'ARRIVED_DESTINATION') ? 'PENDING' : null;

// ============================================================================
// Bàn giao, nghiệm thu, số dư, đóng yêu cầu
// ============================================================================
export const balanceDue = (r: TransportRequest) =>
  Math.max(0, contractTotal(r) - depositPaidAmount(r) - balancePayments(r).filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0));
export function balanceState(r: TransportRequest): 'NONE' | 'PROCESSING' | 'VERIFIED' | 'FAILED' {
  if (r.acceptance && balanceDue(r) === 0) return 'VERIFIED';
  const p = last(balancePayments(r));
  if (!p) return 'NONE';
  return p.status === 'SUCCESS' ? 'VERIFIED' : p.status === 'PROCESSING' ? 'PROCESSING' : 'FAILED';
}
export const openComplaints = (r: TransportRequest) => (r.complaints || []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status));
export const canComplain = (r: TransportRequest) => !!r.trip?.handover && ['DELIVERED'].includes(r.status);

export function closureChecks(r: TransportRequest): Array<[string, boolean]> {
  return [
    ['Chuyến đi hoàn tất, bàn giao có xác minh người nhận, ảnh và chữ ký', !!r.trip?.handover],
    ['Khách hàng đã xác nhận nghiệm thu', r.acceptance?.status === 'ACCEPTED'],
    ['Số dư đã được thanh toán và xác minh', !!r.acceptance && balanceState(r) === 'VERIFIED'],
    ['Đã hết hạn chung 24 giờ nghiệm thu / thanh toán', !!r.acceptance && isPast(r.acceptance.dueAt)],
    ['Không còn khiếu nại chưa giải quyết', openComplaints(r).length === 0],
  ];
}

// ============================================================================
// Vòng đời (10 giai đoạn) & tab chi tiết
// ============================================================================
export const STAGES: Array<[string, RequestDetailTab]> = [
  ['Gửi yêu cầu', 'overview'], ['Manager xét duyệt', 'overview'], ['Soạn hợp đồng', 'contract'], ['Xem & đồng ý hợp đồng', 'contract'],
  ['Ký OTP & đặt cọc', 'payment'], ['Lập kế hoạch & chuẩn bị', 'documents'], ['Đang vận chuyển', 'tracking'], ['Bàn giao', 'handover'],
  ['Nghiệm thu & thanh toán', 'handover'], ['Đóng yêu cầu', 'history'],
];

export function lifecycle(r: TransportRequest): Lifecycle {
  const v = curVersion(r), ds = depositState(r);
  switch (r.status) {
    case 'DRAFT': return { at: 0, note: 'Chưa gửi' };
    case 'PENDING_REVIEW': return { at: 1, note: 'Đang chờ xét duyệt' };
    case 'CHANGES_REQUESTED': return { at: 1, exc: 'warn', note: 'Cần bạn cập nhật' };
    case 'REJECTED': return { at: 1, exc: 'fail', note: 'Bị từ chối' };
    case 'CONTRACT_PREPARATION': return { at: 2, note: 'Đang soạn' };
    case 'CONTRACT_CHANGES_REQUESTED': return { at: 3, note: 'Manager đang xem yêu cầu sửa' };
    case 'CONTRACT_READY':
      if (v && versionState(v) === 'EXPIRED') return { at: 3, exc: 'warn', note: 'Phiên bản đã hết hạn' };
      if (v?.termsAcceptedAt) return { at: 4, note: 'Thanh toán và xác minh tiền cọc' };
      return { at: 3, note: 'Xem & đồng ý điều khoản' };
    case 'AWAITING_DEPOSIT': return { at: 4, note: ds === 'PENDING' ? 'Đang xác minh cọc' : 'Đã ký – cần đặt cọc' };
    case 'DEPOSIT_VERIFIED': return v && versionState(v) === 'EXPIRED' ? { at: 4, exc: 'warn', note: 'Quá hạn ký' } : { at: 4, note: 'Đã xác minh cọc – ký OTP' };
    case 'CANCELLATION_REQUESTED': return { at: 4, exc: 'warn', note: 'Đang xét duyệt hủy' };
    case 'ACTIVATED':
    case 'SCHEDULED':
      return docsNeedingAction(r) ? { at: 5, exc: 'warn', note: `${docsNeedingAction(r)} giấy tờ cần bổ sung` } : { at: 5, note: r.status === 'SCHEDULED' ? 'Đã lên lịch' : 'Đang chuẩn bị' };
    case 'IN_TRANSIT': return handoverState(r.trip) === 'PENDING' ? { at: 7, note: 'Đang bàn giao' } : { at: 6, note: 'Đang trên đường' };
    case 'DELIVERED':
      if (!r.acceptance || r.acceptance.status === 'PENDING') return { at: 8, note: 'Chờ xác nhận nghiệm thu' };
      if (balanceState(r) !== 'VERIFIED') return { at: 8, note: balanceState(r) === 'PROCESSING' ? 'Đang xác minh thanh toán' : 'Cần thanh toán số dư' };
      return { at: 9, note: openComplaints(r).length ? 'Có khiếu nại đang mở' : 'Chờ đủ điều kiện đóng' };
    case 'CLOSED': return { at: 10, note: '' };
    case 'CANCELLED': return { at: isSigned(r) ? 4 : v ? 3 : 1, exc: 'fail', note: 'Đã hủy' };
  }
  return { at: 0, note: '' };
}

export const DETAIL_TABS: Array<[RequestDetailTab, string]> = [
  ['overview', 'Tổng quan'], ['documents', 'Giấy tờ'], ['contract', 'Hợp đồng & chi phí'], ['payment', 'Thanh toán'],
  ['tracking', 'Theo dõi'], ['handover', 'Bàn giao & nghiệm thu'], ['complaints', 'Khiếu nại'], ['history', 'Lịch sử'],
];
export function tabVisible(r: TransportRequest, tab: RequestDetailTab) {
  if (tab === 'tracking') return !!r.trip;
  if (tab === 'handover') return !!handoverState(r.trip) || !!r.acceptance;
  if (tab === 'complaints') return r.complaints.length > 0 || !!r.trip?.handover;
  return true;
}

/** Danh sách tình huống mẫu để thử nhanh (hiển thị ở trang Yêu cầu và Lịch sử) */
export const DEMO_GUIDE: Record<'active' | 'history', Array<[string, string, string]>> = {
  active: [
    ['TRN-8931', 'Bản nháp – đang khai báo', 'Tiếp tục wizard: điểm nhận/giao, chọn ngựa & hồ sơ rồi gửi Manager xét duyệt.'],
    ['TRN-8930', 'Chờ Manager xét duyệt', 'Dùng nút demo để Manager chấp nhận, yêu cầu sửa hoặc từ chối (kèm lý do).'],
    ['TRN-8926', 'Manager yêu cầu sửa', 'Sửa thông tin chuyến theo góp ý rồi gửi lại để xét duyệt.'],
    ['TRN-8929', 'Đang soạn hợp đồng', 'Dùng nút demo để Manager phát hành hợp đồng v1.'],
    ['TRN-8928', 'Hợp đồng sẵn sàng – còn hạn 24 giờ', 'Đọc hợp đồng, yêu cầu thay đổi hoặc đồng ý điều khoản rồi thanh toán cọc bằng QR Sandbox.'],
    ['TRN-8925', 'Đã gửi yêu cầu sửa hợp đồng', 'Manager phát hành phiên bản mới hoặc trả lời và giữ phiên bản; cả hai đều cấp lại 24 giờ.'],
    ['TRN-8927', 'Hợp đồng quá hạn', 'Không ký được nữa; yêu cầu phiên bản cập nhật hoặc để Manager gia hạn. Quá hạn không tự hủy yêu cầu.'],
    ['TRN-8941', 'Đã thanh toán cọc – chờ Sandbox xác minh', 'Trong tab Thanh toán bấm kết quả Sandbox thành công hoặc thất bại.'],
    ['TRN-8942', 'Đã xác minh cọc – chờ ký OTP', 'Ký hợp đồng bằng OTP (mã demo 123456): hợp đồng có hiệu lực và tạo đúng một chuyến.'],
    ['TRN-8924', 'Đang chuẩn bị – có giấy tờ bị từ chối', 'Xem lý do từ chối / yêu cầu bổ sung và tải lại giấy tờ.'],
    ['TRN-8945', 'Đã lên lịch', 'Dùng nút demo tổ xe xuất phát để bắt đầu hành trình.'],
    ['TRN-8923', 'Đang vận chuyển', 'Theo dõi các mốc hành trình đã được xác nhận; nút demo chạy tiếp tới bàn giao.'],
    ['TRN-8810', 'Đã giao – chưa đóng', 'Nghiệm thu, thanh toán số dư bằng VNPay hoặc gửi khiếu nại.'],
  ],
  history: [
    ['TRN-8750', 'Đã đóng – hợp đồng đã hoàn thành', 'Đã giao, thanh toán đủ, hết 24 giờ phản hồi; hợp đồng hết hiệu lực, chỉ xem.'],
    ['TRN-8943', 'Đã hủy trước khi ký – hoàn cọc', 'Tiền cọc đã xác minh được hoàn lại; xem trạng thái hoàn tiền ở tab Thanh toán.'],
    ['TRN-8602', 'Đã hủy', 'Yêu cầu bị hủy, chưa có hợp đồng.'],
    ['TRN-8511', 'Bị từ chối', 'Manager từ chối kèm lý do.'],
  ],
};
