// ============================================================================
// FLOW 3 ENDPOINTS (F3-J01 -> F3-J20)
// Nguồn chuẩn: contracts/API-Flow/Flow3/FLOW3-API-JSON.md
// ============================================================================

export const FLOW3_ENDPOINTS = {
  /** F3-J01: Khả năng flow mới và cấu hình vận hành */
  CAPABILITIES: '/master/flow3-capabilities',

  /** F3-J02: Thông tin Manager giao và đánh giá Specialist */
  SPECIALIST_PLANNING_CONTEXT: (tripId: string) => `/specialist/trips/${tripId}/planning-context`,

  /** F3-J03: Ghi đánh giá khả thi trước lập phương án */
  PLANNING_FEASIBILITY: (tripId: string) => `/specialist/trips/${tripId}/planning-feasibility`,

  /** F3-J04: Khoảng khả thi và bộ phương án hiện hành cho Coordinator */
  COORDINATOR_PLANNING_CONTEXT: (tripId: string) => `/coordinator/trips/${tripId}/planning-context`,

  /** F3-J05: Danh mục chuyến bay demo phù hợp chuyến */
  COORDINATOR_FLIGHTS: '/coordinator/flights',

  /** F3-J06: Lưu bộ phương án nháp (tuyến, lịch, xe, nhân sự, chuyến bay) */
  PLAN_DRAFT: (tripId: string) => `/coordinator/trips/${tripId}/plan-draft`,

  /** F3-J07: Kiểm tra nháp, không giữ lịch */
  PLAN_VALIDATE: (tripId: string) => `/coordinator/trips/${tripId}/plan/validate`,

  /** F3-J08: Gửi duyệt và giữ tạm nguồn lực */
  PLAN_SUBMIT: (tripId: string) => `/coordinator/trips/${tripId}/plan/submit`,

  /** F3-J09: Rút phương án chưa duyệt */
  PLAN_WITHDRAW: (tripId: string) => `/coordinator/trips/${tripId}/plan/withdraw`,

  /** F3-J10: Manager xem feasibility, dependency và phương án */
  MANAGER_PREPARATION: (tripId: string) => `/manager/trips/${tripId}/preparation`,

  /** F3-J11: Duyệt toàn bộ phương án hoặc trả lại */
  MANAGER_PLAN_DECISION: (tripId: string) => `/manager/trips/${tripId}/plan/decision`,

  /** F3-J12: Tạo đề xuất thay phương án đã duyệt */
  PLAN_CHANGES: (tripId: string) => `/coordinator/trips/${tripId}/plan/changes`,

  /** F3-J13: Xác nhận booking sau duyệt phương án */
  FLIGHT_BOOKING: (tripId: string) => `/coordinator/trips/${tripId}/flight/booking`,

  /** F3-J14: Xác nhận khả dụng thực tế xe và nhân sự */
  RESOURCES_CONFIRM: (tripId: string) => `/coordinator/trips/${tripId}/resources/confirm`,

  /** F3-J15: Coordinator xác nhận Ops READY */
  OPS_READY: (tripId: string) => `/coordinator/trips/${tripId}/ops-ready`,

  /** F3-J16: Specialist xác nhận Docs READY theo lịch được duyệt */
  DOCS_READY: (tripId: string) => `/specialist/trips/${tripId}/docs-ready`,

  /** F3-J17: Đọc điều kiện khởi hành hiện hành (cả hai READY) */
  MANAGER_READINESS: (tripId: string) => `/manager/trips/${tripId}/readiness`,

  /** F3-J18: Manager cho phép khởi hành sau hai READY */
  DEPARTURE_APPROVE: (tripId: string) => `/manager/trips/${tripId}/departure/approve`,

  /** F3-J19: Lịch sử đánh giá, phương án, booking và READY */
  PLANNING_HISTORY: (tripId: string) => `/trips/${tripId}/planning-history`,

  /** F3-J20: Ghi nhận hủy booking để xử lý phương án thay thế */
  CANCEL_BOOKING: (tripId: string) => `/coordinator/trips/${tripId}/flight/booking/cancel`,
} as const;
