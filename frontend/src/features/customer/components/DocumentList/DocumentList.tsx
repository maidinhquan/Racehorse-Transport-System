import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DocItem, Horse } from '../../types';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import { FilePickButton } from './FilePickButton';
import { useCustomer } from '../../hooks/useCustomer';
import { FilePreviewModal } from '../Modals/FilePreviewModal';
import './DocumentList.css';
import { getDemoMode } from '../../../../shared/context/DemoModeContext';

interface DocumentRowsProps {
  requestId: string;
  items: DocItem[];
  editable: boolean;
  /** Đường dẫn quay lại sau khi sửa thông tin ngựa */
  backTo?: string;
}

/** Các dòng giấy tờ: trạng thái, lý do từ chối, xem tệp, tải tệp / sửa thông tin */
export const DocumentRows: React.FC<DocumentRowsProps> = ({ requestId, items, editable, backTo }) => {
  const navigate = useNavigate();
  const { actions } = useCustomer();
  const [preview, setPreview] = React.useState<{ file: import('../../types').FileRef; title: string } | null>(null);
  return (
    <div className="cus-docs">
      {items.map((it) => {
        const rejected = it.status === 'ACTION_REQUIRED';
        const missing = it.missing ?? [];
        return (
          <div key={`${it.scope}-${it.key}`} className={`cus-doc ${rejected || missing.length ? 'cus-doc--alert' : ''}`}>
            <div className="cus-doc__top">
              <b>{it.name}{it.optional && it.status !== 'OPTIONAL' && <small> (không bắt buộc)</small>}</b>
              <TripStatusBadge kind="doc" status={it.status} />
              <div className="cus-doc__actions">
                {it.file && <button type="button" className="cus-btn cus-btn--sm" onClick={() => setPreview({ file: it.file!, title: it.name })}>Xem tệp</button>}
                {editable && it.kind === 'info' && (
                  <button type="button" className="cus-btn cus-btn--sm"
                    onClick={() => navigate(`/customer/horses/${it.scope}/edit${backTo ? `?back=${encodeURIComponent(backTo)}` : ''}`)}>
                    {rejected ? 'Cập nhật thông tin' : 'Sửa thông tin'}
                  </button>
                )}
                {editable && it.kind === 'file' && (getDemoMode('customer') || ['passport', 'ownership', 'valueProof'].includes(it.key) || (rejected && ['health', 'flu'].includes(it.key))) && (
                  <FilePickButton label={rejected ? 'Tải lại tệp mới' : it.file ? 'Thay tệp' : 'Tải tệp'}
                    className={`cus-btn cus-btn--sm ${rejected ? 'cus-btn--solid' : ''}`}
                    onPick={(f) => actions.uploadDoc(requestId, it.key, it.scope, f)}
                    onError={actions.showToast} />
                )}
              </div>
            </div>
            {it.note && <div className="cus-doc__meta">{it.note}</div>}
            {missing.length > 0 && <div className="cus-doc__issue" role="alert"><b>Còn thiếu: </b>{missing.join(', ')}</div>}
            {it.issue && <div className="cus-doc__issue"><b>Lý do: </b>{it.issue}</div>}
            {(it.status === 'PENDING_REVIEW' || it.status === 'RESUBMITTED') && <div className="cus-doc__meta">Đã gửi – đang chờ Transport Specialist kiểm duyệt.</div>}
          </div>
        );
      })}
      <FilePreviewModal
        open={!!preview}
        file={preview?.file}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
    </div>
  );
};

interface RequestDocumentsProps {
  requestId: string;
  shared?: DocItem[];
  perHorse: Array<{ horse: Horse; items: DocItem[] }>;
  editable: boolean;
  backTo?: string;
}

/** Danh sách ngựa và hồ sơ từng ngựa */
export const RequestDocuments: React.FC<RequestDocumentsProps> = ({ requestId, perHorse, editable, backTo }) => {
  const [openHorses, setOpenHorses] = React.useState<Record<string, boolean>>({});
  const toggleHorse = (id: string) => {
    setOpenHorses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="cus-req-docs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="cus-doc-group" style={{ margin: 0, border: 0, padding: 0 }}>
          Danh sách ngựa và hồ sơ từng ngựa ({perHorse.length} con)
        </div>
        {perHorse.length > 1 && (
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <button
              type="button"
              className="cus-link"
              onClick={() => {
                const allOpen: Record<string, boolean> = {};
                perHorse.forEach((h) => {
                  allOpen[h.horse.id] = true;
                });
                setOpenHorses(allOpen);
              }}
            >
              Mở tất cả
            </button>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <button type="button" className="cus-link" onClick={() => setOpenHorses({})}>
              Thu gọn tất cả
            </button>
          </div>
        )}
      </div>

      {perHorse.length === 0 && <p className="cus-subtitle">Chưa chọn ngựa.</p>}
      {perHorse.map(({ horse, items }, idx) => {
        const isOpen = perHorse.length === 1 || !!openHorses[horse.id];
        return (
          <div key={horse.id} className={`cus-doc-horse-card ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="cus-doc-horse-toggle"
              onClick={() => toggleHorse(horse.id)}
              aria-expanded={isOpen}
            >
              <div className="cus-doc-horse-info">
                <span className="cus-doc-horse-index">{idx + 1}</span>
                <div>
                  <b className="cus-doc-horse-name">{horse.name}</b>
                  <span className="cus-doc-horse-chip">{horse.microchip || horse.id}</span>
                </div>
              </div>
              <div className="cus-doc-horse-actions">
                <span className="cus-doc-horse-count">{items.length} giấy tờ</span>
                <span className="cus-badge-hint">{isOpen ? 'Thu gọn ▲' : 'Xem hồ sơ ▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="cus-doc-horse-body">
                <DocumentRows requestId={requestId} items={items} editable={editable} backTo={backTo} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RequestDocuments;
