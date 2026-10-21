import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { cityLabel, fmtDate, wizardErrors } from '../../../hooks/customerRules';
import { Note, PlaceBlock } from '../../../components/Common/Common';
import { RequestDocuments } from '../../../components/DocumentList/DocumentList';
import { wizardPath } from '../../../components/WizardStepper/WizardStepper';

/** Bước 4/4 – xem lại toàn bộ, sửa lỗi chặn gửi rồi gửi Manager xét duyệt */
export const ReviewStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { horses, docsOf, actions } = useCustomer();
  const [agree, setAgree] = useState(false);
  const errs = wizardErrors(r, horses);
  const docs = docsOf(r);
  const notes = Object.entries(r.horseNotes).filter(([id, n]) => n && r.horses.includes(id));

  const section = (title: string, step: number, body: React.ReactNode) => (
    <div className="cus-card">
      <h3 className="cus-card__title">{title}<button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>Sửa</button></h3>
      {body}
    </div>
  );

  const submit = () => {
    const res = actions.submitRequest(r.id);
    if (res.ok) navigate(`/customer/requests/${r.id}?submitted=1`);
  };

  return (
    <div className="cus-stack">
      {section('Thông tin chuyến', 0, (
        <>
          <div className="cus-kv">
            <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
            <div><span>Ngày vận chuyển mong muốn</span><b>{fmtDate(r.date)}</b></div>
            <div><span>Số lượng ngựa</span><b>{r.horseCount}</b></div>
          </div>
          {r.careNotes && <p className="cus-lines" style={{ marginTop: 10 }}><b>Yêu cầu chăm sóc:</b> {r.careNotes}</p>}
        </>
      ))}
      {section('Điểm nhận & giao', 1, (
        <div className="cus-grid2">
          <div><div className="cus-eyebrow">Điểm nhận</div><PlaceBlock place={r.pickup} who="Người liên hệ" /></div>
          <div><div className="cus-eyebrow">Điểm giao</div><PlaceBlock place={r.delivery} who="Người nhận" /></div>
        </div>
      ))}
      {section('Ngựa & hồ sơ', 2, (
        <>
          <p className="cus-subtitle" style={{ marginTop: -6, marginBottom: 12 }}>Mỗi giấy tờ có trạng thái riêng; tải lên không đồng nghĩa đã được duyệt.</p>
          <RequestDocuments requestId={r.id} shared={docs.shared} perHorse={docs.perHorse} editable={false} />
          {notes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="cus-eyebrow">Yêu cầu chăm sóc riêng</div>
              {notes.map(([id, n]) => <p key={id} className="cus-lines"><b>{horses.find((h) => h.id === id)?.name ?? id}:</b> {n}</p>)}
            </div>
          )}
        </>
      ))}

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
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/wizard/2`)}>Quay lại</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" disabled={!agree || errs.length > 0} onClick={submit}>
          {r.status === 'CHANGES_REQUESTED' ? 'Gửi lại để xét duyệt' : 'Gửi yêu cầu để xét duyệt'}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
