import { useState, useMemo } from 'react';
import type { TransportRequestItem, AlertItem } from '../types';

export const useManagerFilter = (requests: TransportRequestItem[], alerts?: AlertItem[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.routeDisplay.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchRoute = routeFilter === 'ALL' || r.routeDisplay.includes(routeFilter);

      return matchSearch && matchStatus && matchRoute;
    });
  }, [requests, searchTerm, statusFilter, routeFilter]);

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    if (!searchTerm.trim()) return alerts;
    const term = searchTerm.toLowerCase();
    return alerts.filter(
      (a) => a.title.toLowerCase().includes(term) || a.subtitle.toLowerCase().includes(term)
    );
  }, [alerts, searchTerm]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    routeFilter,
    setRouteFilter,
    page,
    setPage,
    pageSize,
    totalPages,
    filteredRequests,
    paginatedRequests,
    filteredAlerts,
  };
};

export default useManagerFilter;
