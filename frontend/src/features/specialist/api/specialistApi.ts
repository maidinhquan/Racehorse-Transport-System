import { apiClient } from '../../../shared/api/core/apiClient';
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

/**
 * GET dữ liệu từ API. Khi lỗi trả về emptyFallback (mảng rỗng).
 */
async function getOr<T>(url: string, emptyFallback: T = [] as unknown as T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? emptyFallback;
  } catch {
    return emptyFallback;
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
  getTrips: async (): Promise<SpecTrip[]> => {
    try {
      const res = await apiClient.get<ApiResponse<SpecTrip[]>>(SPECIALIST_ENDPOINTS.TRIPS);
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
    } catch {
      // Thử tiếp endpoint bàn giao Flow 1
    }

    return [];
  },
  getCustomerDocs: () => getOr<CustomerDoc[]>(SPECIALIST_ENDPOINTS.CUSTOMER_DOCS, []),
  getDocuments: () => getOr<TripDocument[]>(SPECIALIST_ENDPOINTS.DOCUMENTS, []),
  getRequests: () => getOr<DocRequest[]>(SPECIALIST_ENDPOINTS.DOC_REQUESTS, []),
  getBookings: () => getOr<QuarantineBooking[]>(SPECIALIST_ENDPOINTS.QUARANTINE_BOOKINGS, []),
  getDocTypes: () => getOr<DocType[]>(SPECIALIST_ENDPOINTS.DOC_TYPES, []),
  getRegulations: () => getOr<Regulation[]>(SPECIALIST_ENDPOINTS.REGULATIONS, []),
  getPackages: () => getOr<RegPackage[]>(SPECIALIST_ENDPOINTS.REQUIREMENT_SETS, []),
  getAudit: () => getOr<AuditEntry[]>(SPECIALIST_ENDPOINTS.AUDIT, []),

  applyRequirementSet: (tripId: string, pkgId: string) => send('put', SPECIALIST_ENDPOINTS.APPLY_REQUIREMENT_SET(tripId), { pkgId }),
  confirmDocsReady: (tripId: string) => send('post', SPECIALIST_ENDPOINTS.DOCS_READY(tripId)),
  saveInsurance: (tripId: string, body: unknown) => send('put', SPECIALIST_ENDPOINTS.INSURANCE(tripId), body),
  verifyInsurance: (tripId: string) => send('post', SPECIALIST_ENDPOINTS.VERIFY_INSURANCE(tripId)),
  recordClearance: (tripId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.CLEARANCE(tripId), body),
  reviewCustomerDoc: (tripId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.REVIEW_CUSTOMER_DOC(tripId), body),
  createDocRequest: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.DOC_REQUESTS, body),
  recordDocument: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.DOCUMENTS, body),
  reviewDocument: (docId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.REVIEW_DOCUMENT(docId), body),
  setPhysicalCopy: (docId: string, collected: boolean) => send('post', SPECIALIST_ENDPOINTS.DOCUMENT_PHYSICAL_COPY(docId), { collected }),
  saveBooking: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.QUARANTINE_BOOKINGS, body),
  saveDocType: (body: DocType) => send('put', SPECIALIST_ENDPOINTS.DOC_TYPES, body),
  saveRegulation: (body: Regulation) => send('put', SPECIALIST_ENDPOINTS.REGULATIONS, body),
  savePackage: (body: RegPackage) => send('put', SPECIALIST_ENDPOINTS.REQUIREMENT_SETS, body),
};

export default specialistApi;
