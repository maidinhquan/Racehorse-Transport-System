import { apiClient } from '../../../shared/api/apiClient';
import { COORDINATOR_ENDPOINTS } from './coordinatorEndpoints';
import type {
  ApiResponse,
  AssignResourcesRequestDto,
  FlightProposalRequestDto,
  Incident,
  RecordMilestoneRequestDto,
  Staff,
  SubmitRouteRequestDto,
  Trip,
  UpdateEtaRequestDto,
  Vehicle,
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
  getVehicles: () => getOr<Vehicle[]>(COORDINATOR_ENDPOINTS.VEHICLES, mockVehicles),

  /** Tài xế, phụ xe, bác sĩ thú y */
  getStaff: () => getOr<Staff[]>(COORDINATOR_ENDPOINTS.STAFF, mockStaff),

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
