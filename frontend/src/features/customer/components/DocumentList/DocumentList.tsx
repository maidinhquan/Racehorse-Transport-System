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
                {editable && it.kind === 'file' && (getDemoMode('customer') || ['passport', 'ownership', 'valueProof', 'flu'].includes(it.key) || (rejected && it.key === 'health')) && (
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
export const RequestDocuments: React.FC<RequestDocumentsProps> = ({ requestId, perHorse, editable, backTo }) => (
  <div className="cus-req-docs">
    <div className="cus-doc-group">Danh sách ngựa và hồ sơ từng ngựa</div>
    {perHorse.length === 0 && <p className="cus-subtitle">Chưa chọn ngựa.</p>}
    {perHorse.map(({ horse, items }) => (
      <div key={horse.id} className="cus-doc-horse">
        <div className="cus-eyebrow">{horse.name} • {horse.id}</div>
        <DocumentRows requestId={requestId} items={items} editable={editable} backTo={backTo} />
      </div>
    ))}
  </div>
);

export default RequestDocuments;
