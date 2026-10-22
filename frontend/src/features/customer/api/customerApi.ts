import { apiClient } from '../../../shared/api/apiClient';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';
import type {
  ApiResponse,
  ComplaintInput,
  ContractChangeInput,
  CustomerNotification,
  CustomerProfile,
  Horse,
  HorseInput,
  TransportRequest,
} from '../types';
import { mockHorses, mockNotifications, mockProfile, mockRequests } from '../data/mockData';

import { getDemoMode } from '../../../shared/context/DemoModeContext';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy (chỉ fallback khi demo mode BẬT) */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  const isDemo = getDemoMode('customer');
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    if (res.data?.data) return res.data.data;
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
  } catch {
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
  }
}

/**
 * POST/PUT: trả về true nếu Backend nhận, false nếu đang chạy chế độ mock.
 * Ở chế độ mock, giao diện vẫn cập nhật dữ liệu cục bộ (xem useCustomer).
 */
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

export const customerApi = {
  getProfile: () => getOr<CustomerProfile>(CUSTOMER_ENDPOINTS.PROFILE, mockProfile),
  getNotifications: () => getOr<CustomerNotification[]>(CUSTOMER_ENDPOINTS.NOTIFICATIONS, mockNotifications),

  /** Ngựa của tôi */
  getHorses: () => getOr<Horse[]>(CUSTOMER_ENDPOINTS.HORSES, mockHorses),
  createHorse: (body: HorseInput) => send('post', CUSTOMER_ENDPOINTS.HORSES, body),
  updateHorse: (horseId: string, body: HorseInput) => send('put', CUSTOMER_ENDPOINTS.HORSE_DETAIL(horseId), body),

  /** Yêu cầu vận chuyển */
  getRequests: () => getOr<TransportRequest[]>(CUSTOMER_ENDPOINTS.REQUESTS, mockRequests),
  getRequest: (requestId: string) =>
    getOr<TransportRequest | undefined>(CUSTOMER_ENDPOINTS.REQUEST_DETAIL(requestId), mockRequests.find((r) => r.id === requestId)),
  saveRequest: (request: TransportRequest) => send('put', CUSTOMER_ENDPOINTS.REQUEST_DETAIL(request.id), request),
  createRequest: (request: TransportRequest) => send('post', CUSTOMER_ENDPOINTS.REQUESTS, request),
  submitRequest: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.SUBMIT_REQUEST(requestId)),
  cancelRequest: (requestId: string, reason: string) => send('post', CUSTOMER_ENDPOINTS.CANCEL_REQUEST(requestId), { reason }),
  uploadDocument: (requestId: string, key: string, scope: string, fileName: string) =>
    send('post', CUSTOMER_ENDPOINTS.REQUEST_DOCUMENTS(requestId), { key, scope, fileName }),

  /** Hợp đồng */
  acceptTerms: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.ACCEPT_TERMS(requestId)),
  requestContractChange: (requestId: string, body: ContractChangeInput) => send('post', CUSTOMER_ENDPOINTS.CONTRACT_CHANGE(requestId), body),
  sendSignOtp: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.SEND_SIGN_OTP(requestId)),
  signContract: (requestId: string, otp: string) => send('post', CUSTOMER_ENDPOINTS.SIGN_CONTRACT(requestId), { otp }),

  /** Thanh toán */
  payDeposit: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.DEPOSIT_PAYMENT(requestId)),
  payBalance: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.BALANCE_PAYMENT(requestId)),

  /** Nghiệm thu & khiếu nại */
  confirmAcceptance: (requestId: string) => send('post', CUSTOMER_ENDPOINTS.ACCEPTANCE(requestId)),
  raiseComplaint: (requestId: string, body: ComplaintInput) => send('post', CUSTOMER_ENDPOINTS.COMPLAINTS(requestId), body),
};

export default customerApi;
