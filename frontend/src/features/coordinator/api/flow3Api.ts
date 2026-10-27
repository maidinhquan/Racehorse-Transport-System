/**
 * Flow 3 API — Planning, Routing & Departure Approval
 *
 * Covers 52 operations (F3-J01 … F3-J55) for roles:
 *   FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * On STALE_VERSION refetch the context before retrying.
 *
 * Generated from contracts/API-Flow/Flow3/flow3.openapi.json
 */
import { flow3Request } from './flow3Client';
import type * as T from '../types/flow3.types';

export const flow3Api = {
  // ─── MASTER ──────────────────────────────────────────────────────────────────

  /** F3-J01 – Khả năng triển khai và policy Flow 3 v2 */
  getCapabilities: () =>
    flow3Request<T.Capabilities>('F3-J01', { path: {} }),

  // ─── SPECIALIST ──────────────────────────────────────────────────────────────

  /** F3-J02 – Context cho nhánh hồ sơ song song (TRANSPORT_SPECIALIST) */
  getSpecialistPlanningContext: (tripId: string) =>
    flow3Request<T.Context>('F3-J02', { path: { tripId } }),

  /** F3-J16 – Xác nhận Docs READY độc lập nhánh điều phối (TRANSPORT_SPECIALIST) */
  confirmDocsReady: (tripId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J16', { path: { tripId }, body, idempotencyKey }),

  // ─── COORDINATOR — Context & Trip list ───────────────────────────────────────

  /** F3-J04 – Context điều phối và cả hai nhánh chuẩn bị */
  getCoordinatorPlanningContext: (tripId: string) =>
    flow3Request<T.Context>('F3-J04', { path: { tripId } }),

  /** F3-J23 – Danh sách chuyến được giao và KPI planning */
  getCoordinatorTrips: (query?: { status?: string; mode?: string }) =>
    flow3Request<Array<T.TripListItem>>('F3-J23', { path: {}, query }),

  /** F3-J24 – Chi tiết chuyến, điểm nhận/giao, ngựa và readiness */
  getCoordinatorTrip: (tripId: string) =>
    flow3Request<T.Context>('F3-J24', { path: { tripId } }),

  // ─── COORDINATOR — Plan draft & lifecycle ────────────────────────────────────

  /** F3-J05 – Tra chuyến bay đối tác (read-only) */
  getFlights: (query?: { fromAirportId?: string; toAirportId?: string; departDate?: string; partnerId?: string }) =>
    flow3Request<Array<T.FlightService>>('F3-J05', { path: {}, query }),

  /** F3-J06 – Lưu nháp tuyến, lịch, xe và nhân sự */
  savePlanDraft: (tripId: string, body: T.PlanDraftInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J06', { path: { tripId }, body, idempotencyKey }),

  /** F3-J07 – Kiểm nháp, không giữ nguồn lực */
  validatePlan: (tripId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow3Request<T.Validation>('F3-J07', { path: { tripId }, body, idempotencyKey }),

  /** F3-J08 – Gửi tổng thể và giữ tạm nguyên tử */
  submitPlan: (tripId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J08', { path: { tripId }, body, idempotencyKey }),

  /** F3-J09 – Rút nháp/chờ duyệt/trả lại */
  withdrawPlan: (tripId: string, body: T.ReasonCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J09', { path: { tripId }, body, idempotencyKey }),

  /** F3-J12 – Tạo bản điều chỉnh approved/flight proposal */
  createPlanChanges: (tripId: string, body: T.ReasonCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J12', { path: { tripId }, body, idempotencyKey }),

  // ─── COORDINATOR — Routing ───────────────────────────────────────────────────

  /** F3-J25 – Tính tuyến đường bộ tham khảo */
  calculateRouting: (tripId: string, body: T.RoutingInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J25', { path: { tripId }, body, idempotencyKey }),

  /** F3-J26 – Kiểm tuyến theo kích thước/tải trọng xe */
  checkTruckRouting: (tripId: string, body: T.RoutingInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J26', { path: { tripId }, body, idempotencyKey }),

  // ─── COORDINATOR — Vehicle & Staff resources ─────────────────────────────────

  /** F3-J27 – Lọc xe theo chặng/sức chứa/quốc gia/lối vào */
  getVehicleOptions: (tripId: string, query?: { leg?: string; country?: string }) =>
    flow3Request<Array<T.VehicleOption>>('F3-J27', { path: { tripId }, query }),

  /** F3-J55 – Danh mục xe và thông số đã xác minh */
  getVehicles: () =>
    flow3Request<Array<T.VehicleOption>>('F3-J55', { path: {} }),

  /** F3-J48 – Danh mục nhân sự và trạng thái vận hành */
  getStaff: (query?: { position?: string; status?: string; country?: string }) =>
    flow3Request<Array<T.Staff>>('F3-J48', { path: {}, query }),

  /** F3-J49 – Đổi ACTIVE/ON_LEAVE/INACTIVE */
  updateStaffStatus: (staffId: string, body: T.StaffStatus, idempotencyKey: string) =>
    flow3Request<T.Staff>('F3-J49', { path: { staffId }, body, idempotencyKey }),

  /** F3-J14 – Xác nhận bố trí xe/người và tính Ops READY */
  confirmResources: (tripId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J14', { path: { tripId }, body, idempotencyKey }),

  /** F3-J15 – Kiểm tra/xác nhận lại Ops READY */
  checkOpsReady: (tripId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J15', { path: { tripId }, body, idempotencyKey }),

  // ─── COORDINATOR — Pickup access & relocation ────────────────────────────────

  /** F3-J28 – Ghi xác minh xe có vào địa chỉ nhận */
  recordPickupAccess: (tripId: string, body: T.AccessInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J28', { path: { tripId }, body, idempotencyKey }),

  /** F3-J29 – Tìm cơ sở tiếp nhận thay thế */
  getPickupRelocationCandidates: (tripId: string) =>
    flow3Request<Array<T.PickupCandidate>>('F3-J29', { path: { tripId } }),

  /** F3-J30 – Đề xuất điểm nhận thay thế */
  proposePickupRelocation: (tripId: string, body: T.PickupProposalInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J30', { path: { tripId }, body, idempotencyKey }),

  /** F3-J33 – Mở lại đề xuất điểm nhận đã chốt */
  reopenPickupRelocation: (tripId: string, body: T.ReasonCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J33', { path: { tripId }, body, idempotencyKey }),

  // ─── COORDINATOR — Air partners ──────────────────────────────────────────────

  /** F3-J34 – Danh sách bên dịch vụ bay */
  getAirPartners: () =>
    flow3Request<Array<T.Partner>>('F3-J34', { path: {} }),

  /** F3-J35 – Thêm bên dịch vụ */
  createAirPartner: (body: T.PartnerInput, idempotencyKey: string) =>
    flow3Request<T.Partner>('F3-J35', { path: {}, body, idempotencyKey }),

  /** F3-J36 – Sửa thông tin bên dịch vụ */
  updateAirPartner: (partnerId: string, body: T.PartnerUpdate, idempotencyKey: string) =>
    flow3Request<T.Partner>('F3-J36', { path: { partnerId }, body, idempotencyKey }),

  /** F3-J37 – Kích hoạt/ngừng bên dịch vụ */
  updateAirPartnerStatus: (partnerId: string, body: T.PartnerStatus, idempotencyKey: string) =>
    flow3Request<T.Partner>('F3-J37', { path: { partnerId }, body, idempotencyKey }),

  /** F3-J38 – Xóa đối tác chưa từng tham chiếu */
  deleteAirPartner: (partnerId: string, idempotencyKey: string) =>
    flow3Request<T.Deleted>('F3-J38', { path: { partnerId }, idempotencyKey }),

  // ─── COORDINATOR — Flight selection & booking ────────────────────────────────

  /** F3-J39 – Chọn dịch vụ đúng partner/mã vào draft */
  selectFlight: (tripId: string, body: T.FlightSelectInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J39', { path: { tripId }, body, idempotencyKey }),

  /** F3-J40 – Gửi riêng chi phí dịch vụ bay */
  submitFlightProposal: (tripId: string, body: T.BudgetCommand, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J40', { path: { tripId }, body, idempotencyKey }),

  /** F3-J13 – Ghi nhận booking đã xác nhận bởi đối tác */
  recordFlightBooking: (tripId: string, body: T.BookingInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J13', { path: { tripId }, body, idempotencyKey }),

  /** F3-J20 – Ghi nhận hủy booking đã được đối tác xác nhận */
  cancelFlightBooking: (tripId: string, body: T.CancelBookingInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J20', { path: { tripId }, body, idempotencyKey }),

  /** F3-J42 – Upload bằng chứng đối tác (tùy chọn booking) */
  uploadFlightEvidence: (tripId: string, body: { expectedVersion: number; label: string; fileId?: string }, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J42', { path: { tripId }, body, idempotencyKey }),

  /** F3-J54 – Tra mã chuyến trong đúng bên dịch vụ */
  lookupFlight: (query: { partnerId: string; flightCode: string; date: string }) =>
    flow3Request<T.FlightService>('F3-J54', { path: {}, query }),

  // ─── COORDINATOR — Places ────────────────────────────────────────────────────

  /** F3-J43 – Danh mục đa chức năng cho bản đồ */
  getPlaces: (query?: { functions?: string; country?: string; status?: string }) =>
    flow3Request<Array<T.Place>>('F3-J43', { path: {}, query }),

  /** F3-J44 – Thêm địa điểm dùng chung */
  createPlace: (body: T.PlaceInput, idempotencyKey: string) =>
    flow3Request<T.Place>('F3-J44', { path: {}, body, idempotencyKey }),

  /** F3-J45 – Sửa địa điểm và giờ mở */
  updatePlace: (placeId: string, body: T.PlaceUpdate, idempotencyKey: string) =>
    flow3Request<T.Place>('F3-J45', { path: { placeId }, body, idempotencyKey }),

  /** F3-J46 – Đổi trạng thái cơ sở */
  updatePlaceStatus: (placeId: string, body: T.PlaceStatus, idempotencyKey: string) =>
    flow3Request<T.Place>('F3-J46', { path: { placeId }, body, idempotencyKey }),

  /** F3-J47 – Xóa địa điểm chưa được tham chiếu */
  deletePlace: (placeId: string, idempotencyKey: string) =>
    flow3Request<T.Deleted>('F3-J47', { path: { placeId }, idempotencyKey }),

  // ─── COORDINATOR — Route reports & history ───────────────────────────────────

  /** F3-J53 – Đọc báo cáo tài xế gắn mốc trên bản đồ */
  getRouteReports: (tripId: string) =>
    flow3Request<Array<T.DriverReport>>('F3-J53', { path: { tripId } }),

  /** F3-J19 – Lịch sử phương án, quyết định và bằng chứng */
  getPlanningHistory: (tripId: string) =>
    flow3Request<Array<T.History>>('F3-J19', { path: { tripId } }),

  // ─── MANAGER ─────────────────────────────────────────────────────────────────

  /** F3-J10 – Manager xem hai nhánh và bundle cần duyệt */
  getManagerPreparation: (tripId: string) =>
    flow3Request<T.Context>('F3-J10', { path: { tripId } }),

  /** F3-J11 – Duyệt/trả toàn bộ phương án */
  decidePlan: (tripId: string, body: T.PlanDecisionInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J11', { path: { tripId }, body, idempotencyKey }),

  /** F3-J17 – Đọc gate và revision duyệt khởi hành */
  getManagerReadiness: (tripId: string) =>
    flow3Request<T.Readiness>('F3-J17', { path: { tripId } }),

  /** F3-J18 – Duyệt khởi hành riêng */
  approveDeparture: (tripId: string, body: T.DepartureInput, idempotencyKey: string) =>
    flow3Request<T.DepartureResult>('F3-J18', { path: { tripId }, body, idempotencyKey }),

  /** F3-J31 – Manager xét đề xuất điểm nhận */
  decidePickupRelocation: (tripId: string, body: T.PickupDecisionInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J31', { path: { tripId }, body, idempotencyKey }),

  /** F3-J32 – Ghi nhận khách đã đồng ý thực tế */
  recordPickupRelocationConsent: (tripId: string, body: T.ConsentInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J32', { path: { tripId }, body, idempotencyKey }),

  /** F3-J41 – Manager xét ngân sách bay riêng */
  decideFlightBudget: (tripId: string, body: T.BudgetDecisionInput, idempotencyKey: string) =>
    flow3Request<T.Context>('F3-J41', { path: { tripId }, body, idempotencyKey }),

  /** F3-J50 – Manager đọc catalogue bay */
  getManagerFlights: (query?: { fromAirportId?: string; toAirportId?: string; partnerId?: string }) =>
    flow3Request<Array<T.FlightService>>('F3-J50', { path: {}, query }),

  /** F3-J51 – Manager đọc bên dịch vụ */
  getManagerAirPartners: () =>
    flow3Request<Array<T.Partner>>('F3-J51', { path: {} }),

  // ─── SHARED — File download ──────────────────────────────────────────────────

  /** F3-J52 – Tải bằng chứng planning có xác thực (trả metadata JSON, không phải blob) */
  downloadPlanningFile: (tripId: string, fileId: string) =>
    flow3Request<T.F3File>('F3-J52', { path: { tripId, fileId } }),
};
