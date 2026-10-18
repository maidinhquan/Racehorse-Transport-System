import type {
  CustomerTransportRequest,
  HorseProfile,
  BaselineDocument,
  ContractVersion,
  PaymentTransaction,
  CustomerComplaint,
  CustomerFeedback,
} from '../types/customerTypes';

const STORAGE_KEY = 'cbn_customer_requests_v2';
const HORSES_STORAGE_KEY = 'cbn_customer_horses_v2';

// Standard baseline horses
export const INITIAL_HORSES: HorseProfile[] = [
  {
    id: 'HOR-1035',
    name: 'Thunder Strike',
    breed: 'Thoroughbred',
    microchipIso: '981020000123456',
    feiPassportNo: 'FEI-VN-8821',
    gender: 'Đực',
    weightKg: 520,
    dob: '2020-04-12',
    color: 'Nâu hạt dẻ',
    status: 'Ready',
  },
  {
    id: 'HOR-2048',
    name: 'Saigon Star',
    breed: 'Arabian',
    microchipIso: '981020000654321',
    feiPassportNo: 'FEI-VN-9910',
    gender: 'Thiến',
    weightKg: 480,
    dob: '2021-06-18',
    color: 'Bạch kim',
    status: 'Ready',
  },
  {
    id: 'HOR-3003',
    name: 'Lanna Spirit',
    breed: 'Warmblood',
    microchipIso: '981020000888999',
    feiPassportNo: 'FEI-VN-3344',
    gender: 'Cái',
    weightKg: 540,
    dob: '2019-09-05',
    color: 'Đen tuyền',
    status: 'InTransit',
  },
];

// Helper to compute standard 24h deadline from given ISO timestamp
export function compute24hDeadline(fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  return new Date(base.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

// Initial demo requests
const INITIAL_REQUESTS: CustomerTransportRequest[] = [
  // 1. A waiting review request
  {
    id: 'TR-2026-0160',
    customerId: 'CUS-001',
    customerName: 'Alex Equine',
    customerPhone: '+84 901 234 567',
    customerEmail: 'alex.equine@example.com',
    originCity: 'Bình Dương',
    originCountry: 'Việt Nam',
    destinationCity: 'Tokyo',
    destinationCountry: 'Nhật Bản',
    transportType: 'Hàng không',
    expectedDate: '2026-11-10',
    committedDeadline: '2026-11-15',
    pickupAddress: 'Trường đua Đại Nam, Hiệp An, TP. Thủ Dầu Một, Bình Dương',
    deliveryAddress: 'Tokyo Racecourse, Fuchu, Tokyo, Japan',
    receiverName: 'Kenji Takahashi',
    receiverPhone: '+81-90-1234-5678',
    receiverEmail: 'kenji.takahashi@tokyoracing.jp',
    horseIds: ['HOR-1035'],
    horses: [INITIAL_HORSES[0]],
    commercialValueUsd: 180000,
    specialCareNotes: 'Cần bổ sung cỏ Alfalfa và nước điện giải định kỳ 3 tiếng/lần.',
    documents: [
      { docKey: 'EXPORT_HEALTH_CERT', name: 'Giấy chứng nhận xuất khẩu (Health Certificate)', scope: 'horse', horseId: 'HOR-1035', status: 'Submitted', fileName: 'health-cert-hor1035.pdf' },
      { docKey: 'FEI_PASSPORT', name: 'Hộ chiếu FEI (Equine Passport)', scope: 'horse', horseId: 'HOR-1035', status: 'Submitted', fileName: 'fei-passport-hor1035.pdf' },
      { docKey: 'COGGINS_EIA', name: 'Xét nghiệm Coggins EIA âm tính', scope: 'horse', horseId: 'HOR-1035', status: 'Submitted', fileName: 'coggins-test.pdf' },
    ],
    status: 'Pending',
    contractVersions: [],
    currentVersionNumber: 0,
    transactions: [],
    complaints: [],
    createdAt: '2026-10-17T08:00:00.000Z',
    updatedAt: '2026-10-17T08:00:00.000Z',
  },

  // 2. An active in-transit request with ROAD - AIR - ROAD
  {
    id: 'TR-2026-0155',
    customerId: 'CUS-001',
    customerName: 'Alex Equine',
    customerPhone: '+84 901 234 567',
    customerEmail: 'alex.equine@example.com',
    originCity: 'Hồ Chí Minh',
    originCountry: 'Việt Nam',
    destinationCity: 'Osaka',
    destinationCountry: 'Nhật Bản',
    transportType: 'Hàng không',
    expectedDate: '2026-10-15',
    committedDeadline: '2026-10-20',
    pickupAddress: 'CLB Cưỡi ngựa Saigon Pony Club, Thảo Điền, TP. Thủ Đức',
    deliveryAddress: 'Hanshin Racecourse, Takarazuka, Hyogo, Japan',
    receiverName: 'Hiroshi Sato',
    receiverPhone: '+81-80-9876-5432',
    receiverEmail: 'hiroshi.sato@hanshin.jp',
    horseIds: ['HOR-3003'],
    horses: [INITIAL_HORSES[2]],
    commercialValueUsd: 220000,
    specialCareNotes: 'Ngựa nhạy cảm với tiếng ồn máy bay, cần bịt tai cách âm chuyên dụng.',
    documents: [
      { docKey: 'EXPORT_HEALTH_CERT', name: 'Giấy chứng nhận kiểm dịch xuất khẩu', scope: 'horse', horseId: 'HOR-3003', status: 'Approved', fileName: 'health-hor3003.pdf' },
      { docKey: 'FEI_PASSPORT', name: 'Hộ chiếu FEI quốc tế', scope: 'horse', horseId: 'HOR-3003', status: 'Approved', fileName: 'passport-hor3003.pdf' },
    ],
    status: 'In Transit',
    contractVersions: [
      {
        version: 1,
        contractRef: 'CTR-2026-0155-v1',
        issuedAt: '2026-10-12T09:00:00.000Z',
        validUntil: '2026-10-13T09:00:00.000Z',
        totalPrice: 12500,
        depositRequired: 3750,
        balanceRemaining: 8750,
        currency: 'USD',
        status: 'EFFECTIVE',
        termsAcceptedAt: '2026-10-12T10:15:00.000Z',
      },
    ],
    currentVersionNumber: 1,
    transactions: [
      {
        id: 'TXN-DEP-0155',
        requestId: 'TR-2026-0155',
        type: 'DEPOSIT',
        amount: 3750,
        currency: 'USD',
        method: 'VNPAY',
        status: 'SUCCESS',
        createdAt: '2026-10-12T10:30:00.000Z',
        confirmedAt: '2026-10-12T10:32:00.000Z',
        referenceCode: 'VNP-20261012-001',
      },
    ],
    tripId: 'TRIP-2026-0042',
    legs: [
      {
        id: 'LEG-1',
        type: 'PICKUP',
        title: 'Chặng 1 (Đường bộ): Nhận ngựa tại Trại & đưa ra sân bay TSN',
        location: 'Saigon Pony Club ➔ Sân bay Tân Sơn Nhất',
        scheduledTime: '2026-10-15T06:00:00.000Z',
        confirmedTime: '2026-10-15T06:30:00.000Z',
        status: 'CONFIRMED',
        actorName: 'Nguyễn Văn Hùng',
        actorRole: 'Tài xế chuyên dụng',
        notes: 'Ngựa lên xe Equine Truck ổn định, thân nhiệt bình thường 37.8°C.',
      },
      {
        id: 'LEG-2',
        type: 'AIRPORT_TRANSFER_ORIGIN',
        title: 'Bàn giao cho đối tác mặt đất & lên Air Stall',
        location: 'Kho hàng hàng không SGN Cargo Terminal',
        scheduledTime: '2026-10-15T09:00:00.000Z',
        confirmedTime: '2026-10-15T09:45:00.000Z',
        status: 'CONFIRMED',
        actorName: 'Hoàng Thu Hà',
        actorRole: 'Transport Specialist',
        notes: 'Hoàn tất thủ tục hải quan xuất khẩu và kiểm dịch cửa khẩu.',
      },
      {
        id: 'LEG-3',
        type: 'FLIGHT_DEPARTURE',
        title: 'Chặng 2 (Hàng không): Chuyến bay vận tải SGN ➔ KIX',
        location: 'Tân Sơn Nhất (SGN) ➔ Sân bay quốc tế Kansai (KIX)',
        scheduledTime: '2026-10-15T13:00:00.000Z',
        confirmedTime: '2026-10-15T13:15:00.000Z',
        status: 'CONFIRMED',
        actorName: 'All Nippon Airways Cargo',
        actorRole: 'Hãng bay đối tác',
        notes: 'Chuyến bay cất cánh an toàn theo lịch bay ghi nhận bởi Coordinator.',
      },
      {
        id: 'LEG-4',
        type: 'FLIGHT_ARRIVAL',
        title: 'Hạ cánh Kansai & Đội tiếp nhận đầu đến xác nhận',
        location: 'Kansai International Airport (KIX)',
        scheduledTime: '2026-10-15T21:00:00.000Z',
        status: 'PENDING',
        notes: 'ETA hiện hành: 21:00. Chờ đội mặt đất Osaka xác nhận tiếp nhận thủ công.',
      },
      {
        id: 'LEG-5',
        type: 'FINAL_DELIVERY',
        title: 'Chặng 3 (Đường bộ Nhật Bản): Vận chuyển về Trường đua Hanshin',
        location: 'KIX Airport ➔ Hanshin Racecourse, Hyogo',
        scheduledTime: '2026-10-16T08:00:00.000Z',
        status: 'PENDING',
        notes: 'Chờ hoàn thành thủ tục kiểm dịch nhập cảnh Nhật Bản.',
      },
    ],
    healthLogs: [
      {
        id: 'HL-01',
        horseId: 'HOR-3003',
        horseName: 'Lanna Spirit',
        timestamp: '2026-10-15T07:15:00.000Z',
        recordedBy: 'Bs. Đặng Văn Nam',
        role: 'VETERINARIAN',
        entryType: 'VITAL_SIGNS',
        heartRate: 38,
        temperature: 37.9,
        respiratoryRate: 14,
        observationNotes: 'Sức khỏe tổng quát tốt trước khi đưa vào khoang hàng không.',
        isDoctorConclusion: true,
      },
      {
        id: 'HL-02',
        horseId: 'HOR-3003',
        horseName: 'Lanna Spirit',
        timestamp: '2026-10-15T11:30:00.000Z',
        recordedBy: 'Lê Hoàng Minh',
        role: 'ESCORT',
        entryType: 'FEEDING_HYDRATION',
        waterIntakeLiters: 15,
        foodIntakeKg: 3.5,
        observationNotes: 'Ngựa uống đủ nước, ăn khẩu phần cỏ khô bình thường tại khu chờ bay.',
        isDoctorConclusion: false,
      },
    ],
    incidents: [
      {
        id: 'INC-01',
        requestId: 'TR-2026-0155',
        horseId: 'HOR-3003',
        type: 'DELAY_AIR',
        title: 'Hãng bay lùi giờ cất cánh 15 phút do xếp hàng cất cánh',
        description: 'Chuyến bay vận tải hàng không cất cánh lúc 13:15 thay vì 13:00. Thời gian bay được điều chỉnh không ảnh hưởng sức khỏe ngựa.',
        impactOnEta: 'Lùi giờ hạ cánh dự kiến 15 phút tại Kansai.',
        reportedAt: '2026-10-15T12:45:00.000Z',
        status: 'RESOLVED',
        resolutionNotes: 'Bác sĩ kiểm tra ngựa trong stall bình yên, không có stress.',
      },
    ],
    complaints: [],
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-15T13:20:00.000Z',
  },

  // 3. A delivered request awaiting balance payment and feedback
  {
    id: 'TR-2026-0148',
    customerId: 'CUS-001',
    customerName: 'Alex Equine',
    customerPhone: '+84 901 234 567',
    customerEmail: 'alex.equine@example.com',
    originCity: 'Hồ Chí Minh',
    originCountry: 'Việt Nam',
    destinationCity: 'Hà Nội',
    destinationCountry: 'Việt Nam',
    transportType: 'Đường bộ',
    expectedDate: '2026-10-02',
    committedDeadline: '2026-10-06',
    pickupAddress: 'Trại huấn luyện ngựa Hóc Môn, TP.HCM',
    deliveryAddress: 'Trung tâm Huấn luyện Thể thao Quốc gia Hà Nội',
    receiverName: 'Trần Văn Mạnh',
    receiverPhone: '+84-912-345-678',
    receiverEmail: 'manh.tran@equineteam.vn',
    horseIds: ['HOR-2048'],
    horses: [INITIAL_HORSES[1]],
    commercialValueUsd: 95000,
    documents: [
      { docKey: 'DOMESTIC_QUARANTINE', name: 'Giấy chứng nhận kiểm dịch vận chuyển nội địa', scope: 'horse', horseId: 'HOR-2048', status: 'Approved', fileName: 'kiem-dich-noi-dia.pdf' },
    ],
    status: 'Delivered',
    contractVersions: [
      {
        version: 1,
        contractRef: 'CTR-2026-0148-v1',
        issuedAt: '2026-09-28T09:00:00.000Z',
        validUntil: '2026-09-29T09:00:00.000Z',
        totalPrice: 4200,
        depositRequired: 1260,
        balanceRemaining: 2940,
        currency: 'USD',
        status: 'EFFECTIVE',
        termsAcceptedAt: '2026-09-28T11:00:00.000Z',
      },
    ],
    currentVersionNumber: 1,
    transactions: [
      {
        id: 'TXN-DEP-0148',
        requestId: 'TR-2026-0148',
        type: 'DEPOSIT',
        amount: 1260,
        currency: 'USD',
        method: 'BANK_TRANSFER',
        status: 'SUCCESS',
        createdAt: '2026-09-28T11:30:00.000Z',
        confirmedAt: '2026-09-28T11:45:00.000Z',
        referenceCode: 'VCB-20260928-091',
      },
    ],
    tripId: 'TRIP-2026-0038',
    handover: {
      requestId: 'TR-2026-0148',
      receiverName: 'Trần Văn Mạnh',
      receiverPhone: '+84-912-345-678',
      receiverEmail: 'manh.tran@equineteam.vn',
      otpCode: '883921',
      otpVerifiedAt: '2026-10-06T14:30:00.000Z',
      receiverSignatureNotes: 'Người nhận đã kiểm tra ngựa Saigon Star nguyên vẹn, đối chiếu vi mạch ISO chuẩn xác.',
      completedAt: '2026-10-06T14:30:00.000Z',
    },
    complaints: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    updatedAt: '2026-10-06T14:30:00.000Z',
  },
];

class CustomerMockStore {
  private requests: CustomerTransportRequest[] = [];
  private horses: HorseProfile[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const savedReq = localStorage.getItem(STORAGE_KEY);
      if (savedReq) {
        this.requests = JSON.parse(savedReq);
      } else {
        this.requests = JSON.parse(JSON.stringify(INITIAL_REQUESTS));
        this.saveRequests();
      }

      const savedHorses = localStorage.getItem(HORSES_STORAGE_KEY);
      if (savedHorses) {
        this.horses = JSON.parse(savedHorses);
      } else {
        this.horses = JSON.parse(JSON.stringify(INITIAL_HORSES));
        this.saveHorses();
      }
    } catch {
      this.requests = JSON.parse(JSON.stringify(INITIAL_REQUESTS));
      this.horses = JSON.parse(JSON.stringify(INITIAL_HORSES));
    }
  }

  private saveRequests() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.requests));
  }

  private saveHorses() {
    localStorage.setItem(HORSES_STORAGE_KEY, JSON.stringify(this.horses));
  }

  // Horses
  public getHorses(): HorseProfile[] {
    return [...this.horses];
  }

  public getHorseById(id: string): HorseProfile | undefined {
    return this.horses.find(h => h.id === id);
  }

  public addHorse(horse: Omit<HorseProfile, 'id'>): HorseProfile {
    const newHorse: HorseProfile = {
      ...horse,
      id: `HOR-${Math.max(1000, ...this.horses.map(h => Number(h.id.replace('HOR-', '')) || 0)) + 1}`,
    };
    this.horses.push(newHorse);
    try { this.saveHorses(); } catch (error) { this.horses.pop(); throw error; }
    return newHorse;
  }

  public updateHorse(id: string, updates: Partial<HorseProfile>): HorseProfile | null {
    const idx = this.horses.findIndex(h => h.id === id);
    if (idx === -1) return null;
    const previous = this.horses[idx];
    this.horses[idx] = { ...previous, ...updates, id };
    try { this.saveHorses(); } catch (error) { this.horses[idx] = previous; throw error; }
    return this.horses[idx];
  }

  public getRequests(): CustomerTransportRequest[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.requests = JSON.parse(saved);
    } catch {}
    return [...this.requests];
  }

  public getRequestById(id: string): CustomerTransportRequest | undefined {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.requests = JSON.parse(saved);
    } catch {}

    const found = this.requests.find(r => r.id === id);
    if (found) return found;

    // Check legacy storage key fallback
    try {
      const legacyRaw = localStorage.getItem('cbn_transport_requests');
      if (legacyRaw) {
        const legacyList = JSON.parse(legacyRaw);
        const legacyItem = legacyList.find((r: any) => r && r.id === id);
        if (legacyItem) {
          // Map legacy status to modern request
          let mappedStatus: CustomerTransportRequest['status'] = 'Pending';
          if (legacyItem.status === 'Waiting for Manager Review') mappedStatus = 'Pending';
          else if (legacyItem.status === 'Changes Requested') mappedStatus = 'Changes Requested';
          else if (legacyItem.status === 'Accepted – Contract Preparation') mappedStatus = 'Accepted – Contract Preparation';
          else if (legacyItem.status === 'Rejected') mappedStatus = 'Rejected';
          else if (legacyItem.status === 'Scheduled') mappedStatus = 'Activated';
          else if (legacyItem.status === 'In Transit') mappedStatus = 'In Transit';
          else if (legacyItem.status === 'Completed') mappedStatus = 'Closed';

          const adapted: CustomerTransportRequest = {
            id: legacyItem.id,
            customerId: 'CUS-001',
            customerName: 'Alex Equine',
            customerPhone: '+84 901 234 567',
            customerEmail: 'alex.equine@example.com',
            originCity: legacyItem.origin || 'Bình Dương',
            originCountry: 'Việt Nam',
            destinationCity: legacyItem.destination || 'Tokyo',
            destinationCountry: 'Nhật Bản',
            transportType: 'Hàng không',
            expectedDate: legacyItem.preferredDate || '2026-11-10',
            committedDeadline: '2026-11-15',
            pickupAddress: 'Trường đua Đại Nam, Bình Dương',
            deliveryAddress: 'Tokyo Racecourse, Fuchu, Tokyo, Japan',
            receiverName: 'Kenji Takahashi',
            receiverPhone: '+81-90-1234-5678',
            receiverEmail: 'kenji.takahashi@tokyoracing.jp',
            horseIds: ['HOR-1035'],
            horses: [INITIAL_HORSES[0]],
            commercialValueUsd: 180000,
            documents: [
              { docKey: 'FEI_PASSPORT', name: 'Hộ chiếu FEI Quốc tế', scope: 'horse', horseId: 'HOR-1035', status: 'Submitted', fileName: 'passport.pdf' }
            ],
            status: mappedStatus,
            contractVersions: [],
            currentVersionNumber: 0,
            transactions: [],
            complaints: [],
            createdAt: '2026-10-17T08:00:00.000Z',
            updatedAt: '2026-10-17T08:00:00.000Z',
          };
          this.requests.push(adapted);
          this.saveRequests();
          return adapted;
        }
      }
    } catch {}

    return undefined;
  }

  // Create Request with baseline checklist and designated receiver
  public createRequest(data: {
    originCity: string;
    originCountry: 'Việt Nam';
    destinationCity: string;
    destinationCountry: 'Việt Nam' | 'Nhật Bản';
    transportType: 'Đường bộ' | 'Hàng không';
    expectedDate: string;
    committedDeadline: string;
    pickupAddress: string;
    deliveryAddress: string;
    receiverName: string;
    receiverPhone: string;
    receiverEmail: string;
    horseIds: string[];
    commercialValueUsd: number;
    specialCareNotes?: string;
    documents?: BaselineDocument[];
    pickup?: CustomerTransportRequest['pickup'];
    delivery?: CustomerTransportRequest['delivery'];
    horseNotes?: Record<string, string>;
    requestedHorseCount?: number;
    horseSlots?: string[];
    status?: 'Draft' | 'Pending';
  }, requestId?: string): CustomerTransportRequest {
    const existing = requestId ? this.getRequestById(requestId) : undefined;
    if (requestId && (!existing || !['Draft', 'Changes Requested'].includes(existing.status))) {
      throw new Error('Yêu cầu này không còn được phép chỉnh sửa.');
    }
    const chosenHorses = this.horses.filter(h => data.horseIds.includes(h.id));

    // Default baseline documents if not provided
    const isInternational = data.destinationCountry === 'Nhật Bản';
    const documents: BaselineDocument[] = data.documents || [];

    if (!data.documents) {
      if (isInternational) {
        data.horseIds.forEach(hid => {
          documents.push(
            { docKey: 'FEI_PASSPORT', name: 'Hộ chiếu FEI Quốc tế (FEI Passport)', scope: 'horse', horseId: hid, status: 'Submitted', fileName: `fei-passport-${hid}.pdf` },
            { docKey: 'EXPORT_HEALTH_CERT', name: 'Giấy chứng nhận xuất khẩu (Export Health Cert)', scope: 'horse', horseId: hid, status: 'Submitted', fileName: `health-cert-${hid}.pdf` },
            { docKey: 'COGGINS_EIA', name: 'Xét nghiệm Coggins EIA âm tính', scope: 'horse', horseId: hid, status: 'Submitted', fileName: `coggins-${hid}.pdf` }
          );
        });
      } else {
        data.horseIds.forEach(hid => {
          documents.push(
            { docKey: 'DOMESTIC_QUARANTINE', name: 'Giấy kiểm dịch động vật nội địa', scope: 'horse', horseId: hid, status: 'Submitted', fileName: `kiem-dich-${hid}.pdf` }
          );
        });
      }
    }

    const newId = `TR-${new Date().getFullYear()}-${Math.max(1000, ...this.requests.map(r => Number(r.id.split('-').at(-1)) || 0)) + 1}`;
    const newReq: CustomerTransportRequest = {
      id: existing?.id || newId,
      customerId: 'CUS-001',
      customerName: 'Alex Equine',
      customerPhone: '+84 901 234 567',
      customerEmail: 'alex.equine@example.com',
      originCity: data.originCity,
      originCountry: data.originCountry,
      destinationCity: data.destinationCity,
      destinationCountry: data.destinationCountry,
      transportType: data.transportType,
      expectedDate: data.expectedDate,
      committedDeadline: data.committedDeadline,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      pickup: data.pickup,
      delivery: data.delivery,
      horseNotes: data.horseNotes,
      requestedHorseCount: data.requestedHorseCount,
      horseSlots: data.horseSlots,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
      receiverEmail: data.receiverEmail,
      horseIds: data.horseIds,
      horses: chosenHorses,
      commercialValueUsd: data.commercialValueUsd,
      specialCareNotes: data.specialCareNotes,
      documents,
      status: data.status || 'Pending',
      contractVersions: existing?.contractVersions || [],
      currentVersionNumber: existing?.currentVersionNumber || 0,
      transactions: existing?.transactions || [],
      complaints: existing?.complaints || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previous = [...this.requests];
    if (existing) this.requests = this.requests.map(r => r.id === existing.id ? { ...existing, ...newReq } : r);
    else this.requests.unshift(newReq);
    try { this.saveRequests(); } catch (error) { this.requests = previous; throw error; }
    return newReq;
  }

  // Manager updates request status (for simulation/test fixture)
  public updateRequestStatus(id: string, status: CustomerTransportRequest['status'], meta?: { rejectionReason?: string; changeRequestReason?: string }): CustomerTransportRequest | null {
    const req = this.getRequestById(id);
    if (!req) return null;
    req.status = status;
    if (meta?.rejectionReason) req.rejectionReason = meta.rejectionReason;
    if (meta?.changeRequestReason) req.changeRequestReason = meta.changeRequestReason;
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return req;
  }

  // Manager issues a contract version
  public issueContractVersion(id: string, options?: { totalPrice?: number; depositRate?: number }): ContractVersion | null {
    const req = this.getRequestById(id);
    if (!req) return null;

    const nextVer = req.contractVersions.length + 1;
    const isInternational = req.destinationCountry === 'Nhật Bản';
    const baseHorsePrice = isInternational ? 8500 : 2500;
    const total = options?.totalPrice || (baseHorsePrice * Math.max(req.horseIds.length, 1) + (isInternational ? 3500 : 800));
    const depositRequired = Math.round(total * (options?.depositRate || 0.3));
    const balanceRemaining = total - depositRequired;

    const newVersion: ContractVersion = {
      version: nextVer,
      contractRef: `CTR-${req.id}-v${nextVer}`,
      issuedAt: new Date().toISOString(),
      validUntil: compute24hDeadline(),
      totalPrice: total,
      depositRequired,
      balanceRemaining,
      currency: 'USD',
      status: 'ISSUED',
      termsAcceptedAt: null,
    };

    req.contractVersions.push(newVersion);
    req.currentVersionNumber = nextVer;
    req.status = 'Contract Review';
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return newVersion;
  }

  // Customer accepts contract terms before paying deposit
  public acceptContractTerms(id: string, versionNumber: number): boolean {
    const req = this.getRequestById(id);
    if (!req) return false;
    const v = req.contractVersions.find(item => item.version === versionNumber);
    if (!v || v.status !== 'ISSUED') return false;

    v.termsAcceptedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return true;
  }

  // Customer requests contract changes (only before paying deposit)
  public requestContractChange(id: string, versionNumber: number, sections: string[], notes: string): { success: boolean; message?: string } {
    const req = this.getRequestById(id);
    if (!req) return { success: false, message: 'Request not found' };

    const v = req.contractVersions.find(item => item.version === versionNumber);
    if (!v) return { success: false, message: 'Contract version not found' };

    // Check if deposit payment has already started or succeeded
    const hasActivePayment = req.transactions.some(tx =>
      tx.type === 'DEPOSIT' && (tx.status === 'INITIATED' || tx.status === 'PROCESSING' || tx.status === 'SUCCESS')
    );
    if (hasActivePayment) {
      return { success: false, message: 'Giao dịch thanh toán cọc đang diễn ra hoặc đã hoàn tất. Không thể yêu cầu sửa đổi hợp đồng.' };
    }

    v.status = 'CHANGES_REQUESTED';
    v.changeRequests = {
      requestedAt: new Date().toISOString(),
      sections,
      customerNotes: notes,
    };
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return { success: true };
  }

  // Manager responds to contract change request
  public managerRespondContractChange(
    id: string,
    versionNumber: number,
    decision: 'ACCEPTED' | 'REJECTED',
    notes: string,
    newPriceAdjusted?: number
  ): { success: boolean; newVersion?: ContractVersion } {
    const req = this.getRequestById(id);
    if (!req) return { success: false };
    const curV = req.contractVersions.find(item => item.version === versionNumber);
    if (!curV || !curV.changeRequests) return { success: false };

    curV.changeRequests.managerResponse = {
      decision,
      notes,
      respondedAt: new Date().toISOString(),
    };

    if (decision === 'ACCEPTED') {
      // Create new version with full fresh 24h deadline
      curV.status = 'REVISED';
      const nextVer = req.contractVersions.length + 1;
      const total = newPriceAdjusted || curV.totalPrice;
      const dep = Math.round(total * 0.3);
      const newV: ContractVersion = {
        version: nextVer,
        contractRef: `CTR-${req.id}-v${nextVer}`,
        issuedAt: new Date().toISOString(),
        validUntil: compute24hDeadline(),
        totalPrice: total,
        depositRequired: dep,
        balanceRemaining: total - dep,
        currency: curV.currency,
        status: 'ISSUED',
        termsAcceptedAt: null,
      };
      req.contractVersions.push(newV);
      req.currentVersionNumber = nextVer;
      req.status = 'Contract Review';
      req.updatedAt = new Date().toISOString();
      this.saveRequests();
      return { success: true, newVersion: newV };
    } else {
      // REJECTED: keep same version & content, but reset fresh 24h deadline from manager rejection time!
      curV.status = 'ISSUED';
      curV.validUntil = compute24hDeadline();
      req.status = 'Contract Review';
      req.updatedAt = new Date().toISOString();
      this.saveRequests();
      return { success: true, newVersion: curV };
    }
  }

  // Deposit payment initiation
  public initiateDepositPayment(id: string, method: 'VNPAY' | 'BANK_TRANSFER'): PaymentTransaction | null {
    const req = this.getRequestById(id);
    if (!req) return null;
    const v = req.contractVersions.find(item => item.version === req.currentVersionNumber);
    if (!v) return null;

    const tx: PaymentTransaction = {
      id: `TXN-DEP-${Math.floor(10000 + Math.random() * 90000)}`,
      requestId: req.id,
      type: 'DEPOSIT',
      amount: v.depositRequired,
      currency: v.currency,
      method,
      status: 'INITIATED',
      createdAt: new Date().toISOString(),
      referenceCode: `${method === 'VNPAY' ? 'VNP' : 'BANK'}-${Date.now().toString().slice(-8)}`,
    };

    req.transactions.push(tx);
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return tx;
  }

  // Verify deposit payment (simulate gateway callback or bank reconciliation)
  public verifyDepositPayment(id: string, txId: string, success: boolean): boolean {
    const req = this.getRequestById(id);
    if (!req) return false;
    const tx = req.transactions.find(t => t.id === txId && t.type === 'DEPOSIT');
    if (!tx) return false;

    if (success) {
      tx.status = 'SUCCESS';
      tx.confirmedAt = new Date().toISOString();
      req.status = 'Deposit Verified – Awaiting Signature';
    } else {
      tx.status = 'FAILED';
    }
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return true;
  }

  // Issue Contract OTP
  public requestSignatureOtp(id: string): { success: boolean; otp?: string; message?: string } {
    const req = this.getRequestById(id);
    if (!req) return { success: false, message: 'Request not found' };

    // Must be deposit verified first!
    const isDepositVerified = req.transactions.some(tx => tx.type === 'DEPOSIT' && tx.status === 'SUCCESS');
    if (!isDepositVerified) {
      return { success: false, message: 'Chưa xác minh đủ cọc. Không thể cấp mã OTP ký hợp đồng.' };
    }

    // In demo, generate a standard test OTP: '686868'
    return { success: true, otp: '686868', message: 'Mã OTP ký hợp đồng đã được gửi về email của bạn (Mã demo: 686868)' };
  }

  // Sign contract with OTP -> Contract EFFECTIVE + Request ACTIVATED + 1 Trip PLANNING
  public signContractWithOtp(id: string, otpCode: string): { success: boolean; message?: string } {
    const req = this.getRequestById(id);
    if (!req) return { success: false, message: 'Request not found' };

    const v = req.contractVersions.find(item => item.version === req.currentVersionNumber);
    if (!v) return { success: false, message: 'No current contract version' };

    // Check if deposit verified
    const isDepositVerified = req.transactions.some(tx => tx.type === 'DEPOSIT' && tx.status === 'SUCCESS');
    if (!isDepositVerified) {
      return { success: false, message: 'Chưa xác minh đủ cọc. Không được phép ký hợp đồng.' };
    }

    if (otpCode !== '686868') {
      return { success: false, message: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' };
    }

    // Guard: Repeated signing does not duplicate trip
    if (v.status === 'EFFECTIVE' && req.status === 'Activated') {
      return { success: true, message: 'Hợp đồng đã có hiệu lực.' };
    }

    v.status = 'EFFECTIVE';
    req.status = 'Activated';
    const isInternational = req.destinationCountry === 'Nhật Bản';
    req.tripId = `TRIP-${req.id.replace('TR-', '')}`;

    // Create 1 Trip PLANNING with appropriate milestones
    if (isInternational) {
      req.legs = [
        {
          id: 'LEG-1',
          type: 'PICKUP',
          title: 'Chặng 1 (Đường bộ): Lấy ngựa & vận chuyển ra sân bay',
          location: `${req.pickupAddress} ➔ Sân bay Tân Sơn Nhất`,
          scheduledTime: `${req.expectedDate}T06:00:00.000Z`,
          status: 'PENDING',
          notes: 'Đang xếp lịch tài xế và xe chuyên dụng Equine Truck.',
        },
        {
          id: 'LEG-2',
          type: 'AIRPORT_TRANSFER_ORIGIN',
          title: 'Bàn giao cho hãng/đối tác hàng không & lên Air Stall',
          location: 'Ga hàng hóa Sân bay Tân Sơn Nhất',
          scheduledTime: `${req.expectedDate}T10:00:00.000Z`,
          status: 'PENDING',
          notes: 'Kiểm dịch xuất khẩu và bàn giao hãng bay.',
        },
        {
          id: 'LEG-3',
          type: 'FLIGHT_DEPARTURE',
          title: 'Chặng 2 (Hàng không): Chuyến bay vận tải quốc tế',
          location: `Tân Sơn Nhất (SGN) ➔ ${req.destinationCity} Airport`,
          scheduledTime: `${req.expectedDate}T14:00:00.000Z`,
          status: 'PENDING',
          notes: 'Giờ bay theo xác nhận chuyến từ Coordinator.',
        },
        {
          id: 'LEG-4',
          type: 'FLIGHT_ARRIVAL',
          title: 'Hạ cánh & Đội tiếp nhận đầu đến xác nhận tiếp nhận',
          location: `${req.destinationCity} Airport`,
          scheduledTime: `${req.committedDeadline}T02:00:00.000Z`,
          status: 'PENDING',
          notes: 'Xác nhận tiếp nhận thủ công bởi nhân sự đầu đến.',
        },
        {
          id: 'LEG-5',
          type: 'FINAL_DELIVERY',
          title: 'Chặng 3 (Đường bộ): Vận chuyển về điểm giao cuối & Bàn giao',
          location: `${req.destinationCity} Airport ➔ ${req.deliveryAddress}`,
          scheduledTime: `${req.committedDeadline}T10:00:00.000Z`,
          status: 'PENDING',
          notes: 'Bàn giao cho người nhận chỉ định.',
        },
      ];
    } else {
      req.legs = [
        {
          id: 'LEG-1',
          type: 'PICKUP',
          title: 'Nhận ngựa tại điểm hẹn',
          location: req.pickupAddress,
          scheduledTime: `${req.expectedDate}T07:00:00.000Z`,
          status: 'PENDING',
        },
        {
          id: 'LEG-2',
          type: 'REST_STOP',
          title: 'Trạm dừng nghỉ & chăm sóc thú y',
          location: 'Trạm trung chuyển tiêu chuẩn CBN',
          scheduledTime: `${req.expectedDate}T14:00:00.000Z`,
          status: 'PENDING',
        },
        {
          id: 'LEG-3',
          type: 'FINAL_DELIVERY',
          title: 'Bàn giao tại điểm đến',
          location: req.deliveryAddress,
          scheduledTime: `${req.committedDeadline}T11:00:00.000Z`,
          status: 'PENDING',
        },
      ];
    }

    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return { success: true };
  }

  // Receiver verifies Handover with email OTP -> Trip COMPLETED -> Customer pays balance
  public completeReceiverHandover(id: string, otpCode: string, notes?: string): { success: boolean; message?: string } {
    const req = this.getRequestById(id);
    if (!req) return { success: false, message: 'Request not found' };

    // Standard demo handover OTP is '999888'
    if (otpCode !== '999888') {
      return { success: false, message: 'Mã OTP bàn giao người nhận không đúng.' };
    }

    req.handover = {
      requestId: req.id,
      receiverName: req.receiverName,
      receiverPhone: req.receiverPhone,
      receiverEmail: req.receiverEmail,
      otpCode,
      otpVerifiedAt: new Date().toISOString(),
      receiverSignatureNotes: notes || 'Người nhận đã kiểm tra ngựa đầy đủ và đồng ý tiếp nhận.',
      completedAt: new Date().toISOString(),
    };

    // Trip is COMPLETED, request status is Delivered
    req.status = 'Delivered';
    if (req.legs && req.legs.length > 0) {
      const lastLeg = req.legs[req.legs.length - 1];
      lastLeg.status = 'CONFIRMED';
      lastLeg.confirmedTime = new Date().toISOString();
    }

    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return { success: true };
  }

  // Balance payment by Customer after completed handover
  public initiateBalancePayment(id: string, method: 'VNPAY' | 'BANK_TRANSFER'): PaymentTransaction | null {
    const req = this.getRequestById(id);
    if (!req) return null;
    const v = req.contractVersions.find(item => item.version === req.currentVersionNumber);
    if (!v) return null;

    const tx: PaymentTransaction = {
      id: `TXN-BAL-${Math.floor(10000 + Math.random() * 90000)}`,
      requestId: req.id,
      type: 'BALANCE',
      amount: v.balanceRemaining,
      currency: v.currency,
      method,
      status: 'INITIATED',
      createdAt: new Date().toISOString(),
      referenceCode: `${method === 'VNPAY' ? 'VNP' : 'BANK'}-${Date.now().toString().slice(-8)}`,
    };

    req.transactions.push(tx);
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return tx;
  }

  // Verify balance payment -> Acceptance / 24h feedback window starts!
  public verifyBalancePayment(id: string, txId: string, success: boolean): boolean {
    const req = this.getRequestById(id);
    if (!req) return false;
    const tx = req.transactions.find(t => t.id === txId && t.type === 'BALANCE');
    if (!tx) return false;

    if (success) {
      tx.status = 'SUCCESS';
      tx.confirmedAt = new Date().toISOString();
      req.status = 'Acceptance';

      // Start 24h feedback window
      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      req.acceptanceWindow = {
        startedAt: now.toISOString(),
        deadline,
      };
    } else {
      tx.status = 'FAILED';
    }

    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return true;
  }

  // Customer submits feedback (regular rating/comment does NOT reset 24h window)
  public submitFeedback(id: string, rating: number, comment: string): CustomerFeedback | null {
    const req = this.getRequestById(id);
    if (!req) return null;

    const fb: CustomerFeedback = {
      id: `FB-${Math.floor(1000 + Math.random() * 9000)}`,
      requestId: req.id,
      rating,
      comment,
      submittedAt: new Date().toISOString(),
    };
    req.feedback = fb;
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return fb;
  }

  // Customer submits Complaint (blocks auto-closure)
  public submitComplaint(
    id: string,
    category: CustomerComplaint['category'],
    title: string,
    content: string,
    horseId?: string
  ): CustomerComplaint | null {
    const req = this.getRequestById(id);
    if (!req) return null;

    const cmp: CustomerComplaint = {
      id: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
      requestId: req.id,
      horseId,
      category,
      title,
      content,
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };
    req.complaints.push(cmp);
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return cmp;
  }

  // Manager resolves complaint (does not reset 24h yet!)
  public managerResolveComplaint(id: string, complaintId: string, summary: string, refundOffer?: number): boolean {
    const req = this.getRequestById(id);
    if (!req) return false;
    const cmp = req.complaints.find(c => c.id === complaintId);
    if (!cmp) return false;

    cmp.status = 'MANAGER_RESOLVED';
    cmp.managerResolution = {
      resolvedAt: new Date().toISOString(),
      resolutionSummary: summary,
      refundAdjustmentOffer: refundOffer,
    };
    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return true;
  }

  // Customer agrees to complaint resolution -> NOW resets full fresh 24h window!
  public customerAgreeComplaintResolution(id: string, complaintId: string): boolean {
    const req = this.getRequestById(id);
    if (!req) return false;
    const cmp = req.complaints.find(c => c.id === complaintId);
    if (!cmp || cmp.status !== 'MANAGER_RESOLVED') return false;

    cmp.status = 'CUSTOMER_ACCEPTED';
    cmp.customerAgreedAt = new Date().toISOString();

    // Reset full fresh 24h window
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    req.acceptanceWindow = {
      startedAt: now.toISOString(),
      deadline,
    };

    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return true;
  }

  // Check closure of Acceptance window (called on view/timer)
  public evaluateAcceptanceClosure(id: string): boolean {
    const req = this.getRequestById(id);
    if (!req || req.status !== 'Acceptance' || !req.acceptanceWindow) return false;

    const now = new Date().toISOString();
    const isExpired = req.acceptanceWindow.deadline <= now;
    const hasOpenComplaint = req.complaints.some(c => c.status === 'OPEN' || c.status === 'MANAGER_RESOLVED');

    if (isExpired && !hasOpenComplaint) {
      req.status = 'Closed';
      req.acceptanceWindow.closedAt = now;
      req.updatedAt = now;
      this.saveRequests();
      return true;
    }
    return false;
  }

  // Pre-signing cancellation and refund
  public requestPreSigningCancellation(id: string): { success: boolean; message?: string } {
    const req = this.getRequestById(id);
    if (!req) return { success: false, message: 'Request not found' };

    // Cannot cancel after contract effective
    const v = req.contractVersions.find(item => item.version === req.currentVersionNumber);
    if (v && v.status === 'EFFECTIVE') {
      return { success: false, message: 'Hợp đồng đã có hiệu lực, không áp dụng quy tắc hủy trước ký.' };
    }

    const verifiedDepTx = req.transactions.find(tx => tx.type === 'DEPOSIT' && tx.status === 'SUCCESS');
    if (verifiedDepTx) {
      req.status = 'Cancelled';
      // Mark refund requested, processing, completed
      req.transactions.push({
        id: `TXN-REF-${Math.floor(10000 + Math.random() * 90000)}`,
        requestId: req.id,
        type: 'REFUND',
        amount: verifiedDepTx.amount,
        currency: verifiedDepTx.currency,
        method: verifiedDepTx.method,
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        referenceCode: `REF-${Date.now().toString().slice(-8)}`,
        refundInfo: {
          status: 'PROCESSING',
          refundAmount: verifiedDepTx.amount,
          requestedAt: new Date().toISOString(),
          reason: 'Hủy trước ký sau khi đã cọc. Hoàn toàn bộ cọc thực tế đã xác minh.',
        },
      });
    } else {
      req.status = 'Cancelled';
    }

    req.updatedAt = new Date().toISOString();
    this.saveRequests();
    return { success: true };
  }

  // Reset store to defaults for tests
  public resetToDefaults() {
    this.requests = JSON.parse(JSON.stringify(INITIAL_REQUESTS));
    this.horses = JSON.parse(JSON.stringify(INITIAL_HORSES));
    this.saveRequests();
    this.saveHorses();
  }
}

export const customerMockStore = new CustomerMockStore();
