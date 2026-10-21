import { useState, useEffect, useCallback } from 'react';
import type {
  TransportRequestItem,
  ContractItem,
  BankTransferTransaction,
  DeadlineOverdueItem,
  AlertItem,
  ManagerNotificationItem,
  ActiveTripItem,
  ManagerMetrics,
} from '../types';
import { managerApi } from '../api/managerApi';
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

export const useManager = () => {
  const [metrics, setMetrics] = useState<ManagerMetrics>(INITIAL_METRICS);
  const [requests, setRequests] = useState<TransportRequestItem[]>(INITIAL_REQUESTS);
  const [contracts, setContracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [transactions, setTransactions] = useState<BankTransferTransaction[]>(INITIAL_BANK_TRANSACTIONS);
  const [overdueList, setOverdueList] = useState<DeadlineOverdueItem[]>(INITIAL_DEADLINE_OVERDUE);
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [notifications, setNotifications] = useState<ManagerNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTrips, setActiveTrips] = useState<ActiveTripItem[]>(INITIAL_ACTIVE_TRIPS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, c, t, a, n, tr] = await Promise.all([
        managerApi.getMetrics(),
        managerApi.getRequests(),
        managerApi.getContracts(),
        managerApi.getTransactions(),
        managerApi.getAlerts(),
        managerApi.getNotifications(),
        managerApi.getActiveTrips(),
      ]);
      setMetrics(m);
      setRequests(r);
      setContracts(c);
      setTransactions(t);
      setAlerts(a);
      setNotifications(n);
      setActiveTrips(tr);
    } catch (err) {
      console.warn('Manager API error, using initial mock data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handlers
  const handleAcceptRequest = useCallback((requestId: string, note?: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'ACCEPTED', statusLabel: 'Đã chấp nhận – Đang soạn hợp đồng' }
          : r
      )
    );
    managerApi.acceptRequest(requestId, note);
  }, []);

  const handleRequestRevision = useCallback((requestId: string, reason: string, suggestionDate?: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'CHANGES_REQUESTED', statusLabel: 'Yêu cầu điều chỉnh' }
          : r
      )
    );
    managerApi.requestRevision(requestId, reason, suggestionDate);
  }, []);

  const handleRejectRequest = useCallback((requestId: string, reasonGroup: string, reason: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: 'REJECTED', statusLabel: 'Từ chối tiếp nhận' } : r
      )
    );
    managerApi.rejectRequest(requestId, reasonGroup, reason);
  }, []);

  const handleSaveContract = useCallback((contract: ContractItem) => {
    setContracts((prev) => prev.map((c) => (c.id === contract.id ? contract : c)));
    managerApi.saveContract(contract);
  }, []);

  const handleSendContract = useCallback((contractId: string) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? { ...c, status: 'PENDING_SIGNATURE', statusLabel: 'Chờ khách hàng ký' }
          : c
      )
    );
    managerApi.sendContract(contractId);
  }, []);

  const handleConfirmTransaction = useCallback((transactionId: string, confirmedAmount: number) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.transactionId === transactionId
          ? { ...t, status: 'SUCCESS', confirmedAmount, confirmedAt: new Date().toISOString() }
          : t
      )
    );
    managerApi.confirmTransaction(transactionId, confirmedAmount);
  }, []);

  const handleRejectTransaction = useCallback((transactionId: string, reason: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.transactionId === transactionId
          ? { ...t, status: 'REJECTED', rejectReason: reason }
          : t
      )
    );
    managerApi.rejectTransaction(transactionId, reason);
  }, []);

  const handleExtendDeadline = useCallback((requestId: string, newDeadline: string) => {
    setOverdueList((prev) => prev.filter((o) => o.requestId !== requestId));
    managerApi.extendDeadline(requestId, newDeadline);
  }, []);

  const handleCancelOverdue = useCallback((requestId: string, reason: string) => {
    setOverdueList((prev) => prev.filter((o) => o.requestId !== requestId));
    managerApi.cancelOverdue(requestId, reason);
  }, []);

  return {
    metrics,
    requests,
    contracts,
    transactions,
    overdueList,
    alerts,
    notifications,
    activeTrips,
    loading,
    handleAcceptRequest,
    handleRequestRevision,
    handleRejectRequest,
    handleSaveContract,
    handleSendContract,
    handleConfirmTransaction,
    handleRejectTransaction,
    handleExtendDeadline,
    handleCancelOverdue,
  };
};

export default useManager;
