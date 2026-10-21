import React, { useState } from 'react';
import type { CustomerDoc, CustomerDocKey, SpecTrip } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import { CUSTOMER_DOC_NAME, customerDocCount, fmtDate, fmtDateTime, openRequestFor } from '../../../hooks/specialistRules';
import { SupplementModal } from '../../../components/Modals';
import { openSampleFile } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/**
 * Giấy tờ khách hàng cung cấp – cùng dữ liệu và trạng thái với cổng Khách hàng.
 * Specialist chấp thuận từng giấy tờ hoặc bấm "Yêu cầu bổ sung" ngay tại giấy tờ đó (kèm lý do).
 */
export const CustomerDocsTab: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {
  const { data, customerDocs, actions } = useSpecialist();
  const [sup, setSup] = useState<{ key: CustomerDocKey; scope: string } | null>(null);
  const docs = customerDocs.filter((d) => d.tripId === t.id);
  const cnt = customerDocCount(data, t);
  const canReview = t.status !== 'COMPLETED';

  const row = (d: CustomerDoc) => {
    const req = openRequestFor(data, t.id, d.key, d.scope);
    const expiredBeforeArrival = !!d.expiry && d.expiry < t.eta.slice(0, 10);
    return (
      <div key={`${d.scope}-${d.key}`} className={`spc-cdoc ${d.status === 'ACTION_REQUIRED' ? 'alert' : ''}`}>
        <div className="spc-cdoc__top">
          <b>{CUSTOMER_DOC_NAME[d.key]}</b>
          <TripStatusBadge kind="customer" status={d.status} />
          {d.expiry && <TripStatusBadge label={`Hết hạn ${fmtDate(d.expiry)}`} tone={expiredBeforeArrival ? 'bad' : 'muted'} />}
        </div>
        {d.note && <div className="spc-cdoc__note">{d.note}</div>}
        {d.issue && <div className="spc-cdoc__issue">Lý do: {d.issue}</div>}
        {expiredBeforeArrival && <div className="spc-cdoc__issue">Giấy tờ hết hạn trước khi chuyến đến nơi ({fmtDate(t.eta.slice(0, 10))}) – cần bản mới.</div>}
        {d.reviewedAt && d.status === 'APPROVED' && <div className="spc-cdoc__note">Duyệt {fmtDateTime(d.reviewedAt)} • {d.reviewedBy}</div>}
        <div className="spc-btn-row" style={{ marginTop: 8 }}>
          {d.file && <button type="button" className="spc-btn spc-btn--sm" onClick={() => openSampleFile(d.file!)}>Xem tệp</button>}
          {canReview && d.status === 'SUBMITTED' && (
            <button type="button" className="spc-btn spc-btn--sm spc-btn--solid" onClick={() => actions.approveCustomerDoc(t.id, d.key, d.scope)}>Chấp thuận</button>
          )}
          {canReview && (req
            ? <TripStatusBadge label={req.status === 'SUBMITTED' ? `Khách đã nộp lại • ${req.id}` : `Đang chờ khách bổ sung • ${req.id}`} tone={req.status === 'SUBMITTED' ? 'info' : 'warn'} />
            : <button type="button" className="spc-btn spc-btn--sm" onClick={() => setSup({ key: d.key, scope: d.scope })}>Yêu cầu bổ sung</button>)}
        </div>
      </div>
    );
  };

  return (
    <div className="spc-card">
      <h3 className="spc-card__title">
        <span>Giấy tờ khách hàng – theo yêu cầu {t.requestId}</span>
        <TripStatusBadge label={`${cnt.done}/${cnt.total} mục bắt buộc đã duyệt`} tone={cnt.done === cnt.total ? 'ok' : 'info'} />
      </h3>
      <p className="spc-subtitle" style={{ marginTop: -6, marginBottom: 14 }}>
        Cùng dữ liệu và trạng thái với Manager và Khách hàng. Chỉ Transport Specialist xét duyệt. Giấy phép, kiểm dịch và bảo hiểm của chuyến nằm ở ô “Giấy tờ công ty phải làm” và “Bảo hiểm”.
      </p>
      <div className="spc-cdoc-group">Giấy tờ chung của đơn vận chuyển</div>
      <div className="spc-cdoc-list">{docs.filter((d) => d.scope === 'request').map(row)}</div>
      <div className="spc-cdoc-group">Danh sách ngựa và hồ sơ từng ngựa <span className="spc-muted">{t.horses.length} ngựa</span></div>
      {t.horses.map((h, i) => (
        <details key={h.id} className="spc-cdoc-horse" open={i === 0}>
          <summary>{i + 1}. {h.name} <span className="spc-muted">{h.id} • {docs.filter((d) => d.scope === h.id).length} mục hồ sơ</span></summary>
          <div className="spc-cdoc-list">{docs.filter((d) => d.scope === h.id).map(row)}</div>
        </details>
      ))}
      {sup && <SupplementModal open trip={t} docKey={sup.key} scope={sup.scope} onClose={() => setSup(null)} />}
    </div>
  );
};

export default CustomerDocsTab;
