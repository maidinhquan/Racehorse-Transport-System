/**
 * Flow 5 API — Xử lý sự cố vận chuyển (Incident Management & Recovery)
 * Compliant with Backend C# (Controllers/Flow5/*, Flow5ExtendedDtos.cs) & test api_flow5.md
 *
 * Covers all 43 operations (F5-J01 -> F5-J43) + specialized driver and alternate endpoints.
 */
import { flow5Request } from './flow5Client';
import type * as T from '../types/flow5.types';

export const flow5Api = {
  // ─── MASTER (F5-J01) ────────────────────────────────────────────────────────

  /**
   * F5-J01 – Tra cứu năng lực xử lý sự cố của hệ thống (Capabilities)
   * Trả về danh mục sự cố, các loại giải pháp, nhiệm vụ và phạm vi ảnh hưởng
   */
  getCapabilities: (): Promise<T.Flow5Capabilities> =>
    flow5Request<T.Flow5Capabilities>('F5-J01'),

  // ─── BASE INCIDENTS (F5-J02 - F5-J06, F5-J44) ────────────────────────────────

  /**
   * F5-J02 – Điều phối viên / Nhân sự tra cứu danh sách sự cố
   * Hỗ trợ lọc theo tripId và status ('REPORTED' | 'IN_PROGRESS' | 'RESOLVED')
   */
  getIncidents: (query?: { status?: string; tripId?: string }): Promise<Array<T.IncidentResponse>> =>
    flow5Request<Array<T.IncidentResponse>>('F5-J02', { query }),

  /**
   * F5-J03 – Báo cáo sự cố khẩn cấp từ hiện trường (Tài xế / Nhân sự)
   * Tự động sinh ID INC_..., kích hoạt SafetyBlockerActive = true và thông báo cho Coordinator
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
   * Chuyển trạng thái REPORTED -> IN_PROGRESS, gán coordinatorId
   */
  acceptIncident: (incidentId: string, idempotencyKey?: string): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J06', { path: { incidentId }, idempotencyKey }),

  /**
   * F5-J06-ALT – Đường dẫn tiếp nhận thay thế (POST /api/incidents/{incidentId}/accept)
   */
  acceptIncidentAlt: (incidentId: string, idempotencyKey?: string): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J06-ALT', { path: { incidentId }, idempotencyKey }),

  // ─── IMPACT ASSESSMENT (F5-J07) ─────────────────────────────────────────────

  /**
   * F5-J07 – Đánh giá 8 vùng ảnh hưởng của sự cố
   * Phương tiện, lịch trình, chuyến bay, giấy tờ, bảo hiểm, sức khỏe ngựa, thời hạn, chi phí phát sinh
   */
  saveImpactAssessment: (
    incidentId: string,
    body: T.AssessmentInput,
    idempotencyKey?: string,
  ): Promise<T.ImpactAssessmentResult> =>
    flow5Request<T.ImpactAssessmentResult>('F5-J07', { path: { incidentId }, body, idempotencyKey }),

  assessImpact: (
    incidentId: string,
    body: T.AssessmentInput,
    idempotencyKey?: string,
  ): Promise<T.ImpactAssessmentResult> =>
    flow5Request<T.ImpactAssessmentResult>('F5-J07', { path: { incidentId }, body, idempotencyKey }),

  // ─── FIELD UPDATES (F5-J08, F5-J09) ──────────────────────────────────────────

  /**
   * F5-J08 – Ghi nhận diễn biến hiện trường / sơ cứu khẩn cấp
   * Ghi log FIELD_LOG, MEDICAL_TREATMENT, LOGISTICS_PROGRESS hoặc POLICE_REPORT
   */
  addIncidentUpdate: (
    incidentId: string,
    body: T.UpdateInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentUpdate> =>
    flow5Request<T.IncidentUpdate>('F5-J08', { path: { incidentId }, body, idempotencyKey }),

  recordUpdate: (
    incidentId: string,
    body: T.UpdateInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentUpdate> =>
    flow5Request<T.IncidentUpdate>('F5-J08', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J09 – Đọc toàn bộ nhật ký diễn biến sự cố
   */
  getIncidentUpdates: (incidentId: string): Promise<Array<T.IncidentUpdate>> =>
    flow5Request<Array<T.IncidentUpdate>>('F5-J09', { path: { incidentId } }),

  getUpdates: (incidentId: string): Promise<Array<T.IncidentUpdate>> =>
    flow5Request<Array<T.IncidentUpdate>>('F5-J09', { path: { incidentId } }),

  // ─── TASKS & PROGRESS (F5-J10 - F5-J12) ──────────────────────────────────────

  /**
   * F5-J10 – Điều phối giao việc khắc phục song song cho nhân sự chuyên môn
   */
  createTask: (
    incidentId: string,
    body: T.TaskInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentTask> =>
    flow5Request<T.IncidentTask>('F5-J10', { path: { incidentId }, body, idempotencyKey }),

  createIncidentTask: (
    incidentId: string,
    body: T.TaskInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentTask> =>
    flow5Request<T.IncidentTask>('F5-J10', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J11 – Danh sách công việc khắc phục và người phụ trách
   */
  getIncidentTasks: (incidentId: string): Promise<Array<T.IncidentTask>> =>
    flow5Request<Array<T.IncidentTask>>('F5-J11', { path: { incidentId } }),

  getTasks: (incidentId: string): Promise<Array<T.IncidentTask>> =>
    flow5Request<Array<T.IncidentTask>>('F5-J11', { path: { incidentId } }),

  /**
   * F5-J12 – Người được giao việc cập nhật kết quả / tiến độ công việc
   */
  updateTaskProgress: (
    incidentId: string,
    taskId: string,
    body: T.TaskProgressInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentTask> =>
    flow5Request<T.IncidentTask>('F5-J12', { path: { incidentId, taskId }, body, idempotencyKey }),

  // ─── RECOVERY PLAN LIFECYCLE (F5-J13 - F5-J18, F5-J43, F5-J24) ───────────────

  /**
   * F5-J13 – Đọc dữ liệu phụ thuộc để lập phương án (Recovery Context)
   */
  getRecoveryContext: (incidentId: string): Promise<T.RecoveryContext> =>
    flow5Request<T.RecoveryContext>('F5-J13', { path: { incidentId } }),

  /**
   * F5-J14 – Lưu nháp phương án khôi phục
   */
  saveRecoveryDraft: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J14', { path: { incidentId }, body, idempotencyKey }),

  draftRecoveryPlan: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J14', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J15 – Kiểm tra tính hợp lệ của phương án khôi phục (Validate)
   */
  validateRecoveryPlan: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryValidateResult> =>
    flow5Request<T.RecoveryValidateResult>('F5-J15', { path: { incidentId }, body, idempotencyKey }),

  validateRecovery: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryValidateResult> =>
    flow5Request<T.RecoveryValidateResult>('F5-J15', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J16 – Gửi phương án trình Quản lý và tạm giữ nguồn lực thay thế
   */
  submitRecoveryPlan: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J16', { path: { incidentId }, body, idempotencyKey }),

  submitRecovery: (
    incidentId: string,
    body: T.RecoveryInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J16', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J17 – Quản lý (Logistics Manager) phê duyệt hoặc từ chối phương án khôi phục
   */
  decideRecoveryPlan: (
    incidentId: string,
    body: T.RecoveryDecisionInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J17', { path: { incidentId }, body, idempotencyKey }),

  decideRecovery: (
    incidentId: string,
    body: T.RecoveryDecisionInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J17', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J18 – Mở bản sửa đổi phương án khi bị Quản lý yêu cầu điều chỉnh
   */
  requestRecoveryRevision: (
    incidentId: string,
    body: T.RecoveryRevisionInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J18', { path: { incidentId }, body, idempotencyKey }),

  createRecoveryRevision: (
    incidentId: string,
    body: T.RecoveryRevisionInput,
    idempotencyKey?: string,
  ): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J18', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J43 – Điều phối viên rút lại phương án đang chờ duyệt
   */
  withdrawRecoveryPlan: (incidentId: string, idempotencyKey?: string): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J43', { path: { incidentId }, idempotencyKey }),

  withdrawRecovery: (incidentId: string, idempotencyKey?: string): Promise<T.RecoveryPlan> =>
    flow5Request<T.RecoveryPlan>('F5-J43', { path: { incidentId }, idempotencyKey }),

  /**
   * F5-J24 – Áp dụng phương án khôi phục đã được phê duyệt vào chuyến đi thật
   */
  applyRecoveryPlan: (incidentId: string, idempotencyKey?: string): Promise<T.RecoveryApply> =>
    flow5Request<T.RecoveryApply>('F5-J24', { path: { incidentId }, idempotencyKey }),

  applyRecovery: (incidentId: string, idempotencyKey?: string): Promise<T.RecoveryApply> =>
    flow5Request<T.RecoveryApply>('F5-J24', { path: { incidentId }, idempotencyKey }),

  // ─── HISTORY & RESOURCE OPTIONS (F5-J19, F5-J20) ────────────────────────────

  /**
   * F5-J19 – Xem lịch sử quyết định, phiên bản và áp dụng phương án
   */
  getIncidentHistory: (incidentId: string): Promise<T.IncidentHistory> =>
    flow5Request<T.IncidentHistory>('F5-J19', { path: { incidentId } }),

  /**
   * F5-J20 – Tìm xe và nhân sự thay thế phù hợp cho chặng gặp sự cố
   */
  getResourceOptions: (incidentId: string): Promise<T.ResourceOption> =>
    flow5Request<T.ResourceOption>('F5-J20', { path: { incidentId } }),

  // ─── SPECIALIST, VET & EXTERNAL ACTIONS (F5-J21 - F5-J23) ───────────────────

  /**
   * F5-J21 – Chuyên viên pháp lý rà soát giấy tờ / kiểm dịch / bảo hiểm bị ảnh hưởng
   */
  saveComplianceReview: (
    incidentId: string,
    body: T.ComplianceInput,
    idempotencyKey?: string,
  ): Promise<T.ComplianceReview> =>
    flow5Request<T.ComplianceReview>('F5-J21', { path: { incidentId }, body, idempotencyKey }),

  reviewCompliance: (
    incidentId: string,
    body: T.ComplianceInput,
    idempotencyKey?: string,
  ): Promise<T.ComplianceReview> =>
    flow5Request<T.ComplianceReview>('F5-J21', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J22 – Bác sĩ thú y khám sức khỏe và kết luận khả năng tiếp tục của ngựa
   */
  saveVetAssessment: (
    incidentId: string,
    body: T.VetInput,
    idempotencyKey?: string,
  ): Promise<T.VetAssessment> =>
    flow5Request<T.VetAssessment>('F5-J22', { path: { incidentId }, body, idempotencyKey }),

  recordVetAssessment: (
    incidentId: string,
    body: T.VetInput,
    idempotencyKey?: string,
  ): Promise<T.VetAssessment> =>
    flow5Request<T.VetAssessment>('F5-J22', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J23 – Ghi nhận xác nhận từ đối tác ngoài (xe cứu hộ, chuyến bay charter, chuồng trạm)
   */
  logExternalAction: (
    incidentId: string,
    body: T.ExternalActionInput,
    idempotencyKey?: string,
  ): Promise<T.ExternalAction> =>
    flow5Request<T.ExternalAction>('F5-J23', { path: { incidentId }, body, idempotencyKey }),

  recordExternalAction: (
    incidentId: string,
    body: T.ExternalActionInput,
    idempotencyKey?: string,
  ): Promise<T.ExternalAction> =>
    flow5Request<T.ExternalAction>('F5-J23', { path: { incidentId }, body, idempotencyKey }),

  // ─── CONTINUATION & RESOLUTION (F5-J25 - F5-J28) ────────────────────────────

  /**
   * F5-J25 – Kiểm tra điều kiện tiếp tục hành trình và điều kiện dỡ bỏ SafetyBlocker
   */
  getContinuationReadiness: (incidentId: string): Promise<T.ContinuationReadiness> =>
    flow5Request<T.ContinuationReadiness>('F5-J25', { path: { incidentId } }),

  /**
   * F5-J26 – Cho phép xe tiếp tục hành trình sau sự cố (Gỡ bỏ SafetyBlocker)
   */
  continueTrip: (
    incidentId: string,
    body: T.ContinuationInput = {},
    idempotencyKey?: string,
  ): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J26', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J27 – Coordinator ghi kết quả và đóng sự cố (RESOLVED)
   */
  resolveIncident: (
    incidentId: string,
    body: T.IncidentResolutionInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J27', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J28 – Mở lại sự cố nếu tái phát vấn đề
   */
  reopenIncident: (
    incidentId: string,
    body: T.IncidentReopenInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentResponse> =>
    flow5Request<T.IncidentResponse>('F5-J28', { path: { incidentId }, body, idempotencyKey }),

  // ─── CUSTOMER COMMUNICATIONS & AGREEMENTS (F5-J29 - F5-J33) ─────────────────

  /**
   * F5-J29 – Khách hàng xem danh sách sự cố và ảnh hưởng được thông báo trên đơn hàng
   */
  getCustomerIncidents: (requestId: string): Promise<Array<T.CustomerIncidentSummary>> =>
    flow5Request<Array<T.CustomerIncidentSummary>>('F5-J29', { path: { requestId } }),

  /**
   * F5-J30 – Khách hàng đọc chi tiết sự cố được chia sẻ
   */
  getCustomerIncidentDetail: (requestId: string, incidentId: string): Promise<T.CustomerIncidentDetail> =>
    flow5Request<T.CustomerIncidentDetail>('F5-J30', { path: { requestId, incidentId } }),

  /**
   * F5-J31 – Quản lý gửi thông báo hoặc đề nghị thống nhất thỏa thuận với khách hàng
   */
  sendCustomerCommunication: (
    incidentId: string,
    body: T.CommunicationInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J31', { path: { incidentId }, body, idempotencyKey }),

  sendCommunication: (
    incidentId: string,
    body: T.CommunicationInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J31', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J32 – Khách hàng đồng ý hoặc từ chối đề nghị thỏa thuận
   */
  replyCustomerCommunication: (
    requestId: string,
    incidentId: string,
    messageId: string,
    body: T.CustomerReply,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J32', {
      path: { requestId, incidentId, messageId },
      body,
      idempotencyKey,
    }),

  replyCommunication: (
    requestId: string,
    incidentId: string,
    messageId: string,
    body: T.CustomerReply,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J32', {
      path: { requestId, incidentId, messageId },
      body,
      idempotencyKey,
    }),

  /**
   * F5-J33 – Ghi nhận thỏa thuận ngoài hệ thống với khách hàng có bằng chứng
   */
  logExternalCustomerAgreement: (
    incidentId: string,
    body: T.ExternalAgreementInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J33', { path: { incidentId }, body, idempotencyKey }),

  recordExternalAgreement: (
    incidentId: string,
    body: T.ExternalAgreementInput,
    idempotencyKey?: string,
  ): Promise<T.IncidentCommunication> =>
    flow5Request<T.IncidentCommunication>('F5-J33', { path: { incidentId }, body, idempotencyKey }),

  // ─── FILES & EVIDENCE (F5-J34 - F5-J36, F5-J42) ─────────────────────────────

  /**
   * F5-J34 – Tải lên bằng chứng / file liên quan đến sự cố của chuyến
   */
  uploadTripIncidentFile: (
    tripId: string,
    body: T.IncidentFileUploadInput,
    incidentId?: string,
    idempotencyKey?: string,
  ): Promise<T.IncidentFile> =>
    flow5Request<T.IncidentFile>('F5-J34', {
      path: { tripId },
      query: incidentId ? { incidentId } : undefined,
      body,
      idempotencyKey,
    }),

  uploadIncidentFile: (
    tripId: string,
    fileOrBody: File | T.IncidentFileUploadInput,
    bodyOrPurpose?: unknown,
    idempotencyKey?: string,
  ): Promise<T.IncidentFile> => {
    if (fileOrBody instanceof File) {
      return flow5Request<T.IncidentFile>('F5-J34', {
        path: { tripId },
        file: fileOrBody,
        body: bodyOrPurpose,
        idempotencyKey,
      });
    }
    return flow5Request<T.IncidentFile>('F5-J34', {
      path: { tripId },
      body: fileOrBody,
      idempotencyKey,
    });
  },

  /**
   * F5-J35 – Tải hoặc xem file bằng chứng sự cố (Nội bộ)
   */
  getIncidentFile: (incidentId: string, fileId: string): Promise<T.IncidentFile> =>
    flow5Request<T.IncidentFile>('F5-J35', { path: { incidentId, fileId } }),

  /**
   * F5-J36 – Khách hàng tải tài liệu / bằng chứng được chia sẻ
   */
  getSharedIncidentFile: (requestId: string, incidentId: string, fileId: string): Promise<T.IncidentFile> =>
    flow5Request<T.IncidentFile>('F5-J36', { path: { requestId, incidentId, fileId } }),

  getCustomerIncidentFile: (requestId: string, incidentId: string, fileId: string): Promise<T.IncidentFile> =>
    flow5Request<T.IncidentFile>('F5-J36', { path: { requestId, incidentId, fileId } }),

  /**
   * F5-J42 – Quản lý cấp quyền chia sẻ tài liệu cho khách hàng xem
   */
  shareFileWithCustomer: (
    incidentId: string,
    fileId: string,
    body: T.ShareFileInput = { isSharedWithCustomer: true },
    idempotencyKey?: string,
  ): Promise<T.IncidentFile> =>
    flow5Request<T.IncidentFile>('F5-J42', { path: { incidentId, fileId }, body, idempotencyKey }),

  // ─── TERMINATION PROPOSALS (F5-J37 - F5-J41) ────────────────────────────────

  /**
   * F5-J37 – Quản lý đề xuất dừng chuyến sớm khi bất khả kháng
   */
  createTerminationProposal: (
    incidentId: string,
    body: T.TerminationInput,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J37', { path: { incidentId }, body, idempotencyKey }),

  proposeTermination: (
    incidentId: string,
    body: T.TerminationInput,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J37', { path: { incidentId }, body, idempotencyKey }),

  /**
   * F5-J38 – Khách hàng phản hồi phương án đề xuất kết thúc sớm
   */
  replyTerminationProposal: (
    requestId: string,
    incidentId: string,
    proposalId: string,
    body: T.TerminationReply,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J38', {
      path: { requestId, incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  replyTermination: (
    requestId: string,
    incidentId: string,
    proposalId: string,
    body: T.TerminationReply,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J38', {
      path: { requestId, incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  /**
   * F5-J39 – Chuyển giao hồ sơ hủy chuyến sang bộ phận nghĩa vụ (Pháp lý / Bảo hiểm)
   */
  referTerminationProposal: (
    incidentId: string,
    proposalId: string,
    body: T.TerminationReferInput,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J39', {
      path: { incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  referTermination: (
    incidentId: string,
    proposalId: string,
    body: T.TerminationReferInput,
    idempotencyKey?: string,
  ): Promise<T.TerminationProposal> =>
    flow5Request<T.TerminationProposal>('F5-J39', {
      path: { incidentId, proposalId },
      body,
      idempotencyKey,
    }),

  /**
   * F5-J40 – Đọc lịch sử đề xuất kết thúc sớm của sự cố (Nội bộ)
   */
  getTerminationProposals: (incidentId: string): Promise<Array<T.TerminationProposal>> =>
    flow5Request<Array<T.TerminationProposal>>('F5-J40', { path: { incidentId } }),

  /**
   * F5-J41 – Khách hàng đọc các phương án đề xuất kết thúc sớm cần phản hồi
   */
  getCustomerTerminationProposals: (
    requestId: string,
    incidentId: string,
  ): Promise<Array<T.TerminationProposal>> =>
    flow5Request<Array<T.TerminationProposal>>('F5-J41', { path: { requestId, incidentId } }),
};

export default flow5Api;
