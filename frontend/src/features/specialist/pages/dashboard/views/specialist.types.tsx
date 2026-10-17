import React from 'react';

// ============================================================================
// SVG ICONS (Matching CBN Transport design language)
// ============================================================================
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
  const cls = `i ${className}`.trim();
  switch (name) {
    case 'home':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'truck':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case 'doc':
    case 'file':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'alert':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />
        </svg>
      );
    case 'check':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="m5 12 5 5 9-10" />
        </svg>
      );
    case 'plus':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'flag':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
        </svg>
      );
    case 'book':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'list':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'search':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'filter':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );
    case 'eye':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'download':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'upload':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      );
    case 'chev':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'x':
      return (
        <svg className={cls} viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    default:
      return null;
  }
};

// ============================================================================
// DATA MODELS & ENUMS
// ============================================================================
export type SpecialistNav =
  | 'dashboard'
  | 'trips'
  | 'trip_detail'
  | 'queue'
  | 'doc_detail'
  | 'requests'
  | 'checkpoints'
  | 'packages'
  | 'master'
  | 'audit';

export interface HorseInfo {
  id: string;
  name: string;
  chip: string;
  breed: string;
  dob: string;
  passportNo: string;
}

export interface DocVersion {
  v: number;
  file: string;
  at: string;
  by: string;
  number?: string;
  notes?: string;
}

export interface DocReview {
  v: number;
  decision: 'APPROVED' | 'REJECTED';
  remark: string;
  at: string;
  by: string;
}

export interface SpecialistDoc {
  id: string;
  tripId: string;
  horseId?: string;
  horseName?: string;
  typeId: string;
  typeName: string;
  category: 'IDENTITY' | 'OPERATIONAL';
  group: 'CUSTOMS' | 'MEDICAL' | 'QUARANTINE';
  provider: 'CUSTOMER' | 'CBN';
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  number: string;
  issuer?: string;
  issuedAt?: string;
  expiry?: string;
  physicalCopyReceived?: boolean;
  versions: DocVersion[];
  reviews: DocReview[];
  rejectReason?: string;
  notes?: string;
}

export interface SpecialistTrip {
  id: string;
  requestId: string;
  customerName: string;
  origin: string;
  destination: string;
  transit?: string[];
  mode: 'ROAD' | 'AIR';
  transportDate: string;
  plannedDepart: string;
  eta: string;
  horses: HorseInfo[];
  deploymentStatus: 'CONFIRMED' | 'NOT_CONFIRMED' | 'ON_HOLD';
  status: 'PLANNING' | 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED';
  checklist: {
    ready: number;
    total: number;
    status: 'READY' | 'NOT_READY';
  };
}

export interface DocRequest {
  id: string;
  tripId: string;
  typeId: string;
  typeName: string;
  horseId?: string;
  horseName?: string;
  reason: string;
  dueAt: string;
  status: 'OPEN' | 'SUBMITTED' | 'FULFILLED';
  createdAt: string;
  latestVersionUploaded?: number;
  latestFile?: string;
  history: Array<{ at: string; action: string; by: string }>;
}

export interface CheckpointItem {
  id: string;
  name: string;
  type: 'LAND_BORDER' | 'AIRPORT' | 'QUARANTINE_STATION';
  country: string;
  hours: string;
}

export interface CheckpointClearance {
  id: string;
  tripId: string;
  cpId: string;
  cpName: string;
  cpType: string;
  country: string;
  plannedAt: string;
  crewPosition: 'NOT_ARRIVED' | 'AT_CHECKPOINT' | 'PASSED';
  result?: 'PASSED' | 'HELD' | 'FAILED' | 'NONE';
  at?: string;
  ref?: string;
  remark?: string;
}

export interface QuarantineBooking {
  id: string;
  tripId: string;
  cpId: string;
  cpName: string;
  slot: string;
  ref: string;
  status: 'REQUESTED' | 'BOOKED';
  confirmedAt?: string;
  notes?: string;
}

export interface DocumentPackage {
  id: string;
  tripId: string;
  title: string;
  cpName?: string;
  status: 'DRAFT_PACKAGE' | 'READY' | 'HANDED_OVER';
  docsCount: number;
  docSummary: string;
  releasedAt?: string;
  releasedTo?: string;
  history: Array<{ at: string; by: string; text: string }>;
}

export interface RegulationItem {
  id: string;
  country: string;
  countryName: string;
  direction: 'EXPORT' | 'IMPORT' | 'TRANSIT' | 'DOMESTIC';
  types: string[];
  note: string;
  source: string;
  verified: boolean;
  updated: string;
}

export interface DocTypeItem {
  id: string;
  name: string;
  group: 'CUSTOMS' | 'MEDICAL' | 'QUARANTINE';
  scope: 'PER_HORSE' | 'PER_TRIP';
  category: 'IDENTITY' | 'OPERATIONAL';
  validityDays: number | null;
  provider: 'CUSTOMER' | 'CBN';
}

export interface AuditItem {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  detail: string;
}

// ============================================================================
// INITIAL MOCK DATA
// ============================================================================
export const INITIAL_CHECKPOINTS: CheckpointItem[] = [
  { id: 'CP-11', name: 'Cửa khẩu Quốc tế Mộc Bài (Tây Ninh)', type: 'LAND_BORDER', country: 'VN', hours: '07:00–22:00' },
  { id: 'CP-12', name: 'Cửa khẩu Quốc tế Bavet (Svay Rieng)', type: 'LAND_BORDER', country: 'KH', hours: '06:00–22:00' },
  { id: 'CP-13', name: 'Cửa khẩu Poipet – Aranyaprathet', type: 'LAND_BORDER', country: 'TH', hours: '07:00–20:00' },
  { id: 'CP-14', name: 'Sadao – Bukit Kayu Hitam', type: 'LAND_BORDER', country: 'MY', hours: '06:00–22:00' },
  { id: 'CP-15', name: 'Woodlands Checkpoint', type: 'LAND_BORDER', country: 'SG', hours: '24/24' },
  { id: 'CP-21', name: 'Sân bay Quốc tế Tân Sơn Nhất (Cargo)', type: 'AIRPORT', country: 'VN', hours: '24/24' },
  { id: 'CP-22', name: 'Sân bay Quốc tế Nội Bài (Cargo)', type: 'AIRPORT', country: 'VN', hours: '24/24' },
  { id: 'CP-23', name: 'Sân bay Changi Singapore (Air Cargo)', type: 'AIRPORT', country: 'SG', hours: '24/24' },
  { id: 'CP-31', name: 'Trạm kiểm dịch động vật Long An', type: 'QUARANTINE_STATION', country: 'VN', hours: '08:00–17:00' },
  { id: 'CP-32', name: 'Sembawang Animal Quarantine Station (SAQS)', type: 'QUARANTINE_STATION', country: 'SG', hours: '08:00–17:30' }
];

export const INITIAL_DOC_TYPES: DocTypeItem[] = [
  { id: 'DT-1', name: 'Hộ chiếu ngựa (Equine Passport / FEI)', group: 'CUSTOMS', scope: 'PER_HORSE', category: 'IDENTITY', validityDays: null, provider: 'CUSTOMER' },
  { id: 'DT-2', name: 'Giấy chứng nhận kiểm dịch động vật (Health Certificate)', group: 'MEDICAL', scope: 'PER_HORSE', category: 'OPERATIONAL', validityDays: 10, provider: 'CUSTOMER' },
  { id: 'DT-3', name: 'Sổ tiêm vắc xin cúm ngựa (Equine Influenza Record)', group: 'MEDICAL', scope: 'PER_HORSE', category: 'OPERATIONAL', validityDays: 365, provider: 'CUSTOMER' },
  { id: 'DT-4', name: 'Giấy phép xuất khẩu (Export Permit)', group: 'CUSTOMS', scope: 'PER_TRIP', category: 'OPERATIONAL', validityDays: 30, provider: 'CBN' },
  { id: 'DT-5', name: 'Giấy phép nhập khẩu (Import Permit / Licence)', group: 'CUSTOMS', scope: 'PER_TRIP', category: 'OPERATIONAL', validityDays: 30, provider: 'CBN' },
  { id: 'DT-6', name: 'Chứng nhận cách ly kiểm dịch (Quarantine PEQ Certificate)', group: 'QUARANTINE', scope: 'PER_HORSE', category: 'OPERATIONAL', validityDays: 14, provider: 'CBN' },
  { id: 'DT-7', name: 'Tờ khai hải quan điện tử (Customs Declaration)', group: 'CUSTOMS', scope: 'PER_TRIP', category: 'OPERATIONAL', validityDays: 30, provider: 'CBN' },
  { id: 'DT-8', name: 'Giấy kiểm dịch nội địa (Domestic Transport Permit)', group: 'CUSTOMS', scope: 'PER_TRIP', category: 'OPERATIONAL', validityDays: 30, provider: 'CBN' },
  { id: 'DT-9', name: 'Giấy phép quá cảnh qua nước thứ ba (Transit Permit)', group: 'CUSTOMS', scope: 'PER_TRIP', category: 'OPERATIONAL', validityDays: 3, provider: 'CBN' }
];

export const INITIAL_REGULATIONS: RegulationItem[] = [
  { id: 'REG-1', country: 'VN', countryName: 'Việt Nam', direction: 'EXPORT', types: ['DT-1', 'DT-2', 'DT-3', 'DT-4', 'DT-7'], note: 'Giấy chứng nhận kiểm dịch do Cục Thú y (DAH) cấp trong vòng 10 ngày trước khi xuất bến.', source: 'Thông tư 25/2016/TT-BNNPTNT & Luật Thú y 2015', verified: true, updated: '2026-08-12' },
  { id: 'REG-2', country: 'TH', countryName: 'Thái Lan', direction: 'IMPORT', types: ['DT-1', 'DT-2', 'DT-3', 'DT-5', 'DT-6'], note: 'Cần giấy phép nhập khẩu DLD trước khi đến cửa khẩu và kết quả xét nghiệm EIA âm tính.', source: 'Department of Livestock Development (DLD Thailand)', verified: true, updated: '2026-07-30' },
  { id: 'REG-3', country: 'KH', countryName: 'Campuchia', direction: 'TRANSIT', types: ['DT-1', 'DT-9'], note: 'Giấy phép quá cảnh lãnh thổ Campuchia có hiệu lực tối đa 72 giờ kể từ khi qua cổng Mộc Bài/Bavet.', source: 'Bộ Nông Lâm Ngư nghiệp Campuchia (MAFF)', verified: true, updated: '2026-06-18' },
  { id: 'REG-4', country: 'SG', countryName: 'Singapore', direction: 'IMPORT', types: ['DT-1', 'DT-2', 'DT-3', 'DT-5', 'DT-6'], note: 'Giấy phép nhập khẩu AVS và đặt chỗ cách ly tại trạm kiểm dịch Sembawang ít nhất 14 ngày.', source: 'Animal & Veterinary Service (AVS Singapore)', verified: true, updated: '2026-09-01' },
  { id: 'REG-5', country: 'VN', countryName: 'Việt Nam', direction: 'DOMESTIC', types: ['DT-1', 'DT-3', 'DT-8'], note: 'Vận chuyển liên tỉnh cần Giấy kiểm dịch nội địa cấp bởi Chi cục Chăn nuôi Thú y tỉnh xuất phát.', source: 'Quy chuẩn QCVN 01-100:2012/BNNPTNT', verified: true, updated: '2026-05-10' },
  { id: 'REG-6', country: 'JP', countryName: 'Nhật Bản', direction: 'IMPORT', types: ['DT-1', 'DT-2', 'DT-3', 'DT-5', 'DT-6'], note: 'Thủ tục kiểm dịch nghiêm ngặt của MAFF Animal Quarantine Service; cách ly trước xuất cảnh 7 ngày.', source: 'MAFF Animal Quarantine Service (AQS Japan)', verified: true, updated: '2026-09-15' }
];

export const INITIAL_TRIPS: SpecialistTrip[] = [
  {
    id: 'TRP-901',
    requestId: 'TRN-8923',
    customerName: 'Alex Equine Stables',
    origin: 'Ho Chi Minh City',
    destination: 'Bangkok',
    transit: ['Cambodia'],
    mode: 'ROAD',
    transportDate: '2026-10-04',
    plannedDepart: '2026-10-04 06:00',
    eta: '2026-10-06 16:00',
    deploymentStatus: 'CONFIRMED',
    status: 'IN_TRANSIT',
    horses: [
      { id: 'HOR-1029', name: 'Thunderbolt', chip: '982001928374', breed: 'Thoroughbred', dob: '2021-04-12', passportNo: 'FEI-VN-2021-089' }
    ],
    checklist: { ready: 5, total: 5, status: 'READY' }
  },
  {
    id: 'TRP-902',
    requestId: 'TRN-8924',
    customerName: 'Saigon Racing Stable',
    origin: 'Hanoi',
    destination: 'Singapore',
    transit: [],
    mode: 'AIR',
    transportDate: '2026-10-18',
    plannedDepart: '2026-10-18 06:00',
    eta: '2026-10-18 18:00',
    deploymentStatus: 'CONFIRMED',
    status: 'PLANNING',
    horses: [
      { id: 'HOR-1044', name: 'Shadowfax', chip: '982002881902', breed: 'Arabian', dob: '2020-03-22', passportNo: 'FEI-VN-2020-142' }
    ],
    checklist: { ready: 3, total: 5, status: 'NOT_READY' }
  },
  {
    id: 'TRP-904',
    requestId: 'TRN-8921',
    customerName: 'Royal Turf Club Bangkok',
    origin: 'Bangkok',
    destination: 'Singapore',
    transit: ['Malaysia'],
    mode: 'ROAD',
    transportDate: '2026-10-20',
    plannedDepart: '2026-10-20 05:00',
    eta: '2026-10-22 17:00',
    deploymentStatus: 'CONFIRMED',
    status: 'PLANNING',
    horses: [
      { id: 'HOR-1088', name: 'Lanna Spirit', chip: '982003119284', breed: 'Warmblood', dob: '2019-07-15', passportNo: 'FEI-TH-2019-055' }
    ],
    checklist: { ready: 3, total: 6, status: 'NOT_READY' }
  },
  {
    id: 'TRP-903',
    requestId: 'TRN-8919',
    customerName: 'Tran Minh Khoa',
    origin: 'Da Nang',
    destination: 'Ho Chi Minh City',
    transit: [],
    mode: 'ROAD',
    transportDate: '2026-10-09',
    plannedDepart: '2026-10-09 05:00',
    eta: '2026-10-10 18:00',
    deploymentStatus: 'CONFIRMED',
    status: 'READY_TO_DEPART',
    horses: [
      { id: 'HOR-1011', name: 'Red Rum', chip: '982000192831', breed: 'Thoroughbred', dob: '2022-01-10', passportNo: 'FEI-VN-2022-019' }
    ],
    checklist: { ready: 4, total: 4, status: 'READY' }
  },
  {
    id: 'TRP-905',
    requestId: 'TRN-8939',
    customerName: 'Alex Equine Stables',
    origin: 'Ho Chi Minh City',
    destination: 'Tokyo',
    transit: ['Malaysia'],
    mode: 'AIR',
    transportDate: '2026-10-30',
    plannedDepart: '2026-10-30 05:00',
    eta: '2026-11-01 17:00',
    deploymentStatus: 'NOT_CONFIRMED',
    status: 'PLANNING',
    horses: [
      { id: 'HOR-1102', name: 'Starlight', chip: '982004491022', breed: 'Hanoverian', dob: '2020-09-08', passportNo: 'FEI-VN-2020-318' }
    ],
    checklist: { ready: 1, total: 5, status: 'NOT_READY' }
  }
];

export const INITIAL_DOCUMENTS: SpecialistDoc[] = [
  {
    id: 'DOC-101',
    tripId: 'TRP-901',
    horseId: 'HOR-1029',
    horseName: 'Thunderbolt',
    typeId: 'DT-1',
    typeName: 'Hộ chiếu ngựa (Equine Passport / FEI)',
    category: 'IDENTITY',
    group: 'CUSTOMS',
    provider: 'CUSTOMER',
    status: 'APPROVED',
    number: 'FEI-VN-2021-089',
    issuer: 'FEI / Vietnam Equestrian Federation',
    issuedAt: '2021-05-10',
    expiry: '2028-05-10',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'thunderbolt-fei-passport-scan.pdf', at: '2026-09-30 10:00', by: 'Alex Equine' }
    ],
    reviews: [
      { v: 1, decision: 'APPROVED', remark: 'Hộ chiếu FEI hợp lệ, sơ đồ nhận dạng và số vi chip trùng khớp 100%.', at: '2026-10-01 09:30', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DOC-102',
    tripId: 'TRP-901',
    horseId: 'HOR-1029',
    horseName: 'Thunderbolt',
    typeId: 'DT-2',
    typeName: 'Giấy chứng nhận kiểm dịch động vật (Health Certificate)',
    category: 'OPERATIONAL',
    group: 'MEDICAL',
    provider: 'CUSTOMER',
    status: 'APPROVED',
    number: 'DAH-HC-2026-0419',
    issuer: 'Chi cục Thú y Vùng VI',
    issuedAt: '2026-10-01',
    expiry: '2026-10-11',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'thunderbolt-health-cert-signed.pdf', at: '2026-10-01 11:00', by: 'Alex Equine' }
    ],
    reviews: [
      { v: 1, decision: 'APPROVED', remark: 'Đã kiểm tra kết quả âm tính bệnh dịch và dấu mộc kiểm dịch xuất khẩu.', at: '2026-10-01 14:00', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DOC-103',
    tripId: 'TRP-901',
    horseId: 'HOR-1029',
    horseName: 'Thunderbolt',
    typeId: 'DT-3',
    typeName: 'Sổ tiêm vắc xin cúm ngựa (Equine Influenza Record)',
    category: 'OPERATIONAL',
    group: 'MEDICAL',
    provider: 'CUSTOMER',
    status: 'APPROVED',
    number: 'VAC-2026-881',
    issuer: 'Bệnh viện Thú y Saigon Pet',
    issuedAt: '2026-06-15',
    expiry: '2027-06-15',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'thunderbolt-vaccine-record.pdf', at: '2026-09-30 10:15', by: 'Alex Equine' }
    ],
    reviews: [
      { v: 1, decision: 'APPROVED', remark: 'Đã tiêm phòng nhắc lại trong vòng 6 tháng, hợp lệ quy chuẩn nhập cảnh Thái Lan.', at: '2026-10-01 09:40', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DOC-104',
    tripId: 'TRP-901',
    typeId: 'DT-4',
    typeName: 'Giấy phép xuất khẩu (Export Permit)',
    category: 'OPERATIONAL',
    group: 'CUSTOMS',
    provider: 'CBN',
    status: 'APPROVED',
    number: 'EXP-VN-2026-901',
    issuer: 'Bộ Công Thương / Cục Thú y',
    issuedAt: '2026-10-02',
    expiry: '2026-11-02',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'cbn-export-permit-trp901.pdf', at: '2026-10-02 16:00', by: 'Hoang Thu Ha' }
    ],
    reviews: [
      { v: 1, decision: 'APPROVED', remark: 'CBN đã nhận bản gốc giấy phép xuất cảnh qua cửa khẩu Mộc Bài.', at: '2026-10-02 16:30', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DOC-105',
    tripId: 'TRP-902',
    horseId: 'HOR-1044',
    horseName: 'Shadowfax',
    typeId: 'DT-2',
    typeName: 'Giấy chứng nhận kiểm dịch động vật (Health Certificate)',
    category: 'OPERATIONAL',
    group: 'MEDICAL',
    provider: 'CUSTOMER',
    status: 'SUBMITTED', // Khách đã nộp lại bản v2 -> Chờ duyệt lại!
    number: 'DAH-HC-2026-9022',
    issuer: 'Chi cục Thú y Hà Nội',
    issuedAt: '2026-10-04',
    expiry: '2026-10-14',
    physicalCopyReceived: false,
    versions: [
      { v: 1, file: 'shadowfax-health-cert-v1.pdf', at: '2026-10-02 14:00', by: 'Tran Minh Khoa' },
      { v: 2, file: 'shadowfax-health-cert-v2-signed-official.pdf', at: '2026-10-04 15:30', by: 'Tran Minh Khoa', notes: 'Khách hàng gửi bổ sung bản scan có dấu mộc đỏ chính thức của Trưởng trạm kiểm dịch theo yêu cầu DR-42.' }
    ],
    reviews: [
      { v: 1, decision: 'REJECTED', remark: 'Bản chụp v1 thiếu chữ ký xác nhận của Bác sĩ thú y chính quyền (Official Vet). Yêu cầu nộp bản có dấu mộc tròn hợp lệ.', at: '2026-10-03 14:10', by: 'Hoang Thu Ha' }
    ],
    rejectReason: 'Bản chụp v1 thiếu chữ ký xác nhận của Bác sĩ thú y chính quyền (Official Vet). Yêu cầu nộp bản có dấu mộc tròn hợp lệ.'
  },
  {
    id: 'DOC-106',
    tripId: 'TRP-902',
    horseId: 'HOR-1044',
    horseName: 'Shadowfax',
    typeId: 'DT-1',
    typeName: 'Hộ chiếu ngựa (Equine Passport / FEI)',
    category: 'IDENTITY',
    group: 'CUSTOMS',
    provider: 'CUSTOMER',
    status: 'APPROVED',
    number: 'FEI-VN-2020-142',
    issuer: 'FEI International',
    issuedAt: '2020-04-01',
    expiry: '2028-04-01',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'shadowfax-fei-passport.pdf', at: '2026-10-02 10:00', by: 'Tran Minh Khoa' }
    ],
    reviews: [
      { v: 1, decision: 'APPROVED', remark: 'Hồ sơ danh tính rõ ràng, chip nhận dạng 982002881902 đạt chuẩn ISO 11784.', at: '2026-10-03 09:00', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DOC-107',
    tripId: 'TRP-904',
    horseId: 'HOR-1088',
    horseName: 'Lanna Spirit',
    typeId: 'DT-1',
    typeName: 'Hộ chiếu ngựa (Equine Passport / FEI)',
    category: 'IDENTITY',
    group: 'CUSTOMS',
    provider: 'CUSTOMER',
    status: 'SUBMITTED',
    number: 'FEI-TH-2019-055',
    issuer: 'Thailand Equestrian Federation',
    issuedAt: '2019-08-01',
    expiry: '2027-08-01',
    physicalCopyReceived: false,
    versions: [
      { v: 1, file: 'lanna-spirit-passport-th.pdf', at: '2026-10-03 17:30', by: 'Somchai Prasert' }
    ],
    reviews: []
  },
  {
    id: 'DOC-108',
    tripId: 'TRP-904',
    horseId: 'HOR-1088',
    horseName: 'Lanna Spirit',
    typeId: 'DT-2',
    typeName: 'Giấy chứng nhận kiểm dịch động vật (Health Certificate)',
    category: 'OPERATIONAL',
    group: 'MEDICAL',
    provider: 'CUSTOMER',
    status: 'SUBMITTED',
    number: 'DLD-HC-2026-1108',
    issuer: 'DLD Thailand',
    issuedAt: '2026-10-02',
    expiry: '2026-10-12',
    physicalCopyReceived: false,
    versions: [
      { v: 1, file: 'lanna-spirit-health-cert.pdf', at: '2026-10-03 17:45', by: 'Somchai Prasert' }
    ],
    reviews: []
  },
  {
    id: 'DOC-109',
    tripId: 'TRP-904',
    typeId: 'DT-9',
    typeName: 'Giấy phép quá cảnh qua nước thứ ba (Transit Permit)',
    category: 'OPERATIONAL',
    group: 'CUSTOMS',
    provider: 'CBN',
    status: 'SUBMITTED',
    number: 'MY-DVS-TRANSIT-2026',
    issuer: 'Department of Veterinary Services Malaysia',
    issuedAt: '2026-10-03',
    expiry: '2026-10-23',
    physicalCopyReceived: false,
    versions: [
      { v: 1, file: 'cbn-malaysia-transit-permit.pdf', at: '2026-10-03 17:55', by: 'Hoang Thu Ha' }
    ],
    reviews: []
  },
  {
    id: 'DOC-110',
    tripId: 'TRP-902',
    horseId: 'HOR-1044',
    horseName: 'Shadowfax',
    typeId: 'DT-3',
    typeName: 'Sổ tiêm vắc xin cúm ngựa (Equine Influenza Record)',
    category: 'OPERATIONAL',
    group: 'MEDICAL',
    provider: 'CUSTOMER',
    status: 'EXPIRED',
    number: 'VAC-2025-419',
    issuer: 'Hà Nội Equine Center',
    issuedAt: '2025-09-20',
    expiry: '2026-09-20',
    physicalCopyReceived: true,
    versions: [
      { v: 1, file: 'shadowfax-old-vaccine.pdf', at: '2026-10-02 10:15', by: 'Tran Minh Khoa' }
    ],
    reviews: [
      { v: 1, decision: 'REJECTED', remark: 'Chứng từ đã hết hạn trước ngày bay (18/10/2026). Đã tạo yêu cầu DR-41 cho khách hàng tiêm mũi nhắc lại.', at: '2026-10-03 18:00', by: 'Hoang Thu Ha' }
    ],
    rejectReason: 'Hết hạn hiệu lực vào ngày 20/09/2026. Bắt buộc mũi tiêm tăng cường trong vòng 180 ngày trước khi nhập cảnh Singapore.'
  }
];

export const INITIAL_DOC_REQUESTS: DocRequest[] = [
  {
    id: 'DR-42',
    tripId: 'TRP-902',
    typeId: 'DT-2',
    typeName: 'Giấy chứng nhận kiểm dịch động vật (Health Certificate)',
    horseId: 'HOR-1044',
    horseName: 'Shadowfax',
    reason: 'Bản chụp v1 thiếu chữ ký của Trưởng trạm kiểm dịch vùng và mộc đỏ chính quyền. Yêu cầu tải bản scan có mộc tròn hợp lệ.',
    dueAt: '2026-10-10',
    status: 'SUBMITTED', // Khách đã nộp bản v2 -> Chuyên viên cần vào thẩm định lại!
    createdAt: '2026-10-03 14:15',
    latestVersionUploaded: 2,
    latestFile: 'shadowfax-health-cert-v2-signed-official.pdf',
    history: [
      { at: '2026-10-03 14:15', action: 'Tạo yêu cầu bổ sung gửi khách hàng (do bản v1 bị từ chối)', by: 'Hoang Thu Ha' },
      { at: '2026-10-04 15:30', action: 'Khách hàng tải lên phiên bản v2 để chuyên viên duyệt lại', by: 'Tran Minh Khoa' }
    ]
  },
  {
    id: 'DR-41',
    tripId: 'TRP-902',
    typeId: 'DT-3',
    typeName: 'Sổ tiêm vắc xin cúm ngựa (Equine Influenza Record)',
    horseId: 'HOR-1044',
    horseName: 'Shadowfax',
    reason: 'Sổ tiêm vắc xin cũ đã hết hạn ngày 20/09/2026. Cần tiêm bổ sung mũi nhắc lại theo yêu cầu nhập cảnh của AVS Singapore.',
    dueAt: '2026-10-12',
    status: 'OPEN', // Vẫn đang chờ khách hàng nộp
    createdAt: '2026-10-03 18:00',
    history: [
      { at: '2026-10-03 18:00', action: 'Tạo yêu cầu gửi khách hàng do chứng từ hết hạn', by: 'Hoang Thu Ha' }
    ]
  },
  {
    id: 'DR-39',
    tripId: 'TRP-904',
    typeId: 'DT-6',
    typeName: 'Chứng nhận cách ly kiểm dịch (Quarantine PEQ Certificate)',
    horseId: 'HOR-1088',
    horseName: 'Lanna Spirit',
    reason: 'Cung cấp phiếu kết quả xét nghiệm máu Coggins Test (EIA) âm tính thực hiện tại phòng lab được công nhận.',
    dueAt: '2026-10-14',
    status: 'FULFILLED',
    createdAt: '2026-10-01 10:00',
    latestVersionUploaded: 1,
    latestFile: 'lanna-coggins-test.pdf',
    history: [
      { at: '2026-10-01 10:00', action: 'Tạo yêu cầu bổ sung', by: 'Hoang Thu Ha' },
      { at: '2026-10-02 16:20', action: 'Khách hàng tải tệp đính kèm', by: 'Somchai Prasert' },
      { at: '2026-10-03 09:15', action: 'Chuyên viên đã duyệt đạt yêu cầu - Hoàn tất', by: 'Hoang Thu Ha' }
    ]
  }
];

export const INITIAL_CLEARANCES: CheckpointClearance[] = [
  {
    id: 'CLR-01',
    tripId: 'TRP-901',
    cpId: 'CP-11',
    cpName: 'Cửa khẩu Quốc tế Mộc Bài (Tây Ninh)',
    cpType: 'Cửa khẩu đường bộ',
    country: 'Việt Nam',
    plannedAt: '2026-10-04 10:00',
    crewPosition: 'AT_CHECKPOINT',
    result: 'PASSED',
    at: '2026-10-04 10:35',
    ref: 'HQ-MB-2026-8819',
    remark: 'Hoàn thành thủ tục kiểm dịch động vật sống và soi quét hộ chiếu FEI Thunderbolt. Đủ điều kiện xuất cảnh.'
  },
  {
    id: 'CLR-02',
    tripId: 'TRP-901',
    cpId: 'CP-12',
    cpName: 'Cửa khẩu Quốc tế Bavet (Svay Rieng)',
    cpType: 'Cửa khẩu đường bộ',
    country: 'Campuchia',
    plannedAt: '2026-10-04 11:30',
    crewPosition: 'NOT_ARRIVED',
    result: 'NONE',
    remark: 'Đang chờ xe đến cổng nhập cảnh Campuchia để kiểm tra giấy phép quá cảnh 72h.'
  },
  {
    id: 'CLR-03',
    tripId: 'TRP-902',
    cpId: 'CP-22',
    cpName: 'Sân bay Quốc tế Nội Bài (Cargo)',
    cpType: 'Sân bay hàng hóa',
    country: 'Việt Nam',
    plannedAt: '2026-10-18 07:00',
    crewPosition: 'NOT_ARRIVED',
    result: 'NONE'
  },
  {
    id: 'CLR-04',
    tripId: 'TRP-902',
    cpId: 'CP-23',
    cpName: 'Sân bay Changi Singapore (Air Cargo)',
    cpType: 'Sân bay hàng hóa',
    country: 'Singapore',
    plannedAt: '2026-10-18 13:05',
    crewPosition: 'NOT_ARRIVED',
    result: 'NONE'
  }
];

export const INITIAL_QUARANTINE_BOOKINGS: QuarantineBooking[] = [
  {
    id: 'QB-01',
    tripId: 'TRP-904',
    cpId: 'CP-32',
    cpName: 'Sembawang Animal Quarantine Station (SAQS Singapore)',
    slot: '2026-10-22',
    ref: 'AVS-BK-2026-0912',
    status: 'REQUESTED',
    notes: 'Đã gửi công văn đặt chuồng cách ly 14 ngày cho 1 cá thể ngựa thi đấu (Lanna Spirit). Đang chờ AVS phản hồi số booking chính thức.'
  },
  {
    id: 'QB-02',
    tripId: 'TRP-902',
    cpId: 'CP-32',
    cpName: 'Sembawang Animal Quarantine Station (SAQS Singapore)',
    slot: '2026-10-18',
    ref: 'AVS-BK-2026-0887',
    status: 'BOOKED',
    confirmedAt: '2026-10-03 11:00',
    notes: 'Đã xác nhận chuồng cách ly VIP khu A (Khu A-04). Lệ phí giữ chỗ đã thanh toán qua cổng AVS.'
  }
];

export const INITIAL_PACKAGES: DocumentPackage[] = [
  {
    id: 'PKG-901',
    tripId: 'TRP-901',
    title: 'Gói hồ sơ đường bộ: Việt Nam → Campuchia → Thái Lan',
    cpName: 'Cửa khẩu Mộc Bài - Poipet',
    status: 'HANDED_OVER',
    docsCount: 5,
    docSummary: 'Hộ chiếu FEI, Giấy kiểm dịch DAH gốc, Giấy tiêm phòng cúm, Giấy phép XK VN, Giấy phép quá cảnh Campuchia',
    releasedAt: '2026-10-04 05:30',
    releasedTo: 'Nguyễn Văn Hùng (Tài xế chính)',
    history: [
      { at: '2026-10-02 17:00', by: 'Hoang Thu Ha', text: 'Tạo gói hồ sơ nháp' },
      { at: '2026-10-03 16:00', by: 'Hoang Thu Ha', text: 'Kiểm tra đủ bản cứng gốc & đóng dấu niêm phong túi chuyên dụng' },
      { at: '2026-10-04 05:30', by: 'Hoang Thu Ha', text: 'Bàn giao trực tiếp cho Tổ xe trước khi xuất bến' }
    ]
  },
  {
    id: 'PKG-902',
    tripId: 'TRP-902',
    title: 'Gói hồ sơ bay chuyên cơ: Nội Bài (HAN) → Singapore (SIN)',
    cpName: 'Sân bay Quốc tế Nội Bài',
    status: 'DRAFT_PACKAGE',
    docsCount: 3,
    docSummary: 'Hộ chiếu FEI Shadowfax, Giấy phép nhập cảnh AVS Singapore, Xác nhận đặt chỗ cách ly SAQS',
    history: [
      { at: '2026-10-03 15:00', by: 'Hoang Thu Ha', text: 'Khởi tạo gói hồ sơ nháp. Cần chờ duyệt lại Giấy kiểm dịch v2 và bổ sung Sổ tiêm phòng.' }
    ]
  },
  {
    id: 'PKG-903',
    tripId: 'TRP-903',
    title: 'Gói hồ sơ vận chuyển nội địa: Đà Nẵng → TP. Hồ Chí Minh',
    status: 'READY',
    docsCount: 4,
    docSummary: 'Hộ chiếu ngựa Red Rum, Giấy kiểm dịch liên tỉnh, Sổ tiêm phòng định kỳ, Giấy phép lưu hành',
    history: [
      { at: '2026-10-03 10:00', by: 'Hoang Thu Ha', text: 'Tạo gói hồ sơ' },
      { at: '2026-10-03 16:30', by: 'Hoang Thu Ha', text: 'Đánh dấu Sẵn sàng bàn giao cho tài xế khi nhận xe' }
    ]
  }
];

export const INITIAL_AUDIT_LOG: AuditItem[] = [
  {
    id: 'AUD-01',
    at: '2026-10-04 15:30',
    actor: 'Tran Minh Khoa',
    role: 'Khách hàng',
    action: 'Bổ sung hồ sơ mới',
    entity: 'DOC-105 • DR-42',
    detail: 'Tải lên phiên bản v2 Giấy chứng nhận kiểm dịch Shadowfax có đóng dấu mộc đỏ chính thức.'
  },
  {
    id: 'AUD-02',
    at: '2026-10-04 10:35',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Ghi nhận thông quan',
    entity: 'CLR-01 (Mộc Bài)',
    detail: 'Cập nhật kết quả thông quan xuất khẩu PASSED cho chuyến TRP-901.'
  },
  {
    id: 'AUD-03',
    at: '2026-10-03 18:00',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Yêu cầu bổ sung hồ sơ',
    entity: 'DR-41 • TRP-902',
    detail: 'Yêu cầu tiêm nhắc lại và nộp sổ tiêm vắc xin cúm mới cho ngựa Shadowfax do sổ cũ hết hạn.'
  },
  {
    id: 'AUD-04',
    at: '2026-10-03 14:10',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Từ chối chứng từ',
    entity: 'DOC-105 (v1)',
    detail: 'Từ chối Giấy kiểm dịch do thiếu chữ ký bác sĩ thú y chính quyền; tạo yêu cầu bổ sung DR-42.'
  },
  {
    id: 'AUD-05',
    at: '2026-10-03 11:00',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Xác nhận đặt chỗ kiểm dịch',
    entity: 'QB-02 (SAQS Singapore)',
    detail: 'Ghi nhận mã đặt chuồng AVS-BK-2026-0887 cho chuyến TRP-902 ngày 18/10/2026.'
  },
  {
    id: 'AUD-06',
    at: '2026-10-02 16:30',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Phê duyệt chứng từ',
    entity: 'DOC-104 (TRP-901)',
    detail: 'Duyệt giấy phép xuất khẩu CBN phát hành cho chuyến TRP-901.'
  },
  {
    id: 'AUD-07',
    at: '2026-10-01 14:00',
    actor: 'Hoang Thu Ha',
    role: 'Transport Specialist',
    action: 'Phê duyệt chứng từ',
    entity: 'DOC-102 (TRP-901)',
    detail: 'Duyệt Giấy chứng nhận kiểm dịch động vật cho cá thể Thunderbolt.'
  }
];
