import { apiClient } from '../../../shared/api/apiClient';
import { CUSTOMER_ENDPOINTS } from './customerEndpoints';
import type {
  CurrentTrip,
  CustomerNotification,
  RecentRequest,
  TransportRequestItem,
  DemoScenario,
  IncidentDetail,
  CustomerHorse
} from '../types';
import {
  mockCurrentTrip,
  mockCustomerNotifications,
  mockRecentRequests,
  mockTransportRequests,
  mockDemoScenarios,
  mockIncidentDetail,
  mockCustomerHorses
} from '../data/mockData';

export const customerApi = {
  /**
   * Lấy thông tin chuyến đi đang diễn ra
   */
  async getCurrentTrip(): Promise<CurrentTrip> {
    try {
      const response = await apiClient.get<CurrentTrip>(CUSTOMER_ENDPOINTS.CURRENT_TRIP);
      return response.data || mockCurrentTrip;
    } catch {
      // Fallback về mock data chuẩn thiết kế
      return mockCurrentTrip;
    }
  },

  /**
   * Lấy danh sách các yêu cầu vận chuyển gần đây (Home page)
   */
  async getRecentRequests(): Promise<RecentRequest[]> {
    try {
      const response = await apiClient.get<RecentRequest[]>(CUSTOMER_ENDPOINTS.RECENT_REQUESTS);
      return response.data || mockRecentRequests;
    } catch {
      return mockRecentRequests;
    }
  },

  /**
   * Lấy toàn bộ danh sách yêu cầu vận chuyển (Requests page)
   */
  async getTransportRequests(): Promise<TransportRequestItem[]> {
    try {
      const response = await apiClient.get<TransportRequestItem[]>(CUSTOMER_ENDPOINTS.ALL_REQUESTS);
      return response.data || mockTransportRequests;
    } catch {
      return mockTransportRequests;
    }
  },

  /**
   * Lấy danh sách hồ sơ ngựa cá nhân của khách hàng
   */
  async getCustomerHorses(): Promise<CustomerHorse[]> {
    try {
      const response = await apiClient.get<CustomerHorse[]>(CUSTOMER_ENDPOINTS.HORSES);
      return response.data || mockCustomerHorses;
    } catch {
      return mockCustomerHorses;
    }
  },

  /**
   * Lấy các kịch bản demo mẫu
   */
  async getDemoScenarios(): Promise<DemoScenario[]> {
    try {
      const response = await apiClient.get<DemoScenario[]>(CUSTOMER_ENDPOINTS.DEMO_SCENARIOS);
      return response.data || mockDemoScenarios;
    } catch {
      return mockDemoScenarios;
    }
  },

  /**
   * Lấy danh sách thông báo của khách hàng
   */
  async getNotifications(): Promise<CustomerNotification[]> {
    try {
      const response = await apiClient.get<CustomerNotification[]>(CUSTOMER_ENDPOINTS.NOTIFICATIONS);
      return response.data || mockCustomerNotifications;
    } catch {
      return mockCustomerNotifications;
    }
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.post(CUSTOMER_ENDPOINTS.MARK_NOTIFICATION_READ(id));
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Lấy thông tin chi tiết sự cố kiểm dịch Flow 5
   */
  async getIncidentDetail(incidentId: string = 'INC-FLOW5-001'): Promise<IncidentDetail> {
    try {
      const response = await apiClient.get<IncidentDetail>(CUSTOMER_ENDPOINTS.INCIDENT_FLOW5(incidentId));
      return response.data || mockIncidentDetail;
    } catch {
      return mockIncidentDetail;
    }
  },

  /**
   * Xử lý giải quyết sự cố kiểm dịch (Flow 5)
   */
  async resolveIncident(incidentId: string, action: string, notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(CUSTOMER_ENDPOINTS.RESOLVE_INCIDENT(incidentId), {
        action,
        notes
      });
      return response.data;
    } catch {
      return {
        success: true,
        message: 'Xác nhận xử lý sự cố thành công (Chế độ mô phỏng Flow 5).'
      };
    }
  }
};
