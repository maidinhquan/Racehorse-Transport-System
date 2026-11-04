/**
 * Flow 5 API — Xử lý sự cố vận chuyển (Incident Management & Recovery)
 *
 * Covers 43 operations (F5-J01 … F5-J43) for roles:
 *   FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, DRIVER_ESCORT, TRANSPORT_SPECIALIST, CUSTOMER
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * Refetch on STALE_VERSION before retrying mutations.
 *
 * Generated from contracts/API-Flow/Flow5/flow5.openapi.json
 */
import { flow5Request } from './flow5Client';
import type * as T from '../types/flow5.types';

export const flow5Api = {
  // ─── MASTER ──────────────────────────────────────────────────────────────────

  /** F5-J01 – Capability xử lý sự cố */
  getCapabilities: () =>
    flow5Request<T.Capabilities>('F5-J01', { path: {} }),

  // ─── INCIDENTS & REPORTING ───────────────────────────────────────────────────

  /** F5-J02 – Danh sách sự cố theo quyền */
  getIncidents: (query?: { status?: 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED'; tripId?: string }) =>
    flow5Request<Array<T.IncidentSummary>>('F5-J02', { path: {}, query }),

  /** F5-J03 – Báo sự cố và ghi nhận chăm sóc ban đầu */
  reportIncident: (body: T.ReportInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J03', { path: {}, body, idempotencyKey }),

  /** F5-J04 – Chi tiết sự cố, nhiệm vụ và hành động */
  getIncidentDetail: (incidentId: string) =>
    flow5Request<T.IncidentDetail>('F5-J04', { path: { incidentId } }),

  /** F5-J05 – Sự cố trong chi tiết chuyến */
  getTripIncidents: (tripId: string) =>
    flow5Request<Array<T.IncidentSummary>>('F5-J05', { path: { tripId } }),

  /** F5-J06 – Coordinator tiếp nhận sự cố */
  acceptIncident: (incidentId: string, body: T.Command, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J06', { path: { incidentId }, body, idempotencyKey }),

  // ─── IMPACT ASSESSMENT ───────────────────────────────────────────────────────

  /** F5-J07 – Xác định chính xác phần bị ảnh hưởng */
  assessImpact: (incidentId: string, body: T.AssessmentInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J07', { path: { incidentId }, body, idempotencyKey }),

  // ─── UPDATES & EMERGENCY CARE ────────────────────────────────────────────────

  /** F5-J08 – Ghi hiện trường, tiến độ hoặc chăm sóc khẩn */
  recordUpdate: (incidentId: string, body: T.UpdateInput, idempotencyKey: string) =>
    flow5Request<T.Update>('F5-J08', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J09 – Đọc diễn biến sự cố */
  getUpdates: (incidentId: string) =>
    flow5Request<Array<T.Update>>('F5-J09', { path: { incidentId } }),

  // ─── TASKS ───────────────────────────────────────────────────────────────────

  /** F5-J10 – Giao công việc khắc phục song song (Coordinator) */
  createTask: (incidentId: string, body: T.TaskInput, idempotencyKey: string) =>
    flow5Request<T.Task>('F5-J10', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J11 – Danh sách công việc và người phụ trách */
  getTasks: (incidentId: string) =>
    flow5Request<Array<T.Task>>('F5-J11', { path: { incidentId } }),

  /** F5-J12 – Người được giao cập nhật kết quả công việc */
  updateTaskProgress: (incidentId: string, taskId: string, body: T.TaskProgress, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J12', { path: { incidentId, taskId }, body, idempotencyKey }),

  // ─── RECOVERY PLANNING & LIFECYCLE ───────────────────────────────────────────

  /** F5-J13 – Context phương án khôi phục và dependency */
  getRecoveryContext: (incidentId: string) =>
    flow5Request<T.IncidentDetail>('F5-J13', { path: { incidentId } }),

  /** F5-J14 – Lưu nháp phương án khôi phục */
  saveRecoveryDraft: (incidentId: string, body: T.RecoveryInput, idempotencyKey: string) =>
    flow5Request<T.Recovery>('F5-J14', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J15 – Kiểm tra phương án không ghi trạng thái */
  validateRecovery: (incidentId: string, body: T.PlanCommand) =>
    flow5Request<T.Readiness>('F5-J15', { path: { incidentId }, body }),

  /** F5-J16 – Gửi phương án và giữ nguồn lực nguyên tử (Coordinator) */
  submitRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow5Request<T.Recovery>('F5-J16', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J17 – Manager duyệt hoặc trả phương án */
  decideRecovery: (incidentId: string, body: T.RecoveryDecision, idempotencyKey: string) =>
    flow5Request<T.Recovery>('F5-J17', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J18 – Mở bản sửa phương án, giữ lịch sử approved */
  createRecoveryRevision: (incidentId: string, body: T.Command, idempotencyKey: string) =>
    flow5Request<T.Recovery>('F5-J18', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J43 – Rút phương án đang chờ duyệt */
  withdrawRecovery: (incidentId: string, body: T.PlanCommand, idempotencyKey: string) =>
    flow5Request<T.Recovery>('F5-J43', { path: { incidentId }, body, idempotencyKey }),

  // ─── HISTORY & RESOURCE OPTIONS ──────────────────────────────────────────────

  /** F5-J19 – Lịch sử quyết định, phiên bản và áp dụng */
  getIncidentHistory: (incidentId: string) =>
    flow5Request<Array<T.History>>('F5-J19', { path: { incidentId } }),

  /** F5-J20 – Tìm xe và nhân sự thay thế phù hợp */
  getResourceOptions: (incidentId: string, query?: { leg?: 'road' | 'outbound' | 'air' | 'inbound' }) =>
    flow5Request<Array<T.ResourceOption>>('F5-J20', { path: { incidentId }, query }),

  // ─── SPECIALIST & VET & EXTERNAL ACTIONS ──────────────────────────────────────

  /** F5-J21 – Xác nhận hồ sơ hoặc bảo hiểm bị ảnh hưởng (Specialist) */
  recordComplianceReview: (incidentId: string, body: T.ComplianceInput, idempotencyKey: string) =>
    flow5Request<T.ComplianceReview>('F5-J21', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J22 – Bác sĩ xác nhận sức khỏe và khả năng tiếp tục (Driver/Vet) */
  recordVetAssessment: (incidentId: string, body: T.VetInput, idempotencyKey: string) =>
    flow5Request<T.VetAssessment>('F5-J22', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J23 – Ghi xác nhận đối tác, booking và nguồn lực thật */
  recordExternalAction: (incidentId: string, body: T.ExternalActionInput, idempotencyKey: string) =>
    flow5Request<T.ExternalAction>('F5-J23', { path: { incidentId }, body, idempotencyKey }),

  // ─── APPLY & READINESS & CONTINUATION ────────────────────────────────────────

  /** F5-J24 – Áp dụng phương án khôi phục đã đủ bằng chứng */
  applyRecovery: (incidentId: string, body: T.ContinuationInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J24', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J25 – Kiểm tra điều kiện tiếp tục và điều kiện đóng */
  getContinuationReadiness: (incidentId: string) =>
    flow5Request<T.Readiness>('F5-J25', { path: { incidentId } }),

  /** F5-J26 – Cho phép tiếp tục đúng phần đủ điều kiện */
  allowContinuation: (incidentId: string, body: T.ContinuationInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J26', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J27 – Coordinator ghi kết quả và đóng sự cố */
  resolveIncident: (incidentId: string, body: T.Command, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J27', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J28 – Mở lại sự cố có vấn đề chưa xử lý */
  reopenIncident: (incidentId: string, body: T.Command, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J28', { path: { incidentId }, body, idempotencyKey }),

  // ─── CUSTOMER COMMUNICATIONS & NOTICES ───────────────────────────────────────

  /** F5-J29 – Khách xem sự cố và ảnh hưởng được thông báo */
  getCustomerIncidents: (requestId: string) =>
    flow5Request<Array<T.PublicIncident>>('F5-J29', { path: { requestId } }),

  /** F5-J30 – Khách đọc chi tiết sự cố được chia sẻ */
  getCustomerIncidentDetail: (requestId: string, incidentId: string) =>
    flow5Request<T.PublicContext>('F5-J30', { path: { requestId, incidentId } }),

  /** F5-J31 – Manager thông báo hoặc đề nghị thống nhất với khách */
  sendCommunication: (incidentId: string, body: T.CommunicationInput, idempotencyKey: string) =>
    flow5Request<T.Communication>('F5-J31', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J32 – Khách đồng ý hoặc từ chối nội dung cụ thể */
  replyCommunication: (
    requestId: string,
    incidentId: string,
    messageId: string,
    body: T.CustomerReply,
    idempotencyKey: string,
  ) =>
    flow5Request<T.Mutation>('F5-J32', {
      path: { requestId, incidentId, messageId },
      body,
      idempotencyKey,
    }),

  /** F5-J33 – Ghi thỏa thuận ngoài hệ thống có bằng chứng (Manager) */
  recordExternalAgreement: (incidentId: string, body: T.ExternalAgreementInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J33', { path: { incidentId }, body, idempotencyKey }),

  // ─── FILES & SHARING ─────────────────────────────────────────────────────────

  /** F5-J34 – Upload bằng chứng trước hoặc sau báo sự cố */
  uploadIncidentFile: (
    tripId: string,
    file: File,
    meta: { purpose: 'INCIDENT_FIELD' | 'VET_ASSESSMENT' | 'RESOURCE_PROOF' | 'PARTNER_NOTICE' | 'CUSTOMER_AGREEMENT'; horseId?: string },
    idempotencyKey: string,
  ) =>
    flow5Request<T.File>('F5-J34', {
      path: { tripId },
      file,
      body: meta,
      idempotencyKey,
    }),

  /** F5-J35 – Tải bằng chứng sự cố có kiểm quyền */
  downloadIncidentFile: (incidentId: string, fileId: string) =>
    flow5Request<Blob>('F5-J35', { path: { incidentId, fileId } }),

  /** F5-J36 – Khách tải bằng chứng được chia sẻ */
  downloadCustomerIncidentFile: (requestId: string, incidentId: string, fileId: string) =>
    flow5Request<Blob>('F5-J36', { path: { requestId, incidentId, fileId } }),

  /** F5-J42 – Cho phép chia sẻ bằng chứng với khách (Manager) */
  shareIncidentFile: (incidentId: string, fileId: string, body: T.ShareFileInput, idempotencyKey: string) =>
    flow5Request<T.Mutation>('F5-J42', { path: { incidentId, fileId }, body, idempotencyKey }),

  // ─── TERMINATION PROPOSALS ───────────────────────────────────────────────────

  /** F5-J37 – Đề xuất hướng kết thúc khi không thể tiếp tục (Manager) */
  createTerminationProposal: (incidentId: string, body: T.TerminationInput, idempotencyKey: string) =>
    flow5Request<T.TerminationProposal>('F5-J37', { path: { incidentId }, body, idempotencyKey }),

  /** F5-J38 – Khách phản hồi hướng kết thúc được đề xuất */
  replyTerminationProposal: (
    requestId: string,
    incidentId: string,
    proposalId: string,
    body: T.TerminationReply,
    idempotencyKey: string,
  ) =>
    flow5Request<T.Mutation>('F5-J38', {
      path: { requestId, incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  /** F5-J39 – Chuyển hồ sơ kết thúc sớm sang xử lý nghĩa vụ (Manager) */
  referTerminationProposal: (
    incidentId: string,
    proposalId: string,
    body: T.TerminationReferInput,
    idempotencyKey: string,
  ) =>
    flow5Request<T.TerminationProposal>('F5-J39', {
      path: { incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  /** F5-J40 – Đọc lịch sử đề xuất kết thúc và handoff (Nội bộ) */
  getTerminationProposals: (incidentId: string) =>
    flow5Request<Array<T.TerminationProposal>>('F5-J40', { path: { incidentId } }),

  /** F5-J41 – Khách đọc nội dung kết thúc cần phản hồi */
  getCustomerTerminationProposals: (requestId: string, incidentId: string) =>
    flow5Request<Array<T.TerminationProposal>>('F5-J41', { path: { requestId, incidentId } }),
};

