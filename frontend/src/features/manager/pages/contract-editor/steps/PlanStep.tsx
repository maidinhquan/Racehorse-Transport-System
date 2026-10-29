import React, { useEffect, useState } from 'react';
import { managerApi } from '../../../api/managerApi';
import { DateTimeField } from '../../../components/DateField/DateTimeField';
import type { ContractDraft, HorseRef, TransportRequest } from '../../../types';
import { addDays, fmtDate, today } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
  horses: HorseRef[];
}

/** Bước 1: phương án vận chuyển dự kiến (để lập giá) */
export const PlanStep: React.FC<StepProps> = ({ request: r, draft, set, horses }) => {
  const [minPrepDays, setMinPrepDays] = useState<number | null>(null);
  const [policyError, setPolicyError] = useState('');
  useEffect(() => {
    let active = true; setMinPrepDays(null); setPolicyError('');
    managerApi.getContractEditor(r.id).then(value => { if (active) setMinPrepDays(value.defaults.preparationDays); })
      .catch(() => { if (active) setPolicyError('Chưa tải được quy định chuẩn bị; máy chủ sẽ kiểm tra khi lưu/phát hành.'); });
    return () => { active = false; };
  }, [r.id]);
  const minDepartDate = addDays(today(), minPrepDays ?? 0);

  const isDepartTooEarly = draft.departAt && draft.departAt.slice(0, 10) < minDepartDate;
  // The customer's original dates. After a version is published the request carries the contract's dates,
  // so prefer the values recorded in the contract snapshot.
  const original = [...(r.versions ?? [])].reverse().find((v) => v.snapshot?.requestedPickupAt)?.snapshot;
  const requestedPickup = original?.requestedPickupAt || r.pickupAt;
  const requestedDelivery = original?.requestedDate || r.date;
  const departChanged = !!(requestedPickup && draft.departAt && draft.departAt.slice(0, 10) !== requestedPickup);
  const arriveChanged = !!(requestedDelivery && draft.arriveAt && draft.arriveAt.slice(0, 10) !== requestedDelivery);

  return (
    <>
      <h3 className="mgr-card__title">1. Phương án vận chuyển dự kiến</h3>
      <p className="mgr-hint" style={{ marginTop: 0 }}>
        Thông tin để lập giá. Coordinator lập tuyến, xe và nhân sự chi tiết sau khi chuyến được kích hoạt.
      </p>

      <p className="mgr-hint">
        {policyError || (minPrepDays === null ? 'Đang tải quy định chuẩn bị…' : `Tuyến này cần dự phòng ${minPrepDays} ngày chuẩn bị cho các phương án được hỗ trợ. Khởi hành sớm nhất: ${fmtDate(minDepartDate)}.`)}
      </p>
      <div className="mgr-form-grid">
        <div className="mgr-field">
          <label>Phương thức vận chuyển</label>
          <div className="mgr-input mgr-ce__readonly">Coordinator quyết định khi lập kế hoạch vận chuyển</div>
        </div>
        <div className="mgr-field">
          <label>Ngựa theo yêu cầu (chỉ xem)</label>
          <div className="mgr-input mgr-ce__readonly">{r.horses.map((id) => horses.find((h) => h.id === id)?.name ?? id).join(', ')}</div>
        </div>
        <div className="mgr-field">
          <label htmlFor="ct-depart">Khởi hành dự kiến *</label>
          <DateTimeField
            id="ct-depart"
            value={draft.departAt || `${minDepartDate} 08:00`}
            min={minDepartDate}
            onChange={(v) => {
              const patch: Partial<ContractDraft> = { departAt: v };
              if (v && draft.arriveAt && draft.arriveAt <= v) {
                patch.arriveAt = `${addDays(v.slice(0, 10), 1)} 18:00`;
              }
              set(patch);
            }}
          />
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span className="mgr-hint">Khách yêu cầu lấy ngựa: {fmtDate(requestedPickup)}.</span>
            {isDepartTooEarly && (
              <div style={{ color: '#dc2626', marginTop: 2 }}>
                ⚠️ Ngày khởi hành phải từ {fmtDate(minDepartDate)} trở đi.{' '}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    const newDep = `${minDepartDate} 08:00`;
                    const newArr = `${addDays(minDepartDate, 1)} 18:00`;
                    set({ departAt: newDep, arriveAt: newArr });
                  }}
                >
                  Đặt ngày hợp lệ ({fmtDate(minDepartDate)})
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mgr-field">
          <label htmlFor="ct-arrive">Đến dự kiến *</label>
          <DateTimeField
            id="ct-arrive"
            value={draft.arriveAt || `${addDays(draft.departAt ? draft.departAt.slice(0, 10) : minDepartDate, 1)} 18:00`}
            min={draft.departAt ? draft.departAt.slice(0, 10) : minDepartDate}
            onChange={(v) => set({ arriveAt: v })}
          />
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span className="mgr-hint">Khách yêu cầu giao ngựa: {fmtDate(requestedDelivery)}.</span>
          </div>
        </div>
      </div>
      {(departChanged || arriveChanged) && (
        <div className="mgr-note mgr-note--warn" role="note" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13 }}>
          <b>Bạn đang đề xuất lịch khác ngày khách yêu cầu.</b>{' '}
          {departChanged && <>Lấy ngựa {fmtDate(requestedPickup)} → <b>{fmtDate(draft.departAt.slice(0, 10))}</b>. </>}
          {arriveChanged && <>Giao ngựa {fmtDate(requestedDelivery)} → <b>{fmtDate(draft.arriveAt.slice(0, 10))}</b>. </>}
          Hợp đồng sẽ hiện cả hai mốc; khách đồng ý bằng cách ký hoặc gửi yêu cầu sửa. Hệ thống kiểm tra ngựa không bị trùng lịch khi lưu.
        </div>
      )}
    </>
  );
};

export default PlanStep;
