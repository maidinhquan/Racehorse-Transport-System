import type { CrewMember, Horse, Incident, Trip } from '../types';

// ============================================================================
// Dữ liệu giả lập khi Backend chưa sẵn sàng (theo bản HTML demo CBN Transport)
// Ngày "hiện tại" của demo: 2026-10-04
// ============================================================================
export const DEMO_TODAY = '2026-10-04';

/** Tài khoản demo có thể chuyển qua lại trong cổng Tài xế / Hộ tống */
export const DRIVER_USERS = ['EMP-21', 'EMP-31', 'EMP-25', 'EMP-24'];
export const DEFAULT_DRIVER_USER = 'EMP-21';

/** Thời gian chờ giữa 2 lần ghi mốc (giây) – tránh bấm nhầm liên tiếp */
export const MS_COOLDOWN_SEC = 60;

export const mockCrew: CrewMember[] = [
  { id: 'EMP-21', name: 'Nguyen Van Hung', role: 'DRIVER', phone: '+84 90 5551 0021' },
  { id: 'EMP-22', name: 'Le Quoc Tuan', role: 'DRIVER', phone: '+84 90 5551 0022' },
  { id: 'EMP-23', name: 'Pham Thanh Son', role: 'DRIVER', phone: '+84 90 5551 0023' },
  { id: 'EMP-25', name: 'Bui Van Long', role: 'DRIVER', phone: '+84 90 5551 0025' },
  { id: 'EMP-24', name: 'Somsak Wongsa', role: 'DRIVER', phone: '+66 81 555 0024' },
  { id: 'EMP-33', name: 'Vo Thi Mai', role: 'ESCORT', phone: '+84 90 5551 0033' },
  { id: 'EMP-31', name: 'Dr. Nguyen Minh Anh', role: 'VETERINARIAN', phone: '+84 28 5550 0142' },
  { id: 'EMP-32', name: 'Dr. Tran Quoc Bao', role: 'VETERINARIAN', phone: '+84 24 5550 0177' },
];

export const mockHorses: Horse[] = [
  { id: 'H-01', name: 'Thunderbolt', breed: 'Thoroughbred', sex: 'Ngựa đực thiến', age: 6, color: 'Nâu đỏ', microchip: '982000123456781' },
  { id: 'H-04', name: 'Midnight Star', breed: 'Arabian', sex: 'Ngựa cái', age: 5, color: 'Đen', microchip: '982000123456784' },
  { id: 'H-05', name: 'Golden Arrow', breed: 'Thoroughbred', sex: 'Ngựa đực', age: 4, color: 'Hạt dẻ', microchip: '982000123456785' },
  { id: 'H-06', name: 'Silver Wind', breed: 'Warmblood', sex: 'Ngựa cái', age: 7, color: 'Xám', microchip: '982000123456786' },
  { id: 'H-07', name: 'Lanna Spirit', breed: 'Thoroughbred', sex: 'Ngựa đực thiến', age: 5, color: 'Nâu', microchip: '764000223456787' },
  { id: 'H-09', name: 'Red Comet', breed: 'Quarter Horse', sex: 'Ngựa đực', age: 8, color: 'Hạt dẻ', microchip: '982000123456789' },
];

export const mockTrips: Trip[] = [
  {
    id: 'TRP-901', requestId: 'TRN-8923', customer: 'Alex Equine Stables', mode: 'ROAD',
    origin: 'Ho Chi Minh City', destination: 'Bangkok',
    pickup: { name: 'Saigon Riding Club', address: '1 Nguyen Huu Canh, Binh Thanh, TP.HCM' },
    delivery: { name: 'Bangkok Polo Club', address: '6 Soi Polo, Wireless Rd, Bangkok' },
    receiver: { name: 'Somchai Rattana', phone: '+66 81 222 3344' },
    notes: 'Ngựa nhạy tiếng ồn – hạn chế bấm còi, nghỉ 30 phút mỗi 4 giờ.',
    horses: ['H-01'], plannedDepart: '2026-10-04 06:00', eta: '2026-10-06 16:00', status: 'IN_TRANSIT',
    vehicle: { plate: '51H-313.07', model: 'Isuzu FVR Horse Box' },
    crew: { MAIN_DRIVER: 'EMP-21', CO_DRIVER: 'EMP-22', VETERINARIAN: 'EMP-31' },
    stops: [
      { id: 's1', name: 'Saigon Riding Club', type: 'ORIGIN', country: 'VN', plannedAt: '2026-10-04 06:00', lat: 10.7769, lng: 106.7009 },
      { id: 's2', name: 'Trang Bang rest area', type: 'REST_STOP', country: 'VN', plannedAt: '2026-10-04 08:00', lat: 11.0333, lng: 106.35 },
      { id: 's3', name: 'Moc Bai Border Gate', type: 'CHECKPOINT', country: 'VN', plannedAt: '2026-10-04 10:00', lat: 11.065, lng: 106.172 },
      { id: 's4', name: 'Bavet Border Gate', type: 'CHECKPOINT', country: 'KH', plannedAt: '2026-10-04 11:00', lat: 11.074, lng: 106.16 },
      { id: 's5', name: 'Phnom Penh overnight stable', type: 'REST_STOP', country: 'KH', plannedAt: '2026-10-04 18:00', lat: 11.5564, lng: 104.9282 },
      { id: 's6', name: 'Poipet – Aranyaprathet', type: 'CHECKPOINT', country: 'TH', plannedAt: '2026-10-05 13:00', lat: 13.655, lng: 102.508 },
      { id: 's7', name: 'Sa Kaeo fuel station', type: 'FUEL_STOP', country: 'TH', plannedAt: '2026-10-05 15:00', lat: 13.814, lng: 102.072 },
      { id: 's8', name: 'Bangkok Polo Club', type: 'DESTINATION', country: 'TH', plannedAt: '2026-10-06 16:00', lat: 13.7367, lng: 100.542 },
    ],
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-10-04 07:00', by: 'EMP-21' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-04 08:10', by: 'EMP-21' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-04 08:40', by: 'EMP-21', note: 'Ngựa uống nước tốt' },
      { type: 'ARRIVED_CHECKPOINT', stopIndex: 2, at: '2026-10-04 10:00', by: 'EMP-21' },
    ],
    clearances: [],
    health: [
      { id: 'HL-1', horseId: 'H-01', at: '2026-10-04 06:15', temp: 37.8, hr: 38, condition: 'NORMAL', notes: 'Ăn cỏ tốt trước khi lên xe.', by: 'EMP-31' },
      { id: 'HL-2', horseId: 'H-01', at: '2026-10-04 08:20', temp: 37.9, hr: 40, condition: 'NORMAL', notes: 'Uống 6 lít nước tại trạm nghỉ.', by: 'EMP-31' },
    ],
    documents: [
      {
        id: 'PKG-11', title: 'Bộ hồ sơ xuất cảnh Việt Nam', checkpoint: 'Moc Bai Border Gate', releasedAt: '2026-10-03 16:00', releasedBy: 'Hoang Thu Ha',
        items: [
          { name: 'Giấy chứng nhận kiểm dịch động vật xuất khẩu', horseId: 'H-01', version: 1, number: 'KD-2026-0912', expiry: '2026-10-18' },
          { name: 'Hộ chiếu ngựa (Equine Passport)', horseId: 'H-01', version: 2, number: 'VN-EQ-77812' },
          { name: 'Tờ khai hải quan tạm xuất', version: 1, number: 'TK-301928' },
        ],
      },
      {
        id: 'PKG-12', title: 'Hồ sơ nhập cảnh Thái Lan', checkpoint: 'Poipet – Aranyaprathet', releasedAt: '2026-10-03 16:30', releasedBy: 'Hoang Thu Ha',
        items: [
          { name: 'Giấy phép nhập khẩu động vật (DLD)', horseId: 'H-01', version: 1, number: 'DLD-88123', expiry: '2026-11-01' },
          { name: 'Giấy phép quá cảnh Campuchia', version: 1, number: 'KH-TR-5521', expiry: '2026-10-10' },
        ],
      },
    ],
    handoverAttempts: [],
  },
  {
    id: 'TRP-903', requestId: 'TRN-8919', customer: 'Saigon Racing Stable', mode: 'ROAD',
    origin: 'Da Nang', destination: 'Ho Chi Minh City',
    pickup: { name: 'Da Nang Equestrian Center', address: '120 Vo Nguyen Giap, Son Tra, Da Nang' },
    delivery: { name: 'Saigon Racing Stable', address: '86 Le Van Viet, Thu Duc, TP.HCM' },
    receiver: { name: 'Tran Minh Khoa', phone: '+84 90 812 3456' },
    horses: ['H-04', 'H-05', 'H-06'], plannedDepart: '2026-10-09 05:00', eta: '2026-10-10 18:00', status: 'READY_TO_DEPART',
    vehicle: { plate: '43H-246.81', model: 'Hino 500 Horse Transporter' },
    crew: { MAIN_DRIVER: 'EMP-25', CO_DRIVER: 'EMP-23', VETERINARIAN: 'EMP-32' },
    stops: [
      { id: 's1', name: 'Da Nang Equestrian Center', type: 'ORIGIN', country: 'VN', plannedAt: '2026-10-09 05:00', lat: 16.0544, lng: 108.2022 },
      { id: 's2', name: 'Quy Nhon rest stable', type: 'REST_STOP', country: 'VN', plannedAt: '2026-10-09 14:00', lat: 13.782, lng: 109.2194 },
      { id: 's3', name: 'Phan Thiet fuel station', type: 'FUEL_STOP', country: 'VN', plannedAt: '2026-10-10 09:00', lat: 10.9333, lng: 108.1 },
      { id: 's4', name: 'Saigon Racing Stable', type: 'DESTINATION', country: 'VN', plannedAt: '2026-10-10 18:00', lat: 10.8231, lng: 106.6297 },
    ],
    milestones: [], clearances: [], health: [],
    documents: [
      {
        id: 'PKG-21', title: 'Hồ sơ vận chuyển nội địa', releasedAt: '2026-10-08 10:00', releasedBy: 'Hoang Thu Ha',
        items: [
          { name: 'Giấy chứng nhận kiểm dịch vận chuyển nội địa', version: 1, number: 'KD-ND-4410', expiry: '2026-10-15' },
          { name: 'Giấy chứng nhận sức khoẻ', horseId: 'H-04', version: 1 },
          { name: 'Giấy chứng nhận sức khoẻ', horseId: 'H-05', version: 1 },
          { name: 'Giấy chứng nhận sức khoẻ', horseId: 'H-06', version: 1 },
        ],
      },
    ],
    handoverAttempts: [],
  },
  {
    id: 'TRP-904', requestId: 'TRN-8921', customer: 'Royal Turf Club Bangkok', mode: 'ROAD',
    origin: 'Bangkok', destination: 'Singapore',
    pickup: { name: 'Royal Turf Club Bangkok', address: 'Henri Dunant Rd, Pathum Wan, Bangkok' },
    delivery: { name: 'Singapore Turf Club Stables', address: '1 Turf Club Ave, Singapore' },
    receiver: { name: 'Daniel Tan', phone: '+65 9123 4567' },
    horses: ['H-07'], plannedDepart: '2026-10-20 05:00', eta: '2026-10-22 17:00', status: 'PLANNING',
    vehicle: { plate: '70-4821 BKK', model: 'Volvo FM Horse Truck' },
    crew: { MAIN_DRIVER: 'EMP-24' },
    stops: [], milestones: [], clearances: [], health: [], documents: [], handoverAttempts: [],
  },
  {
    id: 'TRP-870', requestId: 'TRN-8801', customer: 'Saigon Racing Stable', mode: 'ROAD',
    origin: 'Ho Chi Minh City', destination: 'Da Nang',
    pickup: { name: 'Saigon Racing Stable', address: '86 Le Van Viet, Thu Duc, TP.HCM' },
    delivery: { name: 'Da Nang Equestrian Center', address: '120 Vo Nguyen Giap, Son Tra, Da Nang' },
    receiver: { name: 'Le Thi Hoa', phone: '+84 90 333 4455' },
    horses: ['H-09'], plannedDepart: '2026-09-20 05:00', eta: '2026-09-21 17:00', status: 'COMPLETED',
    vehicle: { plate: '51H-313.07', model: 'Isuzu FVR Horse Box' },
    crew: { MAIN_DRIVER: 'EMP-21', CO_DRIVER: 'EMP-23', VETERINARIAN: 'EMP-31' },
    stops: [
      { id: 's1', name: 'Saigon Racing Stable', type: 'ORIGIN', country: 'VN', plannedAt: '2026-09-20 05:00', lat: 10.8231, lng: 106.6297 },
      { id: 's2', name: 'Nha Trang rest stable', type: 'REST_STOP', country: 'VN', plannedAt: '2026-09-20 15:00', lat: 12.2388, lng: 109.1967 },
      { id: 's3', name: 'Da Nang Equestrian Center', type: 'DESTINATION', country: 'VN', plannedAt: '2026-09-21 17:00', lat: 16.0544, lng: 108.2022 },
    ],
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-09-20 05:10', by: 'EMP-21' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-09-20 15:20', by: 'EMP-21' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-09-21 05:00', by: 'EMP-21' },
      { type: 'ARRIVED_DESTINATION', stopIndex: 2, at: '2026-09-21 16:30', by: 'EMP-21' },
    ],
    clearances: [],
    health: [
      { id: 'HL-9', horseId: 'H-09', at: '2026-09-20 15:40', temp: 38.0, hr: 42, condition: 'NORMAL', notes: 'Nghỉ qua đêm tại chuồng tạm.', by: 'EMP-31' },
    ],
    documents: [],
    handover: {
      completedAt: '2026-09-21 17:05',
      receiver: { name: 'Le Thi Hoa', idType: 'Căn cước công dân', idNumber: '079188001234' },
      horses: [{ horseId: 'H-09', condition: 'NORMAL', notes: '' }],
      photos: ['ban-giao-red-comet.jpg'], signature: 'Le Thi Hoa', by: 'EMP-21',
    },
    handoverAttempts: [{ at: '2026-09-21 17:05', status: 'COMPLETED', by: 'EMP-21' }],
    handoverStatus: 'COMPLETED',
  },
];

export const mockIncidents: Incident[] = [
  {
    id: 'INC-301', tripId: 'TRP-901', type: 'BORDER_DELAY', severity: 'MEDIUM', status: 'IN_PROGRESS',
    at: '2026-10-04 10:40', by: 'EMP-21', location: 'Tại Moc Bai Border Gate',
    description: 'Chậm trễ tại cửa khẩu Mộc Bài do kiểm tra hồ sơ kéo dài.', photos: [],
    approvedPlan: 'Giữ ngựa trong xe có thông gió, bác sĩ theo dõi 30 phút/lần; ETA dự kiến trễ 2 giờ.',
  },
];
