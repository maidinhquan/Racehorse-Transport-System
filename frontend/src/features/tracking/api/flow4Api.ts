/**
 * Flow 4 API — Thực hiện và theo dõi hành trình (Trip Progress & Tracking)
 *
 * Covers 37 operations (F4-J01 … F4-J37) for roles:
 *   DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST, CUSTOMER
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * Refetch on STALE_VERSION before retrying mutations.
 *
 * Generated from contracts/API-Flow/Flow4/flow4.openapi.json
 */
import { flow4Request } from './flow4Client';
import type * as T from '../types/flow4.types';

export const flow4Api = {
  // ─── MASTER ──────────────────────────────────────────────────────────────────

  /** F4-J01 – Capability và policy theo dõi hành trình */
  getCapabilities: () =>
    flow4Request<T.Capabilities>('F4-J01', { path: {} }),

  // ─── DRIVER — Trips & Preflight & Departure ──────────────────────────────────

  /** F4-J02 – Nhiệm vụ vận chuyển được phân công */
  getDriverTrips: (query?: { status?: 'READY_TO_DEPART' | 'IN_TRANSIT' | 'COMPLETED' }) =>
    flow4Request<Array<T.TripSummary>>('F4-J02', { path: {}, query }),

  /** F4-J03 – Context hành trình và thao tác theo phân công */
  getTracking: (tripId: string) =>
    flow4Request<T.Tracking>('F4-J03', { path: { tripId } }),

  /** F4-J04 – Kiểm tra trước xuất phát thực tế */
  getDepartureCheck: (tripId: string, query?: { leg?: 'road' | 'outbound' | 'air' | 'inbound' }) =>
    flow4Request<T.Preflight>('F4-J04', { path: { tripId }, query }),

  /** F4-J05 – Xác nhận xuất phát thực tế */
  confirmDeparture: (tripId: string, body: T.DepartureInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J05', { path: { tripId }, body, idempotencyKey }),

  // ─── MILESTONES & CORRECTIONS ────────────────────────────────────────────────

  /** F4-J06 – Xác nhận mốc kế tiếp của chặng */
  completeMilestone: (tripId: string, milestoneId: string, body: T.MilestoneInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J06', { path: { tripId, milestoneId }, body, idempotencyKey }),

  /** F4-J07 – Lịch sử hành trình, đính chính và quyết định */
  getExecutionHistory: (tripId: string) =>
    flow4Request<Array<T.History>>('F4-J07', { path: { tripId } }),

  /** F4-J08 – Yêu cầu đính chính mốc đã hoàn tất */
  requestMilestoneCorrection: (tripId: string, milestoneId: string, body: T.CorrectionInput, idempotencyKey: string) =>
    flow4Request<T.Correction>('F4-J08', { path: { tripId, milestoneId }, body, idempotencyKey }),

  /** F4-J09 – Danh sách yêu cầu đính chính */
  getMilestoneCorrections: (tripId: string) =>
    flow4Request<Array<T.Correction>>('F4-J09', { path: { tripId } }),

  /** F4-J10 – Duyệt hoặc từ chối đính chính */
  decideMilestoneCorrection: (tripId: string, correctionId: string, body: T.CorrectionDecision, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J10', { path: { tripId, correctionId }, body, idempotencyKey }),

  // ─── CHECKPOINTS ─────────────────────────────────────────────────────────────

  /** F4-J11 – Kết quả cho phép đi tiếp tại checkpoint */
  getCheckpoints: (tripId: string) =>
    flow4Request<Array<T.Checkpoint>>('F4-J11', { path: { tripId } }),

  /** F4-J12 – Ghi kết quả kiểm tra pháp lý thực tế (Specialist) */
  recordCheckpointDecision: (tripId: string, checkpointId: string, body: T.CheckpointInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J12', { path: { tripId, checkpointId }, body, idempotencyKey }),

  // ─── AIR OPERATIONS ──────────────────────────────────────────────────────────

  /** F4-J13 – Bàn giao ngựa cho đối tác AIR đầu đi */
  handoverAir: (tripId: string, body: T.AirHandoverInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J13', { path: { tripId }, body, idempotencyKey }),

  /** F4-J14 – Ghi thông tin lịch hoặc sự kiện AIR từ đối tác */
  recordAirNotice: (tripId: string, body: T.AirNoticeInput, idempotencyKey: string) =>
    flow4Request<T.AirNotice>('F4-J14', { path: { tripId }, body, idempotencyKey }),

  /** F4-J15 – Kiểm tra và tiếp nhận ngựa đầu đến */
  receiveAir: (tripId: string, body: T.AirHandoverInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J15', { path: { tripId }, body, idempotencyKey }),

  /** F4-J16 – Lịch sử thông tin hãng và lịch dự kiến riêng */
  getAirNotices: (tripId: string) =>
    flow4Request<Array<T.AirNotice>>('F4-J16', { path: { tripId } }),

  // ─── ETA PROPOSALS & DECISIONS ───────────────────────────────────────────────

  /** F4-J17 – Đề xuất ETA kèm lý do (Driver) */
  proposeDriverEta: (tripId: string, body: T.EtaInput, idempotencyKey: string) =>
    flow4Request<T.EtaProposal>('F4-J17', { path: { tripId }, body, idempotencyKey }),

  /** F4-J18 – Điều phối viên lập đề xuất ETA */
  proposeCoordinatorEta: (tripId: string, body: T.EtaInput, idempotencyKey: string) =>
    flow4Request<T.EtaProposal>('F4-J18', { path: { tripId }, body, idempotencyKey }),

  /** F4-J19 – Đọc ETA hiện hành và lịch sử đề xuất */
  getEtaProposals: (tripId: string) =>
    flow4Request<Array<T.EtaProposal>>('F4-J19', { path: { tripId } }),

  /** F4-J20 – Xác nhận ETA hoặc trình Manager (Coordinator) */
  decideCoordinatorEta: (tripId: string, proposalId: string, body: T.EtaDecision, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J20', { path: { tripId, proposalId }, body, idempotencyKey }),

  /** F4-J21 – Manager quyết định đề xuất ETA vượt phạm vi */
  decideManagerEta: (tripId: string, proposalId: string, body: T.EtaDecision, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J21', { path: { tripId, proposalId }, body, idempotencyKey }),

  // ─── HEALTH LOGS & VET ASSESSMENTS ───────────────────────────────────────────

  /** F4-J22 – Nhật ký chăm sóc và chỉ số từng ngựa */
  getHealthLogs: (tripId: string, query?: { horseId?: string }) =>
    flow4Request<Array<T.HealthLog>>('F4-J22', { path: { tripId }, query }),

  /** F4-J23 – Ghi chăm sóc và quan sát sức khỏe */
  recordHealthLog: (tripId: string, body: T.HealthInput, idempotencyKey: string) =>
    flow4Request<T.HealthLog>('F4-J23', { path: { tripId }, body, idempotencyKey }),

  /** F4-J24 – Bổ sung bản đính chính nhật ký sức khỏe */
  amendHealthLog: (tripId: string, healthLogId: string, body: T.HealthAmendment, idempotencyKey: string) =>
    flow4Request<T.HealthLog>('F4-J24', { path: { tripId, healthLogId }, body, idempotencyKey }),

  /** F4-J25 – Bác sĩ ghi kết luận và khả năng tiếp tục */
  recordVetAssessment: (tripId: string, body: T.VetInput, idempotencyKey: string) =>
    flow4Request<T.VetAssessment>('F4-J25', { path: { tripId }, body, idempotencyKey }),

  /** F4-J26 – Đọc kết luận chuyên môn và hướng dẫn */
  getVetAssessments: (tripId: string) =>
    flow4Request<Array<T.VetAssessment>>('F4-J26', { path: { tripId } }),

  // ─── ALERTS & COMMUNICATIONS ────────────────────────────────────────────────

  /** F4-J27 – Cảnh báo trễ mốc và chăm sóc đến hạn */
  getAlerts: (tripId: string) =>
    flow4Request<Array<T.Alert>>('F4-J27', { path: { tripId } }),

  /** F4-J28 – Ghi đã tiếp nhận cảnh báo */
  acknowledgeAlert: (tripId: string, alertId: string, body: T.Command, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J28', { path: { tripId, alertId }, body, idempotencyKey }),

  /** F4-J29 – Ghi kết quả liên hệ nhân sự không phản hồi */
  logContact: (tripId: string, body: T.ContactInput, idempotencyKey: string) =>
    flow4Request<T.Mutation>('F4-J29', { path: { tripId }, body, idempotencyKey }),

  // ─── EVIDENCE FILES ──────────────────────────────────────────────────────────

  /** F4-J30 – Upload bằng chứng hành trình thật */
  uploadExecutionFile: (
    tripId: string,
    file: File,
    meta: { purpose: 'MILESTONE' | 'AIR' | 'CHECKPOINT' | 'HEALTH' | 'EXPENSE'; horseId?: string },
    idempotencyKey: string,
  ) =>
    flow4Request<T.File>('F4-J30', {
      path: { tripId },
      file,
      body: meta,
      idempotencyKey,
    }),

  /** F4-J31 – Tải file vận hành có kiểm quyền */
  downloadExecutionFile: (tripId: string, fileId: string) =>
    flow4Request<Blob>('F4-J31', { path: { tripId, fileId } }),

  // ─── CUSTOMER PROJECTIONS ────────────────────────────────────────────────────

  /** F4-J32 – Khách xem hành trình đơn của mình */
  getCustomerTracking: (requestId: string) =>
    flow4Request<T.PublicTracking>('F4-J32', { path: { requestId } }),

  /** F4-J33 – Khách xem chăm sóc, chỉ số, ảnh và nhận xét */
  getCustomerHealthLogs: (requestId: string, query?: { horseId?: string }) =>
    flow4Request<Array<T.PublicHealth>>('F4-J33', { path: { requestId }, query }),

  /** F4-J34 – Khách tải ảnh/bằng chứng được chia sẻ */
  downloadCustomerTrackingFile: (requestId: string, fileId: string) =>
    flow4Request<Blob>('F4-J34', { path: { requestId, fileId } }),

  // ─── MANAGER & EXPENSES ──────────────────────────────────────────────────────

  /** F4-J35 – Manager giám sát vận hành */
  getManagerTracking: (tripId: string) =>
    flow4Request<T.Tracking>('F4-J35', { path: { tripId } }),

  /** F4-J36 – Ghi nhận chi phí phát sinh trên đường (Driver) */
  recordExpense: (tripId: string, body: T.ExpenseInput, idempotencyKey: string) =>
    flow4Request<T.ExpenseRecord>('F4-J36', { path: { tripId }, body, idempotencyKey }),

  /** F4-J37 – Danh sách chi phí phát sinh chuyến đi */
  getExpenses: (tripId: string) =>
    flow4Request<Array<T.ExpenseRecord>>('F4-J37', { path: { tripId } }),
};

