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
  const [openHorses, setOpenHorses] = useState<Record<string, boolean>>({});
  const errs = wizardErrors(r, horses);
  const docs = docsOf(r);

  const toggleHorse = (id: string) => {
    setOpenHorses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const section = (title: string, step: number, body: React.ReactNode) => (
    <div className="cus-card">
      <h3 className="cus-card__title">
        {title}
        <button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>
          Sửa
        </button>
      </h3>
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
      {section(
        'Nhận & giao ngựa',
        0,
        <>
          <div className="cus-kv">
            <div>
              <span>Mong muốn CBN đến lấy ngựa</span>
              <b>{fmtDate(r.pickupAt)}</b>
            </div>
            <div>
              <span>Mong muốn ngựa tới nơi giao</span>
              <b>{fmtDate(r.date)}</b>
            </div>
          </div>
          <div className="cus-grid2 cus-wizard__review-places">
            <div>
              <div className="cus-eyebrow">Nhận ngựa</div>
              <PlaceBlock place={r.pickup} city={r.origin} who="Người bàn giao" />
            </div>
            <div>
              <div className="cus-eyebrow">Giao ngựa</div>
              <PlaceBlock place={r.delivery} city={r.destination} who="Người nhận" />
            </div>
          </div>
        </>
      )}

      {section(
        'Ngựa & hồ sơ',
        2,
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="cus-subtitle" style={{ margin: 0 }}>
              {r.horseCount} ngựa trong chuyến. Nhấn vào từng con để xem hoặc thu gọn chi tiết hồ sơ.
            </p>
            {docs.perHorse.length > 1 && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <button
                  type="button"
                  className="cus-link"
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    docs.perHorse.forEach((h) => {
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

          {docs.perHorse.map(({ horse, items }, idx) => {
            const isOpen = docs.perHorse.length === 1 || !!openHorses[horse.id];
            return (
              <div key={horse.id} className={`cus-wizard__review-horse-card ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="cus-wizard__review-horse-toggle"
                  onClick={() => toggleHorse(horse.id)}
                  aria-expanded={isOpen}
                >
                  <div className="cus-wizard__review-horse-info">
                    <span className="cus-wizard__review-horse-index">{idx + 1}</span>
                    <div>
                      <h4 className="cus-wizard__review-horse-name">
                        {horse.name}
                        <small>{horse.microchip || horse.id}</small>
                      </h4>
                      <span className="cus-wizard__review-horse-meta">
                        {items.length} mục hồ sơ • {r.horseNotes[horse.id] ? 'Có yêu cầu chăm sóc riêng' : 'Chăm sóc tiêu chuẩn'}
                      </span>
                    </div>
                  </div>
                  <div className="cus-wizard__review-horse-status">
                    <span className="cus-badge-hint">{isOpen ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="cus-wizard__review-horse-body">
                    <div className="cus-wizard__review-care">
                      <b>Chăm sóc trong chuyến</b>
                      <p className="cus-lines">{r.horseNotes[horse.id] || 'Không có yêu cầu riêng.'}</p>
                    </div>
                    <DocumentRows requestId={r.id} items={items} editable={false} />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {errs.length > 0 && (
        <Note tone="red" title="Chưa thể gửi yêu cầu">
          <ul className="cus-wizard__errors">
            {errs.map(([step, msg]) => (
              <li key={msg}>
                {msg}{' '}
                <button type="button" className="cus-link" onClick={() => navigate(wizardPath(r, step))}>
                  Sửa
                </button>
              </li>
            ))}
          </ul>
        </Note>
      )}

      <label className="cus-check">
        <input
          type="checkbox"
          checked={agree}
          disabled={errs.length > 0}
          onChange={(e) => setAgree(e.target.checked)}
        />
        Tôi xác nhận thông tin đã cung cấp là chính xác.
      </label>
      <div className="cus-wizard__actions">
        <button
          type="button"
          className="cus-btn cus-btn--lg"
          onClick={() => navigate(`/customer/requests/${r.id}/wizard/2`)}
        >
          ← Quay lại: Ngựa & hồ sơ
        </button>
        <button
          type="button"
          className="cus-btn cus-btn--solid cus-btn--lg"
          disabled={!agree || errs.length > 0 || submitting}
          onClick={submit}
        >
          {submitting
            ? 'Đang gửi yêu cầu lên máy chủ...'
            : r.status === 'CHANGES_REQUESTED'
            ? 'Gửi lại để xét duyệt →'
            : 'Gửi yêu cầu để xét duyệt →'}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
