import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Horse, TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { fmtDate, wizardErrors } from '../../../hooks/customerRules';
import { Note, PlaceBlock } from '../../../components/Common/Common';
import { DocumentRows } from '../../../components/DocumentList/DocumentList';
import { DateField } from '../../../components/DateField/DateField';
import { wizardPath } from '../../../components/WizardStepper/WizardStepper';

/** Bước 3/3 – xem lại toàn bộ, sửa lỗi chặn gửi rồi gửi Manager xét duyệt */
export const ReviewStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { horses, docsOf, actions } = useCustomer();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [savingHorse, setSavingHorse] = useState(false);
  const errs = wizardErrors(r, horses);
  const docs = docsOf(r);

  const section = (title: string, step: number, body: React.ReactNode) => (
    <div className="cus-card">
      <h3 className="cus-card__title">{title}<button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>Sửa</button></h3>
      {body}
    </div>
  );

  const openEditPassport = (h: Horse) => {
    setEditingHorse(h);
    setNewExpiryDate(h.passport.expiryDate || r.date || '');
  };

  const savePassportExpiry = async () => {
    if (!editingHorse || !newExpiryDate) return;
    setSavingHorse(true);
    const { id: horseId, ...rest } = editingHorse;
    void horseId;
    const res = await actions.updateHorse(editingHorse.id, {
      ...rest,
      passport: {
        ...editingHorse.passport,
        expiryDate: newExpiryDate,
      },
    });
    setSavingHorse(false);
    if (res.ok) {
      setEditingHorse(null);
      actions.showToast(`Đã cập nhật hạn hộ chiếu cho ${editingHorse.name}`);
    } else {
      actions.showToast(res.message || 'Cập nhật thất bại');
    }
  };

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
        <div className="cus-kv"><div><span>Ngày vận chuyển mong muốn</span><b>{fmtDate(r.date)}</b></div></div>
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
      {section('Giấy tờ chung của yêu cầu', 2, <DocumentRows requestId={r.id} items={docs.shared} editable={false} />)}

      {errs.length > 0 && (
        <Note tone="red" title="Chưa thể gửi yêu cầu">
          <ul className="cus-wizard__errors">
            {errs.map(([step, msg]) => {
              const horseObj = horses.find(h => msg.startsWith(h.name));
              const isExpiryConflict = msg.includes('Hộ chiếu hết hạn');
              return (
                <li key={msg} style={{ marginBottom: isExpiryConflict ? 10 : 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span>{msg}</span>
                  {isExpiryConflict && horseObj ? (
                    <span style={{ display: 'inline-flex', gap: 8 }}>
                      <button type="button" className="cus-btn cus-btn--sm" onClick={() => navigate(wizardPath(r, 0))}>Đổi ngày đi</button>
                      <button type="button" className="cus-btn cus-btn--sm cus-btn--solid" onClick={() => openEditPassport(horseObj)}>Sửa hạn hộ chiếu</button>
                    </span>
                  ) : (
                    <button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>Sửa</button>
                  )}
                </li>
              );
            })}
          </ul>
        </Note>
      )}

      {editingHorse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 }}>
          <div className="cus-card" style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 className="cus-card__title" style={{ marginTop: 0 }}>Cập nhật hạn hộ chiếu • {editingHorse.name}</h3>
            <p className="cus-subtitle" style={{ marginTop: -8, marginBottom: 16 }}>
              Ngày vận chuyển của đơn là <b>{fmtDate(r.date)}</b>. Ngày hết hạn hộ chiếu phải từ ngày này trở đi.
            </p>
            <div className="cus-field">
              <label htmlFor="modal-expiry-date">Ngày hết hạn hộ chiếu mới *</label>
              <DateField id="modal-expiry-date" value={newExpiryDate} min={r.date} onChange={setNewExpiryDate} />
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="cus-btn" disabled={savingHorse} onClick={() => setEditingHorse(null)}>Hủy</button>
              <button type="button" className="cus-btn cus-btn--solid" disabled={!newExpiryDate || savingHorse} onClick={savePassportExpiry}>
                {savingHorse ? 'Đang lưu...' : 'Lưu hạn hộ chiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <label className="cus-check">
        <input type="checkbox" checked={agree} disabled={errs.length > 0} onChange={(e) => setAgree(e.target.checked)} />
        Tôi xác nhận thông tin đã cung cấp là chính xác.
      </label>
      <div className="cus-wizard__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/wizard/2`)}>Quay lại</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" disabled={!agree || errs.length > 0 || submitting} onClick={submit}>
          {submitting ? 'Đang gửi yêu cầu lên máy chủ...' : (r.status === 'CHANGES_REQUESTED' ? 'Gửi lại để xét duyệt' : 'Gửi yêu cầu để xét duyệt')}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
