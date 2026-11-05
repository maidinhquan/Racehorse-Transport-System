import React, { useEffect } from 'react';
import type { CustomerDoc, SpecTrip, TripDocument } from '../../types';
import { fmtDate, horseName } from '../../hooks/specialistRules';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import { useAuthFile } from '../../../../shared/api/useAuthFileUrl';
import './Modals.css';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fileName?: string;
  fileUrl?: string;
  customerDoc?: CustomerDoc;
  companyDoc?: TripDocument;
  trip?: SpecTrip;
  onApprove?: () => void;
  onRequestSupplement?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  title,
  fileName = '',
  fileUrl,
  customerDoc,
  companyDoc,
  trip,
  onApprove,
  onRequestSupplement,
}) => {
  const { url: actualUrl, type: actualType } = useAuthFile(open ? fileUrl : undefined);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedFileName = fileName || (customerDoc?.file ? (typeof customerDoc.file === 'object' ? (customerDoc.file as any).name : String(customerDoc.file)) : '');
  const isImage = !!resolvedFileName.match(/\.(png|jpe?g|webp|gif|svg)$/i) || !!actualType?.startsWith('image/');
  const isPdf = !!resolvedFileName.match(/\.pdf$/i) || actualType === 'application/pdf';

  const expiredBeforeArrival = !!customerDoc?.expiry && !!trip?.eta && customerDoc.expiry < trip.eta.slice(0, 10);

  return (
    <div className="spc-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="spc-modal__back" onClick={onClose} />
      <div className="spc-modal__box spc-modal__box--wide" style={{ maxWidth: 840 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="spc-modal__title" style={{ margin: 0 }}>{title}</h3>
              {customerDoc && <TripStatusBadge kind="customer" status={customerDoc.status} />}
              {customerDoc?.expiry && <TripStatusBadge label={`Hết hạn ${fmtDate(customerDoc.expiry)}`} tone={expiredBeforeArrival ? 'bad' : 'muted'} />}
              {companyDoc && <TripStatusBadge kind="check" status={companyDoc.status} />}
            </div>
            <div className="spc-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {trip && `Chuyến ${trip.id} • Ngựa: ${customerDoc ? horseName(trip, customerDoc.scope) : 'CBN Transport'}`}
              {resolvedFileName ? ` • Tệp: ${resolvedFileName}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="spc-btn spc-btn--sm"
            style={{ padding: '4px 10px', fontSize: 14 }}
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {customerDoc?.issue && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#b91c1c' }}>
            <b>Lý do yêu cầu bổ sung: </b>{customerDoc.issue}
          </div>
        )}

        {expiredBeforeArrival && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            Giấy tờ hết hạn trước khi chuyến đến nơi ({fmtDate(trip?.eta?.slice(0, 10))}) – cần bản mới.
          </div>
        )}

        <div
          style={{
            minHeight: 320,
            maxHeight: '62vh',
            overflowY: 'auto',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isImage && actualUrl ? (
            <img src={actualUrl} alt={resolvedFileName} style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }} />
          ) : isPdf && actualUrl ? (
            <iframe src={actualUrl} title={resolvedFileName} style={{ width: '100%', height: '55vh', border: 'none' }} />
          ) : (
            <div style={{ width: '100%', maxWidth: 650, background: '#fff', border: '2px solid #cbd5e1', borderRadius: 8, padding: '24px 28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Cộng hòa Xã hội Chủ nghĩa Việt Nam</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Độc lập – Tự do – Hạnh phúc</div>
                <h4 style={{ margin: '12px 0 4px', fontSize: 16, color: '#1e293b' }}>
                  {title.toUpperCase()}
                </h4>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Số hồ sơ: {customerDoc ? `HS-EQ-${(trip?.id || 'TRP').replace(/\D/g, '')}-${customerDoc.scope.replace(/\D/g, '').slice(-4) || '1029'}` : (companyDoc?.number || `CBN-DOC-${trip?.id}`)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13, lineHeight: 1.6 }}>
                <div><b>Đối tượng áp dụng:</b> {trip && customerDoc ? horseName(trip, customerDoc.scope) : (trip?.horses.map(h => h.name).join(', ') || 'Toàn chuyến')}</div>
                <div><b>Chuyến vận chuyển:</b> {trip ? `${trip.id} (${trip.origin} → ${trip.destination})` : '—'}</div>
                <div><b>Cơ quan cấp / chứng thực:</b> {companyDoc?.issuer || 'Chi cục Thú y Vùng VI – Cục Thú y'}</div>
                <div><b>Ngày cấp hiệu lực:</b> {companyDoc?.issuedAt ? fmtDate(companyDoc.issuedAt) : '15/10/2026'}</div>
                <div><b>Thời hạn hiệu lực:</b> {customerDoc?.expiry ? fmtDate(customerDoc.expiry) : (companyDoc?.expiry ? fmtDate(companyDoc.expiry) : 'Theo quy định')}</div>
                <div><b>Tên tệp lưu trữ:</b> <code>{resolvedFileName || 'ho-so-dinh-kem.pdf'}</code></div>
              </div>

              {customerDoc?.note && (
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: 13 }}>
                  <b>Nội dung kiểm tra / ghi chú:</b> {customerDoc.note}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Hệ thống Quản lý Vận chuyển Ngựa đua RTS<br />
                  Bản quét chứng thực điện tử
                </div>
                <div style={{ textAlign: 'center', border: '2px solid #dc2626', borderRadius: 8, padding: '6px 14px', color: '#dc2626', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>
                  ĐÃ TIẾP NHẬN HỒ SƠ<br />
                  <span style={{ fontSize: 10, fontWeight: 500 }}>TRANSPORT SPECIALIST VERIFIED</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="spc-modal__actions" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {actualUrl && (
              <a
                href={actualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="spc-btn spc-btn--sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                Mở trong tab mới ↗
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="spc-btn" onClick={onClose}>Đóng</button>
            {onRequestSupplement && (
              <button
                type="button"
                className="spc-btn"
                onClick={() => { onClose(); onRequestSupplement(); }}
              >
                Yêu cầu bổ sung
              </button>
            )}
            {onApprove && ((customerDoc && customerDoc.status === 'SUBMITTED') || (companyDoc && companyDoc.status === 'SUBMITTED')) && (
              <button
                type="button"
                className="spc-btn spc-btn--solid"
                onClick={() => { onApprove(); onClose(); }}
              >
                Chấp thuận giấy tờ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
