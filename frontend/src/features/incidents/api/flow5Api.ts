/**
 * Flow 5 API — Xử lý sự cố vận chuyển (Incident Management & Recovery)
 * Compliant with FLOW5_capnhat.md (v1.1.0 — 03/11/2026) and IncidentsController.cs
 *
 * Covers core implemented endpoints (POST /incidents, GET /incidents, GET /trips/{tripId}/incidents,
 * GET /incidents/{incidentId}, POST /coordinator/incidents/{incidentId}/accept, POST /driver/trips/{tripId}/incidents)
 * and extended recovery / coordination operations.
 */
import { flow5Request } from './flow5Client';
import type * as T from '../types/flow5.types';

export const flow5Api = {
  // ─── MASTER ──────────────────────────────────────────────────────────────────

  /** F5-J01 – Tra cứu capabilities xử lý sự cố */
  getCapabilities: (): Promise<T.Capabilities> =>
    flow5Request<T.Capabilities>('F5-J01'),

  // ─── CORE INCIDENTS (ĐÃ TRIỂN KHAI BACKEND .NET & UI) ───────────────────────

  /**
   * F5-J03 – Báo cáo sự cố khẩn cấp từ hiện trường (Tài xế / Nhân sự)
   * Tự động sinh ID INC_..., đặt SafetyBlockerActive = true và gửi Notification khẩn cấp tới Coordinator
   */
  reportIncident: (body: T.ReportIncidentInput, idempotencyKey?: string): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J03', { body, idempotencyKey }),

  /**
   * F5-J44 – Báo cáo sự cố gắn theo chuyến đi cụ thể của Tài xế
   * Đường dẫn chuyên biệt cho tài xế: POST /api/driver/trips/{tripId}/incidents
   */
  reportTripIncident: (
    tripId: string,
    body: T.ReportIncidentInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J44', { path: { tripId }, body, idempotencyKey }),

  /**
   * F5-J02 – Điều phối viên / Nhân sự tra cứu danh sách sự cố
   * Hỗ trợ lọc theo tripId và status ('REPORTED' | 'IN_PROGRESS' | 'RESOLVED')
   */
  getIncidents: (query?: { status?: string; tripId?: string }): Promise<Array<T.IncidentResponse>> =>
    flow5Request<Array<T.IncidentResponse>>('F5-J02', { query }),

  /**
   * F5-J04 – Xem chi tiết một sự cố theo mã định danh incidentId
   */
  getIncidentDetail: (incidentId: string): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J04', { path: { incidentId } }),

  /**
   * F5-J05 – Lấy danh sách sự cố của một chuyến đi cụ thể
   */
  getTripIncidents: (tripId: string): Promise<Array<T.IncidentResponse>> =>
    flow5Request<Array<T.IncidentResponse>>('F5-J05', { path: { tripId } }),

  /**
   * F5-J06 – Điều phối viên (Coordinator) tiếp nhận xử lý sự cố
   * Chuyển trạng thái REPORTED -> IN_PROGRESS, gán CoordinatorId
   */
  acceptIncident: (
    incidentId: string,
    body?: T.Command,
    idempotencyKey?: string,
  ): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J06', { path: { incidentId }, body, idempotencyKey }),

  // ─── IMPACT ASSESSMENT ───────────────────────────────────────────────────────

  /** F5-J07 – Đánh giá tác động 8 phạm vi sự cố */
  assessImpact: (incidentId: string, body: T.AssessmentInput, idempotencyKey?: string): Promise<T.Mutation> =>
    flow5Request<T.Mutation>('F5-J07', { path: { incidentId }, body, idempotencyKey }),

  // ─── UPDATES & EMERGENCY CARE ────────────────────────────────────────────────

  /** F5-J08 – Ghi nhận hiện trường, tiến độ hoặc chăm sóc khẩn */
  recordUpdate: (incidentId: string, body: T.UpdateInput, idempotencyKey?: string): Promise<T.Update> =>
    flow5Request<T.Update>('F5-J08', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J09 – Đọc nhật ký diễn biến sự cố */
  getUpdates: (incidentId: string): Promise<Array<T.Update>> =>
    flow5Request<Array<T.Update>>('F5-J09', { path: { incidentId } }),

  // ─── TASKS ───────────────────────────────────────────────────────────────────

  /** F5-J10 – Giao nhiệm vụ song song xử lý sự cố */
  createTask: (incidentId: string, body: T.TaskInput, idempotencyKey?: string): Promise<T.Task> =>
    flow5Request<T.Task>('F5-J10', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J11 – Danh sách nhiệm vụ cần làm */
  getTasks: (incidentId: string): Promise<Array<T.Task>> =>
    flow5Request<Array<T.Task>>('F5-J11', { path: { incidentId } }),

  /** F5-J12 – Cập nhật tiến độ hoặc hoàn tất nhiệm vụ */
  updateTaskProgress: (
    incidentId: string,
    taskId: string,
    body: T.TaskProgress,
    idempotencyKey?: string,
  ): Promise<T.Task> =>
    flow5Request<T.Task>('F5-J12', { path: { incidentId, taskId }, body, idempotencyKey }),

  // ─── RECOVERY PLANNING ───────────────────────────────────────────────────────

  /** F5-J13 – Đọc bối cảnh lập phương án khôi phục */
  getRecoveryContext: (incidentId: string): Promise<T.Binding> =>
    flow5Request<T.Binding>('F5-J13', { path: { incidentId } }),

  /** F5-J14 – Lưu hoặc cập nhật bản nháp phương án khôi phục */
  saveRecoveryDraft: (incidentId: string, body: T.RecoveryInput, idempotencyKey?: string): Promise<T.Recovery> =>
    flow5Request<T.Recovery>('F5-J14', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J15 – Kiểm tra tính hợp lệ và thẩm quyền duyệt phương án */
  validateRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey?: string): Promise<T.Readiness> =>
    flow5Request<T.Readiness>('F5-J15', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J16 – Trình duyệt phương án khôi phục */
  submitRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey?: string): Promise<T.Recovery> =>
    flow5Request<T.Recovery>('F5-J16', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J17 – Logistics Manager phê duyệt hoặc trả lại phương án */
  decideRecovery: (incidentId: string, body: T.RecoveryDecision, idempotencyKey?: string): Promise<T.Recovery> =>
    flow5Request<T.Recovery>('F5-J17', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J18 – Tạo phiên bản phương án mới khi có thay đổi */
  createRecoveryRevision: (incidentId: string, body: T.PlanCommand, idempotencyKey?: string): Promise<T.Recovery> =>
    flow5Request<T.Recovery>('F5-J18', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J19 – Lịch sử phương án và quyết định */
  getIncidentHistory: (incidentId: string): Promise<Array<T.History>> =>
    flow5Request<Array<T.History>>('F5-J19', { path: { incidentId } }),

  /** F5-J20 – Tìm kiếm phương tiện và nhân sự thay thế */
  getResourceOptions: (incidentId: string): Promise<Array<T.ResourceOption>> =>
    flow5Request<Array<T.ResourceOption>>('F5-J20', { path: { incidentId } }),

  /** F5-J21 – Thẩm định pháp lý và bảo hiểm (Transport Specialist) */
  reviewCompliance: (incidentId: string, body: T.ComplianceInput, idempotencyKey?: string): Promise<T.ComplianceReview> =>
    flow5Request<T.ComplianceReview>('F5-J21', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J22 – Kết luận y tế chuyên môn về sức khỏe ngựa (Bác sĩ thú y) */
  recordVetAssessment: (incidentId: string, body: T.VetInput, idempotencyKey?: string): Promise<T.VetAssessment> =>
    flow5Request<T.VetAssessment>('F5-J22', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J23 – Ghi nhận hành động với đối tác bên ngoài (Hủy/Đặt vé AIR, xác nhận nguồn lực) */
  recordExternalAction: (incidentId: string, body: T.ExternalActionInput, idempotencyKey?: string): Promise<T.ExternalAction> =>
    flow5Request<T.ExternalAction>('F5-J23', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J24 – Áp dụng phương án khôi phục đã được phê duyệt */
  applyRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey?: string): Promise<T.Mutation> =>
    flow5Request<T.Mutation>('F5-J24', { path: { incidentId }, body, idempotencyKey }),

  // ─── CONTINUATION & RESOLUTION ───────────────────────────────────────────────

  /** F5-J25 – Kiểm tra tính sẵn sàng tiếp tục chặng vận chuyển */
  getContinuationReadiness: (incidentId: string): Promise<T.Readiness> =>
    flow5Request<T.Readiness>('F5-J25', { path: { incidentId } }),

  /** F5-J26 – Cho phép tiếp tục chặng vận chuyển và gỡ Safety Blocker */
  continueTrip: (incidentId: string, body: T.ContinuationInput, idempotencyKey?: string): Promise<T.Mutation> =>
    flow5Request<T.Mutation>('F5-J26', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J27 – Coordinator đóng sự cố (RESOLVED) */
  resolveIncident: (incidentId: string, body: T.Command, idempotencyKey?: string): Promise<T.Mutation> =>
    flow5Request<T.Mutation>('F5-J27', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J28 – Mở lại sự cố khi phát sinh tình tiết mới */
  reopenIncident: (incidentId: string, body: T.Command, idempotencyKey?: string): Promise<T.Mutation> =>
    flow5Request<T.Mutation>('F5-J28', { path: { incidentId }, body, idempotencyKey }),

  // ─── CUSTOMER COMMUNICATIONS ────────────────────────────────────────────────

  /** F5-J29 – Danh sách sự cố phía khách hàng */
  getCustomerIncidents: (requestId: string): Promise<Array<T.PublicIncident>> =>
    flow5Request<Array<T.PublicIncident>>('F5-J29', { path: { requestId } }),

  /** F5-J30 – Chi tiết sự cố phía khách hàng */
  getCustomerIncidentDetail: (requestId: string, incidentId: string): Promise<T.PublicContext> =>
    flow5Request<T.PublicContext>('F5-J30', { path: { requestId, incidentId } }),

  /** F5-J31 – Logistics Manager gửi thông báo hoặc đề nghị thỏa thuận khách hàng */
  sendCommunication: (incidentId: string, body: T.CommunicationInput, idempotencyKey?: string): Promise<T.Communication> =>
    flow5Request<T.Communication>('F5-J31', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J32 – Khách hàng chấp nhận hoặc từ chối thỏa thuận thay đổi */
  replyCommunication: (
    requestId: string,
    incidentId: string,
    messageId: string,
    body: T.CustomerReply,
    idempotencyKey?: string,
  ): Promise<T.Communication> =>
    flow5Request<T.Communication>('F5-J32', { path: { requestId, incidentId, messageId }, body, idempotencyKey }),

  /** F5-J33 – Ghi nhận thỏa thuận khách hàng qua kênh ngoài */
  recordExternalAgreement: (incidentId: string, body: T.ExternalAgreementInput, idempotencyKey?: string): Promise<T.Communication> =>
    flow5Request<T.Communication>('F5-J33', { path: { incidentId }, body, idempotencyKey }),

  // ─── FILES & EVIDENCE ────────────────────────────────────────────────────────

  /** F5-J34 – Tải lên tệp bằng chứng sự cố */
  uploadIncidentFile: (tripId: string, file: File, body?: { purpose?: string }, idempotencyKey?: string): Promise<T.File> =>
    flow5Request<T.File>('F5-J34', { path: { tripId }, file, body, idempotencyKey }),

  /** F5-J35 – Tải xuống tệp bằng chứng nội bộ */
  getIncidentFile: (incidentId: string, fileId: string): Promise<Blob> =>
    flow5Request<Blob>('F5-J35', { path: { incidentId, fileId } }),

  /** F5-J36 – Khách hàng tải tệp bằng chứng được chia sẻ */
  getCustomerIncidentFile: (requestId: string, incidentId: string, fileId: string): Promise<Blob> =>
    flow5Request<Blob>('F5-J36', { path: { requestId, incidentId, fileId } }),

  // ─── TERMINATION ─────────────────────────────────────────────────────────────

  /** F5-J37 – Đề xuất kết thúc vận chuyển sớm khi không thể tiếp tục */
  proposeTermination: (incidentId: string, body: T.TerminationInput, idempotencyKey?: string): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J37', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J38 – Khách hàng phản hồi đề xuất kết thúc sớm */
  replyTermination: (
    requestId: string,
    incidentId: string,
    proposalId: string,
    body: T.TerminationReply,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J38', { path: { requestId, incidentId, proposalId }, body, idempotencyKey }),

  /** F5-J39 – Chuyển hồ sơ kết thúc sớm sang giải quyết quyền lợi (Flow 6) */
  referTermination: (
    incidentId: string,
    proposalId: string,
    body: T.TerminationReferInput,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J39', { path: { incidentId, proposalId }, body, idempotencyKey }),

  /** F5-J40 – Lịch sử các đề xuất kết thúc sớm */
  getTerminationProposals: (incidentId: string): Promise<Array<T.TerminationProposal>> =>
    flow5Request<Array<T.TerminationProposal>>('F5-J40', { path: { incidentId } }),

  /** F5-J41 – Khách xem lịch sử đề xuất kết thúc sớm */
  getCustomerTerminationProposals: (requestId: string, incidentId: string): Promise<Array<T.TerminationProposal>> =>
    flow5Request<Array<T.TerminationProposal>>('F5-J41', { path: { requestId, incidentId } }),

  /** F5-J42 – Chia sẻ tệp bằng chứng sự cố cho khách hàng */
  shareFileWithCustomer: (incidentId: string, fileId: string, body: T.ShareFileInput, idempotencyKey?: string): Promise<T.File> =>
    flow5Request<T.File>('F5-J42', { path: { incidentId, fileId }, body, idempotencyKey }),

  /** F5-J43 – Rút lại phương án khôi phục chưa duyệt */
  withdrawRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey?: string): Promise<T.Recovery> =>
    flow5Request<T.Recovery>('F5-J43', { path: { incidentId }, body, idempotencyKey }),
};

export default flow5Api;
