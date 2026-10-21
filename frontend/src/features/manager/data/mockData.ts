import type {
  ActorRole,
  ActualCost,
  Complaint,
  ContractVersion,
  CustomerInfo,
  DossierItem,
  HistoryEntry,
  HorseRef,
  Incident,
  ManagerNotification,
  Place,
  RouteStop,
  Staff,
  Transaction,
  TransportRequest,
  Trip,
} from '../types';
import { DEFAULT_TERMS, addHours, defaultBudget, defaultItems, defaultMode, sumItems } from '../hooks/managerRules';

// ============================================================================
// Dữ liệu mẫu cho trang Logistics Manager (dùng khi Backend chưa chạy)
// Viết cho ngày demo 04/10/2026; đồng hồ demo bắt đầu lúc 11:30 hôm đó.
// Mã yêu cầu / chuyến / ngựa trùng với trang Khách hàng, Specialist và Coordinator.
// ============================================================================
export const MANAGER_NAME = 'Linh Pham';
export const MANAGER_INITIALS = 'LP';

export const mockCustomers: CustomerInfo[] = [
  { id: 'CUS-001', name: 'Alex Equine', company: 'Equine Racing Stable Co.', email: 'alex.equine@example.com', phone: '+84 90 5550 0110' },
  { id: 'CUS-002', name: 'Nguyen Hoai Nam', company: 'Saigon Thoroughbred JSC', email: 'nam.nguyen@saigontb.example', phone: '+84 91 5550 0222' },
];

export const mockHorses: HorseRef[] = [
  { id: 'HOR-1029', name: 'Thunderbolt', breed: 'Thoroughbred', microchip: '985112004571029', passportNo: 'VN-EQ-2020-1029' },
  { id: 'HOR-1035', name: 'Shadowfax', breed: 'Andalusian', microchip: '985112004571035', passportNo: 'VN-EQ-2016-1035' },
  { id: 'HOR-1092', name: 'Apollo', breed: 'Thoroughbred', microchip: '985112004571092', passportNo: 'VN-EQ-2021-1092' },
  { id: 'HOR-1101', name: 'Starboy', breed: 'Warmblood', microchip: '985112004571101', passportNo: 'AU-EQ-2018-1101' },
  { id: 'HOR-1108', name: 'Bella', breed: 'Arabian', microchip: '', passportNo: 'UK-EQ-2019-1108' },
  { id: 'HOR-2001', name: 'Lightning Spirit', breed: 'Thoroughbred', microchip: '985112004572001', passportNo: 'VN-EQ-2019-2001' },
  { id: 'HOR-2002', name: 'Golden Arrow', breed: 'Arabian', microchip: '985112004572002', passportNo: 'VN-EQ-2020-2002' },
  { id: 'HOR-2003', name: 'Silver Moon', breed: 'Warmblood', microchip: '985112004572003', passportNo: 'VN-EQ-2018-2003' },
];

export const mockStaff: Staff[] = [
  { id: 'EMP-11', name: 'Hoang Thu Ha', role: 'TRANSPORT_SPECIALIST', load: 5 },
  { id: 'EMP-12', name: 'Vu Minh Chau', role: 'TRANSPORT_SPECIALIST', load: 1 },
  { id: 'EMP-15', name: 'Dang Minh Quan', role: 'FLEET_COORDINATOR', load: 5 },
  { id: 'EMP-16', name: 'Tran Bao Ngoc', role: 'FLEET_COORDINATOR', load: 2 },
];

// ---------------------------------------------------------------------------
// Hàm dựng dữ liệu
// ---------------------------------------------------------------------------
const place = (name: string, address: string, contact: string, phone: string): Place => ({ name, address, contact, phone });
const PLACES = {
  saigon: place('Saigon Riding Club', '12 Nguyễn Văn Hưởng, Thảo Điền, Thủ Đức', 'Alex Equine', '+84 90 5550 0110'),
  hanoi: place('Hanoi Equestrian Club', '5 Đặng Thai Mai, Tây Hồ', 'Alex Equine', '+84 90 5550 0110'),
  danang: place('Da Nang Riding Center', '88 Võ Nguyên Giáp, Sơn Trà', 'Lê Thu Hà', '+84 93 5550 0121'),
  tokyo: place('Tokyo Racecourse Stables', '1-1 Hiyoshicho, Fuchu, Tokyo', 'Kenji Watanabe', '+81 42 5550 0188'),
  osaka: place('Hanshin Training Stables', '1-1 Komano-cho, Takarazuka', 'Yuki Sato', '+81 798 555 0102'),
  bangkok: place('Bangkok Polo Club', '88 Sukhumvit Soi 71, Watthana', 'Somchai P.', '+66 2 5550 0193'),
  phuTho: place('Phu Tho Racecourse Stables', '2 Lê Đại Hành, Quận 11', 'Nguyen Hoai Nam', '+84 91 5550 0222'),
  hanoiNam: place('Soc Son Stud Farm', 'Xã Minh Phú, Sóc Sơn', 'Tran Van Phuc', '+84 98 5550 0333'),
};

const NAMES: Record<ActorRole, string> = {
  CUSTOMER: '', LOGISTICS_MANAGER: MANAGER_NAME, TRANSPORT_SPECIALIST: 'Hoang Thu Ha', FLEET_COORDINATOR: 'Dang Minh Quan', CREW: 'Pham Van Duc', SYSTEM: 'Hệ thống',
};
const hist = (at: string, role: ActorRole, action: string, detail?: string, actor?: string): HistoryEntry =>
  ({ at, role, action, detail, actor: actor ?? (NAMES[role] || 'Khách hàng') });

const slug = (h: string) => (mockHorses.find((x) => x.id === h)?.name ?? h).toLowerCase().replace(/\s+/g, '-');
const dossierFor = (horses: string[], status: DossierItem['status'] = 'APPROVED'): DossierItem[] => horses.flatMap((h) => [
  { name: 'Hộ chiếu ngựa', scope: h, status, file: `${slug(h)}-passport.pdf` },
  { name: 'Giấy chứng nhận quyền sở hữu', scope: h, status, file: `${slug(h)}-ownership.pdf` },
  { name: 'Sổ tiêm phòng cúm ngựa', scope: h, status, file: `${slug(h)}-vaccination.pdf` },
  { name: 'Giấy chứng nhận sức khỏe', scope: h, status, file: `${slug(h)}-health-cert.pdf` },
]);

type ReqSeed = Partial<TransportRequest> & Pick<TransportRequest, 'id' | 'customerId' | 'origin' | 'destination' | 'date' | 'status' | 'horses' | 'pickup' | 'delivery' | 'submittedAt'>;
function req(p: ReqSeed): TransportRequest {
  return { careNotes: '', versions: [], dossier: dossierFor(p.horses), collection: [], history: [], ...p };
}

/** Phiên bản hợp đồng dựng từ bảng giá mặc định */
function version(r: Pick<TransportRequest, 'id' | 'origin' | 'destination' | 'horses' | 'date'>, v: number, issuedAt: string, extra: Partial<ContractVersion> = {}): ContractVersion {
  const items = defaultItems(r), mode = defaultMode(r);
  return {
    v, number: `CT-${r.id.slice(4)}`, issuedAt, validUntil: addHours(issuedAt, 24), mode,
    departAt: `${r.date} 06:00`, arriveAt: `${r.date} ${mode === 'AIR' ? '23:00' : '20:00'}`,
    items, total: sumItems(items), depositPct: 30, terms: DEFAULT_TERMS.map((t) => ({ ...t })), budget: defaultBudget(r),
    state: 'ISSUED', extensions: [], ...extra,
  };
}
const dep = (v: ContractVersion) => Math.round((v.total * v.depositPct) / 100);

const R = {
  r8928: { id: 'TRN-8928', origin: 'Da Nang', destination: 'Tokyo', horses: ['HOR-1092'], date: '2026-10-25' },
  r8925: { id: 'TRN-8925', origin: 'Ho Chi Minh City', destination: 'Osaka', horses: ['HOR-1029'], date: '2026-10-30' },
  r8927: { id: 'TRN-8927', origin: 'Hanoi', destination: 'Da Nang', horses: ['HOR-1029', 'HOR-1035'], date: '2026-10-15' },
  r8941: { id: 'TRN-8941', origin: 'Ho Chi Minh City', destination: 'Hanoi', horses: ['HOR-1101'], date: '2026-10-19' },
  r8934: { id: 'TRN-8934', origin: 'Ho Chi Minh City', destination: 'Da Nang', horses: ['HOR-2002'], date: '2026-10-23' },
  r8942: { id: 'TRN-8942', origin: 'Hanoi', destination: 'Ho Chi Minh City', horses: ['HOR-1035'], date: '2026-10-21' },
  r8933: { id: 'TRN-8933', origin: 'Hanoi', destination: 'Ho Chi Minh City', horses: ['HOR-2001'], date: '2026-10-16' },
  r8924: { id: 'TRN-8924', origin: 'Hanoi', destination: 'Tokyo', horses: ['HOR-1035'], date: '2026-10-18' },
  r8944: { id: 'TRN-8944', origin: 'Ho Chi Minh City', destination: 'Da Nang', horses: ['HOR-1092'], date: '2026-10-12' },
  r8947: { id: 'TRN-8947', origin: 'Da Nang', destination: 'Osaka', horses: ['HOR-1101'], date: '2026-10-26' },
  r8948: { id: 'TRN-8948', origin: 'Ho Chi Minh City', destination: 'Tokyo', horses: ['HOR-1108'], date: '2026-11-05' },
  r8945: { id: 'TRN-8945', origin: 'Ho Chi Minh City', destination: 'Da Nang', horses: ['HOR-1029'], date: '2026-10-07' },
  r8923: { id: 'TRN-8923', origin: 'Ho Chi Minh City', destination: 'Bangkok', horses: ['HOR-1029'], date: '2026-10-04' },
  r8810: { id: 'TRN-8810', origin: 'Hanoi', destination: 'Ho Chi Minh City', horses: ['HOR-1101'], date: '2026-10-03' },
  r8935: { id: 'TRN-8935', origin: 'Da Nang', destination: 'Hanoi', horses: ['HOR-2003'], date: '2026-10-01' },
  r8750: { id: 'TRN-8750', origin: 'London', destination: 'Dubai', horses: ['HOR-1108'], date: '2026-08-15' },
  r8943: { id: 'TRN-8943', origin: 'Ho Chi Minh City', destination: 'Tokyo', horses: ['HOR-1092'], date: '2026-10-12' },
};
const signed = (r: typeof R.r8924, issuedAt: string, signedAt: string, extra: Partial<ContractVersion> = {}) =>
  version(r, 1, issuedAt, { state: 'EFFECTIVE', termsAcceptedAt: addHours(issuedAt, 1), signedAt, ...extra });

const V = {
  v8928a: version(R.r8928, 1, '2026-10-03 09:00', {
    state: 'SUPERSEDED',
    change: { at: '2026-10-03 15:20', text: 'Xin dời ngày vận chuyển sang 25/10 vì lịch thi đấu thay đổi.', proposedDate: '2026-10-25',
      response: { at: '2026-10-04 09:00', text: 'Đã cập nhật ngày 25/10 trong phiên bản v2.', decision: 'REVISED' } },
  }),
  v8928b: version(R.r8928, 2, '2026-10-04 09:00', { note: 'Đã cập nhật ngày vận chuyển theo đề nghị của khách hàng.' }),
  v8925: version(R.r8925, 1, '2026-10-04 08:00', {
    state: 'CHANGES_REQUESTED',
    change: { at: '2026-10-04 10:15', text: 'Đề nghị giảm phí thủ tục vì chúng tôi đã có giấy phép nhập khẩu còn hiệu lực.', commercial: 'Giảm phí thủ tục xuất nhập khẩu' },
  }),
  v8927: version(R.r8927, 1, '2026-10-02 10:00'),
  v8941: version(R.r8941, 1, '2026-10-04 07:00', { termsAcceptedAt: '2026-10-04 07:30' }),
  v8934: version(R.r8934, 1, '2026-10-04 08:30', { termsAcceptedAt: '2026-10-04 09:00' }),
  v8942: version(R.r8942, 1, '2026-10-04 06:00', { termsAcceptedAt: '2026-10-04 06:20' }),
  v8933: version(R.r8933, 1, '2026-10-03 14:00', { termsAcceptedAt: '2026-10-03 15:00', extensions: [{ at: '2026-10-04 09:00', from: '2026-10-04 14:00', to: '2026-10-05 14:00' }], validUntil: '2026-10-05 14:00' }),
  v8924: signed(R.r8924, '2026-10-02 09:00', '2026-10-03 08:30'),
  v8944: signed(R.r8944, '2026-10-01 10:00', '2026-10-02 09:00'),
  v8947: signed(R.r8947, '2026-09-30 10:00', '2026-10-01 11:00'),
  v8948: signed(R.r8948, '2026-10-03 10:00', '2026-10-04 08:00'),
  v8945: signed(R.r8945, '2026-09-29 09:00', '2026-09-29 14:00'),
  v8923: signed(R.r8923, '2026-09-29 09:00', '2026-09-30 09:00'),
  v8810: signed(R.r8810, '2026-09-25 09:00', '2026-09-25 15:00'),
  v8935: signed(R.r8935, '2026-09-24 09:00', '2026-09-24 16:00'),
  v8750: signed(R.r8750, '2026-08-03 09:00', '2026-08-04 09:00', { state: 'FULFILLED' }),
  v8943: version(R.r8943, 1, '2026-10-01 09:00', { termsAcceptedAt: '2026-10-01 10:00', state: 'VOID' }),
};

// ---------------------------------------------------------------------------
// Yêu cầu vận chuyển (mỗi đơn minh họa một tình huống trong vòng đời)
// ---------------------------------------------------------------------------
export const mockRequests: TransportRequest[] = [
  req({
    id: 'TRN-8930', customerId: 'CUS-001', origin: 'Ho Chi Minh City', destination: 'Tokyo', date: '2026-10-28', status: 'PENDING_REVIEW',
    horses: ['HOR-1092'], pickup: PLACES.saigon, delivery: PLACES.tokyo, submittedAt: '2026-10-04 08:40',
    careNotes: 'Mang theo lưới cỏ khô và xô nước quen dùng.',
    dossier: [...dossierFor(['HOR-1092']).slice(0, 2), { name: 'Sổ tiêm phòng cúm ngựa', scope: 'HOR-1092', status: 'MISSING' },
      { name: 'Giấy chứng nhận sức khỏe', scope: 'HOR-1092', status: 'PENDING_REVIEW', file: 'apollo-health-cert.pdf' }],
    history: [hist('2026-10-04 08:40', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Ho Chi Minh City → Tokyo • 1 ngựa', 'Alex Equine')],
  }),
  req({
    id: 'TRN-8932', customerId: 'CUS-002', origin: 'Hanoi', destination: 'Ho Chi Minh City', date: '2026-10-09', status: 'PENDING_REVIEW',
    horses: ['HOR-2001'], pickup: PLACES.hanoiNam, delivery: PLACES.phuTho, submittedAt: '2026-10-04 10:05',
    careNotes: 'Ngựa nhạy cảm tiếng ồn, cần khoang riêng.',
    history: [hist('2026-10-04 10:05', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Hanoi → Ho Chi Minh City • 1 ngựa', 'Nguyen Hoai Nam')],
  }),
  req({
    id: 'TRN-8926', customerId: 'CUS-001', origin: 'Hanoi', destination: 'Da Nang', date: '2026-10-08', status: 'CHANGES_REQUESTED',
    horses: ['HOR-1035'], pickup: PLACES.hanoi, delivery: PLACES.danang, submittedAt: '2026-10-02 14:00',
    feedback: 'Ngày 08/10 đội xe đã kín lịch. Vui lòng chọn ngày từ 12/10 trở đi và bổ sung yêu cầu chăm sóc cho ngựa có dị ứng.',
    revisionFields: ['date', 'notes'],
    history: [
      hist('2026-10-02 14:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Hanoi → Da Nang • 1 ngựa', 'Alex Equine'),
      hist('2026-10-03 10:20', 'LOGISTICS_MANAGER', 'Yêu cầu chỉnh sửa', 'Đổi ngày vận chuyển, bổ sung ghi chú chăm sóc'),
    ],
  }),
  req({
    id: 'TRN-8929', customerId: 'CUS-001', origin: 'Da Nang', destination: 'Ho Chi Minh City', date: '2026-10-22', status: 'CONTRACT_PREPARATION',
    horses: ['HOR-1101'], pickup: PLACES.danang, delivery: PLACES.saigon, submittedAt: '2026-10-03 09:00',
    history: [
      hist('2026-10-03 09:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Da Nang → Ho Chi Minh City • 1 ngựa', 'Alex Equine'),
      hist('2026-10-03 16:00', 'LOGISTICS_MANAGER', 'Chấp nhận yêu cầu', 'Bắt đầu soạn hợp đồng'),
    ],
  }),
  req({
    ...R.r8928, customerId: 'CUS-001', status: 'CONTRACT_READY', pickup: PLACES.danang, delivery: PLACES.tokyo, submittedAt: '2026-10-02 10:00',
    versions: [V.v8928a, V.v8928b],
    history: [
      hist('2026-10-02 10:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', undefined, 'Alex Equine'),
      hist('2026-10-02 15:00', 'LOGISTICS_MANAGER', 'Chấp nhận yêu cầu'),
      hist('2026-10-03 09:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8928 v1'),
      hist('2026-10-03 15:20', 'CUSTOMER', 'Yêu cầu sửa hợp đồng', V.v8928a.change!.text, 'Alex Equine'),
      hist('2026-10-04 09:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng sửa đổi', 'CT-8928 v2'),
    ],
  }),
  req({
    ...R.r8925, customerId: 'CUS-001', status: 'CONTRACT_CHANGES_REQUESTED', pickup: PLACES.saigon, delivery: PLACES.osaka, submittedAt: '2026-10-02 16:00',
    versions: [V.v8925],
    history: [
      hist('2026-10-02 16:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', undefined, 'Alex Equine'),
      hist('2026-10-04 08:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8925 v1'),
      hist('2026-10-04 10:15', 'CUSTOMER', 'Yêu cầu sửa hợp đồng', V.v8925.change!.text, 'Alex Equine'),
    ],
  }),
  req({
    ...R.r8927, customerId: 'CUS-001', status: 'CONTRACT_READY', pickup: PLACES.hanoi, delivery: PLACES.danang, submittedAt: '2026-09-30 11:00',
    versions: [V.v8927],
    history: [hist('2026-10-02 10:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8927 v1')],
  }),
  req({
    ...R.r8941, customerId: 'CUS-001', status: 'CONTRACT_READY', pickup: PLACES.saigon, delivery: PLACES.hanoi, submittedAt: '2026-10-01 09:00',
    versions: [V.v8941],
    history: [
      hist('2026-10-04 07:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8941 v1'),
      hist('2026-10-04 07:30', 'CUSTOMER', 'Đồng ý điều khoản hợp đồng', 'CT-8941 v1', 'Alex Equine'),
      hist('2026-10-04 07:40', 'CUSTOMER', 'Thanh toán cọc bằng QR Sandbox', 'PAY-5101', 'Alex Equine'),
    ],
  }),
  req({
    ...R.r8934, customerId: 'CUS-002', status: 'CONTRACT_READY', pickup: PLACES.phuTho, delivery: PLACES.danang, submittedAt: '2026-10-02 08:00',
    versions: [V.v8934],
    history: [
      hist('2026-10-04 08:30', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8934 v1'),
      hist('2026-10-04 09:00', 'CUSTOMER', 'Đồng ý điều khoản hợp đồng', 'CT-8934 v1', 'Nguyen Hoai Nam'),
      hist('2026-10-04 09:20', 'CUSTOMER', 'Báo đã chuyển khoản tiền cọc', 'PAY-5106 • Vietcombank', 'Nguyen Hoai Nam'),
    ],
  }),
  req({
    ...R.r8942, customerId: 'CUS-001', status: 'DEPOSIT_VERIFIED', pickup: PLACES.hanoi, delivery: PLACES.saigon, submittedAt: '2026-10-01 14:00',
    versions: [V.v8942],
    history: [
      hist('2026-10-04 06:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8942 v1'),
      hist('2026-10-04 06:20', 'CUSTOMER', 'Đồng ý điều khoản hợp đồng', undefined, 'Alex Equine'),
      hist('2026-10-04 06:52', 'SYSTEM', 'Sandbox xác minh tiền cọc', 'PAY-5102'),
    ],
  }),
  req({
    ...R.r8933, customerId: 'CUS-002', status: 'CANCELLATION_REQUESTED', pickup: PLACES.hanoiNam, delivery: PLACES.phuTho, submittedAt: '2026-10-01 15:00',
    versions: [V.v8933],
    cancellation: { reason: 'Ngựa bị chấn thương nhẹ khi tập, bác sĩ khuyên nghỉ 3 tuần – xin hủy chuyến và hoàn cọc.', at: '2026-10-04 10:30', status: 'REQUESTED', prevStatus: 'DEPOSIT_VERIFIED' },
    history: [
      hist('2026-10-03 14:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8933 v1'),
      hist('2026-10-03 16:10', 'SYSTEM', 'Sandbox xác minh tiền cọc', 'PAY-5095'),
      hist('2026-10-04 09:00', 'LOGISTICS_MANAGER', 'Gia hạn hạn chung 24 giờ', 'Đến 05/10/2026 14:00'),
      hist('2026-10-04 10:30', 'CUSTOMER', 'Yêu cầu hủy', 'Ngựa bị chấn thương nhẹ khi tập', 'Nguyen Hoai Nam'),
    ],
  }),
  req({
    ...R.r8924, customerId: 'CUS-001', status: 'ACTIVATED', pickup: PLACES.hanoi, delivery: PLACES.tokyo, submittedAt: '2026-10-01 10:00',
    careNotes: 'Mang theo lưới cỏ khô và xô nước quen dùng.', versions: [V.v8924],
    dossier: [
      { name: 'Hộ chiếu ngựa', scope: 'HOR-1035', status: 'APPROVED', file: 'shadowfax-passport.pdf' },
      { name: 'Giấy chứng nhận quyền sở hữu', scope: 'HOR-1035', status: 'APPROVED', file: 'shadowfax-ownership.pdf' },
      { name: 'Sổ tiêm phòng cúm ngựa', scope: 'HOR-1035', status: 'ACTION_REQUIRED', file: 'shadowfax-vaccination.pdf', note: 'Lần tiêm cúm gần nhất đã quá 12 tháng.' },
      { name: 'Giấy chứng nhận sức khỏe', scope: 'HOR-1035', status: 'PENDING_REVIEW', file: 'shadowfax-health-cert.pdf' },
      { name: 'Giấy đăng ký giải đua', scope: 'request', status: 'MISSING', note: 'Specialist yêu cầu bổ sung cho thủ tục tạm nhập Nhật Bản.' },
    ],
    history: [
      hist('2026-10-03 08:30', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8924 v1 – yêu cầu được kích hoạt', 'Alex Equine'),
      hist('2026-10-03 09:00', 'LOGISTICS_MANAGER', 'Phân công chuyến', 'TRP-902 → Hoang Thu Ha, Dang Minh Quan'),
      hist('2026-10-03 14:10', 'TRANSPORT_SPECIALIST', 'Từ chối giấy tờ', 'Sổ tiêm ngừa – Shadowfax'),
      hist('2026-10-04 10:40', 'FLEET_COORDINATOR', 'Gửi phương án tuyến v1', 'Kèm đề xuất ngân sách chuyến bay'),
    ],
  }),
  req({
    ...R.r8944, customerId: 'CUS-001', status: 'ACTIVATED', pickup: PLACES.saigon, delivery: PLACES.danang, submittedAt: '2026-09-30 09:00',
    versions: [V.v8944],
    history: [hist('2026-10-02 09:00', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8944 v1', 'Alex Equine'), hist('2026-10-03 15:00', 'LOGISTICS_MANAGER', 'Duyệt phương án tuyến v1', 'TRP-904')],
  }),
  req({
    ...R.r8947, customerId: 'CUS-001', status: 'ACTIVATED', pickup: PLACES.danang, delivery: PLACES.osaka, submittedAt: '2026-09-28 09:00',
    versions: [V.v8947],
    history: [hist('2026-10-01 11:00', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8947 v1', 'Alex Equine'), hist('2026-10-04 08:00', 'TRANSPORT_SPECIALIST', 'Xác nhận hồ sơ READY', 'TRP-906')],
  }),
  req({
    ...R.r8948, customerId: 'CUS-001', status: 'ACTIVATED', pickup: PLACES.saigon, delivery: PLACES.tokyo, submittedAt: '2026-10-02 09:00',
    versions: [V.v8948], dossier: [...dossierFor(['HOR-1108'], 'PENDING_REVIEW')],
    history: [hist('2026-10-04 08:00', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8948 v1 – hệ thống tạo TRP-907', 'Alex Equine')],
  }),
  req({
    ...R.r8945, customerId: 'CUS-001', status: 'SCHEDULED', pickup: PLACES.saigon, delivery: PLACES.danang, submittedAt: '2026-09-27 10:00',
    versions: [V.v8945],
    history: [hist('2026-10-03 17:00', 'LOGISTICS_MANAGER', 'Duyệt khởi hành', 'TRP-903 sẵn sàng khởi hành 07/10 06:00')],
  }),
  req({
    ...R.r8923, customerId: 'CUS-001', status: 'IN_TRANSIT', pickup: PLACES.saigon, delivery: PLACES.bangkok, submittedAt: '2026-09-28 09:15',
    versions: [V.v8923],
    history: [hist('2026-09-30 09:00', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8923 v1', 'Alex Equine'), hist('2026-10-04 06:40', 'CREW', 'Xuất phát', 'Saigon Riding Club')],
  }),
  req({
    ...R.r8810, customerId: 'CUS-001', status: 'DELIVERED', pickup: PLACES.hanoi, delivery: PLACES.saigon, submittedAt: '2026-09-22 10:00',
    versions: [V.v8810], acceptance: { status: 'PENDING', openedAt: '2026-10-04 10:00', dueAt: '2026-10-05 10:00' },
    history: [
      hist('2026-10-04 09:30', 'CREW', 'Đến điểm giao', 'Saigon Riding Club'),
      hist('2026-10-04 10:00', 'CREW', 'Hoàn tất bàn giao có xác minh', 'Người nhận: Alex Equine'),
      hist('2026-10-04 10:45', 'CUSTOMER', 'Gửi khiếu nại', 'CMP-120 • Tình trạng ngựa', 'Alex Equine'),
    ],
  }),
  req({
    ...R.r8935, customerId: 'CUS-002', status: 'DELIVERED', pickup: PLACES.danang, delivery: PLACES.hanoiNam, submittedAt: '2026-09-20 10:00',
    versions: [V.v8935], acceptance: { status: 'ACCEPTED', openedAt: '2026-10-02 09:00', dueAt: '2026-10-03 09:00', decidedAt: '2026-10-02 15:00' },
    history: [
      hist('2026-10-02 09:00', 'CREW', 'Hoàn tất bàn giao có xác minh', 'Người nhận: Tran Van Phuc'),
      hist('2026-10-02 15:00', 'CUSTOMER', 'Nghiệm thu bàn giao', undefined, 'Nguyen Hoai Nam'),
      hist('2026-10-02 15:20', 'SYSTEM', 'VNPay xác minh số dư', 'PAY-5121'),
    ],
  }),
  req({
    ...R.r8750, customerId: 'CUS-001', status: 'CLOSED', closedAt: '2026-08-18 10:00',
    pickup: place('Royal Windsor Stables', 'Windsor Great Park', 'Oliver B.', '+44 20 5550 0133'),
    delivery: place('Dubai Equestrian Club', 'Al Qudra Road', 'Omar K.', '+971 4 555 0177'), submittedAt: '2026-08-01 10:00',
    versions: [V.v8750], acceptance: { status: 'ACCEPTED', openedAt: '2026-08-16 08:10', dueAt: '2026-08-17 08:10', decidedAt: '2026-08-16 14:00' },
    history: [hist('2026-08-18 10:00', 'LOGISTICS_MANAGER', 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng')],
  }),
  req({
    ...R.r8943, customerId: 'CUS-001', status: 'CANCELLED', reason: 'Khách hàng hủy: giải đua tại Tokyo bị hoãn.',
    pickup: PLACES.saigon, delivery: PLACES.tokyo, submittedAt: '2026-09-29 10:00', versions: [V.v8943],
    cancellation: { reason: 'Giải đua tại Tokyo bị hoãn', at: '2026-10-01 18:00', status: 'APPROVED', decidedAt: '2026-10-02 09:00', decisionNote: 'Hoàn toàn bộ tiền cọc đã xác minh.' },
    history: [
      hist('2026-10-01 18:00', 'CUSTOMER', 'Yêu cầu hủy', 'Giải đua tại Tokyo bị hoãn', 'Alex Equine'),
      hist('2026-10-02 09:00', 'LOGISTICS_MANAGER', 'Duyệt hủy & yêu cầu hoàn cọc', 'Hoàn toàn bộ tiền cọc đã xác minh'),
    ],
  }),
  req({
    id: 'TRN-8511', customerId: 'CUS-001', origin: 'Bangkok', destination: 'Ho Chi Minh City', date: '2026-06-05', status: 'REJECTED',
    horses: ['HOR-1092'], pickup: PLACES.bangkok, delivery: PLACES.saigon, submittedAt: '2026-05-22 10:00',
    reason: 'Không thể bố trí phương tiện cho ngày vận chuyển đã chọn.',
    history: [hist('2026-05-23 11:00', 'LOGISTICS_MANAGER', 'Từ chối yêu cầu', 'Không thể bố trí phương tiện')],
  }),
];

// ---------------------------------------------------------------------------
// Giao dịch
// ---------------------------------------------------------------------------
const okTx = (id: string, requestId: string, amount: number, at: string, type: Transaction['type'] = 'DEPOSIT', method: Transaction['method'] = 'QR_SANDBOX'): Transaction =>
  ({ id, requestId, type, method, amount, status: 'SUCCESS', createdAt: at, confirmedAt: addHours(at, 0.2), ref: method === 'BANK_TRANSFER' ? `VCB ${id.slice(4)}` : `SBX-${id.slice(4)}` });

export const mockTransactions: Transaction[] = [
  okTx('PAY-4801', 'TRN-8750', dep(V.v8750), '2026-08-04 08:00'),
  okTx('PAY-4840', 'TRN-8750', V.v8750.total - dep(V.v8750), '2026-08-16 15:00', 'BALANCE', 'VNPAY'),
  okTx('PAY-5020', 'TRN-8935', dep(V.v8935), '2026-09-24 14:00'),
  okTx('PAY-5030', 'TRN-8810', dep(V.v8810), '2026-09-25 14:00'),
  okTx('PAY-5051', 'TRN-8923', dep(V.v8923), '2026-09-29 16:00'),
  okTx('PAY-5060', 'TRN-8945', dep(V.v8945), '2026-09-29 12:00'),
  okTx('PAY-5070', 'TRN-8947', dep(V.v8947), '2026-09-30 16:00', 'DEPOSIT', 'BANK_TRANSFER'),
  okTx('PAY-5080', 'TRN-8943', dep(V.v8943), '2026-10-01 11:00'),
  { id: 'PAY-R5080', requestId: 'TRN-8943', type: 'REFUND', method: 'BANK_TRANSFER', amount: dep(V.v8943), status: 'PENDING_CONFIRMATION', createdAt: '2026-10-02 09:00', ref: 'Hoàn cọc CT-8943' },
  okTx('PAY-5085', 'TRN-8944', dep(V.v8944), '2026-10-01 15:00'),
  okTx('PAY-5090', 'TRN-8924', dep(V.v8924), '2026-10-02 11:00'),
  okTx('PAY-5095', 'TRN-8933', dep(V.v8933), '2026-10-03 16:00'),
  okTx('PAY-5098', 'TRN-8948', dep(V.v8948), '2026-10-03 18:00'),
  okTx('PAY-5121', 'TRN-8935', V.v8935.total - dep(V.v8935), '2026-10-02 15:10', 'BALANCE', 'VNPAY'),
  okTx('PAY-5102', 'TRN-8942', dep(V.v8942), '2026-10-04 06:40'),
  { id: 'PAY-5101', requestId: 'TRN-8941', type: 'DEPOSIT', method: 'QR_SANDBOX', amount: dep(V.v8941), status: 'PROCESSING', createdAt: '2026-10-04 07:40', ref: 'SBX-5101' },
  { id: 'PAY-5106', requestId: 'TRN-8934', type: 'DEPOSIT', method: 'BANK_TRANSFER', amount: dep(V.v8934), status: 'PENDING_CONFIRMATION', createdAt: '2026-10-04 09:20', ref: 'VCB 2610040921', receipt: 'uy-nhiem-chi-8934.pdf' },
];

// ---------------------------------------------------------------------------
// Chuyến đi
// ---------------------------------------------------------------------------
const stops = (...list: Array<[string, RouteStop['type'], string]>): RouteStop[] => list.map(([name, type, plannedAt]) => ({ name, type, plannedAt }));
const ROAD_CREW: Array<[string, string]> = [['Tài xế chính', 'Nguyen Van Hung'], ['Phụ lái', 'Le Quoc Tuan'], ['Bác sĩ thú y', 'Dr. Nguyen Minh Anh']];

export const mockTrips: Trip[] = [
  {
    id: 'TRP-902', requestId: 'TRN-8924', mode: 'AIR', status: 'PLANNING',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-11', coordinatorId: 'EMP-15', at: '2026-10-03 09:00' },
    plannedDepart: '2026-10-18 06:00', eta: '2026-10-19 06:00',
    readiness: { docsReady: 5, docsTotal: 9, insurance: 'MISSING', quarantineOk: false },
    route: {
      v: 1, status: 'PENDING_APPROVAL', submittedAt: '2026-10-04 10:40', resourcesConfirmed: true, vehicle: '51C-246.80 • Isuzu FVR (2 chỗ) – chặng ra sân bay',
      crew: [['Tài xế chặng nội địa', 'Pham Thanh Son'], ['Bác sĩ thú y', 'Dr. Le Thu Trang']],
      stops: stops(['Hanoi Equestrian Club', 'ORIGIN', '2026-10-18 03:30'], ['Sân bay Nội Bài', 'AIRPORT', '2026-10-18 06:00'],
        ['Sân bay Narita', 'AIRPORT', '2026-10-18 13:30'], ['Trạm kiểm dịch sân bay Narita (AQS)', 'QUARANTINE_STATION', '2026-10-18 15:00'],
        ['Tokyo Racecourse Stables', 'DESTINATION', '2026-10-19 06:00']),
      note: 'Bay thẳng Nội Bài – Narita, kiểm dịch AQS 12 giờ trước khi giao.',
    },
    flight: { airline: 'Vietnam Airlines Cargo', flightNo: 'VN-9310F', budget: 6800, status: 'BUDGET_PENDING' },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-904', requestId: 'TRN-8944', mode: 'ROAD', status: 'PLANNING',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-11', coordinatorId: 'EMP-16', at: '2026-10-02 10:00' },
    plannedDepart: '2026-10-12 06:00', eta: '2026-10-12 20:00',
    readiness: { docsReady: 3, docsTotal: 4, insurance: 'PENDING', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-10-03 11:00', decidedAt: '2026-10-03 15:00', resourcesConfirmed: true,
      vehicle: '51C-135.79 • Hino 500 (4 chỗ)', crew: ROAD_CREW,
      stops: stops(['Saigon Riding Club', 'ORIGIN', '2026-10-12 06:00'], ['Trạm nghỉ Phan Thiết', 'REST_STOP', '2026-10-12 10:00'],
        ['Trạm nghỉ Quy Nhơn', 'REST_STOP', '2026-10-12 15:30'], ['Da Nang Riding Center', 'DESTINATION', '2026-10-12 20:00']),
    },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-906', requestId: 'TRN-8947', mode: 'AIR', status: 'PLANNING',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-12', coordinatorId: 'EMP-15', at: '2026-10-01 14:00' },
    plannedDepart: '2026-10-26 08:00', eta: '2026-10-27 06:00',
    readiness: { docsReady: 8, docsTotal: 8, docsReadyAt: '2026-10-04 08:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 2, status: 'APPROVED', submittedAt: '2026-10-03 09:00', decidedAt: '2026-10-03 16:00', resourcesConfirmed: true,
      vehicle: '43C-112.34 • Isuzu FVR (2 chỗ) – chặng ra sân bay', crew: [['Tài xế chặng nội địa', 'Tran Minh Tri'], ['Bác sĩ thú y', 'Dr. Nguyen Minh Anh']],
      stops: stops(['Da Nang Riding Center', 'ORIGIN', '2026-10-26 08:00'], ['Sân bay Đà Nẵng', 'AIRPORT', '2026-10-26 11:00'],
        ['Trạm kiểm dịch sân bay Kansai (AQS)', 'QUARANTINE_STATION', '2026-10-26 22:00'], ['Hanshin Training Stables', 'DESTINATION', '2026-10-27 06:00']),
    },
    flight: { airline: 'Japan Airlines Cargo', flightNo: 'JL-6062', budget: 5200, status: 'BOOKED', decidedAt: '2026-10-03 16:00' },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-907', requestId: 'TRN-8948', mode: 'AIR', status: 'PLANNING', deployment: { status: 'NOT_CONFIRMED' },
    plannedDepart: '2026-11-05 07:00', eta: '2026-11-06 05:00',
    readiness: { docsReady: 0, docsTotal: 8, insurance: 'MISSING', quarantineOk: false },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-903', requestId: 'TRN-8945', mode: 'ROAD', status: 'READY_TO_DEPART',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-11', coordinatorId: 'EMP-15', at: '2026-09-29 15:00' },
    plannedDepart: '2026-10-07 06:00', eta: '2026-10-07 22:00', departureApprovedAt: '2026-10-03 17:00',
    readiness: { docsReady: 5, docsTotal: 5, docsReadyAt: '2026-10-03 11:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-10-01 10:00', decidedAt: '2026-10-01 16:00', resourcesConfirmed: true,
      vehicle: '51C-135.79 • Hino 500 (4 chỗ)', crew: ROAD_CREW,
      stops: stops(['Saigon Riding Club', 'ORIGIN', '2026-10-07 06:00'], ['Trạm nghỉ Phan Thiết', 'REST_STOP', '2026-10-07 10:00'],
        ['Trạm nghỉ Quy Nhơn', 'REST_STOP', '2026-10-07 16:30'], ['Da Nang Riding Center', 'DESTINATION', '2026-10-07 22:00']),
    },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-901', requestId: 'TRN-8923', mode: 'ROAD', status: 'IN_TRANSIT',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-11', coordinatorId: 'EMP-15', at: '2026-09-30 10:00' },
    plannedDepart: '2026-10-04 06:30', eta: '2026-10-05 18:00', departureApprovedAt: '2026-10-03 10:00',
    readiness: { docsReady: 7, docsTotal: 7, docsReadyAt: '2026-10-02 16:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-10-01 09:00', decidedAt: '2026-10-01 14:00', resourcesConfirmed: true,
      vehicle: '51C-246.80 • Isuzu FVR (2 chỗ)', crew: [['Tài xế chính', 'Pham Van Duc'], ['Tài xế Thái Lan', 'Somsak Wongsa'], ['Bác sĩ thú y', 'Dr. Nguyen Minh Anh']],
      stops: stops(['Saigon Riding Club', 'ORIGIN', '2026-10-04 06:30'], ['Cửa khẩu Mộc Bài', 'CHECKPOINT', '2026-10-04 09:30'],
        ['Trạm nghỉ Phnom Penh', 'REST_STOP', '2026-10-04 14:00'], ['Cửa khẩu Poipet', 'CHECKPOINT', '2026-10-05 08:00'], ['Bangkok Polo Club', 'DESTINATION', '2026-10-05 16:00']),
    },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-10-04 06:40', by: 'Pham Van Duc' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-04 10:00', by: 'Pham Van Duc', note: 'Đang làm thủ tục thông quan' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-04 11:10', by: 'Pham Van Duc' },
    ],
    etaHistory: [{ at: '2026-10-04 11:15', from: '2026-10-05 16:00', to: '2026-10-05 18:00', reason: 'Thông quan tại Mộc Bài lâu hơn dự kiến' }],
  },
  {
    id: 'TRP-880', requestId: 'TRN-8810', mode: 'ROAD', status: 'COMPLETED',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-12', coordinatorId: 'EMP-16', at: '2026-09-26 09:00' },
    plannedDepart: '2026-10-03 05:00', eta: '2026-10-04 09:00', departureApprovedAt: '2026-10-02 15:00',
    readiness: { docsReady: 5, docsTotal: 5, docsReadyAt: '2026-10-01 10:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-09-28 10:00', decidedAt: '2026-09-28 15:00', resourcesConfirmed: true,
      vehicle: '29C-468.02 • Hino 500 (4 chỗ)', crew: [['Tài xế chính', 'Pham Thanh Son'], ['Phụ lái', 'Dang Van Khoa'], ['Bác sĩ thú y', 'Dr. Tran Quoc Bao']],
      stops: stops(['Hanoi Equestrian Club', 'ORIGIN', '2026-10-03 05:00'], ['Trạm nghỉ Vinh', 'REST_STOP', '2026-10-03 11:00'],
        ['Trạm nghỉ Đà Nẵng', 'REST_STOP', '2026-10-03 20:00'], ['Saigon Riding Club', 'DESTINATION', '2026-10-04 09:00']),
    },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-10-03 05:10', by: 'Pham Thanh Son' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-03 11:20', by: 'Pham Thanh Son' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-03 12:00', by: 'Pham Thanh Son' },
      { type: 'ARRIVED_STOP', stopIndex: 2, at: '2026-10-03 20:10', by: 'Pham Thanh Son' },
      { type: 'LEFT_STOP', stopIndex: 2, at: '2026-10-03 21:00', by: 'Pham Thanh Son' },
      { type: 'ARRIVED_DESTINATION', stopIndex: 3, at: '2026-10-04 09:30', by: 'Pham Thanh Son' },
    ],
    etaHistory: [],
    handover: {
      completedAt: '2026-10-04 10:00', receiverName: 'Alex Equine', receiverId: 'CCCD 079****1234', signature: true,
      horses: [{ horseId: 'HOR-1101', microchipOk: true, condition: 'MINOR_ISSUE' }], photos: ['handover-starboy-1.jpg', 'handover-starboy-2.jpg'],
    },
  },
  {
    id: 'TRP-895', requestId: 'TRN-8935', mode: 'ROAD', status: 'COMPLETED',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-12', coordinatorId: 'EMP-16', at: '2026-09-25 09:00' },
    plannedDepart: '2026-10-01 05:00', eta: '2026-10-02 08:30', departureApprovedAt: '2026-09-30 16:00',
    readiness: { docsReady: 5, docsTotal: 5, docsReadyAt: '2026-09-29 10:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-09-27 10:00', decidedAt: '2026-09-27 15:00', resourcesConfirmed: true,
      vehicle: '43C-112.34 • Isuzu FVR (2 chỗ)', crew: [['Tài xế chính', 'Bui Van Long'], ['Bác sĩ thú y', 'Dr. Le Thu Trang']],
      stops: stops(['Da Nang Riding Center', 'ORIGIN', '2026-10-01 05:00'], ['Trạm nghỉ Vinh', 'REST_STOP', '2026-10-01 16:00'], ['Soc Son Stud Farm', 'DESTINATION', '2026-10-02 08:30']),
    },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-10-01 05:05', by: 'Bui Van Long' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-01 16:10', by: 'Bui Van Long' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-01 17:00', by: 'Bui Van Long' },
      { type: 'ARRIVED_DESTINATION', stopIndex: 2, at: '2026-10-02 08:40', by: 'Bui Van Long' },
    ],
    etaHistory: [],
    handover: {
      completedAt: '2026-10-02 09:00', receiverName: 'Tran Van Phuc', receiverId: 'CCCD 001****5678', signature: true,
      horses: [{ horseId: 'HOR-2003', microchipOk: true, condition: 'NORMAL' }], photos: ['handover-silvermoon.jpg'],
    },
  },
  {
    id: 'TRP-720', requestId: 'TRN-8750', mode: 'AIR', status: 'COMPLETED',
    deployment: { status: 'CONFIRMED', specialistId: 'EMP-11', coordinatorId: 'EMP-15', at: '2026-08-05 09:00' },
    plannedDepart: '2026-08-15 06:00', eta: '2026-08-16 08:00', departureApprovedAt: '2026-08-14 10:00',
    readiness: { docsReady: 8, docsTotal: 8, docsReadyAt: '2026-08-12 10:00', insurance: 'VERIFIED', quarantineOk: true },
    route: {
      v: 1, status: 'APPROVED', submittedAt: '2026-08-08 10:00', decidedAt: '2026-08-08 15:00', resourcesConfirmed: true, crew: [['Bác sĩ thú y', 'Dr. Le Thu Trang']],
      stops: stops(['Royal Windsor Stables', 'ORIGIN', '2026-08-15 06:00'], ['Sân bay London Heathrow', 'AIRPORT', '2026-08-15 10:00'],
        ['Sân bay Dubai', 'AIRPORT', '2026-08-15 22:00'], ['Dubai Equestrian Club', 'DESTINATION', '2026-08-16 08:00']),
    },
    flight: { airline: 'Emirates SkyCargo', flightNo: 'EK-9006', budget: 7400, status: 'BOOKED', decidedAt: '2026-08-08 15:00' },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-08-15 06:05', by: 'Tổ xe' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-08-15 09:40', by: 'Tổ xe' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-08-15 12:00', by: 'Tổ xe' },
      { type: 'ARRIVED_STOP', stopIndex: 2, at: '2026-08-15 22:10', by: 'Tổ xe' },
      { type: 'LEFT_STOP', stopIndex: 2, at: '2026-08-16 05:00', by: 'Tổ xe' },
      { type: 'ARRIVED_DESTINATION', stopIndex: 3, at: '2026-08-16 07:40', by: 'Tổ xe' },
    ],
    etaHistory: [],
    handover: {
      completedAt: '2026-08-16 08:10', receiverName: 'Omar K.', receiverId: 'Passport A1234567', signature: true,
      horses: [{ horseId: 'HOR-1108', microchipOk: true, condition: 'NORMAL' }], photos: ['handover-bella.jpg'],
    },
  },
];

// ---------------------------------------------------------------------------
// Sự cố & khiếu nại
// ---------------------------------------------------------------------------
export const mockIncidents: Incident[] = [
  {
    id: 'INC-301', tripId: 'TRP-901', type: 'BORDER', severity: 'MEDIUM', status: 'IN_PROGRESS', at: '2026-10-04 10:20', by: 'Pham Van Duc',
    location: 'Cửa khẩu Mộc Bài', description: 'Hải quan Campuchia yêu cầu kiểm tra lại giấy kiểm dịch; xe chờ 70 phút. Dự kiến không kịp qua Poipet trong ngày làm việc 05/10 nếu giữ lịch cũ.',
    safety: 'Ngựa được cho uống nước, xe đỗ trong bóng râm, bác sĩ thú y kiểm tra mạch và nhiệt độ bình thường.',
    photos: ['moc-bai-queue.jpg'],
    plans: [{ id: 'PLN-11', kind: 'Nghỉ thêm một đêm', desc: 'Lưu chuồng thêm 1 đêm tại Phnom Penh, qua Poipet sáng 05/10 lúc 07:00 để tránh giờ cao điểm. ETA mới 05/10 18:00.', cost: 180, payer: 'COMPANY', status: 'PENDING_APPROVAL', at: '2026-10-04 11:30' }],
    log: [['2026-10-04 10:20', 'Tài xế báo sự cố tại Mộc Bài'], ['2026-10-04 11:15', 'Coordinator cập nhật ETA 05/10 18:00'], ['2026-10-04 11:30', 'Specialist đề xuất phương án PLN-11']],
  },
  {
    id: 'INC-288', tripId: 'TRP-880', type: 'HORSE_HEALTH', severity: 'LOW', status: 'CLOSED', at: '2026-10-03 20:30', by: 'Pham Thanh Son', horseId: 'HOR-1101',
    location: 'Trạm nghỉ Đà Nẵng', description: 'Starboy bị trầy nhẹ ở chân sau trái khi xuống dốc tại trạm nghỉ.',
    safety: 'Bác sĩ Tran Quoc Bao sát trùng và băng vết trầy; ngựa ăn uống bình thường.', photos: ['starboy-leg.jpg'],
    plans: [{ id: 'PLN-9', kind: 'Theo dõi thú y', desc: 'Theo dõi vết trầy tại mỗi điểm dừng, thay băng trước khi giao.', cost: 0, payer: 'COMPANY', status: 'APPROVED', at: '2026-10-03 20:45', decisionNote: 'Đồng ý, ghi rõ trong biên bản bàn giao.' }],
    log: [['2026-10-03 20:30', 'Tài xế báo sự cố'], ['2026-10-03 21:00', 'Manager duyệt PLN-9'], ['2026-10-04 10:05', 'Đóng sự cố sau bàn giao']],
  },
];

export const mockComplaints: Complaint[] = [
  {
    id: 'CMP-120', requestId: 'TRN-8810', type: 'HORSE_CONDITION', title: 'Starboy bị trầy chân sau trái khi nhận', horseId: 'HOR-1101', status: 'NEW', createdAt: '2026-10-04 10:45',
    messages: [{ from: 'CUSTOMER', name: 'Alex Equine', at: '2026-10-04 10:45', text: 'Khi nhận ngựa tôi thấy chân sau trái của Starboy bị trầy và có băng. Tôi muốn biết nguyên nhân và đề nghị hỗ trợ chi phí khám thú y.', files: ['starboy-leg-customer.jpg'] }],
  },
  {
    id: 'CMP-097', requestId: 'TRN-8750', type: 'DELAY', title: 'Giao trễ so với kế hoạch ban đầu', status: 'RESOLVED', createdAt: '2026-08-16 09:00', resolvedAt: '2026-08-17 10:00',
    messages: [
      { from: 'CUSTOMER', name: 'Alex Equine', at: '2026-08-16 09:00', text: 'Lịch hạ cánh dời 40 phút nhưng tôi không được thông báo trước.' },
      { from: 'MANAGER', name: MANAGER_NAME, at: '2026-08-16 11:00', text: 'Xin lỗi quý khách. Chúng tôi đã bổ sung thông báo tự động khi ETA thay đổi.' },
    ],
    resolution: { proposal: 'Xin lỗi bằng văn bản, bổ sung thông báo ETA.', amount: 0 },
  },
];

// ---------------------------------------------------------------------------
// Chi phí thực tế
// ---------------------------------------------------------------------------
export const mockActualCosts: ActualCost[] = [
  { tripId: 'TRP-720', enteredAt: '2026-08-17 10:00', costs: { TRANSPORT: 980, PROCEDURE: 240, VET: 110, INSURANCE: 70, STAFF: 130, FUEL: 55 }, extra: [] },
  { tripId: 'TRP-895', enteredAt: '2026-10-03 09:00', costs: { TRANSPORT: 190, PROCEDURE: 50, VET: 100, INSURANCE: 70, STAFF: 95, FUEL: 80 }, extra: [] },
  { tripId: 'TRP-901', enteredAt: '2026-10-04 11:00', costs: { TRANSPORT: 0, PROCEDURE: 260, VET: 0, INSURANCE: 70, STAFF: 0, FUEL: 40 }, extra: [{ label: 'Phí lưu bãi Mộc Bài', amount: 35, payer: 'COMPANY' }] },
];

export const mockNotifications: ManagerNotification[] = [
  { id: 'N-1', at: '2026-10-04 11:30', title: 'Phương án xử lý sự cố chờ quyết định', text: 'INC-301 • TRP-901 – nghỉ thêm một đêm tại Phnom Penh.', link: '/manager/incidents/INC-301', read: false },
  { id: 'N-2', at: '2026-10-04 10:45', title: 'Khiếu nại mới', text: 'CMP-120 • TRN-8810 – Starboy bị trầy chân.', link: '/manager/complaints/CMP-120', read: false },
  { id: 'N-3', at: '2026-10-04 10:40', title: 'Phương án tuyến chờ duyệt', text: 'TRP-902 • tuyến v1 kèm ngân sách chuyến bay.', link: '/manager/trips/TRP-902/prepare', read: false },
  { id: 'N-4', at: '2026-10-04 10:30', title: 'Khách hàng yêu cầu hủy', text: 'TRN-8933 • đã có tiền cọc được xác minh.', link: '/manager/requests/TRN-8933', read: false },
  { id: 'N-5', at: '2026-10-04 10:15', title: 'Yêu cầu sửa hợp đồng', text: 'TRN-8925 • đề nghị giảm phí thủ tục.', link: '/manager/contracts/TRN-8925', read: true },
  { id: 'N-6', at: '2026-10-04 09:20', title: 'Chuyển khoản chờ xác minh', text: 'PAY-5106 • TRN-8934.', link: '/manager/payments', read: true },
];
