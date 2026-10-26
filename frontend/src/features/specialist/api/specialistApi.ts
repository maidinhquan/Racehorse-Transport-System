import { apiClient } from '../../../shared/api/apiClient';
import { flow3Api, type ReadyConfirmInput, type SubmitFeasibilityRequest } from '../../../shared/api/flow3Api';
import {
  flow2Api,
  type CompanyDocumentVersionInput,
  type PhysicalCopyInput,
  type QuarantineBookingConfirmInput,
} from '../../../shared/api/flow2Api';
import { SPECIALIST_ENDPOINTS } from './specialistEndpoints';
import type {
  ApiResponse,
  AuditEntry,
  CustomerDoc,
  DocRequest,
  DocType,
  QuarantineBooking,
  RegPackage,
  Regulation,
  SpecTrip,
  TripDocument,
} from '../types';
import {
  mockAudit,
  mockBookings,
  mockCustomerDocs,
  mockDocTypes,
  mockDocuments,
  mockPackages,
  mockRegulations,
  mockRequests,
  mockTrips,
} from '../data/mockData';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

/** POST/PUT: true nếu Backend nhận; false khi đang chạy mock (giao diện vẫn cập nhật cục bộ) */
async function send(method: 'post' | 'put', url: string, body?: unknown): Promise<boolean> {
  try {
    const res = method === 'post'
      ? await apiClient.post<ApiResponse<unknown>>(url, body)
      : await apiClient.put<ApiResponse<unknown>>(url, body);
    return res.data?.success !== false;
  } catch {
    return false;
  }
}

export const specialistApi = {
  getTrips: () => getOr<SpecTrip[]>(SPECIALIST_ENDPOINTS.TRIPS, mockTrips),
  getCustomerDocs: () => getOr<CustomerDoc[]>(SPECIALIST_ENDPOINTS.CUSTOMER_DOCS, mockCustomerDocs),
  getDocuments: () => getOr<TripDocument[]>(SPECIALIST_ENDPOINTS.DOCUMENTS, mockDocuments),
  getRequests: () => getOr<DocRequest[]>(SPECIALIST_ENDPOINTS.DOC_REQUESTS, mockRequests),
  getBookings: () => getOr<QuarantineBooking[]>(SPECIALIST_ENDPOINTS.QUARANTINE_BOOKINGS, mockBookings),
  getDocTypes: () => getOr<DocType[]>(SPECIALIST_ENDPOINTS.DOC_TYPES, mockDocTypes),
  getRegulations: () => getOr<Regulation[]>(SPECIALIST_ENDPOINTS.REGULATIONS, mockRegulations),
  getPackages: () => getOr<RegPackage[]>(SPECIALIST_ENDPOINTS.REQUIREMENT_SETS, mockPackages),
  getAudit: () => getOr<AuditEntry[]>(SPECIALIST_ENDPOINTS.AUDIT, mockAudit),

  // ----- FLOW 3: Khả thi & Docs READY -----
  /** F3-J02: Lấy thông tin ngữ cảnh giao việc và kiểm tra yêu cầu */
  getPlanningContext: (tripId: string) => flow3Api.getSpecialistPlanningContext(tripId),

  /** F3-J03: Đánh giá và công bố tính khả thi */
  submitFeasibility: (tripId: string, body: SubmitFeasibilityRequest) =>
    flow3Api.submitFeasibility(tripId, body),

  /** F3-J16: Xác nhận toàn bộ hồ sơ sẵn sàng (Docs READY) */
  confirmDocsReady: (tripId: string, body?: Partial<ReadyConfirmInput>) => {
    const payload: ReadyConfirmInput = {
      planVersion: body?.planVersion ?? 1,
      feasibilityVersion: body?.feasibilityVersion ?? 1,
      notes: body?.notes ?? 'Hồ sơ đã sẵn sàng',
      ...body,
    };
    return flow3Api.confirmDocsReady(tripId, payload);
  },

  // ----- FLOW 2: Bộ yêu cầu & Checklist -----
  /** F2-J12: Checklist hồ sơ tự động */
  getChecklist: (tripId: string) => flow2Api.getChecklist(tripId),

  /** F2-J13: Xem trước tác động khi thay đổi bộ yêu cầu */
  previewRequirementSet: (tripId: string, pkgId: string) =>
    flow2Api.previewRequirementSet(tripId, pkgId),

  applyRequirementSet: (tripId: string, pkgId: string) =>
    send('put', SPECIALIST_ENDPOINTS.APPLY_REQUIREMENT_SET(tripId), { pkgId }),

  // ----- FLOW 2: Khách nộp & Yêu cầu bổ sung -----
  reviewCustomerDoc: (tripId: string, body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.REVIEW_CUSTOMER_DOC(tripId), body),
  createDocRequest: (body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.DOC_REQUESTS, body),
  fulfillDocRequest: (supplementRef: string, note?: string) =>
    flow2Api.fulfillDocRequest(supplementRef, note),

  // ----- FLOW 2: Tài liệu công ty & Bản gốc -----
  recordDocument: (body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.DOCUMENTS, body),
  createDocumentVersion: (docRef: string, body: CompanyDocumentVersionInput) =>
    flow2Api.createDocumentVersion(docRef, body),
  reviewDocument: (docId: string, body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.REVIEW_DOCUMENT(docId), body),
  updatePhysicalCopy: (docRef: string, body: PhysicalCopyInput) =>
    flow2Api.updatePhysicalCopy(docRef, body),

  // ----- FLOW 2: Bảo hiểm & Kiểm dịch & Thông quan -----
  saveInsurance: (tripId: string, body: unknown) =>
    send('put', SPECIALIST_ENDPOINTS.INSURANCE(tripId), body),
  verifyInsurance: (tripId: string) =>
    send('post', SPECIALIST_ENDPOINTS.VERIFY_INSURANCE(tripId)),
  recordClearance: (tripId: string, body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.CLEARANCE(tripId), body),
  saveBooking: (body: unknown) =>
    send('post', SPECIALIST_ENDPOINTS.QUARANTINE_BOOKINGS, body),
  confirmQuarantineBooking: (bookingId: string, body: QuarantineBookingConfirmInput) =>
    flow2Api.confirmQuarantineBooking(bookingId, body),

  // ----- Danh mục thiết lập -----
  saveDocType: (body: DocType) => send('put', SPECIALIST_ENDPOINTS.DOC_TYPES, body),
  saveRegulation: (body: Regulation) => send('put', SPECIALIST_ENDPOINTS.REGULATIONS, body),
  savePackage: (body: RegPackage) => send('put', SPECIALIST_ENDPOINTS.REQUIREMENT_SETS, body),
};

export default specialistApi;

