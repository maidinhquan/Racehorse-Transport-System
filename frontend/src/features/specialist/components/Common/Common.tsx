import React from 'react';
import { Icon } from '../SpecialistLayout';

type NoteTone = 'yellow' | 'blue' | 'red' | 'grey' | 'green';

/** Ghi chú có màu */
export const Note: React.FC<{ tone: NoteTone; title: string; children?: React.ReactNode; icon?: string }> = ({ tone, title, children, icon }) => (
  <div className={`spc-note spc-note--${tone}`}>
    <Icon name={icon ?? (tone === 'green' ? 'check' : tone === 'red' || tone === 'yellow' ? 'alert' : 'info')} />
    <div><b>{title}</b>{children}</div>
  </div>
);

/** Thẻ khóa: chức năng chưa mở */
export const LockedCard: React.FC<{ title: string; text: string; icon?: string; children?: React.ReactNode }> = ({ title, text, icon = 'lock', children }) => (
  <div className="spc-locked"><Icon name={icon} /><div><b>{title}</b><span>{text}</span>{children}</div></div>
);

/** Phân trang đơn giản */
export const Pager: React.FC<{ total: number; page: number; pageCount: number; setPage: (p: number) => void; unit?: string }> = ({ total, page, pageCount, setPage, unit = 'mục' }) => (
  <div className="spc-pager">
    <span>{total} {unit}</span>
    <div>
      <button type="button" className="spc-btn spc-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
      <span>Trang {page}/{pageCount}</span>
      <button type="button" className="spc-btn spc-btn--sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Sau</button>
    </div>
  </div>
);

/** Thanh tiến độ nhỏ kèm số */
export const MiniProgress: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <span className="spc-mini">
    <span className={`spc-progress ${total && done === total ? 'spc-progress--ok' : ''}`}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
    {done}/{total}
  </span>
);

/** Mở tệp an toàn (hỗ trợ cả URL thật và mẫu chứng từ) */
export function openSampleFile(nameOrObj: string | { name?: string; url?: string }) {
  const name = typeof nameOrObj === 'object' && nameOrObj ? (nameOrObj.name || nameOrObj.url || 'Tệp đính kèm') : String(nameOrObj || 'Tệp đính kèm');
  const url = typeof nameOrObj === 'object' && nameOrObj?.url ? nameOrObj.url : (name.startsWith('blob:') || name.startsWith('data:') || name.startsWith('http') ? name : undefined);
  if (url) {
    try {
      window.open(url, '_blank', 'noopener');
      return;
    } catch { /* fallback to html preview */ }
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:40px;color:#1e293b;background:#f8fafc;margin:0}h2{color:#0f172a;margin-top:0}.card{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:24px;max-width:640px;margin:0 auto;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)}.stamp{color:#15803d;font-weight:700;font-size:12px;border:1px solid #bbf7d0;background:#f0fdf4;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:12px}</style></head><body><div class="card"><h2>${name}</h2><p>Hồ sơ chứng từ vận chuyển ngựa đua – CBN Transport.</p><div class="stamp">HỒ SƠ ĐÃ TIẾP NHẬN TRÊN HỆ THỐNG</div></div></body></html>`;
  try {
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    window.open(blobUrl, '_blank', 'noopener');
  } catch (e) {
    console.warn('Không thể mở cửa sổ xem tệp:', e);
  }
}
