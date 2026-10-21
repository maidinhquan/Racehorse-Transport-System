import { apiClient } from '../../../shared/api/apiClient';
import { MANAGER_ENDPOINTS } from './managerEndpoints';
import type {
  ManagerMetrics,
  TransportRequestItem,
  ContractItem,
  BankTransferTransaction,
  DeadlineOverdueItem,
  AlertItem,
  ManagerNotificationItem,
  ActiveTripItem,
} from '../types';
import {
  INITIAL_METRICS,
  INITIAL_REQUESTS,
  INITIAL_CONTRACTS,
  INITIAL_BANK_TRANSACTIONS,
  INITIAL_DEADLINE_OVERDUE,
  INITIAL_ALERTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVE_TRIPS,
} from '../data/mockData';

export const managerApi = {
  /**
   * Lấy tổng quan các chỉ số KPI
   */
  async getMetrics(): Promise<ManagerMetrics> {
    try {
      const res = await apiClient.get<ManagerMetrics>(MANAGER_ENDPOINTS.METRICS);
      return res.data || INITIAL_METRICS;
    } catch {
      return INITIAL_METRICS;
    }
  },

  /**
   * Lấy danh sách các yêu cầu vận chuyển
   */
  async getRequests(): Promise<TransportRequestItem[]> {
    try {
      const res = await apiClient.get<TransportRequestItem[]>(MANAGER_ENDPOINTS.REQUESTS);
      return res.data || INITIAL_REQUESTS;
    } catch {
      return INITIAL_REQUESTS;
    }
  },

  /**
   * Chấp nhận yêu cầu (F01-M02)
   */
  async acceptRequest(requestId: string, note?: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.ACCEPT_REQUEST(requestId), { note });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Yêu cầu khách hàng điều chỉnh thông tin (F01-M04)
   */
  async requestRevision(requestId: string, reason: string, suggestionDate?: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.REQUEST_REVISION(requestId), { reason, suggestionDate });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Từ chối yêu cầu (F01-M03)
   */
  async rejectRequest(requestId: string, reasonGroup: string, reason: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.REJECT_REQUEST(requestId), { reasonGroup, reason });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Lấy danh sách hợp đồng
   */
  async getContracts(): Promise<ContractItem[]> {
    try {
      const res = await apiClient.get<ContractItem[]>(MANAGER_ENDPOINTS.CONTRACTS);
      return res.data || INITIAL_CONTRACTS;
    } catch {
      return INITIAL_CONTRACTS;
    }
  },

  /**
   * Lưu hợp đồng (F02-M01)
   */
  async saveContract(contract: ContractItem): Promise<boolean> {
    try {
      await apiClient.put(MANAGER_ENDPOINTS.SAVE_CONTRACT(contract.id), contract);
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Phát hành hợp đồng sang cho khách hàng ký (F02-M03)
   */
  async sendContract(contractId: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.SEND_CONTRACT(contractId));
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Lấy danh sách giao dịch đặt cọc & thanh toán (F03-M01)
   */
  async getTransactions(): Promise<BankTransferTransaction[]> {
    try {
      const res = await apiClient.get<BankTransferTransaction[]>(MANAGER_ENDPOINTS.PAYMENTS);
      return res.data || INITIAL_BANK_TRANSACTIONS;
    } catch {
      return INITIAL_BANK_TRANSACTIONS;
    }
  },

  /**
   * Lấy danh sách quá hạn thanh toán
   */
  async getOverdueList(): Promise<DeadlineOverdueItem[]> {
    try {
      const res = await apiClient.get<DeadlineOverdueItem[]>('/manager/overdue');
      return res.data || INITIAL_DEADLINE_OVERDUE;
    } catch {
      return INITIAL_DEADLINE_OVERDUE;
    }
  },

  /**
   * Xác nhận giao dịch thanh toán hợp lệ (F03-M02)
   */
  async confirmTransaction(transactionId: string, confirmedAmount: number): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.CONFIRM_PAYMENT(transactionId), { confirmedAmount });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Từ chối giao dịch thanh toán (F03-M03)
   */
  async rejectTransaction(transactionId: string, reason: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.REJECT_PAYMENT(transactionId), { reason });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Gia hạn thời hạn nộp cọc / hợp đồng (F03-M04)
   */
  async extendDeadline(requestId: string, newDeadline: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.EXTEND_DEADLINE(requestId), { newDeadline });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Hủy đơn quá hạn cọc (F03-M05)
   */
  async cancelOverdue(requestId: string, reason: string): Promise<boolean> {
    try {
      await apiClient.post(MANAGER_ENDPOINTS.CANCEL_OVERDUE(requestId), { reason });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Lấy danh sách cảnh báo
   */
  async getAlerts(): Promise<AlertItem[]> {
    try {
      const res = await apiClient.get<AlertItem[]>(MANAGER_ENDPOINTS.ALERTS);
      return res.data || INITIAL_ALERTS;
    } catch {
      return INITIAL_ALERTS;
    }
  },

  /**
   * Lấy danh sách thông báo
   */
  async getNotifications(): Promise<ManagerNotificationItem[]> {
    try {
      const res = await apiClient.get<ManagerNotificationItem[]>(MANAGER_ENDPOINTS.NOTIFICATIONS);
      return res.data || INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markNotificationRead(id: string): Promise<boolean> {
    try {
      await apiClient.put(MANAGER_ENDPOINTS.MARK_NOTIFICATION_READ(id));
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Lấy danh sách chuyến đang chạy
   */
  async getActiveTrips(): Promise<ActiveTripItem[]> {
    try {
      const res = await apiClient.get<ActiveTripItem[]>(MANAGER_ENDPOINTS.ACTIVE_TRIPS);
      return res.data || INITIAL_ACTIVE_TRIPS;
    } catch {
      return INITIAL_ACTIVE_TRIPS;
    }
  },
};
