import { useMemo, useState } from 'react';

/**
 * Bộ lọc dùng chung: ô tìm kiếm + nhiều bộ lọc chọn + phân trang.
 * filters: { key: (row, value) => boolean } – giá trị '' nghĩa là không lọc.
 * initial: giá trị lọc ban đầu (ví dụ lấy từ query ?status=...).
 */
export function useManagerFilter<T>(
  rows: T[],
  text: (row: T) => string,
  filters: Record<string, (row: T, value: string) => boolean> = {},
  pageSize = 10,
  initial: Record<string, string> = {},
) {
  const [search, setSearchRaw] = useState('');
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!q || text(r).toLowerCase().includes(q))
      && Object.entries(values).every(([k, v]) => !v || !filters[k] || filters[k](r, v)));
    // filters/text là hàm thuần do trang truyền vào
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, values]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  return {
    search,
    setSearch: (v: string) => { setSearchRaw(v); setPage(1); },
    value: (k: string) => values[k] ?? '',
    setValue: (k: string, v: string) => { setValues((x) => ({ ...x, [k]: v })); setPage(1); },
    rows: filtered.slice((current - 1) * pageSize, current * pageSize),
    total: filtered.length,
    page: current,
    pageCount,
    setPage,
  };
}

export default useManagerFilter;
