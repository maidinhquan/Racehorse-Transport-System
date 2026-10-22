import type {
  ActorRole,
  CompanyDoc,
  ContractVersion,
  CustomerNotification,
  CustomerProfile,
  DocRecord,
  HistoryEntry,
  Horse,
  Place,
  TransportRequest,
  Trip,
} from '../types';
import { addHours, contractItems, emptyPlace, sumItems } from '../hooks/customerRules';

// ============================================================================
// Dữ liệu mẫu cho trang Khách hàng (dùng khi Backend chưa chạy)
// Dữ liệu được viết cho ngày demo 04/10/2026; đồng hồ demo bắt đầu lúc 11:30 hôm đó.
// ============================================================================
export const DEMO_TODAY = '2026-10-04';
export const DEMO_OTP = '123456';

export const mockProfile: CustomerProfile = {
  id: 'CUS-001',
  name: 'Alex Equine',
  initials: 'AE',
  email: 'alex.equine@example.com',
  phone: '+84 90 5550 0110',
  company: 'Equine Racing Stable Co.',
};

// ---------------------------------------------------------------------------
// Ngựa
// ---------------------------------------------------------------------------
// export const mockHorses: Horse[] = [
//   {
//     id: 'HOR-1029', name: 'Thunderbolt', breed: 'Thoroughbred', sex: 'Male', dob: '2020-03-14', color: 'Bay', microchip: '985112004571029',
//     value: '120000', currency: 'USD',
//     passport: { number: 'VN-EQ-2020-1029', authority: 'Liên đoàn Đua ngựa Việt Nam', issueDate: '2023-04-10', expiryDate: '2028-04-09', scan: { name: 'thunderbolt-passport.pdf' } },
//     ownership: { name: 'thunderbolt-ownership.pdf' }, flu: { name: 'thunderbolt-vaccination.pdf' },
//     fluDate: '2026-05-20', conditions: '', vetName: 'BS. Nguyễn Minh Anh', vetPhone: '+84 28 5550 0142',
//   },
//   {
//     id: 'HOR-1035', name: 'Shadowfax', breed: 'Andalusian', sex: 'Gelding', dob: '2016-05-02', color: 'Grey', microchip: '985112004571035',
//     value: '85000', currency: 'USD',
//     passport: { number: 'VN-EQ-2016-1035', authority: 'Liên đoàn Đua ngựa Việt Nam', issueDate: '2024-01-15', expiryDate: '2029-01-14', scan: { name: 'shadowfax-passport.pdf' } },
//     ownership: { name: 'shadowfax-ownership.pdf' }, flu: { name: 'shadowfax-vaccination.pdf' },
//     fluDate: '2025-06-10', conditions: 'Dị ứng nhẹ theo mùa', vetName: 'BS. Trần Quốc Bảo', vetPhone: '+84 24 5550 0177',
//   },
//   {
//     id: 'HOR-1092', name: 'Apollo', breed: 'Thoroughbred', sex: 'Stallion', dob: '2021-04-20', color: 'Chestnut', microchip: '985112004571092',
//     value: '150000', currency: 'USD',
//     passport: { number: 'VN-EQ-2021-1092', authority: 'Liên đoàn Đua ngựa Việt Nam', issueDate: '2021-11-21', expiryDate: '2026-11-20', scan: { name: 'apollo-passport.pdf' } },
//     ownership: { name: 'apollo-ownership.pdf' },
//     fluDate: '2026-03-02', conditions: '', vetName: 'BS. Nguyễn Minh Anh', vetPhone: '+84 28 5550 0142',
//   },
//   {
//     id: 'HOR-1101', name: 'Starboy', breed: 'Warmblood', sex: 'Gelding', dob: '2018-08-09', color: 'Black', microchip: '985112004571101',
//     value: '95000', currency: 'USD',
//     passport: { number: 'AU-EQ-2018-1101', authority: 'Equestrian Australia', issueDate: '2023-08-01', expiryDate: '2028-07-31', scan: { name: 'starboy-passport.pdf' } },
//     ownership: { name: 'starboy-ownership.pdf' }, flu: { name: 'starboy-vaccination.pdf' },
//     fluDate: '2026-07-11', conditions: '', vetName: 'BS. Nguyễn Minh Anh', vetPhone: '+84 28 5550 0142',
//   },
//   {
//     id: 'HOR-1108', name: 'Bella', breed: 'Arabian', sex: 'Mare', dob: '2019-02-11', color: '', microchip: '',
//     value: '', currency: 'USD',
//     passport: { number: 'UK-EQ-2019-1108', authority: 'British Equestrian', issueDate: '2024-02-20', expiryDate: '2029-02-19', scan: { name: 'bella-passport.pdf' } },
//     fluDate: '2026-06-15', conditions: '', vetName: '', vetPhone: '',
//   },
// ];

// ---------------------------------------------------------------------------
// Hàm dựng dữ liệu
// ---------------------------------------------------------------------------
const place = (name: string, address: string, postal: string, contact: string, phone: string, notes = ''): Place =>
  ({ name, address, postal, contact, phone, notes });

const PLACES = {
  saigon: place('Saigon Riding Club', '12 Nguyễn Văn Hưởng, Thảo Điền, Thủ Đức', '700000', 'Alex Equine', '+84 90 5550 0110', 'Cổng mở lúc 06:00.'),
  hanoi: place('Hanoi Equestrian Club', '5 Đặng Thai Mai, Tây Hồ', '100000', 'Alex Equine', '+84 90 5550 0110'),
  danang: place('Da Nang Riding Center', '88 Võ Nguyên Giáp, Sơn Trà', '550000', 'Lê Thu Hà', '+84 93 5550 0121'),
  tokyo: place('Tokyo Racecourse Stables', '1-1 Hiyoshicho, Fuchu, Tokyo', '183-0024', 'Kenji Watanabe', '+81 42 5550 0188'),
  osaka: place('Hanshin Training Stables', '1-1 Komano-cho, Takarazuka', '665-0053', 'Yuki Sato', '+81 798 555 0102'),
  bangkok: place('Bangkok Polo Club', '88 Sukhumvit Soi 71, Watthana', '10110', 'Somchai P.', '+66 2 5550 0193'),
};

const hist = (at: string, role: ActorRole, action: string, detail?: string): HistoryEntry => ({
  at, role, action, detail,
  actor: role === 'CUSTOMER' ? mockProfile.name : role === 'LOGISTICS_MANAGER' ? 'Linh Pham' : role === 'TRANSPORT_SPECIALIST' ? 'Hoang Thu Ha'
    : role === 'FLEET_COORDINATOR' ? 'Dang Minh Quan' : role === 'CREW' ? 'Pham Van Duc' : 'Hệ thống',
});

function version(id: string, v: number, issuedAt: string, r: Pick<TransportRequest, 'origin' | 'destination' | 'horseCount'>,
  extra: Partial<ContractVersion> = {}): ContractVersion {
  const items = contractItems(r);
  return {
    v, number: `CT-${id.slice(4)}`, issuedAt, validUntil: addHours(issuedAt, 24), items, total: sumItems(items),
    depositPct: 30, state: 'ISSUED', ...extra,
  };
}

const approvedDocs = (horseId: string): DocRecord[] =>
  (['passport', 'ownership', 'flu', 'health'] as const).map((key) => ({ key, scope: horseId, status: 'APPROVED', updatedAt: '2026-09-30 10:00' }));

const companyDocs = (intl: boolean, status: CompanyDoc['status']): CompanyDoc[] => intl
  ? [{ name: 'Giấy phép xuất khẩu & tờ khai hải quan', status }, { name: 'Giấy phép nhập khẩu', status }, { name: 'Chứng nhận kiểm dịch xuất cảnh', status }]
  : [{ name: 'Giấy phép vận chuyển nội địa', status }];

function req(p: Partial<TransportRequest> & Pick<TransportRequest, 'id' | 'origin' | 'destination' | 'date' | 'status'>): TransportRequest {
  return {
    horseCount: 1, requestedAt: '2026-10-01', careNotes: '', pickup: emptyPlace(), delivery: emptyPlace(), horses: [''], horseNotes: {},
    wizardStep: 3, revisions: [], versions: [], payments: [], docs: [], supplements: [], companyDocs: [], complaints: [], history: [],
    ...p,
  };
}

function trip(id: string, t: Partial<Trip> & Pick<Trip, 'status' | 'mode' | 'plannedDepart' | 'eta' | 'stops'>): Trip {
  return { id, routeApproved: true, milestones: [], etaHistory: [], ...t };
}

// ---------------------------------------------------------------------------
// Yêu cầu vận chuyển (mỗi đơn minh họa một tình huống trong vòng đời)
// ---------------------------------------------------------------------------
const R8928 = { origin: 'Da Nang', destination: 'Tokyo', horseCount: 1 };
const R8925 = { origin: 'Ho Chi Minh City', destination: 'Osaka', horseCount: 1 };
const R8927 = { origin: 'Hanoi', destination: 'Da Nang', horseCount: 2 };
const R8941 = { origin: 'Ho Chi Minh City', destination: 'Hanoi', horseCount: 1 };
const R8942 = { origin: 'Hanoi', destination: 'Ho Chi Minh City', horseCount: 1 };
const R8924 = { origin: 'Hanoi', destination: 'Tokyo', horseCount: 1 };
const R8945 = { origin: 'Ho Chi Minh City', destination: 'Da Nang', horseCount: 1 };
const R8923 = { origin: 'Ho Chi Minh City', destination: 'Bangkok', horseCount: 1 };
const R8810 = { origin: 'Hanoi', destination: 'Ho Chi Minh City', horseCount: 1 };
const R8750 = { origin: 'London', destination: 'Dubai', horseCount: 1 };
const R8943 = { origin: 'Ho Chi Minh City', destination: 'Tokyo', horseCount: 1 };

const paid = (id: string, amount: number, at: string) =>
  ({ id, type: 'DEPOSIT' as const, method: 'QR_SANDBOX' as const, amount, status: 'SUCCESS' as const, createdAt: at, confirmedAt: addHours(at, 0.2) });
const deposit = (v: ContractVersion) => Math.round((v.total * v.depositPct) / 100);

const v8928a = version('TRN-8928', 1, '2026-10-03 09:00', R8928, {
  state: 'SUPERSEDED',
  change: { at: '2026-10-03 15:20', text: 'Xin dời ngày vận chuyển sang 25/10 vì lịch thi đấu thay đổi.', proposedDate: '2026-10-25',
    response: { at: '2026-10-04 09:00', text: 'Đã cập nhật ngày 25/10 trong phiên bản v2.' } },
});
const v8928b = version('TRN-8928', 2, '2026-10-04 09:00', R8928, { note: 'Đã cập nhật ngày vận chuyển theo đề nghị của khách hàng.' });
const v8925 = version('TRN-8925', 1, '2026-10-04 08:00', R8925, {
  state: 'CHANGES_REQUESTED',
  change: { at: '2026-10-04 10:15', text: 'Đề nghị giảm phí thủ tục vì chúng tôi đã có giấy phép nhập khẩu còn hiệu lực.', commercial: 'Giảm phí thủ tục xuất nhập khẩu' },
});
const v8927 = version('TRN-8927', 1, '2026-10-02 10:00', R8927);
const v8941 = version('TRN-8941', 1, '2026-10-04 07:00', R8941, { termsAcceptedAt: '2026-10-04 07:30' });
const v8942 = version('TRN-8942', 1, '2026-10-04 06:00', R8942, { termsAcceptedAt: '2026-10-04 06:20' });
const v8924 = version('TRN-8924', 1, '2026-10-02 09:00', R8924, { state: 'EFFECTIVE', termsAcceptedAt: '2026-10-02 10:00', signedAt: '2026-10-03 08:30' });
const v8945 = version('TRN-8945', 1, '2026-09-29 09:00', R8945, { state: 'EFFECTIVE', termsAcceptedAt: '2026-09-29 11:00', signedAt: '2026-09-29 14:00' });
const v8923 = version('TRN-8923', 1, '2026-09-29 09:00', R8923, { state: 'EFFECTIVE', termsAcceptedAt: '2026-09-29 10:00', signedAt: '2026-09-30 09:00' });
const v8810 = version('TRN-8810', 1, '2026-09-25 09:00', R8810, { state: 'EFFECTIVE', termsAcceptedAt: '2026-09-25 10:00', signedAt: '2026-09-25 15:00' });
const v8750 = version('TRN-8750', 1, '2026-08-03 09:00', R8750, { state: 'FULFILLED', termsAcceptedAt: '2026-08-03 10:00', signedAt: '2026-08-04 09:00' });
const v8943 = version('TRN-8943', 1, '2026-10-01 09:00', R8943, { termsAcceptedAt: '2026-10-01 10:00' });

export const mockRequests: TransportRequest[] = [
  req({
    id: 'TRN-8931', origin: 'Ho Chi Minh City', destination: 'Hanoi', date: '2026-10-20', status: 'DRAFT', horseCount: 2,
    requestedAt: '2026-10-04', horses: ['HOR-1029', ''], wizardStep: 2, pickup: PLACES.saigon, delivery: PLACES.hanoi,
    careNotes: 'Cần dừng nghỉ mỗi 4 giờ.',
    history: [hist('2026-10-04 09:10', 'CUSTOMER', 'Tạo bản nháp yêu cầu', 'Ho Chi Minh City → Hanoi • 2 ngựa')],
  }),
  req({
    id: 'TRN-8930', origin: 'Ho Chi Minh City', destination: 'Tokyo', date: '2026-10-28', status: 'PENDING_REVIEW',
    requestedAt: '2026-10-04', submittedAt: '2026-10-04 08:40', horses: ['HOR-1092'], pickup: PLACES.saigon, delivery: PLACES.tokyo,
    careNotes: 'Mang theo lưới cỏ khô và xô nước quen dùng.',
    history: [hist('2026-10-04 08:40', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Ho Chi Minh City → Tokyo • 1 ngựa')],
  }),
  req({
    id: 'TRN-8926', origin: 'Hanoi', destination: 'Da Nang', date: '2026-10-08', status: 'CHANGES_REQUESTED',
    requestedAt: '2026-10-02', submittedAt: '2026-10-02 14:00', horses: ['HOR-1035'], pickup: PLACES.hanoi, delivery: PLACES.danang,
    feedback: 'Ngày 08/10 đội xe đã kín lịch. Vui lòng chọn ngày từ 12/10 trở đi và bổ sung yêu cầu chăm sóc cho ngựa có dị ứng.',
    revisionFields: ['date', 'notes'],
    history: [
      hist('2026-10-02 14:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Hanoi → Da Nang • 1 ngựa'),
      hist('2026-10-03 10:20', 'LOGISTICS_MANAGER', 'Yêu cầu chỉnh sửa', 'Đổi ngày vận chuyển, bổ sung ghi chú chăm sóc'),
    ],
  }),
  req({
    id: 'TRN-8929', origin: 'Da Nang', destination: 'Ho Chi Minh City', date: '2026-10-22', status: 'CONTRACT_PREPARATION',
    requestedAt: '2026-10-03', submittedAt: '2026-10-03 09:00', horses: ['HOR-1101'], pickup: PLACES.danang, delivery: PLACES.saigon,
    history: [
      hist('2026-10-03 09:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển', 'Da Nang → Ho Chi Minh City • 1 ngựa'),
      hist('2026-10-03 16:00', 'LOGISTICS_MANAGER', 'Chấp nhận yêu cầu', 'Bắt đầu soạn hợp đồng'),
    ],
  }),
  req({
    id: 'TRN-8928', ...R8928, date: '2026-10-25', status: 'CONTRACT_READY',
    requestedAt: '2026-10-02', submittedAt: '2026-10-02 10:00', horses: ['HOR-1092'], pickup: PLACES.danang, delivery: PLACES.tokyo,
    versions: [v8928a, v8928b],
    history: [
      hist('2026-10-02 10:00', 'CUSTOMER', 'Gửi yêu cầu vận chuyển'),
      hist('2026-10-02 15:00', 'LOGISTICS_MANAGER', 'Chấp nhận yêu cầu'),
      hist('2026-10-03 09:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8928 v1'),
      hist('2026-10-03 15:20', 'CUSTOMER', 'Yêu cầu sửa hợp đồng', v8928a.change!.text),
      hist('2026-10-04 09:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng sửa đổi', 'CT-8928 v2'),
    ],
  }),
  req({
    id: 'TRN-8925', ...R8925, date: '2026-10-30', status: 'CONTRACT_CHANGES_REQUESTED',
    requestedAt: '2026-10-02', submittedAt: '2026-10-02 16:00', horses: ['HOR-1029'], pickup: PLACES.saigon, delivery: PLACES.osaka,
    versions: [v8925],
    history: [
      hist('2026-10-04 08:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8925 v1'),
      hist('2026-10-04 10:15', 'CUSTOMER', 'Yêu cầu sửa hợp đồng', v8925.change!.text),
    ],
  }),
  req({
    id: 'TRN-8927', ...R8927, date: '2026-10-15', status: 'CONTRACT_READY',
    requestedAt: '2026-09-30', submittedAt: '2026-09-30 11:00', horses: ['HOR-1029', 'HOR-1035'], pickup: PLACES.hanoi, delivery: PLACES.danang,
    versions: [v8927],
    history: [hist('2026-10-02 10:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8927 v1')],
  }),
  req({
    id: 'TRN-8941', ...R8941, date: '2026-10-19', status: 'CONTRACT_READY',
    requestedAt: '2026-10-01', submittedAt: '2026-10-01 09:00', horses: ['HOR-1101'], pickup: PLACES.saigon, delivery: PLACES.hanoi,
    versions: [v8941],
    payments: [{ id: 'PAY-5101', type: 'DEPOSIT', method: 'QR_SANDBOX', amount: deposit(v8941), status: 'PROCESSING', createdAt: '2026-10-04 07:40' }],
    history: [
      hist('2026-10-04 07:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8941 v1'),
      hist('2026-10-04 07:30', 'CUSTOMER', 'Đồng ý điều khoản hợp đồng', 'CT-8941 v1'),
      hist('2026-10-04 07:40', 'CUSTOMER', 'Thanh toán cọc bằng QR Sandbox', 'PAY-5101'),
    ],
  }),
  req({
    id: 'TRN-8942', ...R8942, date: '2026-10-21', status: 'DEPOSIT_VERIFIED',
    requestedAt: '2026-10-01', submittedAt: '2026-10-01 14:00', horses: ['HOR-1035'], pickup: PLACES.hanoi, delivery: PLACES.saigon,
    versions: [v8942], payments: [paid('PAY-5102', deposit(v8942), '2026-10-04 06:40')],
    history: [
      hist('2026-10-04 06:00', 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', 'CT-8942 v1'),
      hist('2026-10-04 06:20', 'CUSTOMER', 'Đồng ý điều khoản hợp đồng'),
      hist('2026-10-04 06:52', 'SYSTEM', 'Sandbox xác minh tiền cọc', 'PAY-5102'),
    ],
  }),
  req({
    id: 'TRN-8924', ...R8924, date: '2026-10-18', status: 'ACTIVATED',
    requestedAt: '2026-10-01', submittedAt: '2026-10-01 10:00', horses: ['HOR-1035'], pickup: PLACES.hanoi, delivery: PLACES.tokyo,
    careNotes: 'Mang theo lưới cỏ khô và xô nước quen dùng.',
    versions: [v8924], payments: [paid('PAY-5090', deposit(v8924), '2026-10-02 11:00')],
    docs: [
      { key: 'passport', scope: 'HOR-1035', status: 'APPROVED', updatedAt: '2026-10-03 14:00' },
      { key: 'ownership', scope: 'HOR-1035', status: 'APPROVED', updatedAt: '2026-10-03 14:00' },
      { key: 'flu', scope: 'HOR-1035', status: 'ACTION_REQUIRED', file: { name: 'shadowfax-vaccination.pdf' },
        issue: 'Lần tiêm cúm gần nhất đã quá 12 tháng. Vui lòng tiêm nhắc lại và tải sổ tiêm mới.', updatedAt: '2026-10-03 14:10' },
      { key: 'health', scope: 'HOR-1035', status: 'PENDING_REVIEW', file: { name: 'shadowfax-health-cert.pdf' }, updatedAt: '2026-10-03 16:00' },
    ],
    supplements: [{ id: 'SUP-301', key: 'raceReg', scope: 'request', reason: 'Chuyến phục vụ giải Tokyo Autumn Cup – cần giấy đăng ký giải để làm thủ tục tạm nhập.', at: '2026-10-03 14:20', by: 'Hoang Thu Ha', status: 'OPEN' }],
    companyDocs: companyDocs(true, 'PROCESSING'),
    trip: trip('TRP-902', { status: 'PLANNING', mode: 'AIR', routeApproved: false, plannedDepart: '2026-10-18 06:00', eta: '2026-10-19 06:00', stops: [] }),
    history: [
      hist('2026-10-03 08:30', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8924 v1 – yêu cầu được kích hoạt'),
      hist('2026-10-03 14:10', 'TRANSPORT_SPECIALIST', 'Từ chối giấy tờ', 'Sổ tiêm ngừa – Shadowfax'),
      hist('2026-10-03 14:20', 'TRANSPORT_SPECIALIST', 'Yêu cầu bổ sung giấy tờ', 'Giấy đăng ký giải đua'),
    ],
  }),
  req({
    id: 'TRN-8945', ...R8945, date: '2026-10-07', status: 'SCHEDULED',
    requestedAt: '2026-09-27', submittedAt: '2026-09-27 10:00', horses: ['HOR-1029'], pickup: PLACES.saigon, delivery: PLACES.danang,
    versions: [v8945], payments: [paid('PAY-5060', deposit(v8945), '2026-09-29 12:00')],
    docs: approvedDocs('HOR-1029'), companyDocs: companyDocs(false, 'COMPLETED'),
    trip: trip('TRP-903', {
      status: 'READY_TO_DEPART', mode: 'ROAD', plannedDepart: '2026-10-07 06:00', eta: '2026-10-07 22:00',
      stops: [
        { name: 'Saigon Riding Club', type: 'ORIGIN', plannedAt: '2026-10-07 06:00' },
        { name: 'Trạm nghỉ Phan Thiết', type: 'REST_STOP', plannedAt: '2026-10-07 10:00' },
        { name: 'Trạm nghỉ Quy Nhơn', type: 'REST_STOP', plannedAt: '2026-10-07 16:30' },
        { name: 'Da Nang Riding Center', type: 'DESTINATION', plannedAt: '2026-10-07 22:00' },
      ],
    }),
    history: [hist('2026-10-03 17:00', 'LOGISTICS_MANAGER', 'Duyệt khởi hành', 'TRP-903 sẵn sàng khởi hành 07/10 06:00')],
  }),
  req({
    id: 'TRN-8923', ...R8923, date: '2026-10-04', status: 'IN_TRANSIT',
    requestedAt: '2026-09-28', submittedAt: '2026-09-28 09:15', horses: ['HOR-1029'], pickup: PLACES.saigon, delivery: PLACES.bangkok,
    versions: [v8923], payments: [paid('PAY-5051', deposit(v8923), '2026-09-29 16:00')],
    docs: approvedDocs('HOR-1029'), companyDocs: companyDocs(true, 'COMPLETED'),
    trip: trip('TRP-901', {
      status: 'IN_TRANSIT', mode: 'ROAD', plannedDepart: '2026-10-04 06:30', eta: '2026-10-05 18:00', etaOriginal: '2026-10-05 16:00',
      stops: [
        { name: 'Saigon Riding Club', type: 'ORIGIN', plannedAt: '2026-10-04 06:30' },
        { name: 'Cửa khẩu Mộc Bài', type: 'CHECKPOINT', plannedAt: '2026-10-04 09:30' },
        { name: 'Trạm nghỉ Phnom Penh', type: 'REST_STOP', plannedAt: '2026-10-04 14:00' },
        { name: 'Cửa khẩu Poipet', type: 'CHECKPOINT', plannedAt: '2026-10-05 08:00' },
        { name: 'Bangkok Polo Club', type: 'DESTINATION', plannedAt: '2026-10-05 16:00' },
      ],
      milestones: [
        { type: 'DEPARTED', stopIndex: 0, at: '2026-10-04 06:40', by: 'Pham Van Duc' },
        { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-04 10:00', by: 'Pham Van Duc', note: 'Đang làm thủ tục thông quan' },
        { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-04 11:10', by: 'Pham Van Duc' },
      ],
      etaHistory: [{ at: '2026-10-04 11:15', from: '2026-10-05 16:00', to: '2026-10-05 18:00', reason: 'Thông quan tại Mộc Bài lâu hơn dự kiến' }],
    }),
    history: [
      hist('2026-09-30 09:00', 'CUSTOMER', 'Ký hợp đồng bằng OTP', 'CT-8923 v1'),
      hist('2026-10-04 06:40', 'CREW', 'Xuất phát', 'Saigon Riding Club'),
    ],
  }),
  req({
    id: 'TRN-8810', ...R8810, date: '2026-10-03', status: 'DELIVERED',
    requestedAt: '2026-09-22', submittedAt: '2026-09-22 10:00', horses: ['HOR-1101'], pickup: PLACES.hanoi, delivery: PLACES.saigon,
    versions: [v8810], payments: [paid('PAY-5030', deposit(v8810), '2026-09-25 14:00')],
    docs: approvedDocs('HOR-1101'), companyDocs: companyDocs(false, 'COMPLETED'),
    trip: trip('TRP-880', {
      status: 'COMPLETED', mode: 'ROAD', plannedDepart: '2026-10-03 05:00', eta: '2026-10-04 09:00',
      stops: [
        { name: 'Hanoi Equestrian Club', type: 'ORIGIN', plannedAt: '2026-10-03 05:00' },
        { name: 'Trạm nghỉ Vinh', type: 'REST_STOP', plannedAt: '2026-10-03 11:00' },
        { name: 'Trạm nghỉ Đà Nẵng', type: 'REST_STOP', plannedAt: '2026-10-03 20:00' },
        { name: 'Saigon Riding Club', type: 'DESTINATION', plannedAt: '2026-10-04 09:00' },
      ],
      milestones: [
        { type: 'DEPARTED', stopIndex: 0, at: '2026-10-03 05:10' },
        { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-03 11:20' },
        { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-03 12:00' },
        { type: 'ARRIVED_STOP', stopIndex: 2, at: '2026-10-03 20:10' },
        { type: 'LEFT_STOP', stopIndex: 2, at: '2026-10-03 21:00' },
        { type: 'ARRIVED_DESTINATION', stopIndex: 3, at: '2026-10-04 09:30' },
      ],
      handover: {
        completedAt: '2026-10-04 10:00', receiverName: 'Alex Equine', receiverId: 'CCCD 079****1234',
        horses: [{ horseId: 'HOR-1101', microchipOk: true, condition: 'NORMAL' }],
        photos: ['handover-starboy-1.jpg', 'handover-starboy-2.jpg'],
      },
    }),
    acceptance: { status: 'PENDING', openedAt: '2026-10-04 10:00', dueAt: '2026-10-05 10:00' },
    history: [
      hist('2026-10-04 09:30', 'CREW', 'Đến điểm giao', 'Saigon Riding Club'),
      hist('2026-10-04 10:00', 'CREW', 'Hoàn tất bàn giao có xác minh', 'Người nhận: Alex Equine'),
    ],
  }),
  // ----- Lịch sử -----
  req({
    id: 'TRN-8750', ...R8750, date: '2026-08-15', status: 'CLOSED', closedAt: '2026-08-18 10:00',
    requestedAt: '2026-08-01', submittedAt: '2026-08-01 10:00', horses: ['HOR-1108'],
    pickup: place('Royal Windsor Stables', 'Windsor Great Park', 'SL4 2HT', 'Oliver B.', '+44 20 5550 0133'),
    delivery: place('Dubai Equestrian Club', 'Al Qudra Road', '00000', 'Omar K.', '+971 4 555 0177'),
    versions: [v8750],
    payments: [paid('PAY-4801', deposit(v8750), '2026-08-04 08:00'),
      { id: 'PAY-4840', type: 'BALANCE', method: 'VNPAY', amount: v8750.total - deposit(v8750), status: 'SUCCESS', createdAt: '2026-08-16 15:00', confirmedAt: '2026-08-16 15:05' }],
    docs: approvedDocs('HOR-1108'), companyDocs: companyDocs(true, 'COMPLETED'),
    trip: trip('TRP-720', {
      status: 'COMPLETED', mode: 'AIR', plannedDepart: '2026-08-15 06:00', eta: '2026-08-16 08:00',
      stops: [
        { name: 'Royal Windsor Stables', type: 'ORIGIN', plannedAt: '2026-08-15 06:00' },
        { name: 'Sân bay London Heathrow', type: 'AIRPORT', plannedAt: '2026-08-15 10:00' },
        { name: 'Sân bay Dubai', type: 'AIRPORT', plannedAt: '2026-08-15 22:00' },
        { name: 'Dubai Equestrian Club', type: 'DESTINATION', plannedAt: '2026-08-16 08:00' },
      ],
      milestones: [
        { type: 'DEPARTED', stopIndex: 0, at: '2026-08-15 06:05' },
        { type: 'ARRIVED_DESTINATION', stopIndex: 3, at: '2026-08-16 07:40' },
      ],
      handover: { completedAt: '2026-08-16 08:10', receiverName: 'Omar K.', receiverId: 'Passport A1234567', horses: [{ horseId: 'HOR-1108', microchipOk: true, condition: 'NORMAL' }], photos: ['handover-bella.jpg'] },
    }),
    acceptance: { status: 'ACCEPTED', openedAt: '2026-08-16 08:10', dueAt: '2026-08-17 08:10', decidedAt: '2026-08-16 14:00' },
    history: [hist('2026-08-18 10:00', 'LOGISTICS_MANAGER', 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng')],
  }),
  req({
    id: 'TRN-8943', ...R8943, date: '2026-10-12', status: 'CANCELLED', reason: 'Khách hàng hủy: giải đua tại Tokyo bị hoãn.',
    requestedAt: '2026-09-29', submittedAt: '2026-09-29 10:00', horses: ['HOR-1092'], pickup: PLACES.saigon, delivery: PLACES.tokyo,
    versions: [v8943], payments: [paid('PAY-5080', deposit(v8943), '2026-10-01 11:00')],
    refund: { amount: deposit(v8943), status: 'REQUESTED', at: '2026-10-02 09:00' },
    history: [
      hist('2026-10-01 18:00', 'CUSTOMER', 'Yêu cầu hủy', 'Giải đua tại Tokyo bị hoãn'),
      hist('2026-10-02 09:00', 'LOGISTICS_MANAGER', 'Duyệt hủy & yêu cầu hoàn cọc', 'Hoàn toàn bộ tiền cọc đã xác minh'),
    ],
  }),
  req({
    id: 'TRN-8602', origin: 'Ho Chi Minh City', destination: 'Hanoi', date: '2026-07-10', status: 'CANCELLED',
    requestedAt: '2026-06-28', submittedAt: '2026-06-28 10:00', horses: ['HOR-1029'], reason: 'Khách hàng hủy trước ngày khởi hành.',
    history: [hist('2026-06-30 09:00', 'CUSTOMER', 'Hủy yêu cầu', 'Đổi kế hoạch thi đấu')],
  }),
  req({
    id: 'TRN-8511', origin: 'Bangkok', destination: 'Ho Chi Minh City', date: '2026-06-05', status: 'REJECTED',
    requestedAt: '2026-05-22', submittedAt: '2026-05-22 10:00', horses: ['HOR-1092'], reason: 'Không thể bố trí phương tiện cho ngày vận chuyển đã chọn.',
    history: [hist('2026-05-23 11:00', 'LOGISTICS_MANAGER', 'Từ chối yêu cầu', 'Không thể bố trí phương tiện')],
  }),
];

export const mockNotifications: CustomerNotification[] = [
  { id: 'N-1', title: 'Hợp đồng sửa đổi cho TRN-8928', body: 'CT-8928 v2 đã phát hành. Hãy xem và đồng ý điều khoản trong 24 giờ.', at: '2026-10-04 09:00', read: false, link: '/customer/requests/TRN-8928/contract' },
  { id: 'N-2', title: 'Cần nộp lại giấy tờ • TRN-8924', body: 'Sổ tiêm ngừa của Shadowfax bị từ chối; Specialist yêu cầu bổ sung giấy đăng ký giải đua.', at: '2026-10-03 14:20', read: false, link: '/customer/requests/TRN-8924/documents' },
  { id: 'N-3', title: 'Đã bàn giao Starboy • TRN-8810', body: 'Vui lòng nghiệm thu và thanh toán số dư trước 05/10/2026 10:00.', at: '2026-10-04 10:00', read: false, link: '/customer/requests/TRN-8810/handover' },
  { id: 'N-4', title: 'Tiền cọc đã được xác minh • TRN-8942', body: 'Bạn có thể ký hợp đồng CT-8942 v1 bằng OTP.', at: '2026-10-04 06:52', read: true, link: '/customer/requests/TRN-8942/contract' },
];
