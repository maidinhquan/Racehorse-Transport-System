import { apiClient } from '../../../shared/api/apiClient';
import { flow3Api, type FlightBookingInput, type PlanDraftInput, type ReadyConfirmInput, type ResourcesConfirmInput } from '../../../shared/api/flow3Api';
import { flow2Api } from '../../../shared/api/flow2Api';
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

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? clone(fallback);
  } catch {
    return clone(fallback);
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

  // ==========================================================================
  // Flow 3 Integration (F3-J04 -> F3-J20)
  // ==========================================================================
  /** F3-J04: Lấy khoảng khả thi và phương án hiện hành */
  getPlanningContext: (tripId: string) => flow3Api.getCoordinatorPlanningContext(tripId),

  /** F3-J05: Tra cứu danh mục chuyến bay phù hợp */
  getAvailableFlights: (tripId: string, feasibilityVersion: number) =>
    flow3Api.getFlights(tripId, feasibilityVersion),

  /** F3-J06: Lưu bộ phương án nháp (tuyến, lịch, xe, nhân sự, chuyến bay) */
  savePlanDraft: (tripId: string, body: PlanDraftInput) => flow3Api.savePlanDraft(tripId, body),

  /** F3-J07: Kiểm tra tính hợp lệ của phương án nháp */
  validatePlan: (tripId: string, body: PlanDraftInput) => flow3Api.validatePlan(tripId, body),

  /** F3-J08: Gửi duyệt phương án và giữ nguồn lực tạm */
  submitPlan: (tripId: string, planVersion: number) => flow3Api.submitPlan(tripId, planVersion),

  /** F3-J09: Rút lại phương án chưa duyệt */
  withdrawPlan: (tripId: string, planVersion: number, reason: string) =>
    flow3Api.withdrawPlan(tripId, planVersion, reason),

  /** F3-J12: Đề xuất thay đổi phương án đã duyệt */
  proposePlanChanges: (tripId: string, reason: string) => flow3Api.proposePlanChanges(tripId, reason),

  /** F3-J13: Xác nhận mã booking máy bay */
  confirmFlightBookingFlow3: (tripId: string, body: FlightBookingInput) =>
    flow3Api.confirmFlightBooking(tripId, body),

  /** F3-J14: Xác nhận khả dụng thực tế nguồn lực */
  confirmResourcesAvailability: (tripId: string, body: ResourcesConfirmInput) =>
    flow3Api.confirmResources(tripId, body),

  /** F3-J15: Xác nhận Ops READY */
  confirmOpsReady: (tripId: string, body: ReadyConfirmInput) => flow3Api.confirmOpsReady(tripId, body),

  /** F3-J19: Lịch sử lập kế hoạch */
  getPlanningHistory: (tripId: string) => flow3Api.getPlanningHistory(tripId),

  /** F3-J20: Hủy booking chuyến bay khi có sự cố */
  cancelFlightBooking: (tripId: string, reason: string) => flow3Api.cancelFlightBooking(tripId, reason),

  // ==========================================================================
  // Flow 2 Integration
  // ==========================================================================
  /** F2: Danh mục trạm kiểm tra / checkpoint */
  getCheckpoints: () => flow2Api.getCheckpoints(),

  /** F2: Lưu nháp tuyến đường */
  saveRouteDraft: (tripId: string, body: unknown) => flow2Api.saveRouteDraft(tripId, body),

  /** F2: Mở lại tuyến đường khi cần điều chỉnh */
  reopenRoute: (tripId: string, reason: string) => flow2Api.reopenRoute(tripId, reason),
};

export default coordinatorApi;

