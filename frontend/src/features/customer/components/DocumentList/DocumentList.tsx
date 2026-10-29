import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DocItem, Horse, SupplementRequest } from '../../types';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import { FilePickButton } from './FilePickButton';
import { useCustomer } from '../../hooks/useCustomer';
import { DOC_NAME } from '../../hooks/customerRules';
import { FilePreviewModal } from '../Modals/FilePreviewModal';
import './DocumentList.css';

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
        return (
          <div key={`${it.scope}-${it.key}`} className={`cus-doc ${rejected ? 'cus-doc--alert' : ''}`}>
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
                {editable && it.kind === 'file' && (
                  <FilePickButton disabled={it.scope === 'request'} label={it.scope === 'request' ? 'Chưa thể nộp trực tuyến' : rejected ? 'Tải lại tệp mới' : it.file ? 'Thay tệp' : 'Tải tệp'}
                    className={`cus-btn cus-btn--sm ${rejected ? 'cus-btn--solid' : ''}`}
                    onPick={(f) => actions.uploadDoc(requestId, it.key, it.scope, f)}
                    onError={actions.showToast} />
                )}
              </div>
            </div>
            {it.note && <div className="cus-doc__meta">{it.note}</div>}
            {it.issue && <div className="cus-doc__issue"><b>Lý do: </b>{it.issue}</div>}
            {it.status === 'PENDING_REVIEW' && <div className="cus-doc__meta">Đã gửi – đang chờ Transport Specialist kiểm duyệt.</div>}
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
  shared: DocItem[];
  perHorse: Array<{ horse: Horse; items: DocItem[] }>;
  editable: boolean;
  supplements?: SupplementRequest[];
  backTo?: string;
}

/** Giấy tờ chung của đơn + danh sách ngựa và hồ sơ từng ngựa */
export const RequestDocuments: React.FC<RequestDocumentsProps> = ({ requestId, shared, perHorse, editable, supplements = [], backTo }) => (
  <div className="cus-req-docs">
    {supplements.length > 0 && (
      <div className="cus-note cus-note--yellow">
        <div>
          <b>Transport Specialist yêu cầu bổ sung</b>
          {supplements.map((s) => (
            <div key={s.id}>
              {DOC_NAME[s.key]}{s.scope !== 'request' ? ` – ${perHorse.find((p) => p.horse.id === s.scope)?.horse.name ?? s.scope}` : ''}: {s.reason}
            </div>
          ))}
        </div>
      </div>
    )}
    {shared && shared.length > 0 && (
      <>
        <div className="cus-doc-group">Giấy tờ chung của đơn vận chuyển</div>
        <DocumentRows requestId={requestId} items={shared} editable={editable} backTo={backTo} />
      </>
    )}
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
