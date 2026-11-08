import React, { useState } from 'react';
import type { CustomerDoc, CustomerDocKey, SpecTrip } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import { CUSTOMER_DOC_NAME, customerDocCount, fmtDate, fmtDateTime, openRequestFor } from '../../../hooks/specialistRules';
import { SupplementModal, DocumentPreviewModal } from '../../../components/Modals';
import { Icon } from '../../../components/SpecialistLayout';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { useSharedIncidents } from '../../../../../shared/utils/sharedIncidents';

/**
 * Giấy tờ khách hàng cung cấp – cùng dữ liệu và trạng thái với cổng Khách hàng.
 * Specialist chấp thuận từng giấy tờ hoặc bấm "Yêu cầu bổ sung" ngay tại giấy tờ đó (kèm lý do).
 */
export const CustomerDocsTab: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {
  const { data, customerDocs, actions } = useSpecialist();
  const [sup, setSup] = useState<{ key: CustomerDocKey; scope: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CustomerDoc | null>(null);
  const cleanId = (x?: string | null) => (x || '').replace(/-/g, '_');
  const tTrips = [t.id, cleanId(t.id), t.requestId, cleanId(t.requestId)].filter(Boolean);
  const docs = customerDocs.filter((d) => tTrips.some((tid) => tid === d.tripId || cleanId(d.tripId) === tid));
  const cnt = customerDocCount(data, t);
  const incidents = useSharedIncidents(t.id);
  const hasIncident = (t.status as string) === 'INCIDENT' || incidents.length > 0;
  const isDocsLocked = Boolean(t.docsReady) && !hasIncident;
  const canReview = !isDocsLocked && t.status !== 'COMPLETED';

  const getDocFileName = (d: CustomerDoc) => {
    if (typeof d.file === 'object' && d.file && (d.file as any).name) {
      return (d.file as any).name;
    }
    if (d.file && typeof d.file === 'string' && !d.file.startsWith('/api')) {
      return d.file;
    }
    return `${d.scope || 'horse'}_${d.key}.pdf`;
  };

  const getDocFileUrl = (d: CustomerDoc) => {
    if (typeof d.file === 'object' && d.file && (d.file as any).url) {
      return (d.file as any).url;
    }
    const str = String(d.file || '');
    if (str.startsWith('/api') || str.startsWith('http') || str.startsWith('blob:') || str.startsWith('data:')) {
      return str;
    }
    return `/api/specialist/trips/${t.id}/customer-documents/${d.key}/file?scope=${d.scope}`;
  };

  const row = (d: CustomerDoc) => {
    const req = openRequestFor(data, t.id, d.key, d.scope);
    const expiredBeforeArrival = !!d.expiry && d.expiry < (t.eta || '').slice(0, 10);
    return (
      <div key={`${d.scope}-${d.key}`} className={`spc-cdoc ${d.status === 'ACTION_REQUIRED' ? 'alert' : ''}`}>
        <div className="spc-cdoc__main">
          <div className="spc-cdoc__top">
            <b>{CUSTOMER_DOC_NAME[d.key] || d.key}</b>
            <TripStatusBadge kind="customer" status={d.status} />
            {d.expiry && <TripStatusBadge label={`Hết hạn ${fmtDate(d.expiry)}`} tone={expiredBeforeArrival ? 'bad' : 'muted'} />}
          </div>
          {d.note && <div className="spc-cdoc__note">{d.note}</div>}
          {d.issue && <div className="spc-cdoc__issue">Lý do: {d.issue}</div>}
          {expiredBeforeArrival && <div className="spc-cdoc__issue">Giấy tờ hết hạn trước khi chuyến đến nơi ({fmtDate(t.eta?.slice(0, 10))}) – cần bản mới.</div>}
          {d.reviewedAt && d.status === 'APPROVED' && <div className="spc-cdoc__note">Duyệt {fmtDateTime(d.reviewedAt)} • {d.reviewedBy}</div>}
        </div>
        <div className="spc-cdoc__actions spc-btn-row">
          <button type="button" className="spc-btn spc-btn--sm" onClick={() => setPreviewDoc(d)}>Xem tệp</button>
          {canReview && d.status === 'SUBMITTED' && (
            <button type="button" className="spc-btn spc-btn--sm spc-btn--solid" onClick={() => actions.approveCustomerDoc(t.id, d.key, d.scope)}>Chấp thuận</button>
          )}
          {canReview && req?.status === 'OPEN' && (
            <button type="button" className="spc-btn spc-btn--sm" title="Gửi lại yêu cầu nếu khách hàng không nhận được" onClick={() => actions.resendCustomerDocRequest(req.id)}>Gửi lại yêu cầu</button>
          )}
          {canReview && req?.status === 'SUBMITTED' && d.status === 'SUBMITTED' && (
            <button type="button" className="spc-btn spc-btn--sm" onClick={() => setSup({ key: d.key, scope: d.scope })}>Yêu cầu nộp lại</button>
          )}
          {canReview ? (req
            ? <TripStatusBadge label={req.status === 'SUBMITTED' ? `Khách đã nộp lại • ${req.id}` : `Đang chờ khách bổ sung • ${req.id}`} tone={req.status === 'SUBMITTED' ? 'info' : 'warn'} />
            : <button type="button" className="spc-btn spc-btn--sm" onClick={() => setSup({ key: d.key, scope: d.scope })}>Yêu cầu bổ sung</button>
          ) : req ? (
            <TripStatusBadge label={req.status === 'SUBMITTED' ? `Khách đã nộp lại • ${req.id}` : `Đang chờ khách bổ sung • ${req.id}`} tone={req.status === 'SUBMITTED' ? 'info' : 'warn'} />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="spc-card">
      <h3 className="spc-card__title">
        <span>Giấy tờ khách hàng – theo yêu cầu {t.requestId}</span>
        <TripStatusBadge label={`${cnt.done}/${cnt.total} giấy tờ đã duyệt`} tone={cnt.done === cnt.total ? 'ok' : 'info'} />
      </h3>

      {isDocsLocked && (
        <div className="spc-ready-locked-alert" style={{ marginBottom: 12 }}>
          <Icon name="lock" />
          <div>
            <b>Hồ sơ khách hàng đã khoá.</b>
            <div>Chuyến đã được xác nhận Docs READY — không thể phê duyệt hay yêu cầu bổ sung trừ khi có sự cố vận chuyển phát sinh.</div>
          </div>
        </div>
      )}

      {t.docsReady && hasIncident && (
        <div className="spc-incident-unlocked-alert" style={{ marginBottom: 12 }}>
          <Icon name="alert" />
          <div>
            <b>Mở quyền rà soát theo sự cố.</b>
            <div>Chuyến đang có sự cố vận chuyển ({incidents.length} sự cố) — cho phép Specialist cập nhật xét duyệt và gửi yêu cầu bổ sung hồ sơ tới khách hàng.</div>
          </div>
        </div>
      )}

      <div className="spc-cdoc-group">Danh sách ngựa và hồ sơ từng ngựa <span className="spc-muted">{t.horses.length} ngựa</span></div>
      {t.horses.map((h, i) => {
        const horseDocs = docs.filter((d) => d.scope === h.id || cleanId(d.scope) === cleanId(h.id));
        return (
          <details key={h.id} className="spc-cdoc-horse" open={i === 0}>
            <summary>{i + 1}. {h.name} <span className="spc-muted">{h.id} • {horseDocs.length} mục hồ sơ</span></summary>
            <div className="spc-cdoc-list">{horseDocs.map(row)}</div>
          </details>
        );
      })}
      {sup && <SupplementModal open trip={t} docKey={sup.key} scope={sup.scope} onClose={() => setSup(null)} />}
      {previewDoc && (
        <DocumentPreviewModal
          open={!!previewDoc}
          title={CUSTOMER_DOC_NAME[previewDoc.key] || previewDoc.key}
          fileName={getDocFileName(previewDoc)}
          fileUrl={getDocFileUrl(previewDoc)}
          customerDoc={previewDoc}
          trip={t}
          onClose={() => setPreviewDoc(null)}
          onApprove={canReview && previewDoc.status === 'SUBMITTED' ? () => actions.approveCustomerDoc(t.id, previewDoc.key, previewDoc.scope) : undefined}
          onRequestSupplement={canReview ? () => { const target = previewDoc; setPreviewDoc(null); setSup({ key: target.key, scope: target.scope }); } : undefined}
        />
      )}
    </div>
  );
};

export default CustomerDocsTab;
