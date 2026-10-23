import { apiClient } from '../../../shared/api/apiClient';
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

  applyRequirementSet: (tripId: string, pkgId: string) => send('put', SPECIALIST_ENDPOINTS.APPLY_REQUIREMENT_SET(tripId), { pkgId }),
  confirmDocsReady: (tripId: string) => send('post', SPECIALIST_ENDPOINTS.DOCS_READY(tripId)),
  saveInsurance: (tripId: string, body: unknown) => send('put', SPECIALIST_ENDPOINTS.INSURANCE(tripId), body),
  verifyInsurance: (tripId: string) => send('post', SPECIALIST_ENDPOINTS.VERIFY_INSURANCE(tripId)),
  recordClearance: (tripId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.CLEARANCE(tripId), body),
  reviewCustomerDoc: (tripId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.REVIEW_CUSTOMER_DOC(tripId), body),
  createDocRequest: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.DOC_REQUESTS, body),
  recordDocument: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.DOCUMENTS, body),
  reviewDocument: (docId: string, body: unknown) => send('post', SPECIALIST_ENDPOINTS.REVIEW_DOCUMENT(docId), body),
  saveBooking: (body: unknown) => send('post', SPECIALIST_ENDPOINTS.QUARANTINE_BOOKINGS, body),
  saveDocType: (body: DocType) => send('put', SPECIALIST_ENDPOINTS.DOC_TYPES, body),
  saveRegulation: (body: Regulation) => send('put', SPECIALIST_ENDPOINTS.REGULATIONS, body),
  savePackage: (body: RegPackage) => send('put', SPECIALIST_ENDPOINTS.REQUIREMENT_SETS, body),
};

export default specialistApi;
