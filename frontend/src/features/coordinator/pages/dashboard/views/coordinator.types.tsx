// ============================================================================
// SVG ICONS (Matching reference HTML symbols)
// ============================================================================
export const Icon = ({ name }: { name: string }) => {
  switch (name) {
    case 'home':
      return <svg className="i"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case 'map':
      return <svg className="i"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'truck':
      return <svg className="i"><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
    case 'users':
      return <svg className="i"><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.9 4 6" /></svg>;
    case 'plane':
      return <svg className="i"><path d="M10 15 3 13l1-2 6 .5L14 5c1-1.5 3-1.5 3 0l-2 7 5 1-1 2-5-.5-3 5h-2l1-5z" /></svg>;
    case 'pin':
      return <svg className="i"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'alert':
      return <svg className="i"><path d="M12 3 2 20h20zM12 10v4M12 17h.01" /></svg>;
    case 'clock':
      return <svg className="i"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'check':
      return <svg className="i"><path d="m5 12 5 5 9-10" /></svg>;
    case 'plus':
      return <svg className="i"><path d="M12 5v14M5 12h14" /></svg>;
    case 'chev':
      return <svg className="i chev"><path d="m6 9 6 6 6-6" /></svg>;
    default:
      return null;
  }
};

// ============================================================================
// DATA MODELS
// ============================================================================
export interface StopItem {
  id: string;
  name: string;
  type: 'ORIGIN' | 'REST_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'DESTINATION';
  plannedAt: string;
  cp?: string;
}

export interface GroundLeg {
  vehicleId: string;
  mainDriver: string;
  coDriver: string;
  vet: string;
}

export interface MockTrip {
  id: string;
  requestId: string;
  customer: string;
  origin: string;
  destination: string;
  mode: 'AIR' | 'ROAD';
  transportDate: string;
  plannedDepart: string;
  eta: string;
  horses: number;
  deploymentStatus: 'CONFIRMED' | 'NOT_CONFIRMED' | 'ON_HOLD';
  routeStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RETURNED';
  resourcesConfirmed: boolean;
  stops: StopItem[];
  outboundLeg: GroundLeg;
  inboundLeg: GroundLeg;
  flight?: {
    airline: string;
    flightNo: string;
    fromAirport: string;
    toAirport: string;
    departAt: string;
    arriveAt: string;
    stalls: number;
    cost: number;
    bookingRef: string;
  };
}

export interface VehicleItem {
  id: string;
  plate: string;
  model: string;
  stalls: number;
  country: string;
  base: string;
  status: string;
  nextService: string;
}

export interface EmployeeItem {
  id: string;
  name: string;
  role: string;
  country: string;
  phone: string;
  certExpiry: string;
}

export const INITIAL_TRIPS: MockTrip[] = [
  {
    id: 'TRP-20261120-0003',
    requestId: 'REQ-2026-003',
    customer: 'Saigon Racing Club',
    origin: 'Bình Dương, Việt Nam',
    destination: 'Tokyo, Nhật Bản',
    mode: 'AIR',
    transportDate: '2026-11-20',
    plannedDepart: '2026-11-20 06:00',
    eta: '2026-11-21 14:00',
    horses: 3,
    deploymentStatus: 'CONFIRMED',
    routeStatus: 'DRAFT',
    resourcesConfirmed: false,
    stops: [
      { id: 'st-1', name: 'Trang trại Bến Cát (Bình Dương)', type: 'ORIGIN', plannedAt: '2026-11-20T06:00' },
      { id: 'st-2', name: 'Trạm kiểm tra sinh hiệu Suối Tiên', type: 'REST_STOP', plannedAt: '2026-11-20T08:30' },
      { id: 'st-3', name: 'Cảng hàng không quốc tế Tân Sơn Nhất (SGN)', type: 'AIRPORT', plannedAt: '2026-11-20T11:00', cp: 'SGN' },
      { id: 'st-4', name: 'Sân bay quốc tế Narita (NRT)', type: 'AIRPORT', plannedAt: '2026-11-21T06:00', cp: 'NRT' },
      { id: 'st-5', name: 'Trường đua Fuchu (Tokyo)', type: 'DESTINATION', plannedAt: '2026-11-21T14:00' },
    ],
    outboundLeg: {
      vehicleId: 'VEH-02',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-02',
      vet: 'VET-01',
    },
    inboundLeg: {
      vehicleId: 'VEH-JP-01',
      mainDriver: 'JP-DRV-01',
      coDriver: 'JP-DRV-02',
      vet: 'JP-VET-01',
    },
    flight: {
      airline: 'ANA Cargo Equine Express',
      flightNo: 'NH 8472',
      fromAirport: 'Sân bay Tân Sơn Nhất (SGN)',
      toAirport: 'Sân bay Quốc tế Narita (NRT)',
      departAt: '2026-11-20 23:30',
      arriveAt: '2026-11-21 06:45',
      stalls: 4,
      cost: 14500,
      bookingRef: 'ANA-EQ-99201',
    },
  },
  {
    id: 'TRP-20261125-0004',
    requestId: 'REQ-2026-004',
    customer: 'Phnom Penh Equestrian',
    origin: 'TP. Hồ Chí Minh',
    destination: 'Phnom Penh, Campuchia',
    mode: 'ROAD',
    transportDate: '2026-11-25',
    plannedDepart: '2026-11-25 05:00',
    eta: '2026-11-25 18:00',
    horses: 2,
    deploymentStatus: 'CONFIRMED',
    routeStatus: 'PENDING_APPROVAL',
    resourcesConfirmed: true,
    stops: [
      { id: 'st-10', name: 'Trang trại Củ Chi', type: 'ORIGIN', plannedAt: '2026-11-25T05:00' },
      { id: 'st-11', name: 'Trạm dừng nghỉ Trảng Bàng', type: 'REST_STOP', plannedAt: '2026-11-25T07:30' },
      { id: 'st-12', name: 'Cửa khẩu Quốc tế Mộc Bài', type: 'CHECKPOINT', plannedAt: '2026-11-25T09:00', cp: 'MOC_BAI' },
      { id: 'st-13', name: 'Trường đua Phnom Penh', type: 'DESTINATION', plannedAt: '2026-11-25T18:00' },
    ],
    outboundLeg: {
      vehicleId: 'VEH-01',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-03',
      vet: 'VET-01',
    },
    inboundLeg: {
      vehicleId: 'VEH-01',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-03',
      vet: 'VET-01',
    },
  },
];

export const VEHICLES: VehicleItem[] = [
  { id: 'VEH-01', plate: '51C-889.12', model: 'Scania Equine Air-Ride', stalls: 2, country: 'VN', base: 'TP. Hồ Chí Minh', status: 'READY', nextService: '2027-02-15' },
  { id: 'VEH-02', plate: '51D-334.09', model: 'Volvo Pro Horse Carrier', stalls: 6, country: 'VN', base: 'Bình Dương', status: 'READY', nextService: '2027-05-10' },
  { id: 'VEH-03', plate: '51E-992.11', model: 'Mercedes Actros Horse Cruiser', stalls: 4, country: 'VN', base: 'Đồng Nai', status: 'MAINTENANCE', nextService: '2026-10-30' },
  { id: 'VEH-JP-01', plate: 'TK-880-99', model: 'Isuzu Giga Horse Transporter (JP)', stalls: 4, country: 'JP', base: 'Narita / Tokyo', status: 'READY', nextService: '2027-08-01' },
  { id: 'VEH-KH-01', plate: 'PP-2-4412', model: 'Hino 500 Equine Box (KH)', stalls: 3, country: 'KH', base: 'Phnom Penh', status: 'READY', nextService: '2027-01-20' },
];

export const EMPLOYEES: EmployeeItem[] = [
  { id: 'DRV-01', name: 'Nguyễn Văn Hùng', role: 'DRIVER', country: 'VN', phone: '0903 112 233', certExpiry: '2028-12-31' },
  { id: 'DRV-02', name: 'Trần Đình Trọng', role: 'DRIVER', country: 'VN', phone: '0918 445 566', certExpiry: '2027-08-15' },
  { id: 'DRV-03', name: 'Phạm Minh Tuấn', role: 'DRIVER', country: 'VN', phone: '0977 889 900', certExpiry: '2028-04-10' },
  { id: 'VET-01', name: 'BS. Lê Hoàng Nam', role: 'VETERINARIAN', country: 'VN', phone: '0933 667 788', certExpiry: '2027-12-31' },
  { id: 'JP-DRV-01', name: 'Kenji Takahashi', role: 'DRIVER', country: 'JP', phone: '+81 90 1234 5678', certExpiry: '2029-05-20' },
  { id: 'JP-DRV-02', name: 'Daiki Sato', role: 'DRIVER', country: 'JP', phone: '+81 90 9876 5432', certExpiry: '2028-10-15' },
  { id: 'JP-VET-01', name: 'Dr. Yumi Tanaka', role: 'VETERINARIAN', country: 'JP', phone: '+81 80 5555 4321', certExpiry: '2028-04-30' },
];
