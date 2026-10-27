import { apiClient } from './apiClient';
import { FLOW3_ENDPOINTS as E } from './flow3Endpoints';
import type {
  DepartureApprovalResult,
  FeasibilityAssessment,
  FlightBookingInput,
  FlightCatalogItem,
  Flow3Capabilities,
  PlanDecisionInput,
  PlanDraftInput,
  PlanValidationResult,
  PlanningContext,
  PlanningHistoryItem,
  ReadyConfirmInput,
  ResourcesConfirmInput,
  SubmitFeasibilityRequest,
  TripPlan,
  TripPreparation,
  TripReadiness,
} from './flow3.types';

export * from './flow3.types';
export * from './flow3Endpoints';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  blockers?: unknown[];
}

const getIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * API Service cho Flow 3 (F3-J01 -> F3-J20)
 * Đánh giá khả thi -> Lập phương án -> Phê duyệt -> READY kép -> Khởi hành
 */
export const flow3Api = {
  /** F3-J01: Khả năng flow mới và cấu hình vận hành */
  getCapabilities: async (): Promise<Flow3Capabilities | null> => {
    try {
      const res = await apiClient.get<ApiResponse<Flow3Capabilities>>(E.CAPABILITIES);
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F3-J02: Thông tin Manager giao và đánh giá Specialist */
  getSpecialistPlanningContext: async (tripId: string): Promise<PlanningContext | null> => {
    try {
      const res = await apiClient.get<ApiResponse<PlanningContext>>(E.SPECIALIST_PLANNING_CONTEXT(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F3-J03: Specialist công bố đánh giá khả thi */
  submitFeasibility: async (
    tripId: string,
    body: SubmitFeasibilityRequest
  ): Promise<FeasibilityAssessment | null> => {
    try {
      const res = await apiClient.put<ApiResponse<FeasibilityAssessment>>(
        E.PLANNING_FEASIBILITY(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.data ?? null;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(msg);
    }
  },

  /** F3-J04: Khoảng khả thi và bộ phương án hiện hành cho Coordinator */
  getCoordinatorPlanningContext: async (tripId: string): Promise<PlanningContext | null> => {
    try {
      const res = await apiClient.get<ApiResponse<PlanningContext>>(E.COORDINATOR_PLANNING_CONTEXT(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F3-J05: Danh mục chuyến bay demo phù hợp chuyến (AIR) */
  getFlights: async (tripId: string, feasibilityVersion: number): Promise<FlightCatalogItem[]> => {
    try {
      const res = await apiClient.get<ApiResponse<FlightCatalogItem[]>>(E.COORDINATOR_FLIGHTS, {
        params: { tripId, feasibilityVersion },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  },

  /** F3-J06: Lưu bộ phương án nháp (tuyến, dừng nghỉ, xe, nhân sự, chuyến bay) */
  savePlanDraft: async (tripId: string, body: PlanDraftInput): Promise<TripPlan | null> => {
    try {
      const res = await apiClient.put<ApiResponse<TripPlan>>(E.PLAN_DRAFT(tripId), body, {
        headers: { 'Idempotency-Key': getIdempotencyKey() },
      });
      return res.data?.data ?? null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J07: Kiểm tra nháp, không giữ lịch */
  validatePlan: async (tripId: string, body: PlanDraftInput): Promise<PlanValidationResult> => {
    try {
      const res = await apiClient.post<ApiResponse<PlanValidationResult>>(E.PLAN_VALIDATE(tripId), body);
      return res.data?.data ?? { valid: true, blockers: [] };
    } catch (err: any) {
      return {
        valid: false,
        blockers: err.response?.data?.blockers || [{ code: 'VALIDATION_FAILED', message: err.message }],
      };
    }
  },

  /** F3-J08: Gửi duyệt và giữ tạm nguồn lực */
  submitPlan: async (tripId: string, planVersion: number): Promise<TripPlan | null> => {
    try {
      const res = await apiClient.post<ApiResponse<TripPlan>>(
        E.PLAN_SUBMIT(tripId),
        { planVersion },
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.data ?? null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J09: Rút phương án chưa duyệt */
  withdrawPlan: async (tripId: string, planVersion: number, reason: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.PLAN_WITHDRAW(tripId),
        { planVersion, reason },
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  /** F3-J10: Manager xem chuẩn bị, feasibility và phương án */
  getPreparation: async (tripId: string): Promise<TripPreparation | null> => {
    try {
      const res = await apiClient.get<ApiResponse<TripPreparation>>(E.MANAGER_PREPARATION(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F3-J11: Manager phê duyệt hoặc trả lại toàn bộ phương án */
  decidePlan: async (tripId: string, body: PlanDecisionInput): Promise<TripPlan | null> => {
    try {
      const res = await apiClient.post<ApiResponse<TripPlan>>(
        E.MANAGER_PLAN_DECISION(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.data ?? null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J12: Tạo đề xuất thay phương án đã duyệt */
  proposePlanChanges: async (tripId: string, reason: string): Promise<TripPlan | null> => {
    try {
      const res = await apiClient.post<ApiResponse<TripPlan>>(
        E.PLAN_CHANGES(tripId),
        { reason },
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.data ?? null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J13: Xác nhận mã đặt chỗ/booking hãng bay sau duyệt */
  confirmFlightBooking: async (tripId: string, body: FlightBookingInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.FLIGHT_BOOKING(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  /** F3-J14: Xác nhận khả dụng thực tế phương tiện và nhân sự */
  confirmResources: async (tripId: string, body: ResourcesConfirmInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.RESOURCES_CONFIRM(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  /** F3-J15: Coordinator xác nhận Operations READY */
  confirmOpsReady: async (tripId: string, body: ReadyConfirmInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.OPS_READY(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J16: Specialist xác nhận Documents READY theo phương án được duyệt */
  confirmDocsReady: async (tripId: string, body: ReadyConfirmInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.DOCS_READY(tripId),
        body,
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J17: Manager kiểm tra điều kiện sẵn sàng khởi hành (cả 2 READY) */
  getReadiness: async (tripId: string): Promise<TripReadiness | null> => {
    try {
      const res = await apiClient.get<ApiResponse<TripReadiness>>(E.MANAGER_READINESS(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F3-J18: Manager cho phép khởi hành sau hai READY */
  approveDeparture: async (tripId: string): Promise<DepartureApprovalResult | null> => {
    try {
      const res = await apiClient.post<ApiResponse<DepartureApprovalResult>>(
        E.DEPARTURE_APPROVE(tripId),
        {},
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.data ?? null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F3-J19: Lịch sử đánh giá, phương án, booking và READY */
  getPlanningHistory: async (tripId: string): Promise<PlanningHistoryItem[]> => {
    try {
      const res = await apiClient.get<ApiResponse<PlanningHistoryItem[]>>(E.PLANNING_HISTORY(tripId));
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  },

  /** F3-J20: Ghi nhận hủy booking để xử lý phương án thay thế */
  cancelFlightBooking: async (tripId: string, reason: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(
        E.CANCEL_BOOKING(tripId),
        { reason },
        { headers: { 'Idempotency-Key': getIdempotencyKey() } }
      );
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },
};

export default flow3Api;
