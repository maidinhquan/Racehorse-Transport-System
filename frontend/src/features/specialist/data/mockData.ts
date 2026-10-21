import type {
  AuditEntry,
  CustomerDoc,
  CustomerDocKey,
  CustomerDocStatus,
  DocRequest,
  DocType,
  QuarantineBooking,
  RegPackage,
  Regulation,
  ReqSetSnapshot,
  RequirementLine,
  SpecHorse,
  SpecTrip,
  TripDocument,
} from '../types';

// ============================================================================
// Dữ liệu mẫu cho trang Transport Specialist (dùng khi Backend chưa chạy)
// Cùng các chuyến / yêu cầu / ngựa với trang Khách hàng và Điều phối.
// ============================================================================
export const SPECIALIST_NAME = 'Hoang Thu Ha';
export const SPECIALIST_INITIALS = 'HH';

// ---------------------------------------------------------------------------
// Danh mục giấy tờ
// ---------------------------------------------------------------------------
export const mockDocTypes: DocType[] = [
  { id: 'DT-1', name: 'Hộ chiếu ngựa', group: 'IDENTITY', scope: 'PER_HORSE', provider: 'CUSTOMER', validityDays: null, status: 'ACTIVE' },
  { id: 'DT-2', name: 'Giấy chứng nhận sức khỏe', group: 'MEDICAL', scope: 'PER_HORSE', provider: 'CUSTOMER', validityDays: 10, status: 'ACTIVE' },
  { id: 'DT-3', name: 'Sổ tiêm phòng cúm ngựa', group: 'MEDICAL', scope: 'PER_HORSE', provider: 'CUSTOMER', validityDays: 365, status: 'ACTIVE' },
  { id: 'DT-4', name: 'Giấy phép xuất khẩu', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE' },
  { id: 'DT-5', name: 'Giấy phép nhập khẩu', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE' },
  { id: 'DT-6', name: 'Giấy chứng nhận kiểm dịch', group: 'QUARANTINE', scope: 'PER_HORSE', provider: 'CBN', validityDays: 14, status: 'ACTIVE' },
  { id: 'DT-7', name: 'Tờ khai hải quan', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE' },
  { id: 'DT-8', name: 'Giấy phép vận chuyển nội địa', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE' },
];

const line = (typeId: string, provider: RequirementLine['provider'], scope: RequirementLine['scope'], stage: RequirementLine['stage'] = 'BEFORE_DEPART',
  condition = '', level: RequirementLine['level'] = 'REQUIRED'): RequirementLine => ({ typeId, provider, scope, level, stage, condition });

// ---------------------------------------------------------------------------
// Yêu cầu theo quốc gia / hướng
// ---------------------------------------------------------------------------
export const mockRegulations: Regulation[] = [
  {
    id: 'REG-1', country: 'VN', direction: 'EXPORT', v: 1, effectiveFrom: '2026-08-12', status: 'ACTIVE',
    note: 'Giấy chứng nhận sức khỏe do Cục Thú y cấp trong vòng 10 ngày trước khởi hành.',
    lines: [
      line('DT-1', 'CUSTOMER', 'PER_HORSE', 'BEFORE_SUBMIT'),
      line('DT-2', 'CUSTOMER', 'PER_HORSE', 'BEFORE_DEPART', 'Cấp trong vòng 10 ngày trước khởi hành'),
      line('DT-3', 'CUSTOMER', 'PER_HORSE'),
      line('DT-4', 'CBN', 'PER_TRIP'),
      line('DT-7', 'CBN', 'PER_TRIP'),
    ],
  },
  {
    id: 'REG-5', country: 'VN', direction: 'DOMESTIC', v: 1, effectiveFrom: '2026-05-10', status: 'ACTIVE',
    note: 'Giấy phép vận chuyển thú y cấp tỉnh.',
    lines: [line('DT-1', 'CUSTOMER', 'PER_HORSE', 'BEFORE_SUBMIT'), line('DT-3', 'CUSTOMER', 'PER_HORSE'), line('DT-8', 'CBN', 'PER_TRIP')],
  },
  {
    id: 'REG-10', country: 'JP', direction: 'IMPORT', v: 1, effectiveFrom: '2026-10-01', status: 'ACTIVE',
    note: 'Giấy phép nhập khẩu và kiểm dịch nhập cảnh tại Cơ quan Kiểm dịch Động vật (AQS) – cách ly tại sân bay đến.',
    lines: [
      line('DT-1', 'CUSTOMER', 'PER_HORSE', 'BEFORE_SUBMIT'),
      line('DT-2', 'CUSTOMER', 'PER_HORSE'),
      line('DT-3', 'CUSTOMER', 'PER_HORSE'),
      line('DT-5', 'CBN', 'PER_TRIP'),
      line('DT-6', 'CBN', 'PER_HORSE', 'AT_CHECKPOINT', 'Kiểm dịch nhập cảnh do AQS thực hiện khi ngựa đến sân bay'),
    ],
  },
  {
    id: 'REG-2', country: 'TH', direction: 'IMPORT', v: 1, effectiveFrom: '2026-07-30', status: 'ACTIVE',
    note: 'Giấy phép nhập khẩu DLD trước khi tới cửa khẩu; kiểm dịch tại biên giới.',
    lines: [
      line('DT-1', 'CUSTOMER', 'PER_HORSE', 'BEFORE_SUBMIT'),
      line('DT-2', 'CUSTOMER', 'PER_HORSE'),
      line('DT-5', 'CBN', 'PER_TRIP'),
      line('DT-6', 'CBN', 'PER_HORSE', 'AT_CHECKPOINT', 'Kiểm dịch tại cửa khẩu Poipet'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Bộ yêu cầu hồ sơ
// ---------------------------------------------------------------------------
export const mockPackages: RegPackage[] = [
  { id: 'RP-1', name: 'Nội địa Việt Nam', items: [['VN', 'DOMESTIC']], origin: 'VN', dest: 'VN', modes: ['ROAD'], note: 'Giấy phép vận chuyển thú y cấp tỉnh cho tuyến trong nước.', v: 1, effectiveFrom: '2026-09-15', status: 'ACTIVE' },
  { id: 'RP-2', name: 'Việt Nam → Nhật Bản (hàng không)', items: [['VN', 'EXPORT'], ['JP', 'IMPORT']], origin: 'VN', dest: 'JP', modes: ['AIR'], note: 'Xuất khẩu từ Việt Nam (Cục Thú y) và nhập khẩu Nhật Bản (AQS).', v: 1, effectiveFrom: '2026-09-15', status: 'ACTIVE' },
  { id: 'RP-3', name: 'Việt Nam → Thái Lan', items: [['VN', 'EXPORT'], ['TH', 'IMPORT']], origin: 'VN', dest: 'TH', modes: ['ROAD'], note: 'Tuyến lịch sử qua Campuchia – không nhận đơn mới.', v: 1, effectiveFrom: '2026-09-15', status: 'ACTIVE' },
];

const snap = (pkgId: string, at: string): ReqSetSnapshot => {
  const p = mockPackages.find((x) => x.id === pkgId)!;
  return {
    pkgId, pkgV: p.v, name: p.name, at, by: SPECIALIST_NAME,
    rules: p.items.map(([c, d]) => {
      const g = mockRegulations.find((x) => x.country === c && x.direction === d);
      return g ? { country: c, direction: d, regId: g.id, regV: g.v, lines: JSON.parse(JSON.stringify(g.lines)) } : { country: c, direction: d, regId: null, lines: [] };
    }),
  };
};

// ---------------------------------------------------------------------------
// Chuyến được giao
// ---------------------------------------------------------------------------
const H = {
  thunderbolt: { id: 'HOR-1029', name: 'Thunderbolt', microchip: '985112004571029', passportNo: 'VN-EQ-2020-1029' },
  shadowfax: { id: 'HOR-1035', name: 'Shadowfax', microchip: '985112004571035', passportNo: 'VN-EQ-2016-1035' },
  apollo: { id: 'HOR-1092', name: 'Apollo', microchip: '985112004571092', passportNo: 'VN-EQ-2021-1092' },
  starboy: { id: 'HOR-1101', name: 'Starboy', microchip: '985112004571101', passportNo: 'AU-EQ-2018-1101' },
  bella: { id: 'HOR-1108', name: 'Bella', microchip: '', passportNo: 'UK-EQ-2019-1108' },
} satisfies Record<string, SpecHorse>;

export const mockTrips: SpecTrip[] = [
  {
    id: 'TRP-902', requestId: 'TRN-8924', customerName: 'Alex Equine', origin: 'Hanoi', destination: 'Tokyo', originCountry: 'VN', destCountry: 'JP',
    mode: 'AIR', status: 'PLANNING', deployment: 'CONFIRMED', plannedDepart: '2026-10-18 06:00', eta: '2026-10-19 06:00', horses: [H.shadowfax], checkpoints: [
      { name: 'Sân bay Nội Bài', type: 'AIRPORT', country: 'VN', plannedAt: '2026-10-18 10:00' },
      { name: 'Trạm kiểm dịch sân bay Narita (AQS)', type: 'QUARANTINE_STATION', country: 'JP', plannedAt: '2026-10-18 20:00' },
    ],
  },
  {
    id: 'TRP-904', requestId: 'TRN-8944', customerName: 'Alex Equine', origin: 'Ho Chi Minh City', destination: 'Da Nang', originCountry: 'VN', destCountry: 'VN',
    mode: 'ROAD', status: 'PLANNING', deployment: 'CONFIRMED', plannedDepart: '2026-10-12 06:00', eta: '2026-10-12 20:00', horses: [H.apollo],
    reqSet: snap('RP-1', '2026-10-03 15:00'), checkpoints: [],
    insurance: { insurer: 'Bảo hiểm Bảo Việt', policy: 'BV-HX-2026-0441', validFrom: '2026-10-12', validTo: '2026-10-13', coverage: 150000, status: 'PENDING' },
  },
  {
    id: 'TRP-906', requestId: 'TRN-8947', customerName: 'Alex Equine', origin: 'Da Nang', destination: 'Osaka', originCountry: 'VN', destCountry: 'JP',
    mode: 'AIR', status: 'PLANNING', deployment: 'CONFIRMED', plannedDepart: '2026-10-26 08:00', eta: '2026-10-27 06:00', horses: [H.starboy],
    reqSet: snap('RP-2', '2026-10-02 10:00'), checkpoints: [
      { name: 'Sân bay Đà Nẵng', type: 'AIRPORT', country: 'VN', plannedAt: '2026-10-26 11:00' },
      { name: 'Trạm kiểm dịch sân bay Kansai (AQS)', type: 'QUARANTINE_STATION', country: 'JP', plannedAt: '2026-10-26 22:00' },
    ],
  },
  {
    id: 'TRP-907', requestId: 'TRN-8948', customerName: 'Alex Equine', origin: 'Ho Chi Minh City', destination: 'Tokyo', originCountry: 'VN', destCountry: 'JP',
    mode: 'AIR', status: 'PLANNING', deployment: 'NOT_CONFIRMED', plannedDepart: '2026-11-05 07:00', eta: '2026-11-06 05:00', horses: [H.bella], checkpoints: [],
  },
  {
    id: 'TRP-903', requestId: 'TRN-8945', customerName: 'Alex Equine', origin: 'Ho Chi Minh City', destination: 'Da Nang', originCountry: 'VN', destCountry: 'VN',
    mode: 'ROAD', status: 'READY_TO_DEPART', deployment: 'CONFIRMED', plannedDepart: '2026-10-07 06:00', eta: '2026-10-07 22:00', horses: [H.thunderbolt],
    reqSet: snap('RP-1', '2026-09-30 10:00'), docsReady: { at: '2026-10-03 14:00', by: SPECIALIST_NAME }, checkpoints: [],
    insurance: { insurer: 'Bảo hiểm PVI', policy: 'PVI-VC-2026-1180', validFrom: '2026-10-07', validTo: '2026-10-08', coverage: 120000, status: 'VERIFIED', checkedBy: SPECIALIST_NAME, checkedAt: '2026-10-03 11:00' },
  },
  {
    id: 'TRP-901', requestId: 'TRN-8923', customerName: 'Alex Equine', origin: 'Ho Chi Minh City', destination: 'Bangkok', originCountry: 'VN', destCountry: 'TH',
    mode: 'ROAD', status: 'IN_TRANSIT', deployment: 'CONFIRMED', plannedDepart: '2026-10-04 06:30', eta: '2026-10-05 18:00', horses: [H.thunderbolt],
    reqSet: snap('RP-3', '2026-09-30 09:00'), docsReady: { at: '2026-10-02 16:00', by: SPECIALIST_NAME },
    insurance: { insurer: 'Bảo hiểm Bảo Việt', policy: 'BV-QT-2026-0390', validFrom: '2026-10-04', validTo: '2026-10-06', coverage: 120000, status: 'VERIFIED', checkedBy: SPECIALIST_NAME, checkedAt: '2026-10-02 10:00' },
    checkpoints: [
      { name: 'Cửa khẩu Mộc Bài', type: 'LAND_BORDER', country: 'VN', plannedAt: '2026-10-04 09:30', arrivedAt: '2026-10-04 10:00', clearance: { result: 'PASSED', at: '2026-10-04 11:00', ref: 'MB-2026-10-0412', by: SPECIALIST_NAME } },
      { name: 'Cửa khẩu Poipet', type: 'LAND_BORDER', country: 'TH', plannedAt: '2026-10-05 08:00' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Giấy tờ khách hàng (cùng bộ hồ sơ với cổng Khách hàng)
// ---------------------------------------------------------------------------
const NOTE: Partial<Record<CustomerDocKey, string>> = {
  invite: 'Có điều kiện: chỉ cần khi chuyến phục vụ thi đấu / sự kiện.',
  raceReg: 'Có điều kiện: chỉ cần khi chuyến phục vụ thi đấu / sự kiện.',
  ataCarnet: 'Tùy yêu cầu tạm quản, không mặc định bắt buộc.',
  bio: 'Giống, giới tính, ngày sinh, microchip',
  valueProof: 'Không bắt buộc',
  conditions: 'Không bắt buộc',
  vet: 'Tên & số điện thoại bác sĩ thú y riêng',
};
const SHARED: CustomerDocKey[] = ['invite', 'raceReg'];
const PER_HORSE: CustomerDocKey[] = ['passport', 'ownership', 'bio', 'valueProof', 'flu', 'health', 'conditions', 'vet'];
const OPTIONAL_KEYS: CustomerDocKey[] = ['invite', 'raceReg', 'ataCarnet', 'valueProof', 'conditions'];

function dossier(t: SpecTrip, base: CustomerDocStatus, over: Partial<Record<string, Partial<CustomerDoc>>> = {}): CustomerDoc[] {
  const shared = t.destCountry === 'JP' ? [...SHARED, 'ataCarnet' as const] : SHARED;
  const make = (key: CustomerDocKey, scope: string): CustomerDoc => {
    const optional = OPTIONAL_KEYS.includes(key);
    const o = over[`${key}:${scope}`] ?? over[key] ?? {};
    const hasFile = ['passport', 'ownership', 'flu', 'health'].includes(key);
    return {
      tripId: t.id, key, scope, optional, status: optional ? 'OPTIONAL' : base, note: NOTE[key] ?? '',
      file: hasFile && base !== 'MISSING' ? `${scope.toLowerCase()}-${key}.pdf` : undefined, ...o,
    };
  };
  return [...shared.map((k) => make(k, 'request')), ...t.horses.flatMap((h) => PER_HORSE.map((k) => make(k, h.id)))];
}
const trip = (id: string) => mockTrips.find((t) => t.id === id)!;

export const mockCustomerDocs: CustomerDoc[] = [
  ...dossier(trip('TRP-902'), 'APPROVED', {
    raceReg: { optional: false, status: 'ACTION_REQUIRED', issue: 'Chuyến phục vụ giải Tokyo Autumn Cup – cần giấy đăng ký giải để làm thủ tục tạm nhập.' },
    flu: { status: 'ACTION_REQUIRED', file: 'shadowfax-vaccination.pdf', issue: 'Lần tiêm cúm gần nhất đã quá 12 tháng. Vui lòng tiêm nhắc lại và tải sổ tiêm mới.' },
    health: { status: 'SUBMITTED', file: 'shadowfax-health-cert.pdf', expiry: '2026-10-25' },
  }),
  ...dossier(trip('TRP-904'), 'APPROVED', { health: { status: 'SUBMITTED', file: 'apollo-health-cert.pdf', expiry: '2026-10-20' } }),
  ...dossier(trip('TRP-906'), 'APPROVED', { health: { status: 'APPROVED', file: 'starboy-health-cert.pdf', expiry: '2026-10-20' } }),
  ...dossier(trip('TRP-907'), 'SUBMITTED', { bio: { status: 'MISSING', note: 'Thiếu microchip' }, ownership: { status: 'MISSING', file: undefined } }),
  ...dossier(trip('TRP-903'), 'APPROVED'),
  ...dossier(trip('TRP-901'), 'APPROVED'),
];

// ---------------------------------------------------------------------------
// Chứng từ CBN Transport ghi nhận
// ---------------------------------------------------------------------------
const doc = (id: string, tripId: string, typeId: string, horseId: string | null, status: TripDocument['status'], o: Partial<TripDocument> = {}): TripDocument => ({
  id, tripId, typeId, horseId, status, number: `${typeId}-${tripId.slice(4)}`, issuer: 'Cục Thú y – Chi cục Kiểm dịch vùng', issuedAt: '2026-10-01', expiry: '2026-11-15',
  versions: [{ v: 1, file: `${tripId.toLowerCase()}-${typeId.toLowerCase()}.pdf`, at: '2026-10-01 10:00', by: SPECIALIST_NAME }],
  reviews: status === 'SUBMITTED' ? [] : [{ v: 1, decision: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', at: '2026-10-02 09:00', by: SPECIALIST_NAME, remark: o.rejectReason ?? 'Đúng thông tin chuyến.' }],
  physicalCopy: status === 'APPROVED', ...o,
});

export const mockDocuments: TripDocument[] = [
  doc('DOC-501', 'TRP-904', 'DT-8', null, 'SUBMITTED', { issuer: 'Chi cục Thú y TP.HCM', versions: [{ v: 1, file: 'trp-904-giay-phep-noi-dia.pdf', at: '2026-10-04 09:20', by: SPECIALIST_NAME }] }),
  doc('DOC-480', 'TRP-903', 'DT-8', null, 'APPROVED', { issuer: 'Chi cục Thú y TP.HCM' }),
  doc('DOC-460', 'TRP-901', 'DT-4', null, 'APPROVED'),
  doc('DOC-461', 'TRP-901', 'DT-7', null, 'APPROVED', { issuer: 'Chi cục Hải quan cửa khẩu Mộc Bài' }),
  doc('DOC-462', 'TRP-901', 'DT-5', null, 'APPROVED', { issuer: 'Department of Livestock Development (DLD)' }),
  doc('DOC-463', 'TRP-901', 'DT-6', 'HOR-1029', 'APPROVED', { issuer: 'DLD – Trạm kiểm dịch Poipet' }),
  doc('DOC-510', 'TRP-906', 'DT-4', null, 'APPROVED', { issuedAt: '2026-10-03', expiry: '2026-11-10' }),
  doc('DOC-511', 'TRP-906', 'DT-5', null, 'REJECTED', {
    issuer: 'MAFF Animal Quarantine Service', rejectReason: 'Tên ngựa trên giấy phép không khớp hộ chiếu (Star Boy ≠ Starboy). Cần xin cấp lại.',
  }),
];

// ---------------------------------------------------------------------------
// Yêu cầu bổ sung, lịch kiểm dịch, nhật ký
// ---------------------------------------------------------------------------
export const mockRequests: DocRequest[] = [
  { id: 'DR-301', tripId: 'TRP-902', key: 'raceReg', scope: 'request', reason: 'Chuyến phục vụ giải Tokyo Autumn Cup – cần giấy đăng ký giải để làm thủ tục tạm nhập.', dueAt: '2026-10-10', status: 'OPEN', createdAt: '2026-10-03 14:20', history: [['2026-10-03 14:20', 'Gửi yêu cầu cho khách hàng']] },
  { id: 'DR-302', tripId: 'TRP-902', key: 'flu', scope: 'HOR-1035', reason: 'Lần tiêm cúm gần nhất đã quá 12 tháng. Vui lòng tiêm nhắc lại và tải sổ tiêm mới.', dueAt: '2026-10-12', status: 'OPEN', createdAt: '2026-10-03 14:10', history: [['2026-10-03 14:10', 'Từ chối sổ tiêm và yêu cầu nộp lại']] },
  { id: 'DR-280', tripId: 'TRP-903', key: 'health', scope: 'HOR-1029', reason: 'Giấy chứng nhận sức khỏe phải cấp trong vòng 10 ngày trước khởi hành.', status: 'FULFILLED', createdAt: '2026-09-29 10:00', history: [['2026-09-29 10:00', 'Gửi yêu cầu'], ['2026-10-01 09:00', 'Đã duyệt bản mới']] },
];

export const mockBookings: QuarantineBooking[] = [
  { id: 'QB-21', tripId: 'TRP-906', station: 'Trạm kiểm dịch sân bay Kansai (AQS)', slot: '2026-10-26', ref: '', status: 'REQUESTED', notes: 'Đặt lịch cách ly 3 ngày khi đến.' },
  { id: 'QB-18', tripId: 'TRP-901', station: 'Trạm kiểm dịch Poipet (DLD)', slot: '2026-10-05', ref: 'DLD-PP-5512', status: 'BOOKED', notes: '', confirmedAt: '2026-10-02 15:00' },
];

export const mockAudit: AuditEntry[] = [
  { at: '2026-10-04 09:20', actor: SPECIALIST_NAME, role: 'TRANSPORT_SPECIALIST', action: 'Ghi nhận chứng từ CBN', entity: 'TRP-904', detail: 'Giấy phép vận chuyển nội địa v1' },
  { at: '2026-10-04 11:00', actor: SPECIALIST_NAME, role: 'TRANSPORT_SPECIALIST', action: 'Ghi nhận kết quả thông quan', entity: 'TRP-901', detail: 'Cửa khẩu Mộc Bài: Đạt' },
  { at: '2026-10-03 16:00', actor: 'Alex Equine', role: 'CUSTOMER', action: 'Nộp giấy chứng nhận sức khỏe', entity: 'TRP-902', detail: 'shadowfax-health-cert.pdf' },
  { at: '2026-10-03 14:20', actor: SPECIALIST_NAME, role: 'TRANSPORT_SPECIALIST', action: 'Yêu cầu khách bổ sung', entity: 'TRP-902', detail: 'Giấy đăng ký giải đua' },
  { at: '2026-10-03 14:10', actor: SPECIALIST_NAME, role: 'TRANSPORT_SPECIALIST', action: 'Từ chối giấy tờ khách hàng', entity: 'TRP-902', detail: 'Sổ tiêm ngừa – Shadowfax' },
  { at: '2026-10-03 14:00', actor: SPECIALIST_NAME, role: 'TRANSPORT_SPECIALIST', action: 'Xác nhận hồ sơ sẵn sàng (Docs READY)', entity: 'TRP-903' },
  { at: '2026-10-02 10:00', actor: 'Linh Pham', role: 'LOGISTICS_MANAGER', action: 'Giao chuyến cho Specialist', entity: 'TRP-902' },
];
