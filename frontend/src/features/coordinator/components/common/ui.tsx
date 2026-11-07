// ============================================================================
// Thành phần giao diện dùng chung (đánh dấu giống bản HTML demo để dùng chung CSS)
// ============================================================================
import type { CSSProperties, ReactNode } from 'react';
import React,{ createContext,useContext } from 'react';
import type { Any, FormApi } from '../../store/coordinatorStore';
import { commit, go, ui } from '../../store/coordinatorStore';
import { pillClass, pillLabel, shortCity } from '../../utils/format';
import { SPRITE } from './sprite';

/* eslint-disable react-refresh/only-export-components */

// ---------- biểu tượng ----------
export const IconSprite = () => <svg style={{ display: 'none' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPRITE }} />;
export const Icon = ({ name, className = 'i' }: { name: string; className?: string }) => (
  <svg className={className}><use href={`#cbn-i-${name}`} /></svg>
);

// ---------- nhãn trạng thái ----------
export const Pill = ({ v, label }: { v: string; label?: ReactNode }) => (
  <span className={`pill ${pillClass(v)}`}>{label ?? pillLabel(v)}</span>
);
export const PillT = ({ p }: { p: [string, string?] }) => <Pill v={p[0]} label={p[1]} />;

// ---------- ô thông tin ----------
export const Cell = ({ label, children, cls = 'sm' }: { label: ReactNode; children?: ReactNode; cls?: string }) => (
  <div><div className="label">{label}</div><div className={`value ${cls}`}>{children === undefined || children === null || children === '' ? '—' : children}</div></div>
);
export const Empty = ({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) => (
  <div className="empty-state"><b>{title}</b>{text}{action ? <div style={{ marginTop: 14 }}>{action}</div> : null}</div>
);
export const RouteText = ({ r }: { r: Any }) => (
  <>{shortCity(r.origin)} <span className="arrow">→</span> {shortCity(r.destination)}</>
);
export const RouteCell = ({ r }: { r: Any }) => <span style={{ whiteSpace: 'nowrap' }}><RouteText r={r} /></span>;
export const Note = ({ tone, icon, title, children, style }: { tone: string; icon?: string; title?: ReactNode; children?: ReactNode; style?: CSSProperties }) => (
  <div className={`note ${tone}`} style={style}>{icon ? <Icon name={icon} /> : null}<div>{title ? <b>{title}</b> : null}{children}</div></div>
);
/** nút điều hướng nội bộ (data-go của bản HTML) */
export const GoBtn = ({ to, className = 'btn ghost sm', children, style }: { to: string; className?: string; children: ReactNode; style?: CSSProperties }) => (
  <button type="button" className={className} style={style} onClick={() => go(to)}>{children}</button>
);

// ---------- thanh tab (tabsBar) ----------
export const tabOn = (key: string, fallback: string) => ui.tab[key] || fallback;
export function Tabs({ k, items, fallback, className = 'rtabs' }: { k: string; items: Array<[string, ReactNode, number?]>; fallback?: string; className?: string }) {
  const on = ui.tab[k] || fallback || items[0][0];
  return (
    <div className={className} role="tablist">
      {items.map(([key, label, n]) => (
        <button key={key} type="button" role="tab" className={key === on ? 'on' : ''} onClick={() => { ui.tab[k] = key; commit(); }}>
          {label}{n ? <small>{n}</small> : null}
        </button>
      ))}
    </div>
  );
}

// ---------- form trong hộp thoại ----------
export const FormCtx = createContext<FormApi | null>(null);
export const useForm = () => useContext(FormCtx) as FormApi;
export const Field = ({ label, hint, children, style }: { label: ReactNode; hint?: ReactNode; children: ReactNode; style?: CSSProperties }) => (
  <div className="field" style={style}><label>{label}</label>{children}{hint ? <p className="hint" style={{ marginTop: 6 }}>{hint}</p> : null}</div>
);
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange'> & { name: string };
export function Inp({ name, type = 'text', ...rest }: InputProps) {
  const f = useForm();
  return <input id={name} type={type} value={f.v[name] ?? ''} onChange={(e) => f.set(name, e.target.value)} {...rest} />;
}
export function Sel({ name, options, ...rest }: { name: string; options: Array<string | [string, ReactNode]>; disabled?: boolean; style?: CSSProperties }) {
  const f = useForm();
  return (
    <select id={name} value={f.v[name] ?? ''} onChange={(e) => f.set(name, e.target.value)} {...rest}>
      {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={String(v)} value={String(v)}>{l}</option>; })}
    </select>
  );
}
export function Txt({ name, placeholder = '' }: { name: string; placeholder?: string }) {
  const f = useForm();
  return <textarea id={name} placeholder={placeholder} value={f.v[name] ?? ''} onChange={(e) => f.set(name, e.target.value)} />;
}
export function Chk({ name, children, className = 'check-line' }: { name: string; children: ReactNode; className?: string }) {
  const f = useForm();
  return <label className={className}><input type="checkbox" id={name} checked={!!f.v[name]} onChange={(e) => f.set(name, e.target.checked)} /> {children}</label>;
}

// ---------- bảng có tìm kiếm, lọc, sắp xếp, phân trang ----------
export interface Col<T> { label: ReactNode; render: (row: T) => ReactNode; sort?: (row: T) => Any; cls?: string }
export interface TableDef<T> {
  id: string; rows: T[]; cols: Col<T>[];
  go?: (row: T) => string; search?: (row: T) => string; placeholder?: string;
  filters?: Array<{ key: string; label: string; options: Array<string | [string, string]>; test: (row: T, v: string) => boolean }>;
  title?: ReactNode; titleRight?: ReactNode; style?: CSSProperties; cls?: string; pageSize?: number;
  emptyTitle?: ReactNode; empty?: ReactNode; tools?: ReactNode; rowCls?: (row: T) => string;
}
const tstate = (id: string) => (ui.t[id] = ui.t[id] || { q: '', f: {}, sort: null, dir: 1, page: 1 });
export function DataTable<T>(def: TableDef<T>) {
  const s = tstate(def.id);
  let rows = def.rows;
  if (s.q && def.search) { const q = s.q.toLowerCase(); rows = rows.filter((r) => def.search!(r).toLowerCase().includes(q)); }
  (def.filters || []).forEach((f) => { if (s.f[f.key]) rows = rows.filter((r) => f.test(r, s.f[f.key])); });
  if (s.sort !== null && def.cols[s.sort]?.sort) {
    const key = def.cols[s.sort].sort!;
    rows = rows.slice().sort((x, y) => { const a = key(x), b = key(y); return (a > b ? 1 : a < b ? -1 : 0) * s.dir; });
  }
  const size = def.pageSize || 8, pages = Math.max(1, Math.ceil(rows.length / size));
  s.page = Math.min(s.page, pages);
  const shown = rows.slice((s.page - 1) * size, s.page * size);
  const setPage = (p: number) => { s.page = Math.max(1, p); commit(); };
  const hasTools = !!def.search || !!(def.filters && def.filters.length) || !!def.tools;
  return (
    <div className={`card table-card ${def.cls || ''}`} style={def.style}>
      {def.title ? <div className="section-title" style={{ padding: '16px 16px 4px' }}><h3 className="card-title">{def.title}</h3>{def.titleRight}</div> : null}
      {hasTools ? (
        <div className="t-tools">
          {def.search ? (
            <label className="search"><Icon name="search" />
              <input value={s.q} placeholder={def.placeholder || 'Tìm kiếm...'} onChange={(e) => { s.q = e.target.value; s.page = 1; commit(); }} />
            </label>
          ) : null}
          {(def.filters || []).map((f) => (
            <select key={f.key} aria-label={f.label} value={s.f[f.key] || ''} onChange={(e) => { s.f[f.key] = e.target.value; s.page = 1; commit(); }}>
              <option value="">{f.label}</option>
              {f.options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
            </select>
          ))}
          {def.tools}
        </div>
      ) : null}
      <div>
        {!rows.length ? (
          <Empty title={def.emptyTitle || 'Không có dữ liệu'} text={def.empty || (s.q || Object.values(s.f).some(Boolean) ? 'Không có bản ghi nào khớp tìm kiếm hoặc bộ lọc.' : '')} />
        ) : (
          <>
            <div className="table-wrap"><table>
              <thead><tr>{def.cols.map((c, i) => (
                <th key={i}>{c.sort ? (
                  <button type="button" className="t-sort" onClick={() => { s.dir = s.sort === i ? -s.dir : 1; s.sort = i; commit(); }}>
                    {c.label}{s.sort === i ? <i>{s.dir > 0 ? '▲' : '▼'}</i> : null}
                  </button>) : c.label}</th>
              ))}</tr></thead>
              <tbody>{shown.map((r, k) => (
                <tr key={k} className={`${def.go ? 'go-row' : ''} ${def.rowCls ? def.rowCls(r) : ''}`} onClick={def.go ? (e) => { if ((e.target as HTMLElement).closest('button,a,input,select')) return; go(def.go!(r)); } : undefined}>
                  {def.cols.map((c, i) => <td key={i} className={c.cls || ''}>{c.render(r)}</td>)}
                </tr>
              ))}</tbody>
            </table></div>
            <div className="t-foot"><span>{rows.length} bản ghi{pages > 1 ? ` • trang ${s.page}/${pages}` : ''}</span>
              {pages > 1 ? (
                <div className="pager">
                  <button type="button" disabled={s.page === 1} aria-label="Trang trước" onClick={() => setPage(s.page - 1)}>‹</button>
                  {Array.from({ length: pages }, (_, i) => <button type="button" key={i} className={s.page === i + 1 ? 'on' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
                  <button type="button" disabled={s.page === pages} aria-label="Trang sau" onClick={() => setPage(s.page + 1)}>›</button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
