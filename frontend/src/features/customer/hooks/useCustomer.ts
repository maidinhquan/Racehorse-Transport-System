import { useState, useEffect, useCallback } from 'react';
import type { CurrentTrip, CustomerNotification, RecentRequest, IncidentDetail } from '../types';
import { customerApi } from '../api/customerApi';
import { mockCurrentTrip, mockCustomerNotifications, mockRecentRequests, mockIncidentDetail } from '../data/mockData';

export const useCustomer = () => {
  const [currentTrip, setCurrentTrip] = useState<CurrentTrip>(mockCurrentTrip);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>(mockRecentRequests);
  const [notifications, setNotifications] = useState<CustomerNotification[]>(mockCustomerNotifications);
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetail>(mockIncidentDetail);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tripRes, requestsRes, notifsRes, incRes] = await Promise.all([
        customerApi.getCurrentTrip(),
        customerApi.getRecentRequests(),
        customerApi.getNotifications(),
        customerApi.getIncidentDetail(),
      ]);

      setCurrentTrip(tripRes);
      setRecentRequests(requestsRes);
      setNotifications(notifsRes);
      setIncidentDetail(incRes);
    } catch (err: unknown) {
      console.warn('API error, falling back to mock data:', err);
      // Fallback guarantees UI always renders smoothly
      setCurrentTrip(mockCurrentTrip);
      setRecentRequests(mockRecentRequests);
      setNotifications(mockCustomerNotifications);
      setIncidentDetail(mockIncidentDetail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await customerApi.markNotificationAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleResolveIncident = useCallback(async (action: string) => {
    await customerApi.resolveIncident(incidentDetail.incidentId, action);
    // Add resolution notification
    const newNotif: CustomerNotification = {
      id: `notif-resolved-${Date.now()}`,
      title: '• Đã xác nhận phương án xử lý sự cố kiểm dịch (Flow 5)',
      body: `Hệ thống đã ghi nhận phương án: ${action === 'quarantine_24h' ? 'Lưu trú cách ly 24h & điều trị' : action === 'return_stable' ? 'Hủy và quay về cơ sở ban đầu' : 'Liên hệ quản lý'}.`,
      time: 'Vừa xong',
      read: false,
      type: 'info'
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, [incidentDetail.incidentId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    currentTrip,
    recentRequests,
    notifications,
    incidentDetail,
    unreadCount,
    loading,
    error,
    refresh: fetchData,
    markNotificationAsRead,
    markAllAsRead,
    handleResolveIncident
  };
};

export default useCustomer;
