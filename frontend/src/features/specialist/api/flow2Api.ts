/**
 * Flow 2 API — Transport Specialist (Legal, Medical, Quarantine & Insurance)
 * Complete, contract-validated client API.
 * Compliant with contracts/API-Flow/Flow2/FLOW2.md and specialist.openapi.json.
 */

import { flow2Request } from './flow2Client';
import type * as T from '../types/flow2.types';

export const flow2Api = {
  // ─── MASTER ──────────────────────────────────────────────────────────────────

  /** F2-J01 – Khả năng hỗ trợ và cấu hình chính sách của Flow 2 */
  getCapabilities: (): Promise<T.Flow2Capabilities> =>
    flow2Request<T.Flow2Capabilities>('F2-J01'),

  // ─── TRIPS ───────────────────────────────────────────────────────────────────

  /** F2-J02 – Danh sách chuyến vận chuyển cần quản lý pháp lý & kiểm dịch */
  getTrips: (): Promise<T.SpecTrip[]> =>
    flow2Request<T.SpecTrip[]>('F2-J02'),

  /** F2-J11 – Chi tiết hồ sơ pháp lý, bảo hiểm và trạm kiểm dịch của chuyến */
  getTripDetail: (tripId: string): Promise<T.SpecTrip> =>
    flow2Request<T.SpecTrip>('F2-J11', { path: { tripId } }),

  // ─── CUSTOMER DOCUMENTS & REQUESTS ───────────────────────────────────────────

  /** F2-J03 – Danh sách giấy tờ do khách hàng tải lên */
  getCustomerDocs: (tripId?: string): Promise<T.CustomerDoc[]> =>
    flow2Request<T.CustomerDoc[]>('F2-J03', { query: tripId ? { tripId } : undefined }),

  /** F2-J15 – Chuyên viên duyệt (ACCEPT) hoặc từ chối (REJECT) giấy tờ của khách */
  reviewCustomerDoc: (tripId: string, body: T.ReviewCustomerDocInput): Promise<void> =>
    flow2Request<void>('F2-J15', { path: { tripId }, body }),

  /** F2-J05 – Danh sách các yêu cầu bổ sung giấy tờ đã gửi khách */
  getDocRequests: (tripId?: string): Promise<T.DocRequest[]> =>
    flow2Request<T.DocRequest[]>('F2-J05', { query: tripId ? { tripId } : undefined }),

  /** F2-J16 – Tạo yêu cầu bổ sung hồ sơ gửi khách hàng */
  createDocRequest: (body: T.CreateDocRequestInput): Promise<void> =>
    flow2Request<void>('F2-J16', { body }),

  // ─── COMPANY DOCUMENTS (CBN) ────────────────────────────────────────────────

  /** F2-J04 – Danh sách chứng từ công ty / kiểm dịch do CBN thực hiện */
  getDocuments: (tripId?: string): Promise<T.TripDocument[]> =>
    flow2Request<T.TripDocument[]>('F2-J04', { query: tripId ? { tripId } : undefined }),

  /** F2-J19 – Ghi nhận hoặc cập nhật chứng từ công ty đã làm */
  recordDocument: (body: T.RecordDocInput): Promise<void> =>
    flow2Request<void>('F2-J19', { body }),

  // ─── INSURANCE ───────────────────────────────────────────────────────────────

  /** F2-J23 – Xem thông tin đơn bảo hiểm của chuyến đi */
  getInsurance: (tripId: string): Promise<T.Insurance> =>
    flow2Request<T.Insurance>('F2-J23', { path: { tripId } }),

  /** F2-J24 – Lưu hoặc cập nhật hợp đồng bảo hiểm vận chuyển */
  saveInsurance: (tripId: string, body: T.SaveInsuranceInput): Promise<void> =>
    flow2Request<void>('F2-J24', { path: { tripId }, body }),

  /** F2-J25 – Xác nhận đã kiểm tra và phê duyệt bảo hiểm hợp lệ */
  verifyInsurance: (tripId: string): Promise<void> =>
    flow2Request<void>('F2-J25', { path: { tripId } }),

  // ─── QUARANTINE BOOKINGS ─────────────────────────────────────────────────────

  /** F2-J06 – Danh sách đặt chỗ tại các trạm kiểm dịch / cách ly */
  getQuarantineBookings: (tripId?: string): Promise<T.QuarantineBooking[]> =>
    flow2Request<T.QuarantineBooking[]>('F2-J06', { query: tripId ? { tripId } : undefined }),

  /** F2-J26 – Lưu hoặc cập nhật thông tin đặt chỗ kiểm dịch */
  saveQuarantineBooking: (body: T.SaveBookingInput): Promise<void> =>
    flow2Request<void>('F2-J26', { body }),

  // ─── WORKFLOW & READINESS GATES ──────────────────────────────────────────────

  /** F2-J14 – Áp dụng bộ quy định hồ sơ (Requirement Set) vào chuyến đi */
  applyRequirementSet: (tripId: string, body: T.ApplyRequirementSetInput): Promise<void> =>
    flow2Request<void>('F2-J14', { path: { tripId }, body }),

  /** F2-J28 – Đóng dấu xác nhận toàn bộ hồ sơ đã hoàn tất sẵn sàng xuất phát (Docs READY) */
  confirmDocsReady: (tripId: string): Promise<void> =>
    flow2Request<void>('F2-J28', { path: { tripId } }),

  /** F2-J17 – Ghi nhận kết quả thông quan / kiểm dịch tại từng trạm dừng */
  recordClearance: (tripId: string, body: T.RecordClearanceInput): Promise<void> =>
    flow2Request<void>('F2-J17', { path: { tripId }, body }),

  // ─── CONFIGURATION & MASTER DATA ─────────────────────────────────────────────

  /** F2-J07 – Danh mục các loại chứng từ hồ sơ */
  getDocTypes: (): Promise<T.DocType[]> =>
    flow2Request<T.DocType[]>('F2-J07'),

  /** F2-J30 – Thêm hoặc cập nhật một loại chứng từ trong danh mục */
  saveDocType: (body: T.DocType): Promise<void> =>
    flow2Request<void>('F2-J30', { body }),

  /** F2-J08 – Danh mục các quy định hồ sơ theo quốc gia và hướng di chuyển */
  getRegulations: (): Promise<T.Regulation[]> =>
    flow2Request<T.Regulation[]>('F2-J08'),

  /** F2-J32 – Thêm hoặc cập nhật quy định hồ sơ theo quốc gia */
  saveRegulation: (body: T.Regulation): Promise<void> =>
    flow2Request<void>('F2-J32', { body }),

  /** F2-J09 – Danh mục các gói quy định hồ sơ (Requirement Sets) */
  getRequirementSets: (): Promise<T.RegPackage[]> =>
    flow2Request<T.RegPackage[]>('F2-J09'),

  /** F2-J34 – Thêm hoặc cập nhật gói quy định hồ sơ */
  saveRequirementSet: (body: T.RegPackage): Promise<void> =>
    flow2Request<void>('F2-J34', { body }),

  // ─── AUDIT ───────────────────────────────────────────────────────────────────

  /** F2-J10 – Nhật ký kiểm toán thao tác pháp lý & hồ sơ */
  getAudit: (tripId?: string): Promise<T.AuditEntry[]> =>
    flow2Request<T.AuditEntry[]>('F2-J10', { query: tripId ? { tripId } : undefined }),
};

export default flow2Api;

