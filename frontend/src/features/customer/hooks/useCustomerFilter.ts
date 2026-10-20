import { useState, useMemo } from 'react';
import type { RecentRequest } from '../types';

export const useCustomerFilter = (requests: RecentRequest[]) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchSearch =
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.horses.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        req.status === statusFilter ||
        req.statusText === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredRequests
  };
};

export default useCustomerFilter;
