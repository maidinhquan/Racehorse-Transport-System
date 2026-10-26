import React from 'react';
import type { Horse, Place, TransportRequest } from '../../types';
import { cityLabel, shortCity } from '../../hooks/customerRules';
import { Icon } from '../CustomerLayout';

/** "HCMC → Tokyo" */
export const RouteText: React.FC<{ r: Pick<TransportRequest, 'origin' | 'destination'>; full?: boolean }> = ({ r, full }) => (
  <span className="cus-route">
    {full ? cityLabel(r.origin) : shortCity(r.origin)}
    <span className="cus-arrow">→</span>
    {full ? cityLabel(r.destination) : shortCity(r.destination)}
  </span>
);

/** Tên các ngựa đã chọn, hoặc "2 ngựa (chưa chọn)" */
export function horseNames(r: TransportRequest, horses: Horse[]) {
  const names = r.horses.filter(Boolean).map((id) => horses.find((h) => h.id === id)?.name ?? id);
  const missing = r.horses.filter((x) => !x).length;
  if (!names.length) return `${r.horseCount} ngựa (chưa chọn)`;
  return missing ? `${names.join(', ')} + ${missing} chưa chọn` : names.join(', ');
}

/** Khối địa chỉ nhận / giao */
export const PlaceBlock: React.FC<{ place: Place; who: string; city?: string }> = ({ place: p, who, city }) =>
  p.name ? (
    <div className="cus-place">
      <b>{p.name}</b>
      <span>{p.address || '—'}{city ? `, ${cityLabel(city)}` : ''}{p.postal ? `, ${p.postal}` : ''}</span>
      <dl>
        <dt>{who}</dt><dd>{p.contact || '—'}</dd>
        <dt>Điện thoại</dt><dd>{p.phone || '—'}</dd>
        {p.notes && <><dt>Ghi chú</dt><dd>{p.notes}</dd></>}
      </dl>
    </div>
  ) : <p className="cus-muted">Chưa khai báo.</p>;

/** Thẻ khóa: chức năng chưa mở ở giai đoạn hiện tại */
export const LockedCard: React.FC<{ title: string; text: string; icon?: string }> = ({ title, text, icon = 'lock' }) => (
  <div className="cus-locked"><Icon name={icon} /><div><b>{title}</b><span>{text}</span></div></div>
);

type NoteTone = 'yellow' | 'blue' | 'red' | 'grey' | 'green';
/** Ghi chú có màu */
export const Note: React.FC<{ tone: NoteTone; title: string; children?: React.ReactNode; icon?: string }> = ({ tone, title, children, icon }) => (
  <div className={`cus-note cus-note--${tone}`}>
    <Icon name={icon ?? (tone === 'green' ? 'check' : tone === 'red' || tone === 'yellow' ? 'alert' : 'info')} />
    <div><b>{title}</b>{children}</div>
  </div>
);

/** Cặp nhãn – giá trị trong lưới .cus-kv */
export const KV: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><span>{label}</span><b>{children}</b></div>
);

/** Dòng thời gian */
export const Timeline: React.FC<{ items: Array<{ key: string; title: string; sub?: string; tone?: 'done' | 'now' | '' }> }> = ({ items }) => (
  <ul className="cus-timeline">
    {items.map((x) => <li key={x.key} className={x.tone ?? ''}><b>{x.title}</b>{x.sub && <span>{x.sub}</span>}</li>)}
  </ul>
);
