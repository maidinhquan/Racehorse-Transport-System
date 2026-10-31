/**
 * Flow 6 API - Complete Frontend API for Handover, Delivery Confirmation,
 * Settlement, Balance Payment, Customer Feedback and Closure.
 * Compliant with ID_NAME_RULE_Reviewed and DATABASE_STATUS_CONVENTION.
 */

import { flow6Request } from './flow6Client';
import type * as T from '../types/flow6.types';

export const flow6Api = {
  // ==========================================
  // Operations / Driver Delivery (F6-J01..J11, J38..J40, J45)
  // ==========================================

  /** F6-J01: Danh sách chuyến giao nhận (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getTrips(query?: { status?: 'IN_TRANSIT' | 'COMPLETED' }): Promise<Array<T.TripSummary>> {
    return flow6Request<Array<T.TripSummary>>('F6-J01', { query });
  },

  /** F6-J02: Đầu vào và baseline giao nhận (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getTripContext(tripId: string): Promise<T.Context> {
    return flow6Request<T.Context>('F6-J02', { path: { tripId } });
  },

  /** F6-J03: Tạo DELIVERY và revision DRAFT đầu tiên (DRIVER_ESCORT) */
  createDelivery(tripId: string, body: T.DeliveryContent, idempotencyKey: string): Promise<T.Delivery> {
    return flow6Request<T.Delivery>('F6-J03', { path: { tripId }, body, idempotencyKey });
  },

  /** F6-J04: Định danh biên bản giao nhận (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getHandover(handoverId: string): Promise<T.Delivery> {
    return flow6Request<T.Delivery>('F6-J04', { path: { handoverId } });
  },

  /** F6-J05: Đọc chi tiết đúng bản giao nhận (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getRevision(revisionId: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J05', { path: { revisionId } });
  },

  /** F6-J06: Thay nội dung DRAFT trước khi gửi OTP (DRIVER_ESCORT) */
  updateRevision(revisionId: string, body: T.DeliveryContent, idempotencyKey: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J06', { path: { revisionId }, body, idempotencyKey });
  },

  /** F6-J07: Gửi hoặc gửi lại OTP xác thực (DRIVER_ESCORT) */
  sendOtp(revisionId: string, idempotencyKey: string): Promise<T.OtpState> {
    return flow6Request<T.OtpState>('F6-J07', { path: { revisionId }, idempotencyKey });
  },

  /** F6-J08: Thu hồi OTP để sửa lại bản DRAFT (DRIVER_ESCORT) */
  invalidateOtp(revisionId: string, idempotencyKey: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J08', { path: { revisionId }, idempotencyKey });
  },

  /** F6-J09: Xác nhận nhận ngựa bằng OTP đúng phiên bản (DRIVER_ESCORT) */
  confirmRevision(revisionId: string, body: T.OtpInput, idempotencyKey: string): Promise<T.ConfirmedDelivery> {
    return flow6Request<T.ConfirmedDelivery>('F6-J09', { path: { revisionId }, body, idempotencyKey });
  },

  /** F6-J10: Ghi nhận người nhận từ chối nhận ngựa (DRIVER_ESCORT) */
  refuseRevision(revisionId: string, body: T.ReasonInput, idempotencyKey: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J10', { path: { revisionId }, body, idempotencyKey });
  },

  /** F6-J11: Lập bản giao lại kế tiếp sau khi bị từ chối (DRIVER_ESCORT) */
  createRedeliveryRevision(handoverId: string, body: T.DeliveryContent, idempotencyKey: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J11', { path: { handoverId }, body, idempotencyKey });
  },

  /** F6-J38: Đọc baseline bàn giao PICKUP đầu chuyến (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getPickupBaseline(tripId: string): Promise<T.PickupReference> {
    return flow6Request<T.PickupReference>('F6-J38', { path: { tripId } });
  },

  /** F6-J39: Tham chiếu nhật ký sức khỏe đã ghi (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getHealthLogs(tripId: string): Promise<Array<T.HealthReference>> {
    return flow6Request<Array<T.HealthReference>>('F6-J39', { path: { tripId } });
  },

  /** F6-J40: Tham chiếu sự cố hành trình (DRIVER_ESCORT, LOGISTICS_MANAGER) */
  getIncidents(tripId: string): Promise<Array<T.IncidentReference>> {
    return flow6Request<Array<T.IncidentReference>>('F6-J40', { path: { tripId } });
  },

  /** F6-J45: Xuất PDF đúng bản biên bản (DRIVER_ESCORT) */
  downloadRevisionPdf(revisionId: string): Promise<Blob> {
    return flow6Request<Blob>('F6-J45', { path: { revisionId }, responseType: 'blob' });
  },

  // ==========================================
  // Customer Flow 6 (F6-J12..J13, J18, J21, J23..J25, J29..J30, J34..J35, J41, J46)
  // ==========================================

  /** F6-J12: Danh sách hồ sơ tất toán của Customer */
  getCustomerSettlements(): Promise<Array<T.Settlement>> {
    return flow6Request<Array<T.Settlement>>('F6-J12');
  },

  /** F6-J13: Chi tiết hồ sơ tất toán của Customer */
  getCustomerSettlement(settlementId: string): Promise<T.Settlement> {
    return flow6Request<T.Settlement>('F6-J13', { path: { settlementId } });
  },

  /** F6-J18: Customer xem nghĩa vụ tiền và số dư còn lại */
  getCustomerBalance(settlementId: string): Promise<T.Balance> {
    return flow6Request<T.Balance>('F6-J18', { path: { settlementId } });
  },

  /** F6-J21: Customer xem danh sách điều chỉnh cước phí */
  getCustomerAdjustments(settlementId: string): Promise<Array<T.Adjustment>> {
    return flow6Request<Array<T.Adjustment>>('F6-J21', { path: { settlementId } });
  },

  /** F6-J23: Customer đọc invoice cuối hiện hành */
  getCustomerInvoice(settlementId: string): Promise<T.Invoice> {
    return flow6Request<T.Invoice>('F6-J23', { path: { settlementId } });
  },

  /** F6-J24: Tạo phiên thanh toán VNPay trả số dư */
  createPaymentSession(invoiceId: string, idempotencyKey: string): Promise<T.PaymentSession> {
    return flow6Request<T.PaymentSession>('F6-J24', { path: { invoiceId }, idempotencyKey });
  },

  /** F6-J25: Kiểm tra kết quả giao dịch thanh toán số dư */
  getCustomerPayment(paymentId: string): Promise<T.Payment> {
    return flow6Request<T.Payment>('F6-J25', { path: { paymentId } });
  },

  /** F6-J29: Customer gửi khiếu nại hoặc hỗ trợ sau chuyến */
  createCustomerCase(settlementId: string, body: T.CaseInput, idempotencyKey: string): Promise<T.Case> {
    return flow6Request<T.Case>('F6-J29', { path: { settlementId }, body, idempotencyKey });
  },

  /** F6-J30: Customer theo dõi danh sách phiếu khiếu nại/hỗ trợ */
  getCustomerCases(settlementId: string): Promise<Array<T.Case>> {
    return flow6Request<Array<T.Case>>('F6-J30', { path: { settlementId } });
  },

  /** F6-J34: Customer gửi đánh giá sao (CUSTOMER_FEEDBACK) */
  submitFeedback(settlementId: string, body: T.FeedbackInput, idempotencyKey: string): Promise<T.Feedback> {
    return flow6Request<T.Feedback>('F6-J34', { path: { settlementId }, body, idempotencyKey });
  },

  /** F6-J35: Customer đọc đánh giá đã gửi */
  getCustomerFeedback(settlementId: string): Promise<T.Feedback> {
    return flow6Request<T.Feedback>('F6-J35', { path: { settlementId } });
  },

  /** F6-J41: Customer đọc biên bản đã nhận bàn giao */
  getCustomerDelivery(settlementId: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J41', { path: { settlementId } });
  },

  /** F6-J46: Customer tải tệp PDF biên bản đã nhận */
  downloadCustomerDeliveryPdf(settlementId: string): Promise<Blob> {
    return flow6Request<Blob>('F6-J46', { path: { settlementId }, responseType: 'blob' });
  },

  // ==========================================
  // Logistics Manager Flow 6 (F6-J14..J17, J19..J20, J22, J26..J28, J31..J33, J36..J37, J42..J44, J47)
  // ==========================================

  /** F6-J14: Danh sách hồ sơ tất toán (Manager) */
  getManagerSettlements(query?: { status?: 'DRAFT' | 'AWAITING_PAYMENT' | 'SETTLED' | 'CLOSED' }): Promise<Array<T.Settlement>> {
    return flow6Request<Array<T.Settlement>>('F6-J14', { query });
  },

  /** F6-J15: Chuẩn bị hồ sơ tất toán DRAFT */
  prepareSettlement(tripId: string, idempotencyKey: string): Promise<T.Settlement> {
    return flow6Request<T.Settlement>('F6-J15', { path: { tripId }, idempotencyKey });
  },

  /** F6-J16: Chi tiết hồ sơ tất toán (Manager) */
  getManagerSettlement(settlementId: string): Promise<T.Settlement> {
    return flow6Request<T.Settlement>('F6-J16', { path: { settlementId } });
  },

  /** F6-J17: Tính số tiền còn phải thu (Manager) */
  getManagerBalance(settlementId: string): Promise<T.Balance> {
    return flow6Request<T.Balance>('F6-J17', { path: { settlementId } });
  },

  /** F6-J19: Manager xác nhận điều chỉnh (CHARGE, DISCOUNT, REFUND) */
  createAdjustment(settlementId: string, body: T.AdjustmentInput, idempotencyKey: string): Promise<T.Adjustment> {
    return flow6Request<T.Adjustment>('F6-J19', { path: { settlementId }, body, idempotencyKey });
  },

  /** F6-J20: Danh sách điều chỉnh đã xác nhận (Manager) */
  getManagerAdjustments(settlementId: string): Promise<Array<T.Adjustment>> {
    return flow6Request<Array<T.Adjustment>>('F6-J20', { path: { settlementId } });
  },

  /** F6-J22: Phát hành hoặc thay thế invoice cuối cùng */
  issueFinalInvoice(settlementId: string, body: T.InvoiceInput, idempotencyKey: string): Promise<T.Invoice> {
    return flow6Request<T.Invoice>('F6-J22', { path: { settlementId }, body, idempotencyKey });
  },

  /** F6-J26: Manager xác nhận nghiệm thu và hoàn tất tất toán */
  settleSettlement(settlementId: string, idempotencyKey: string): Promise<T.Settlement> {
    return flow6Request<T.Settlement>('F6-J26', { path: { settlementId }, idempotencyKey });
  },

  /** F6-J27: Ghi nhận bắt đầu xử lý hoàn tiền */
  startRefundProcessing(adjustmentId: string, idempotencyKey: string): Promise<T.Refund> {
    return flow6Request<T.Refund>('F6-J27', { path: { adjustmentId }, idempotencyKey });
  },

  /** F6-J28: Ghi nhận bằng chứng hoàn tiền đủ khoản */
  completeRefund(adjustmentId: string, body: T.RefundInput, idempotencyKey: string): Promise<T.Refund> {
    return flow6Request<T.Refund>('F6-J28', { path: { adjustmentId }, body, idempotencyKey });
  },

  /** F6-J31: Hàng đợi khiếu nại và hỗ trợ của khách hàng */
  getManagerCases(query?: { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' }): Promise<Array<T.Case>> {
    return flow6Request<Array<T.Case>>('F6-J31', { query });
  },

  /** F6-J32: Đánh dấu bắt đầu xử lý khiếu nại */
  startCaseProcessing(caseId: string, idempotencyKey: string): Promise<T.Case> {
    return flow6Request<T.Case>('F6-J32', { path: { caseId }, idempotencyKey });
  },

  /** F6-J33: Manager ghi phản hồi và giải quyết phiếu (RESOLVED) */
  resolveCase(caseId: string, body: T.ResolveInput, idempotencyKey: string): Promise<T.Case> {
    return flow6Request<T.Case>('F6-J33', { path: { caseId }, body, idempotencyKey });
  },

  /** F6-J36: Mở lại feedback window sau khi xử lý xong khiếu nại và nghĩa vụ tiền */
  restartFeedbackWindow(settlementId: string, idempotencyKey: string): Promise<T.Settlement> {
    return flow6Request<T.Settlement>('F6-J36', { path: { settlementId }, idempotencyKey });
  },

  /** F6-J37: Đóng hồ sơ tất toán khi đủ điều kiện (CLOSED) */
  closeSettlement(settlementId: string, idempotencyKey: string): Promise<T.CloseResult> {
    return flow6Request<T.CloseResult>('F6-J37', { path: { settlementId }, idempotencyKey });
  },

  /** F6-J42: Manager đọc biên bản giao nhận nghiệm thu */
  getManagerDelivery(settlementId: string): Promise<T.Revision> {
    return flow6Request<T.Revision>('F6-J42', { path: { settlementId } });
  },

  /** F6-J43: Manager đọc phản hồi đánh giá khách hàng */
  getManagerFeedback(settlementId: string): Promise<T.Feedback> {
    return flow6Request<T.Feedback>('F6-J43', { path: { settlementId } });
  },

  /** F6-J44: Manager đọc danh sách giao dịch thanh toán số dư */
  getManagerPayments(settlementId: string): Promise<Array<T.Payment>> {
    return flow6Request<Array<T.Payment>>('F6-J44', { path: { settlementId } });
  },

  /** F6-J47: Manager tải tệp PDF biên bản nghiệm thu */
  downloadManagerDeliveryPdf(settlementId: string): Promise<Blob> {
    return flow6Request<Blob>('F6-J47', { path: { settlementId }, responseType: 'blob' });
  },
};
