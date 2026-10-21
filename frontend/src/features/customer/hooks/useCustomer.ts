import { useEffect, useSyncExternalStore } from 'react';
import { isAxiosError } from 'axios';
import { apiClient } from '../../../shared/api/apiClient';
import { CUSTOMER_ENDPOINTS } from '../api/customerEndpoints';
import { mockCurrentTrip, mockCustomerNotifications, mockRecentRequests, mockIncidentDetail } from '../data/mockData';
import type { CurrentTrip, CustomerNotification, RecentRequest, IncidentDetail } from '../types';

interface CustomerState {
  currentTrip: CurrentTrip | null;
  recentRequests: RecentRequest[];
  notifications: CustomerNotification[];
  incidentDetail: IncidentDetail | null;
  loading: boolean;
  error: string | null;
}

// Explicitly labelled sample data in dev. Set VITE_CUSTOMER_DEMO=false to call the API.
const demoMode = import.meta.env.VITE_CUSTOMER_DEMO === 'true'
  || (import.meta.env.DEV && import.meta.env.VITE_CUSTOMER_DEMO !== 'false');

function createCustomerStore() {
  let state: CustomerState = { currentTrip: null, recentRequests: [], notifications: [], incidentDetail: null, loading: true, error: null };
  let initialized = false;
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const readIds = new Set<string>();
  const pendingReads = new Map<string, Promise<boolean>>();
  const emit = (changes: Partial<CustomerState>) => {
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
  };
  const snapshot = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  async function nullableResource<T>(url: string): Promise<T | null> {
    try {
      const response = await apiClient.get<T | null>(url);
      return response.status === 204 ? null : response.data;
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    }
  }

  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight;
    emit({ loading: true, error: null });
    inFlight = (async () => {
      try {
        let currentTrip: CurrentTrip | null;
        let recentRequests: RecentRequest[];
        let notifications: CustomerNotification[];
        let incidentDetail: IncidentDetail | null;
        if (demoMode) {
          currentTrip = structuredClone(mockCurrentTrip);
          recentRequests = structuredClone(mockRecentRequests);
          notifications = structuredClone(mockCustomerNotifications);
          incidentDetail = state.incidentDetail?.status === 'resolved'
            ? state.incidentDetail : structuredClone(mockIncidentDetail);
          // Allow all mounted consumers to share the same in-flight load.
          await Promise.resolve();
        } else {
          [currentTrip, recentRequests, notifications, incidentDetail] = await Promise.all([
            nullableResource<CurrentTrip>(CUSTOMER_ENDPOINTS.CURRENT_TRIP),
            apiClient.get<RecentRequest[]>(CUSTOMER_ENDPOINTS.RECENT_REQUESTS).then(r => r.data),
            apiClient.get<CustomerNotification[]>(CUSTOMER_ENDPOINTS.NOTIFICATIONS).then(r => r.data),
            nullableResource<IncidentDetail>(CUSTOMER_ENDPOINTS.INCIDENT_FLOW5('INC-FLOW5-001')),
          ]);
          if (!Array.isArray(recentRequests) || !Array.isArray(notifications)
            || (currentTrip !== null && (!currentTrip || typeof currentTrip.id !== 'string'))
            || (incidentDetail !== null && (!incidentDetail || typeof incidentDetail.incidentId !== 'string'))) {
            throw new Error('Định dạng dữ liệu Customer API không hợp lệ.');
          }
        }
        // A late response must not undo a read made while refresh was running.
        emit({
          currentTrip, recentRequests, notifications: notifications.map(n =>
            readIds.has(n.id) ? { ...n, read: true } : n), incidentDetail
        });
      } catch {
        emit({ error: 'Không tải được dữ liệu khách hàng. Vui lòng thử lại.' });
      } finally {
        initialized = true;
        inFlight = null;
        emit({ loading: false });
      }
    })();
    return inFlight;
  };

  const markNotificationAsRead = (id: string): Promise<boolean> => {
    if (pendingReads.has(id)) return pendingReads.get(id)!;
    const notification = state.notifications.find(n => n.id === id);
    if (!notification || notification.read) return Promise.resolve(true);
    readIds.add(id);
    emit({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) });
    const request = (async () => {
      try {
        if (!demoMode) await apiClient.post(CUSTOMER_ENDPOINTS.MARK_NOTIFICATION_READ(id));
        else await Promise.resolve();
        return true;
      } catch {
        readIds.delete(id);
        emit({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: false } : n) });
        return false;
      } finally { pendingReads.delete(id); }
    })();
    pendingReads.set(id, request);
    return request;
  };

  const markAllAsRead = async () => {
    const results = await Promise.all(state.notifications.filter(n => !n.read).map(n => markNotificationAsRead(n.id)));
    return results.every(Boolean);
  };

  const handleResolveIncident = async (action: string) => {
    const incident = state.incidentDetail;
    if (!incident || incident.status !== 'pending') throw new Error('Không có sự cố đang chờ phản hồi.');
    if (!['quarantine_24h', 'return_stable', 'contact_manager'].includes(action)) throw new Error('Lựa chọn không hợp lệ.');
    if (!demoMode) {
      const response = await apiClient.post<{ success: boolean; message?: string }>(CUSTOMER_ENDPOINTS.RESOLVE_INCIDENT(incident.incidentId), { action });
      if (!response.data.success) throw new Error(response.data.message || 'Chưa gửi được phản hồi.');
    }
    // Sending a customer response does not close an operational incident.
    emit({
      incidentDetail: state.incidentDetail,
      notifications: [{
        id: crypto.randomUUID(), title: 'Đã gửi phản hồi sự cố',
        body: `Phản hồi của bạn cho ${incident.incidentId} đã được ghi nhận${demoMode ? ' (mô phỏng)' : ''}.`,
        time: 'Vừa xong', read: false, type: 'info'
      }, ...state.notifications]
    });
  };

  return {
    snapshot, subscribe, refresh, markNotificationAsRead, markAllAsRead, handleResolveIncident,
    ensureLoaded: () => { if (!initialized) void refresh(); }
  };
}

// Shared between Home and Layout; segregated when the signed-in session changes.
const stores = new Map<string, ReturnType<typeof createCustomerStore>>();
function sessionStore() {
  const key = localStorage.getItem('accessToken') || `demo:${localStorage.getItem('userFullName') || 'guest'}`;
  let store = stores.get(key);
  if (!store) { store = createCustomerStore(); stores.set(key, store); }
  return store;
}

export const useCustomer = () => {
  const store = sessionStore();
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => { store.ensureLoaded(); }, [store]);
  return {
    ...state, demoMode,
    unreadCount: state.notifications.filter(n => !n.read).length,
    refresh: store.refresh, markNotificationAsRead: store.markNotificationAsRead,
    markAllAsRead: store.markAllAsRead, handleResolveIncident: store.handleResolveIncident
  };
};

export default useCustomer;
