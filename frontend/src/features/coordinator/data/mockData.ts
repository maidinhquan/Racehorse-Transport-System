import type { Incident, Staff, Trip, Vehicle } from '../types';

// ============================================================================
// Dữ liệu giả lập khi Backend chưa sẵn sàng (giống bản HTML demo)
// Ngày "hiện tại" của demo: 2026-10-04
// ============================================================================
export const DEMO_TODAY = '2026-10-04';
export const COORDINATOR_NAME = 'Dang Minh Quan';

export const COUNTRY_NAME: Record<string, string> = {
  VN: 'Việt Nam', TH: 'Thái Lan', KH: 'Campuchia', MY: 'Malaysia', SG: 'Singapore', JP: 'Nhật Bản',
};

export const mockVehicles: Vehicle[] = [
  { id: 'VH-11', plate: '43H-246.81', model: 'Hino 500 Horse Transporter', stalls: 4, country: 'VN', base: 'Da Nang', status: 'READY', nextService: '2026-12-10', features: 'Air suspension, CCTV, water tank 400 L' },
  { id: 'VH-12', plate: '51H-313.07', model: 'Isuzu FVR Horse Box', stalls: 2, country: 'VN', base: 'Ho Chi Minh City', status: 'READY', nextService: '2026-11-02', features: 'Air suspension, ventilation fans' },
  { id: 'VH-13', plate: '30H-771.25', model: 'Hino 500 Horse Transporter', stalls: 4, country: 'VN', base: 'Hanoi', status: 'READY', nextService: '2027-01-15', features: 'Air suspension, CCTV' },
  { id: 'VH-14', plate: '70-4821 BKK', model: 'Volvo FM Horse Truck', stalls: 6, country: 'TH', base: 'Bangkok', status: 'READY', nextService: '2026-12-20', features: 'Climate control, CCTV, ramp lift' },
  { id: 'VH-15', plate: '51H-902.44', model: 'Isuzu FVR Horse Box', stalls: 2, country: 'VN', base: 'Ho Chi Minh City', status: 'MAINTENANCE', nextService: '2026-10-08', features: 'Ventilation fans' },
  { id: 'VH-SG-01', plate: 'SG-DEMO-801', model: 'Singapore Horse Transporter (Demo)', stalls: 4, country: 'SG', base: 'Singapore', status: 'READY', nextService: '2027-02-15', features: 'Climate control, safety partitions' },
  { id: 'VH-JP-01', plate: 'JP-DEMO-301', model: 'Tokyo Horse Van (Demo)', stalls: 4, country: 'JP', base: 'Tokyo', status: 'READY', nextService: '2027-03-01', features: 'Climate control' },
];

export const mockStaff: Staff[] = [
  { id: 'EMP-21', name: 'Nguyen Van Hung', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0021', licence: 'FC • exp. 2028-05-30' },
  { id: 'EMP-22', name: 'Le Quoc Tuan', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0022', licence: 'FC • exp. 2027-11-02' },
  { id: 'EMP-23', name: 'Pham Thanh Son', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0023', licence: 'FC • exp. 2029-01-15' },
  { id: 'EMP-25', name: 'Bui Van Long', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0025', licence: 'FC • exp. 2026-11-20' },
  { id: 'EMP-26', name: 'Dang Van Khoa', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0026', licence: 'FC • exp. 2029-03-12' },
  { id: 'EMP-27', name: 'Tran Minh Tri', role: 'DRIVER', country: 'VN', phone: '+84 90 5551 0027', licence: 'FC • exp. 2028-07-21' },
  { id: 'EMP-24', name: 'Somsak Wongsa', role: 'DRIVER', country: 'TH', phone: '+66 81 555 0024', licence: 'TH Class 4 • exp. 2027-08-09' },
  { id: 'EMP-29', name: 'Prasert Boonmee', role: 'DRIVER', country: 'TH', phone: '+66 81 555 0029', licence: 'TH Class 4 • exp. 2028-04-18' },
  { id: 'EMP-SG-01', name: 'Wei Ming (Demo)', role: 'DRIVER', country: 'SG', phone: '+65 8000 1001', licence: 'SG Heavy Vehicle • demo' },
  { id: 'EMP-SG-02', name: 'Jia Chen (Demo)', role: 'DRIVER', country: 'SG', phone: '+65 8000 1002', licence: 'SG Heavy Vehicle • demo' },
  { id: 'EMP-33', name: 'Vo Thi Mai', role: 'ESCORT', country: 'VN', phone: '+84 90 5551 0033' },
  { id: 'EMP-31', name: 'Dr. Nguyen Minh Anh', role: 'VETERINARIAN', country: 'VN', phone: '+84 28 5550 0142', certExpiry: '2027-06-30' },
  { id: 'EMP-32', name: 'Dr. Tran Quoc Bao', role: 'VETERINARIAN', country: 'VN', phone: '+84 24 5550 0177', certExpiry: '2026-10-20' },
  { id: 'EMP-35', name: 'Dr. Le Thu Trang', role: 'VETERINARIAN', country: 'VN', phone: '+84 28 5550 0135', certExpiry: '2028-06-30' },
  { id: 'EMP-34', name: 'Dr. Arthit Chaiyo', role: 'VETERINARIAN', country: 'TH', phone: '+66 81 555 0034', certExpiry: '2028-01-31' },
  { id: 'EMP-SG-03', name: 'Dr. Li Wen (Demo)', role: 'VETERINARIAN', country: 'SG', phone: '+65 8000 1003', certExpiry: '2028-12-31' },
];

export const mockTrips: Trip[] = [
  {
    id: 'TRP-901', requestId: 'TRN-8923', customer: 'Alex Equine Stables',
    origin: 'Ho Chi Minh City', destination: 'Bangkok', originCountry: 'VN', destinationCountry: 'TH',
    mode: 'ROAD', horses: ['Thunderbolt'], plannedDepart: '2026-10-04 06:00', eta: '2026-10-06 16:00',
    status: 'IN_TRANSIT', deploymentStatus: 'CONFIRMED',
    route: {
      version: 1, status: 'APPROVED', submittedAt: '2026-09-30 15:00', reviewedAt: '2026-09-30 17:00',
      stops: [
        { id: 's1', name: 'Saigon Riding Club', type: 'ORIGIN', country: 'VN', plannedAt: '2026-10-04 06:00' },
        { id: 's2', name: 'Trang Bang rest area', type: 'REST_STOP', country: 'VN', plannedAt: '2026-10-04 08:00' },
        { id: 's3', name: 'Moc Bai Border Gate', type: 'CHECKPOINT', country: 'VN', plannedAt: '2026-10-04 10:00' },
        { id: 's4', name: 'Bavet Border Gate', type: 'CHECKPOINT', country: 'KH', plannedAt: '2026-10-04 11:00' },
        { id: 's5', name: 'Phnom Penh overnight stable', type: 'REST_STOP', country: 'KH', plannedAt: '2026-10-04 18:00' },
        { id: 's6', name: 'Poipet – Aranyaprathet', type: 'CHECKPOINT', country: 'TH', plannedAt: '2026-10-05 13:00' },
        { id: 's7', name: 'Sa Kaeo fuel station', type: 'FUEL_STOP', country: 'TH', plannedAt: '2026-10-05 15:00' },
        { id: 's8', name: 'Bangkok Polo Club', type: 'DESTINATION', country: 'TH', plannedAt: '2026-10-06 16:00' },
      ],
    },
    vehicleId: 'VH-12', crew: { MAIN_DRIVER: 'EMP-21', CO_DRIVER: 'EMP-22', VETERINARIAN: 'EMP-31' },
    resourcesConfirmed: { at: '2026-10-01 09:00', by: COORDINATOR_NAME },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-10-04 07:00', by: 'Nguyen Van Hung' },
      { type: 'ARRIVED_STOP', stopIndex: 1, at: '2026-10-04 08:10', by: 'Nguyen Van Hung' },
      { type: 'LEFT_STOP', stopIndex: 1, at: '2026-10-04 08:40', by: 'Nguyen Van Hung' },
      { type: 'ARRIVED_CHECKPOINT', stopIndex: 2, at: '2026-10-04 10:00', by: 'Nguyen Van Hung' },
    ],
    etaHistory: [],
  },
  {
    id: 'TRP-902', requestId: 'TRN-8924', customer: 'Alex Equine Stables',
    origin: 'Hanoi', destination: 'Singapore', originCountry: 'VN', destinationCountry: 'SG',
    mode: 'AIR', horses: ['Shadowfax'], plannedDepart: '2026-10-18 06:00', eta: '2026-10-18 18:00',
    status: 'PLANNING', deploymentStatus: 'CONFIRMED',
    route: {
      version: 1, status: 'DRAFT',
      stops: [
        { id: 's1', name: 'Hanoi Equestrian Club', type: 'ORIGIN', country: 'VN', plannedAt: '2026-10-18 03:30' },
        { id: 's2', name: 'Noi Bai Airport', type: 'AIRPORT', country: 'VN', plannedAt: '2026-10-18 05:00' },
        { id: 's3', name: 'Changi Airport', type: 'AIRPORT', country: 'SG', plannedAt: '2026-10-18 13:05' },
        { id: 's4', name: 'Sembawang Animal Quarantine Station', type: 'QUARANTINE_STATION', country: 'SG', plannedAt: '2026-10-18 15:30' },
        { id: 's5', name: 'Singapore Turf Club Stables', type: 'DESTINATION', country: 'SG', plannedAt: '2026-10-18 18:00' },
      ],
    },
    crew: {},
    legs: {
      outbound: { key: 'outbound', title: 'ROAD VN – Vận chuyển trước chuyến bay', country: 'VN', from: 'Hanoi Equestrian Club', to: 'Noi Bai Airport', crew: {} },
      inbound: { key: 'inbound', title: 'ROAD SG – Vận chuyển sau chuyến bay', country: 'SG', from: 'Changi Airport', to: 'Singapore Turf Club Stables', crew: {} },
    },
    flight: { airline: 'Vietnam Airlines Cargo', flightNo: 'VN-C 6421', fromAirport: 'Noi Bai Airport', toAirport: 'Changi Airport', departAt: '2026-10-18 07:00', arriveAt: '2026-10-18 13:05', cost: 9800, status: 'BUDGET_PENDING' },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-903', requestId: 'TRN-8919', customer: 'Saigon Racing Stable',
    origin: 'Da Nang', destination: 'Ho Chi Minh City', originCountry: 'VN', destinationCountry: 'VN',
    mode: 'ROAD', horses: ['Midnight Star', 'Golden Arrow', 'Silver Wind'], plannedDepart: '2026-10-09 05:00', eta: '2026-10-10 18:00',
    status: 'READY_TO_DEPART', deploymentStatus: 'CONFIRMED',
    route: {
      version: 2, status: 'APPROVED', submittedAt: '2026-09-25 10:00', reviewedAt: '2026-09-25 14:00',
      stops: [
        { id: 's1', name: 'Da Nang Equestrian Center', type: 'ORIGIN', country: 'VN', plannedAt: '2026-10-09 05:00' },
        { id: 's2', name: 'Quy Nhon rest stable', type: 'REST_STOP', country: 'VN', plannedAt: '2026-10-09 14:00' },
        { id: 's3', name: 'Phan Thiet fuel station', type: 'FUEL_STOP', country: 'VN', plannedAt: '2026-10-10 09:00' },
        { id: 's4', name: 'Saigon Racing Stable', type: 'DESTINATION', country: 'VN', plannedAt: '2026-10-10 18:00' },
      ],
    },
    vehicleId: 'VH-11', crew: { MAIN_DRIVER: 'EMP-25', CO_DRIVER: 'EMP-23', VETERINARIAN: 'EMP-32' },
    resourcesConfirmed: { at: '2026-10-02 16:00', by: COORDINATOR_NAME },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-904', requestId: 'TRN-8921', customer: 'Royal Turf Club Bangkok',
    origin: 'Bangkok', destination: 'Singapore', originCountry: 'TH', destinationCountry: 'SG',
    mode: 'ROAD', horses: ['Lanna Spirit'], plannedDepart: '2026-10-20 05:00', eta: '2026-10-22 17:00',
    status: 'PLANNING', deploymentStatus: 'CONFIRMED',
    route: {
      version: 1, status: 'RETURNED', submittedAt: '2026-10-01 10:00', reviewedAt: '2026-10-01 15:00',
      returnReason: 'Bổ sung trạm nghỉ qua đêm tại Malaysia cho ngựa.',
      stops: [
        { id: 's1', name: 'Royal Turf Club Bangkok', type: 'ORIGIN', country: 'TH', plannedAt: '2026-10-20 05:00' },
        { id: 's2', name: 'Sadao – Bukit Kayu Hitam', type: 'CHECKPOINT', country: 'MY', plannedAt: '2026-10-21 08:00' },
        { id: 's3', name: 'Woodlands Checkpoint', type: 'CHECKPOINT', country: 'SG', plannedAt: '2026-10-22 10:00' },
        { id: 's4', name: 'Singapore Turf Club Stables', type: 'DESTINATION', country: 'SG', plannedAt: '2026-10-22 17:00' },
      ],
    },
    vehicleId: 'VH-14', crew: { MAIN_DRIVER: 'EMP-24' },
    milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-905', requestId: 'TRN-8939', customer: 'Royal Turf Club Bangkok',
    origin: 'Singapore', destination: 'Bangkok', originCountry: 'SG', destinationCountry: 'TH',
    mode: 'ROAD', horses: ['Siam Glory'], plannedDepart: '2026-10-30 05:00', eta: '2026-11-01 17:00',
    status: 'PLANNING', deploymentStatus: 'NOT_CONFIRMED',
    route: { version: 0, status: 'DRAFT', stops: [] },
    crew: {}, milestones: [], etaHistory: [],
  },
  {
    id: 'TRP-880', requestId: 'TRN-8810', customer: 'Saigon Racing Stable',
    origin: 'Ho Chi Minh City', destination: 'Hanoi', originCountry: 'VN', destinationCountry: 'VN',
    mode: 'ROAD', horses: ['Red Comet'], plannedDepart: '2026-09-28 06:00', eta: '2026-10-01 14:00',
    status: 'COMPLETED', deploymentStatus: 'CONFIRMED',
    route: {
      version: 1, status: 'APPROVED',
      stops: [
        { id: 's1', name: 'Saigon Racing Stable', type: 'ORIGIN', country: 'VN', plannedAt: '2026-09-28 06:00' },
        { id: 's2', name: 'Hanoi Equestrian Club', type: 'DESTINATION', country: 'VN', plannedAt: '2026-10-01 14:00' },
      ],
    },
    vehicleId: 'VH-13', crew: { MAIN_DRIVER: 'EMP-26', VETERINARIAN: 'EMP-35' },
    milestones: [
      { type: 'DEPARTED', stopIndex: 0, at: '2026-09-28 06:10', by: 'Dang Van Khoa' },
      { type: 'ARRIVED_DESTINATION', stopIndex: 1, at: '2026-10-01 13:40', by: 'Dang Van Khoa' },
    ],
    etaHistory: [],
  },
];

export const mockIncidents: Incident[] = [
  { id: 'INC-301', tripId: 'TRP-901', type: 'BORDER_DELAY', severity: 'MEDIUM', status: 'IN_PROGRESS', reportedAt: '2026-10-04 10:40', reportedBy: 'Nguyen Van Hung', description: 'Chậm trễ tại cửa khẩu Mộc Bài do kiểm tra hồ sơ kéo dài.' },
  { id: 'INC-288', tripId: 'TRP-880', type: 'HORSE_HEALTH', severity: 'LOW', status: 'CLOSED', reportedAt: '2026-09-29 15:20', reportedBy: 'Dr. Le Thu Trang', description: 'Ngựa hơi mệt sau chặng dài, đã cho nghỉ thêm 30 phút.' },
];
