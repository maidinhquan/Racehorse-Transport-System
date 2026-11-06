import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ManagerLayout';
import type { CustomerInfo, TransportRequest } from '../../types';
import { cityLabel } from '../../hooks/managerRules';

type NoteTone = 'yellow' | 'blue' | 'red' | 'grey' | 'green';

/** Ghi chú có màu */
export const Note: React.FC<{ tone: NoteTone; title: string; children?: React.ReactNode; icon?: string }> = ({ tone, title, children, icon }) => (
  <div className={`mgr-note mgr-note--${tone}`}>
    <Icon name={icon ?? (tone === 'green' ? 'check' : tone === 'red' || tone === 'yellow' ? 'alert' : 'info')} />
    <div><b>{title}</b>{children}</div>
  </div>
);

/** Thẻ khóa: chức năng chưa mở */
export const LockedCard: React.FC<{ title: string; text: string; icon?: string; children?: React.ReactNode }> = ({ title, text, icon = 'lock', children }) => (
  <div className="mgr-locked"><Icon name={icon} /><div><b>{title}</b><span>{text}</span>{children}</div></div>
);

/** Phân trang đơn giản */
export const Pager: React.FC<{ total: number; page: number; pageCount: number; setPage: (p: number) => void; unit?: string }> = ({ total, page, pageCount, setPage, unit = 'mục' }) => (
  <div className="mgr-pager">
    <span>{total} {unit}</span>
    <div>
      <button type="button" className="mgr-btn mgr-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
      <span>Trang {page}/{pageCount}</span>
      <button type="button" className="mgr-btn mgr-btn--sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Sau</button>
    </div>
  </div>
);

/** Thanh tiến độ nhỏ kèm số */
export const MiniProgress: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <span className="mgr-mini">
    <span className={`mgr-progress ${total && done >= total ? 'mgr-progress--ok' : ''}`}><i style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }} /></span>
    {done}/{total}
  </span>
);

/** Danh sách điều kiện có dấu tích */
export const CheckList: React.FC<{ items: Array<[string, boolean]> }> = ({ items }) => (
  <ul className="mgr-checks">
    {items.map(([label, ok]) => (
      <li key={label} className={ok ? 'ok' : ''}><Icon name={ok ? 'check' : 'clock'} /><span>{label}</span></li>
    ))}
  </ul>
);

/** Ô khách hàng trong bảng */
export const CustomerCell: React.FC<{ c?: CustomerInfo }> = ({ c }) => {
  const name = c?.name || c?.company || '—';
  const sub = c?.company && c?.name && c.company !== c.name ? c.company : undefined;
  return (
    <div className="mgr-customer-cell">
      <div className="mgr-customer-name" title={name} style={{ fontWeight: 600, color: 'var(--mgr-ink)' }}>
        {name}
      </div>
      {sub && <div className="mgr-muted" style={{ fontSize: '11px' }}>{sub}</div>}
      {c?.email && (
        <div className="mgr-customer-email mgr-muted" style={{ fontSize: '11px', marginTop: '2px' }} title={c.email}>
          {c.email}
        </div>
      )}
    </div>
  );
};

/** Ô tuyến đường trong bảng: hiển thị đầy đủ điểm xuất phát → điểm đến, tự động xuống dòng chống vỡ bảng */
export const RouteCell: React.FC<{
  r?: Pick<TransportRequest, 'origin' | 'destination'> | null;
  detailed?: boolean;
}> = ({ r }) => {
  if (!r) return <span className="mgr-muted">—</span>;
  const origin = cityLabel(r.origin);
  const dest = cityLabel(r.destination);
  if (!r.origin && !r.destination) return <span className="mgr-muted">—</span>;

  return (
    <div className="mgr-route-cell" title={`${origin} → ${dest}`}>
      <span className="mgr-route-point">{origin}</span>
      <span className="mgr-route-arrow" aria-hidden="true">→</span>
      <span className="mgr-route-point">{dest}</span>
    </div>
  );
};

/** Nút quay lại */
export const BackLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link className="mgr-back" to={to}><Icon name="back" />{children}</Link>
);

/** Mở tệp mẫu (bản demo không có tài liệu thật) */
export function openSampleFile(name: string) {
  const html = `<title>${name}</title><body style="font-family:sans-serif;padding:40px;color:#334155"><h2>${name}</h2><p>Tệp mẫu trong dữ liệu demo CBN Transport. Không có tài liệu thật đính kèm.</p>`;
  window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank', 'noopener');
}
