import { apiClient } from '../../../shared/api/apiClient';
import { MANAGER_ENDPOINTS as E } from './managerEndpoints';
import type {
  ActualCost,
  ApiResponse,
  Complaint,
  CustomerInfo,
  HorseRef,
  Incident,
  ManagerNotification,
  Staff,
  Transaction,
  TransportRequest,
  Trip,
} from '../types';
import {
  mockActualCosts,
  mockComplaints,
  mockCustomers,
  mockHorses,
  mockIncidents,
  mockNotifications,
  mockRequests,
  mockStaff,
  mockTransactions,
  mockTrips,
} from '../data/mockData';

import { getDemoMode } from '../../../shared/context/DemoModeContext';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy (chỉ fallback khi demo mode BẬT) */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  const isDemo = getDemoMode('manager');
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    if (res.data?.data) return res.data.data;
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
  } catch {
    return isDemo ? clone(fallback) : (Array.isArray(fallback) ? [] as unknown as T : undefined as unknown as T);
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

export const managerApi = {
  // ----- Đọc dữ liệu -----
  getCustomers: () => getOr<CustomerInfo[]>(E.CUSTOMERS, mockCustomers),
  getHorses: () => getOr<HorseRef[]>(E.HORSES, mockHorses),
  getStaff: () => getOr<Staff[]>(E.STAFF, mockStaff),
  getRequests: () => getOr<TransportRequest[]>(E.REQUESTS, mockRequests),
  getTrips: () => getOr<Trip[]>(E.TRIPS, mockTrips),
  getTransactions: () => getOr<Transaction[]>(E.TRANSACTIONS, mockTransactions),
  getIncidents: () => getOr<Incident[]>(E.INCIDENTS, mockIncidents),
  getComplaints: () => getOr<Complaint[]>(E.COMPLAINTS, mockComplaints),
  getActualCosts: () => getOr<ActualCost[]>(E.ACTUAL_COST_LIST, mockActualCosts),
  getNotifications: () => getOr<ManagerNotification[]>(E.NOTIFICATIONS, mockNotifications),

  // ----- Yêu cầu -----
  acceptRequest: (id: string) => send('post', E.ACCEPT_REQUEST(id)),
  requestRevision: (id: string, body: unknown) => send('post', E.REQUEST_REVISION(id), body),
  rejectRequest: (id: string, reason: string) => send('post', E.REJECT_REQUEST(id), { reason }),
  cancelRequest: (id: string, reason: string) => send('post', E.CANCEL_REQUEST(id), { reason }),
  decideCancellation: (id: string, body: unknown) => send('post', E.CANCELLATION_DECISION(id), body),
  closeRequest: (id: string) => send('post', E.CLOSE_REQUEST(id)),
  addCollectionNote: (id: string, note: string) => send('post', E.COLLECTION_NOTE(id), { note }),

  // ----- Hợp đồng -----
  saveContractDraft: (id: string, body: unknown) => send('put', E.CONTRACT_DRAFT(id), body),
  issueContract: (id: string, body: unknown) => send('post', E.ISSUE_CONTRACT(id), body),
  respondContractChange: (id: string, body: unknown) => send('post', E.CONTRACT_CHANGE_RESPONSE(id), body),
  extendContract: (id: string) => send('post', E.EXTEND_CONTRACT(id)),
  remindSign: (id: string) => send('post', E.REMIND_SIGN(id)),

  // ----- Thanh toán -----
  verifyTransaction: (id: string) => send('post', E.VERIFY_TRANSACTION(id)),
  rejectTransaction: (id: string, reason: string) => send('post', E.REJECT_TRANSACTION(id), { reason }),
  confirmRefund: (id: string) => send('post', E.CONFIRM_REFUND(id)),

  // ----- Chuyến đi -----
  deployTrip: (id: string, body: unknown) => send('post', E.DEPLOY_TRIP(id), body),
  holdTrip: (id: string, reason: string) => send('post', E.HOLD_TRIP(id), { reason }),
  resumeTrip: (id: string) => send('post', E.RESUME_TRIP(id)),
  decideRoute: (id: string, body: unknown) => send('post', E.ROUTE_DECISION(id), body),
  decideFlight: (id: string, body: unknown) => send('post', E.FLIGHT_DECISION(id), body),
  approveDeparture: (id: string) => send('post', E.APPROVE_DEPARTURE(id)),
  resolveHandover: (id: string, body: unknown) => send('post', E.HANDOVER_RESOLUTION(id), body),
  saveActualCosts: (id: string, body: unknown) => send('put', E.ACTUAL_COSTS(id), body),

  // ----- Sự cố & khiếu nại -----
  setIncidentStatus: (id: string, status: string) => send('put', E.INCIDENT_STATUS(id), { status }),
  decidePlan: (id: string, planId: string, body: unknown) => send('post', E.PLAN_DECISION(id, planId), body),
  replyComplaint: (id: string, body: unknown) => send('post', E.COMPLAINT_REPLY(id), body),
  resolveComplaint: (id: string, body: unknown) => send('post', E.COMPLAINT_RESOLVE(id), body),
  escalateComplaint: (id: string) => send('post', E.COMPLAINT_ESCALATE(id)),
};

export default managerApi;
