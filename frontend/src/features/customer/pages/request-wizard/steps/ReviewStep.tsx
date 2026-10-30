import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { fmtDate, wizardErrors } from '../../../hooks/customerRules';
import { Note, PlaceBlock } from '../../../components/Common/Common';
import { DocumentRows } from '../../../components/DocumentList/DocumentList';
import { wizardPath } from '../../../components/WizardStepper/WizardStepper';

/** Bước 3/3 – xem lại toàn bộ, sửa lỗi chặn gửi rồi gửi Manager xét duyệt */
export const ReviewStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { horses, docsOf, actions } = useCustomer();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const errs = wizardErrors(r, horses);
  const docs = docsOf(r);

  const section = (title: string, step: number, body: React.ReactNode) => (
    <div className="cus-card">
      <h3 className="cus-card__title">{title}<button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>Sửa</button></h3>
      {body}
    </div>
  );

  const submit = async () => {
    setSubmitting(true);
    const res = await actions.submitRequest(r.id);
    setSubmitting(false);
    if (res.ok) {
      navigate(`/customer/requests/${res.id || r.id}?submitted=1`);
    }
  };

  return (
    <div className="cus-stack">
      {section('Nhận & giao ngựa', 0, <>
        <div className="cus-kv"><div><span>Mong muốn CBN đến lấy ngựa</span><b>{fmtDate(r.pickupAt)}</b></div><div><span>Mong muốn ngựa tới nơi giao</span><b>{fmtDate(r.date)}</b></div></div>
        <div className="cus-grid2 cus-wizard__review-places">
          <div><div className="cus-eyebrow">Nhận ngựa</div><PlaceBlock place={r.pickup} city={r.origin} who="Người bàn giao" /></div>
          <div><div className="cus-eyebrow">Giao ngựa</div><PlaceBlock place={r.delivery} city={r.destination} who="Người nhận" /></div>
        </div>
      </>)}
      {section('Ngựa & hồ sơ', 2, <>
        <p className="cus-subtitle">{r.horseCount} ngựa trong chuyến. Hướng dẫn chăm sóc được ghi theo từng con.</p>
        {docs.perHorse.map(({ horse, items }) => <section key={horse.id} className="cus-wizard__review-horse">
          <h4>{horse.name}<small>{horse.microchip}</small></h4>
          <div className="cus-wizard__review-care"><b>Chăm sóc trong chuyến</b><p className="cus-lines">{r.horseNotes[horse.id] || 'Không có yêu cầu riêng.'}</p></div>
          <DocumentRows requestId={r.id} items={items} editable={false} />
        </section>)}
      </>)}

      {errs.length > 0 && (
        <Note tone="red" title="Chưa thể gửi yêu cầu">
          <ul className="cus-wizard__errors">
            {errs.map(([step, msg]) => (
              <li key={msg}>{msg} <button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>Sửa</button></li>
            ))}
          </ul>
        </Note>
      )}

      <label className="cus-check">
        <input type="checkbox" checked={agree} disabled={errs.length > 0} onChange={(e) => setAgree(e.target.checked)} />
        Tôi xác nhận thông tin đã cung cấp là chính xác.
      </label>
      <div className="cus-wizard__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/wizard/2`)}>
          ← Quay lại: Ngựa & hồ sơ
        </button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" disabled={!agree || errs.length > 0 || submitting} onClick={submit}>
          {submitting ? 'Đang gửi yêu cầu lên máy chủ...' : (r.status === 'CHANGES_REQUESTED' ? 'Gửi lại để xét duyệt →' : 'Gửi yêu cầu để xét duyệt →')}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
