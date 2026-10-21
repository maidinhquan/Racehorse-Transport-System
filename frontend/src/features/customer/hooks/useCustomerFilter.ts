import { useMemo, useState } from 'react';
import type { Horse, RequestStatus, TransportRequest } from '../types';

export type RequestStatusFilter = RequestStatus | '' | 'NEEDS_ACTION';

/**
 * Tìm kiếm + lọc trạng thái + lọc năm + phân trang cho danh sách yêu cầu (trang Yêu cầu và Lịch sử).
 * Tìm theo mã yêu cầu, thành phố và tên ngựa.
 */
export function useCustomerFilter(
  requests: TransportRequest[],
  horses: Horse[],
  pageSize = 8,
  needsAction?: (r: TransportRequest) => boolean,
  initialStatus: RequestStatusFilter = '',
) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RequestStatusFilter>(initialStatus);
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);

  const years = useMemo(() => [...new Set(requests.map((r) => r.date.slice(0, 4)))].sort().reverse(), [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const horseName = (id: string) => horses.find((h) => h.id === id)?.name ?? '';
    return requests.filter((r) =>
      (!status || (status === 'NEEDS_ACTION' ? !!needsAction?.(r) : r.status === status))
      && (!year || r.date.startsWith(year))
      && [r.id, r.origin, r.destination, ...r.horses.map(horseName)].join(' ').toLowerCase().includes(q));
  }, [requests, horses, search, status, year, needsAction]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return {
    search, setSearch: (v: string) => { setSearch(v); setPage(1); },
    status, setStatus: (v: RequestStatusFilter) => { setStatus(v); setPage(1); },
    year, setYear: (v: string) => { setYear(v); setPage(1); },
    years, rows, total: filtered.length, page: current, pageCount, setPage,
  };
}

/** Lọc danh sách Ngựa của tôi */
export function useHorseFilter(horses: Horse[], usedIds: Set<string>) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'notSubmitted'>('all');
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return horses.filter((h) =>
      (filter === 'all' || (filter === 'submitted' ? usedIds.has(h.id) : !usedIds.has(h.id)))
      && [h.name, h.id, h.breed, h.microchip].join(' ').toLowerCase().includes(q));
  }, [horses, usedIds, search, filter]);
  return { search, setSearch, filter, setFilter, rows };
}

export default useCustomerFilter;
