import { apiClient } from '../../../shared/api/apiClient';
import { COORDINATOR_ENDPOINTS } from './coordinatorEndpoints';
import type {
  ApiResponse,
  AssignResourcesRequestDto,
  FlightProposalRequestDto,
  Incident,
  RecordMilestoneRequestDto,
  Staff,
  StaffRole,
  SubmitRouteRequestDto,
  Trip,
  UpdateEtaRequestDto,
  Vehicle,
  VehicleStatus,
} from '../types';
import { mockIncidents, mockStaff, mockTrips, mockVehicles } from '../data/mockData';
import { getDemoMode } from '../../../shared/context/DemoModeContext';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy (chỉ fallback khi demo mode BẬT) */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  const isDemo = getDemoMode('coordinator');
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    if (res.data?.data) return res.data.data;
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
  } catch {
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
  }
}

/** Chuyển đổi dữ liệu Staff từ Backend DTO sang Frontend Model */
function mapStaff(raw: any): Staff {
  if (!raw) return raw;
  const id = raw.id ?? raw.userId ?? '';
  const name = raw.name ?? raw.fullName ?? '';
  const spec = String(raw.specialization ?? '').toLowerCase();
  const rawRole = String(raw.role ?? '').toUpperCase();

  let role: StaffRole = 'DRIVER';
  if (
    spec.includes('bác sĩ') ||
    spec.includes('thú y') ||
    spec.includes('vet') ||
    name.startsWith('BS.') ||
    name.startsWith('Dr.') ||
    rawRole === 'VETERINARIAN'
  ) {
    role = 'VETERINARIAN';
  } else if (rawRole.includes('ESCORT') || rawRole.includes('SPECIALIST')) {
    role = 'ESCORT';
  } else {
    role = 'DRIVER';
  }

  const country =
    raw.country ??
    (Array.isArray(raw.canDriveCountries) && raw.canDriveCountries[0]) ??
    (id.includes('_JP_') ? 'JP' : 'VN');

  const licence =
    raw.licence ??
    (raw.licenseClass
      ? `${raw.licenseClass}${raw.licenseExpiry ? ' • exp. ' + String(raw.licenseExpiry).slice(0, 10) : ''}`
      : undefined);

  const certExpiry =
    raw.certExpiry ??
    (raw.licenseExpiry ? String(raw.licenseExpiry).slice(0, 10) : undefined);

  return {
    id,
    name,
    role,
    country,
    phone: raw.phone ?? '',
    licence,
    certExpiry,
  };
}

/** Chuyển đổi dữ liệu Vehicle từ Backend DTO sang Frontend Model */
function mapVehicle(raw: any): Vehicle {
  if (!raw) return raw;
  const id = raw.id ?? raw.vehicleId ?? '';
  const plate = raw.plate ?? raw.plateNumber ?? id;
  const model = raw.model ?? raw.type ?? 'Horse Transporter';
  const stalls = Number(raw.stalls ?? raw.totalStalls ?? raw.capacityStalls ?? 4);
  const country =
    raw.country ??
    raw.operatingCountry ??
    raw.registrationCountry ??
    (id.includes('_JP_') ? 'JP' : 'VN');
  const base = raw.base ?? (country === 'JP' ? 'Tokyo' : 'Ho Chi Minh City');
  const rawStatus = String(raw.status ?? 'READY').toUpperCase();
  const status: VehicleStatus =
    rawStatus === 'MAINTENANCE' ? 'MAINTENANCE' : rawStatus === 'INACTIVE' ? 'INACTIVE' : 'READY';
  const nextService =
    raw.nextService ??
    (raw.registrationExpiry ? String(raw.registrationExpiry).slice(0, 10) : '2027-01-01');
  const features = raw.features ?? `${stalls} ngăn, điều hòa, GPS`;

  return {
    id,
    plate,
    model,
    stalls,
    country,
    base,
    status,
    nextService,
    features,
  };
}

/** POST/PUT: trả về true nếu Backend nhận, false nếu đang chạy chế độ mock (UI vẫn cập nhật cục bộ) */
async function send(method: 'post' | 'put', url: string, body?: unknown): Promise<boolean> {
  try {
    const res = method === 'post'
      ? await apiClient.post<ApiResponse<unknown>>(url, body)
      : await apiClient.put<ApiResponse<unknown>>(url, body);
    return res.data?.success !== false;
  } catch {
    return false;
  }
}

export const coordinatorApi = {
  /** Danh sách chuyến Coordinator phụ trách */
  getTrips: () => getOr<Trip[]>(COORDINATOR_ENDPOINTS.TRIPS, mockTrips),

  /** Chi tiết một chuyến */
  getTrip: (tripId: string) =>
    getOr<Trip | undefined>(COORDINATOR_ENDPOINTS.TRIP_DETAIL(tripId), mockTrips.find((t) => t.id === tripId)),

  /** Đội xe */
  getVehicles: async (): Promise<Vehicle[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(COORDINATOR_ENDPOINTS.VEHICLES);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapVehicle);
      }
    } catch {
      // fallback
    }
    const isDemo = getDemoMode('coordinator');
    return isDemo ? clone(mockVehicles) : [];
  },

  /** Tài xế, phụ xe, bác sĩ thú y */
  getStaff: async (): Promise<Staff[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(COORDINATOR_ENDPOINTS.STAFF);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapStaff);
      }
    } catch {
      // fallback
    }
    const isDemo = getDemoMode('coordinator');
    return isDemo ? clone(mockStaff) : [];
  },

  /** Sự cố */
  getIncidents: () => getOr<Incident[]>(COORDINATOR_ENDPOINTS.INCIDENTS, mockIncidents),

  /** Gửi phương án tuyến cho Manager phê duyệt */
  submitRoute: (tripId: string, body: SubmitRouteRequestDto) =>
    send('post', COORDINATOR_ENDPOINTS.SUBMIT_ROUTE(tripId), body),

  /** Phân công xe & nhân sự (chuyến AIR gửi kèm leg) */
  assignResources: (tripId: string, body: AssignResourcesRequestDto) =>
    send('post', COORDINATOR_ENDPOINTS.ASSIGN_RESOURCES(tripId), body),

  /** Xác nhận bố trí phương tiện & nhân sự (Operations READY) */
  confirmResources: (tripId: string) => send('post', COORDINATOR_ENDPOINTS.CONFIRM_RESOURCES(tripId)),

  /** Cập nhật ETA */
  updateEta: (tripId: string, body: UpdateEtaRequestDto) =>
    send('put', COORDINATOR_ENDPOINTS.UPDATE_ETA(tripId), body),

  /** Ghi nhận mốc hành trình (dùng cho nút demo – thực tế do tài xế ghi trên app tài xế) */
  recordMilestone: (tripId: string, body: RecordMilestoneRequestDto) =>
    send('post', COORDINATOR_ENDPOINTS.MILESTONES(tripId), body),

  /** Đề xuất phương án bay (Manager duyệt ngân sách) */
  proposeFlight: (tripId: string, body: FlightProposalRequestDto) =>
    send('post', COORDINATOR_ENDPOINTS.FLIGHT(tripId), body),

  /** Ghi nhận mã đặt chỗ từ hãng bay */
  bookFlight: (tripId: string, bookingRef: string) =>
    send('post', COORDINATOR_ENDPOINTS.FLIGHT_BOOKING(tripId), { bookingRef }),
};

export default coordinatorApi;
