import { apiClient } from './apiClient';
import { FLOW2_ENDPOINTS as E } from './flow2Endpoints';
import type {
  ClearanceRecordInput,
  CompanyDocumentInput,
  CompanyDocumentVersionInput,
  CustomerDocRequestInput,
  CustomerDocReviewInput,
  CustomerSupplement,
  Flow2Capabilities,
  InsuranceInput,
  InsuranceVerifyResult,
  PhysicalCopyInput,
  QuarantineBookingConfirmInput,
  QuarantineBookingInput,
  RequirementSetPreview,
  TripChecklist,
} from './flow2.types';

export * from './flow2.types';
export * from './flow2Endpoints';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

/**
 * API Service cho Flow 2: Quản lý hồ sơ y tế, kiểm dịch, bảo hiểm và danh mục
 * Áp dụng cho Specialist, Coordinator, Customer
 */
export const flow2Api = {
  /** F2-J01: Khả năng Flow 2 */
  getCapabilities: async (): Promise<Flow2Capabilities | null> => {
    try {
      const res = await apiClient.get<ApiResponse<Flow2Capabilities>>(E.CAPABILITIES);
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  // ==========================================================================
  // Specialist — Checklist & Bộ yêu cầu
  // ==========================================================================

  /** F2-J12: Lấy checklist hồ sơ chuyến do backend rà soát */
  getChecklist: async (tripId: string): Promise<TripChecklist | null> => {
    try {
      const res = await apiClient.get<ApiResponse<TripChecklist>>(E.SPECIALIST_CHECKLIST(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F2-J13: Xem trước thay đổi khi áp dụng bộ yêu cầu */
  previewRequirementSet: async (tripId: string, pkgId: string): Promise<RequirementSetPreview | null> => {
    try {
      const res = await apiClient.post<ApiResponse<RequirementSetPreview>>(
        E.REQUIREMENT_SET_PREVIEW(tripId),
        { pkgId }
      );
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F2-J14: Áp dụng bộ quy định kiểm dịch / bộ yêu cầu */
  applyRequirementSet: async (tripId: string, pkgId: string): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.APPLY_REQUIREMENT_SET(tripId), { pkgId });
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  // ==========================================================================
  // Specialist — Kiểm duyệt hồ sơ khách nộp & Yêu cầu bổ sung
  // ==========================================================================

  /** F2-J03: Danh sách hồ sơ khách hàng đã nộp */
  getCustomerDocs: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.CUSTOMER_DOCS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  /** F2-J15: Duyệt hoặc từ chối hồ sơ khách nộp */
  reviewCustomerDoc: async (tripId: string, body: CustomerDocReviewInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.REVIEW_CUSTOMER_DOC(tripId), body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J18: Đọc/tải file giấy tờ khách nộp */
  getCustomerDocFileUrl: (tripId: string, scope: string, key: string): string => {
    return `${apiClient.defaults.baseURL || '/api'}${E.CUSTOMER_DOC_FILE(tripId, scope, key)}`;
  },

  /** F2-J05: Danh sách yêu cầu bổ sung giấy tờ */
  getDocRequests: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.DOC_REQUESTS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  /** F2-J16: Tạo yêu cầu bổ sung giấy tờ gửi khách hàng */
  createDocRequest: async (body: CustomerDocRequestInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.DOC_REQUESTS, body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J17: Hoàn tất / đóng yêu cầu bổ sung khi đã được đáp ứng */
  fulfillDocRequest: async (supplementRef: string, note?: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.FULFILL_DOC_REQUEST(supplementRef), { note });
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // Specialist — Chứng từ CBN Transport & Phiên bản
  // ==========================================================================

  /** F2-J04: Danh mục chứng từ CBN */
  getDocuments: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.DOCUMENTS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  /** F2-J19: Ghi nhận chứng từ CBN với file thật */
  createDocument: async (body: CompanyDocumentInput): Promise<boolean> => {
    try {
      const form = new FormData();
      form.append('tripId', body.tripId);
      form.append('docType', body.docType);
      form.append('scope', body.scope);
      if (body.horseId) form.append('horseId', body.horseId);
      form.append('title', body.title);
      if (body.docNumber) form.append('docNumber', body.docNumber);
      if (body.issuedAt) form.append('issuedAt', body.issuedAt);
      if (body.validUntil) form.append('validUntil', body.validUntil);
      form.append('file', body.file);

      const res = await apiClient.post<ApiResponse<unknown>>(E.DOCUMENTS, form, {
        headers: { 'Content-Type': undefined },
      });
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J20: Nộp bản phiên bản mới cùng chứng từ */
  createDocumentVersion: async (documentRef: string, body: CompanyDocumentVersionInput): Promise<boolean> => {
    try {
      const form = new FormData();
      form.append('versionNo', String(body.versionNo));
      form.append('reason', body.reason);
      form.append('file', body.file);

      const res = await apiClient.post<ApiResponse<unknown>>(E.DOCUMENT_VERSIONS(documentRef), form, {
        headers: { 'Content-Type': undefined },
      });
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J22: Duyệt phiên bản chứng từ */
  reviewDocument: async (
    documentRef: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.REVIEW_DOCUMENT(documentRef), {
        decision,
        reason,
      });
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  /** F2-J23: Ghi nhận kiểm tra bản cứng tại văn phòng/kho */
  updatePhysicalCopy: async (documentRef: string, body: PhysicalCopyInput): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.DOCUMENT_PHYSICAL_COPY(documentRef), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // Specialist — Bảo hiểm & Kiểm dịch & Thông quan
  // ==========================================================================

  /** F2-J24: Thiết lập thông tin bảo hiểm vận chuyển */
  saveInsurance: async (tripId: string, body: InsuranceInput): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.INSURANCE(tripId), body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J25: Xác minh hiệu lực bảo hiểm */
  verifyInsurance: async (tripId: string): Promise<InsuranceVerifyResult | null> => {
    try {
      const res = await apiClient.post<ApiResponse<InsuranceVerifyResult>>(E.VERIFY_INSURANCE(tripId));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** F2-J06: Danh sách đặt chỗ cơ sở kiểm dịch */
  getQuarantineBookings: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.QUARANTINE_BOOKINGS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  /** F2-J26: Tạo đề nghị đặt chỗ cơ sở kiểm dịch */
  createQuarantineBooking: async (body: QuarantineBookingInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.QUARANTINE_BOOKINGS, body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  /** F2-J27: Xác nhận phản hồi từ trạm kiểm dịch */
  confirmQuarantineBooking: async (bookingId: string, body: QuarantineBookingConfirmInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.CONFIRM_QUARANTINE_BOOKING(bookingId), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  /** Ghi nhận chứng thư thông quan / kiểm dịch vùng */
  recordClearance: async (tripId: string, body: ClearanceRecordInput): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.CLEARANCES(tripId), body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  // ==========================================================================
  // Specialist — Danh mục Cấu hình & Nhật ký
  // ==========================================================================

  getDocTypes: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.DOC_TYPES);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  saveDocType: async (configKey: string, body: unknown): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.DOC_TYPE_DETAIL(configKey), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  getRegulations: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.REGULATIONS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  saveRegulation: async (configKey: string, body: unknown): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.REGULATION_DETAIL(configKey), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  getRequirementSets: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.REQUIREMENT_SETS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  saveRequirementSet: async (configKey: string, body: unknown): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.REQUIREMENT_SET_DETAIL(configKey), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  getAudit: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.AUDIT);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  // ==========================================================================
  // Coordinator — Tuyến đường & Nguồn lực (Flow 2)
  // ==========================================================================

  getCheckpoints: async <T = unknown[]>(): Promise<T> => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(E.CHECKPOINTS);
      return res.data?.data ?? ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  },

  saveRouteDraft: async (tripId: string, body: unknown): Promise<boolean> => {
    try {
      const res = await apiClient.put<ApiResponse<unknown>>(E.ROUTE_DRAFT(tripId), body);
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  submitRoute: async (tripId: string, body: unknown): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.ROUTE_SUBMIT(tripId), body);
      return res.data?.success !== false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  reopenRoute: async (tripId: string, reason: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<unknown>>(E.ROUTE_REOPEN(tripId), { reason });
      return res.data?.success !== false;
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // Customer — Yêu cầu bổ sung
  // ==========================================================================

  getCustomerSupplements: async (requestId: string): Promise<CustomerSupplement[]> => {
    try {
      const res = await apiClient.get<ApiResponse<CustomerSupplement[]>>(E.CUSTOMER_SUPPLEMENTS(requestId));
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  },
};

export default flow2Api;
