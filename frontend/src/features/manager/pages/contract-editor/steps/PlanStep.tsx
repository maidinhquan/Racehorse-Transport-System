import React, { useEffect, useState } from 'react';
import { managerApi } from '../../../api/managerApi';
import { DateTimeField } from '../../../components/DateField/DateTimeField';
import type { ContractDraft, HorseRef, TransportMode, TransportRequest } from '../../../types';
import { MODE_LABEL, addDays, fmtDate, today } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
  horses: HorseRef[];
}

/** Bước 1: phương án vận chuyển dự kiến (để lập giá) */
export const PlanStep: React.FC<StepProps> = ({ request: r, draft, set, horses }) => {
  const isAir = draft.mode === 'AIR';
  const [minPrepDays, setMinPrepDays] = useState<number | null>(null);
  const [policyError, setPolicyError] = useState('');
  useEffect(() => {
    let active = true; setMinPrepDays(null); setPolicyError('');
    managerApi.getContractEditor(r.id, draft.mode).then(value => { if (active) setMinPrepDays(value.defaults.preparationDays); })
      .catch(() => { if (active) setPolicyError('Chưa tải được quy định chuẩn bị; máy chủ sẽ kiểm tra khi lưu/phát hành.'); });
    return () => { active = false; };
  }, [r.origin, r.destination, draft.mode]);
  const minDepartDate = addDays(today(), minPrepDays ?? 0);
  const handleModeChange = (mode: TransportMode) => set({ mode });

  const isDepartTooEarly = draft.departAt && draft.departAt.slice(0, 10) < minDepartDate;

  return (
    <>
      <h3 className="mgr-card__title">1. Phương án vận chuyển dự kiến</h3>
      <p className="mgr-hint" style={{ marginTop: 0 }}>
        Thông tin để lập giá. Coordinator lập tuyến, xe và nhân sự chi tiết sau khi chuyến được kích hoạt.
      </p>

      <div style={{
        backgroundColor: isAir ? '#eff6ff' : '#f8fafc',
        borderLeft: isAir ? '4px solid #3b82f6' : '4px solid #94a3b8',
        padding: '8px 12px',
        borderRadius: 4,
        marginBottom: 16,
        fontSize: 13,
        color: '#334155',
      }}>
        <span>{policyError || (minPrepDays === null ? 'Đang tải quy định chuẩn bị…' : `Tuyến này cần ${minPrepDays} ngày chuẩn bị. Khởi hành sớm nhất: ${fmtDate(minDepartDate)}. Hạn cọc/ký lấy riêng từ hợp đồng.`)}</span>
      </div>

      <div className="mgr-form-grid">
        <div className="mgr-field">
          <label htmlFor="ct-mode">Phương thức dự kiến *</label>
          <select id="ct-mode" className="mgr-select" value={draft.mode} onChange={(e) => handleModeChange(e.target.value as TransportMode)}>
            {(Object.keys(MODE_LABEL) as TransportMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
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
                patch.arriveAt = `${addDays(v.slice(0, 10), isAir ? 1 : 1)} 18:00`;
              }
              set(patch);
            }}
          />
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span className="mgr-hint">Khách mong muốn ngày {fmtDate(r.date)}.</span>
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
                    const newArr = `${addDays(minDepartDate, isAir ? 1 : 1)} 18:00`;
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
            value={draft.arriveAt || `${addDays(draft.departAt ? draft.departAt.slice(0, 10) : minDepartDate, isAir ? 1 : 1)} 18:00`}
            min={draft.departAt ? draft.departAt.slice(0, 10) : minDepartDate}
            onChange={(v) => set({ arriveAt: v })}
          />
        </div>
      </div>
    </>
  );
};

export default PlanStep;
