import { useMemo, useState } from 'react';
import type { TransportMode, Trip, TripStatus } from '../types';

export type TripStatusFilter = 'all' | TripStatus | 'NEEDS_ACTION';

/** Search + filter + phân trang cho danh sách chuyến */
export const useCoordinatorFilter = (trips: Trip[], pageSize = 8, needsAction?: (t: Trip) => boolean) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<'all' | TransportMode>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return trips.filter((t) => {
      const matchSearch = !q || [t.id, t.requestId, t.customer, t.origin, t.destination].some((x) => x.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'NEEDS_ACTION' ? !!needsAction?.(t) : t.status === statusFilter);
      const matchMode = modeFilter === 'all' || t.mode === modeFilter;
      return matchSearch && matchStatus && matchMode;
    });
  }, [trips, searchTerm, statusFilter, modeFilter, needsAction]);

  // về trang 1 khi đổi điều kiện lọc
  const [prevFilters, setPrevFilters] = useState({ searchTerm, statusFilter, modeFilter });
  if (
    prevFilters.searchTerm !== searchTerm ||
    prevFilters.statusFilter !== statusFilter ||
    prevFilters.modeFilter !== modeFilter
  ) {
    setPrevFilters({ searchTerm, statusFilter, modeFilter });
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const paginated = filtered.slice((current - 1) * pageSize, current * pageSize);

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    modeFilter, setModeFilter,
    page: current, setPage, totalPages,
    filtered, paginated,
  };
};

export default useCoordinatorFilter;
